const User = require('../models/User');
const JwtSession = require('../models/JwtSession');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../services/secretsManager');

const ACCESS_TOKEN_TTL = '1h';
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const signAccessToken = (userId, jti) => (
    jwt.sign({id: userId, jti, type: 'access'}, getJwtSecret(), {expiresIn: ACCESS_TOKEN_TTL})
);

const signRefreshToken = (userId, jti) => (
    jwt.sign({id: userId, jti, type: 'refresh'}, getJwtSecret(), {expiresIn: REFRESH_TOKEN_TTL})
);

const buildSessionMetadata = (req) => ({
    DeviceName: req.get('X-Device-Name') || '',
    IpAddress: req.ip || '',
    UserAgent: req.get('user-agent') || ''
});

const createSessionForUser = async (userId, req) => {
    const now = new Date();
    const jti = crypto.randomUUID();
    const refreshToken = signRefreshToken(userId, jti);

    await JwtSession.create({
        UserId: userId,
        Jti: jti,
        TokenHash: hashToken(refreshToken),
        TokenType: 'refresh',
        ExpiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
        IssuedAt: now,
        ...buildSessionMetadata(req)
    });

    return {
        accessToken: signAccessToken(userId, jti),
        refreshToken
    };
};

const rotateSessionTokens = async (session) => {
    const now = new Date();
    const refreshToken = signRefreshToken(session.UserId.toString(), session.Jti);

    session.TokenHash = hashToken(refreshToken);
    session.ExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);
    session.IssuedAt = now;
    await session.save();

    return {
        accessToken: signAccessToken(session.UserId.toString(), session.Jti),
        refreshToken
    };
};

const register = async (req, res) => {
    try{
        const{FirstName, LastName, Login, Email, Password} = req.body;

        // check if the login is taken
        const existingLogin = await User.findOne({Login});
        if (existingLogin){
            return res.status(400).json({message: 'Login already in use'});
        }

        // check if the email is taken
        const existingEmail = await User.findOne({Email});
        if (existingEmail){
            return res.status(400).json({message: 'Email already in use'});
        }

        // hash and salt password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(Password, saltRounds);

        // create the user
        const newUser = await User.create({
            FirstName,
            LastName,
            Login,
            Email,
            hashedPassword
        });

        const { accessToken, refreshToken } = await createSessionForUser(newUser._id.toString(), req);

        //return on success
        res.status(201).json({jwtToken: accessToken, refreshToken, user: newUser});
    }catch(error){
        console.error(error);
        res.status(500).json({message: 'Server Error'});
    }
};

const login = async (req, res) => {
    try{
        // get email and password
        const{Email, Password} = req.body;

        // find user by email
        const returnUser = await User.findOne({Email});
        if(!returnUser){
            return res.status(400).json({message: 'Invalid Email'});
        }

        if (returnUser.EmailVerified === false) {
            return res.status(400).json({message: 'Please verify your email before logging in'});
        }

        // compare the password
        const match = await bcrypt.compare(Password, returnUser.hashedPassword);
        if(!match){
            return res.status(400).json({message: 'Incorrect Password'});
        }

        returnUser.LastLoginAt = new Date();
        await returnUser.save();

        const { accessToken, refreshToken } = await createSessionForUser(returnUser._id.toString(), req);

        // return on success
        res.status(201).json({jwtToken: accessToken, refreshToken, user: returnUser});
    }catch(error){
        console.error(error);
        res.status(500).json({message: 'Server Error'})
    }
};

const refresh = async (req, res) => {
    try {
        const refreshToken = req.body?.refreshToken || req.body?.RefreshToken;
        if (!refreshToken) {
            return res.status(400).json({message: 'Refresh token is required'});
        }

        const decoded = jwt.verify(refreshToken, getJwtSecret());
        if (decoded.type !== 'refresh' || !decoded.jti) {
            return res.status(401).json({message: 'Refresh token is not valid'});
        }

        const session = await JwtSession.findOne({
            UserId: decoded.id,
            Jti: decoded.jti,
            RevokedAt: null
        });

        if (!session) {
            return res.status(401).json({message: 'Session not found or revoked'});
        }

        if (session.ExpiresAt <= new Date()) {
            return res.status(401).json({message: 'Session expired'});
        }

        if (session.TokenHash !== hashToken(refreshToken)) {
            session.RevokedAt = new Date();
            await session.save();
            return res.status(401).json({message: 'Refresh token is not valid'});
        }

        const tokens = await rotateSessionTokens(session);
        return res.status(200).json(tokens);
    } catch (error) {
        console.error(error);
        return res.status(401).json({message: 'Refresh token is not valid'});
    }
};

const logout = async (req, res) => {
    try {
        const bearerToken = req.header('Authorization')?.replace('Bearer ', '');
        const refreshToken = req.body?.refreshToken || req.body?.RefreshToken;
        const tokenToInspect = bearerToken || refreshToken;

        if (!tokenToInspect) {
            return res.status(400).json({message: 'Token is required'});
        }

        const decoded = jwt.verify(tokenToInspect, getJwtSecret());
        if (!decoded.jti) {
            return res.status(400).json({message: 'Session id missing from token'});
        }

        await JwtSession.findOneAndUpdate(
            { UserId: decoded.id, Jti: decoded.jti, RevokedAt: null },
            { RevokedAt: new Date() }
        );

        return res.status(200).json({message: 'Logged out'});
    } catch (error) {
        console.error(error);
        return res.status(401).json({message: 'Token is not valid'});
    }
};

const me = async(req, res) => {
    try{
        const user = await User.findById(req.user.id).select('-hashedPassword');
        if (!user) return res.status(400).json({message:'User not found.'});
        res.status(200).json(user);
    }catch (err){
        console.error(err);
        res.status(500).json({message: 'Server Error'});
    }
};

module.exports = {register, login, refresh, logout, me};
