const User = require('../models/User');
const JwtSession = require('../models/JwtSession');
const OAuthAccount = require('../models/OAuthAccount');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/mailer');
const { getJwtSecret, getSecretValue, getOptionalSecretValue } = require('../services/secretsManager');

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

const getFrontendAuthRedirectBase = () => (
    getOptionalSecretValue('FRONTEND_APP_URL', 'http://localhost:3000/Login')
);

const getFrontendUrl = (pathname, params = {}) => {
    const url = new URL(getFrontendAuthRedirectBase());
    url.pathname = pathname;
    url.search = '';

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, String(value));
        }
    });

    return url.toString();
};

const getGithubOauthConfig = () => ({
    clientId: getSecretValue('GITHUB_CLIENT_ID'),
    clientSecret: getSecretValue('GITHUB_CLIENT_SECRET'),
    callbackUrl: getSecretValue('GITHUB_CALLBACK_URL')
});

const signGithubState = () => (
    jwt.sign(
        { nonce: crypto.randomUUID(), provider: 'github' },
        getJwtSecret(),
        { expiresIn: '10m' }
    )
);

const buildAuthRedirectUrl = (params) => {
    return getFrontendUrl('/Login', params);
};

const buildResetPasswordUrl = (token) => getFrontendUrl('/ResetPassword', { token });

const splitName = (name = '', fallback = '') => {
    const trimmed = (name || '').trim();
    if (!trimmed) {
        return { firstName: fallback || 'GitHub', lastName: 'User' };
    }

    const parts = trimmed.split(/\s+/);
    return {
        firstName: parts[0] || fallback || 'GitHub',
        lastName: parts.slice(1).join(' ') || 'User'
    };
};

const findAvailableLogin = async (baseLogin) => {
    const base = (baseLogin || '').trim().toLowerCase().replace(/[^a-z0-9-_]/g, '') || 'github-user';
    let candidate = base;
    let suffix = 0;

    while (await User.findOne({ Login: candidate })) {
        suffix += 1;
        candidate = `${base}-${suffix}`;
    }

    return candidate;
};

const fetchGithubAccessToken = async (code) => {
    const { clientId, clientSecret, callbackUrl } = getGithubOauthConfig();

    const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: callbackUrl
        })
    });

    const data = await response.json();
    if (!response.ok || !data.access_token) {
        throw new Error(data.error_description || 'Failed to exchange GitHub code');
    }

    return {
        accessToken: data.access_token,
        scopes: (data.scope || '').split(',').filter(Boolean)
    };
};

const fetchGithubProfile = async (accessToken) => {
    const headers = {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'ReadMeMaybe'
    };

    const [userResponse, emailResponse] = await Promise.all([
        fetch('https://api.github.com/user', { headers }),
        fetch('https://api.github.com/user/emails', { headers })
    ]);

    const githubUser = await userResponse.json();
    const githubEmails = await emailResponse.json();

    if (!userResponse.ok) {
        throw new Error(githubUser.message || 'Failed to fetch GitHub profile');
    }

    if (!emailResponse.ok || !Array.isArray(githubEmails)) {
        throw new Error('Failed to fetch GitHub email addresses');
    }

    const primaryEmailRecord =
        githubEmails.find((entry) => entry.primary && entry.verified) ||
        githubEmails.find((entry) => entry.verified) ||
        githubEmails[0];

    if (!primaryEmailRecord?.email) {
        throw new Error('GitHub account does not expose an email address');
    }

    return {
        githubUser,
        primaryEmail: primaryEmailRecord.email.toLowerCase()
    };
};

const upsertGithubUser = async ({ githubUser, primaryEmail, accessToken, scopes = [] }) => {
    const providerAccountId = String(githubUser.id);
    let oauthAccount = await OAuthAccount.findOne({
        Provider: 'github',
        ProviderAccountId: providerAccountId
    });
    let user;

    if (oauthAccount) {
        user = await User.findById(oauthAccount.UserId);
    }

    if (!user) {
        user = await User.findOne({ Email: primaryEmail });
    }

    const nameParts = splitName(githubUser.name, githubUser.login);

    if (!user) {
        const randomPlaceholderPassword = await bcrypt.hash(crypto.randomUUID(), 12);
        user = await User.create({
            FirstName: nameParts.firstName,
            LastName: nameParts.lastName,
            Login: await findAvailableLogin(githubUser.login || primaryEmail.split('@')[0]),
            Email: primaryEmail,
            EmailVerified: true,
            EmailVerifiedAt: new Date(),
            hashedPassword: randomPlaceholderPassword,
            GithubProfile: {
                Username: githubUser.login || '',
                ProfileUrl: githubUser.html_url || '',
                AvatarUrl: githubUser.avatar_url || '',
                IsConnected: true,
                LastSyncedAt: new Date()
            },
            LastLoginAt: new Date()
        });
    } else {
        user.FirstName = user.FirstName || nameParts.firstName;
        user.LastName = user.LastName || nameParts.lastName;
        user.EmailVerified = true;
        user.EmailVerifiedAt = user.EmailVerifiedAt || new Date();
        user.GithubProfile = {
            Username: githubUser.login || '',
            ProfileUrl: githubUser.html_url || '',
            AvatarUrl: githubUser.avatar_url || '',
            IsConnected: true,
            LastSyncedAt: new Date()
        };
        user.LastLoginAt = new Date();
        await user.save();
    }

    const oauthPayload = {
        UserId: user._id,
        Provider: 'github',
        ProviderAccountId: providerAccountId,
        Email: primaryEmail,
        AccessToken: accessToken,
        Scopes: scopes,
        Profile: githubUser,
        LastLoginAt: new Date()
    };

    if (oauthAccount) {
        oauthAccount.set(oauthPayload);
        await oauthAccount.save();
    } else {
        oauthAccount = await OAuthAccount.create({
            ...oauthPayload,
            LinkedAt: new Date()
        });
    }

    return user;
};

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
        const{
            FirstName = '',
            LastName = '',
            Login = '',
            Email = '',
            Password = ''
        } = req.body;
        const normalizedLogin = Login.trim().toLowerCase();
        const normalizedEmail = Email.trim().toLowerCase();

        // check if the login is taken
        const existingLogin = await User.findOne({Login: normalizedLogin});
        if (existingLogin){
            return res.status(400).json({message: 'Login already in use'});
        }

        // check if the email is taken
        const existingEmail = await User.findOne({Email: normalizedEmail});
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
            hashedPassword,
            isVerified: false
        });

        // generate email jwt token
        const emailToken = jwt.sign({ id: newUser._id }, getJwtSecret(), { expiresIn: '1d'});

        // email url
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const url = `${baseUrl}/api/auth/verify/${emailToken}`;

        // send verification email
        await sendEmail(
            newUser.Email,
            'Verify your email for ReadMeMaybe',
            `
            <h2>Welcome to ReadMe-Maybe!</h2>
            <p>Click below to verify your account:</p>
            <a href="${url}">Verify Email</a>
            `
        );

        // Return on success. DON'T create a session until email is verified
        res.status(201).json({message:'Registration successful! Please check your email to verify your account before logging in.'});
    }catch(error){
        console.error(error);
        res.status(500).json({message: 'Server Error'});
    }
};

const login = async (req, res) => {
    try{
        // get email and password
        const{Email = '', Password = ''} = req.body;
        const normalizedEmail = Email.trim().toLowerCase();

        // find user by email
        const returnUser = await User.findOne({Email: normalizedEmail});
        if(!returnUser){
            return res.status(400).json({message: 'Invalid Email'});
        }

        // check if user is verified, if not do not let them login
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

const githubStart = async (_req, res) => {
    try {
        const { clientId, callbackUrl } = getGithubOauthConfig();

        const githubUrl = new URL('https://github.com/login/oauth/authorize');
        githubUrl.searchParams.set('client_id', clientId);
        githubUrl.searchParams.set('redirect_uri', callbackUrl);
        githubUrl.searchParams.set('scope', 'read:user user:email public_repo');
        githubUrl.searchParams.set('state', signGithubState());

        return res.redirect(githubUrl.toString());
    } catch (error) {
        console.error(error);
        return res.redirect(buildAuthRedirectUrl({ error: 'GitHub sign-in could not be started' }));
    }
};

const githubCallback = async (req, res) => {
    try {
        const { code, state } = req.query;
        if (!code || !state) {
            return res.redirect(buildAuthRedirectUrl({ error: 'Missing GitHub callback parameters' }));
        }

        const decodedState = jwt.verify(state, getJwtSecret());
        if (decodedState.provider !== 'github') {
            return res.redirect(buildAuthRedirectUrl({ error: 'Invalid GitHub callback state' }));
        }

        getGithubOauthConfig();

        const { accessToken, scopes } = await fetchGithubAccessToken(code);
        const { githubUser, primaryEmail } = await fetchGithubProfile(accessToken);
        const user = await upsertGithubUser({ githubUser, primaryEmail, accessToken, scopes });
        const sessionTokens = await createSessionForUser(user._id.toString(), req);

        return res.redirect(buildAuthRedirectUrl({
            jwtToken: sessionTokens.accessToken,
            refreshToken: sessionTokens.refreshToken,
            userId: user._id.toString(),
            firstName: user.FirstName,
            lastName: user.LastName
        }));
    } catch (error) {
        console.error('[githubCallback] error:', error?.message || error);
        return res.redirect(buildAuthRedirectUrl({ error: 'GitHub sign-in failed' }));
    }
};

const githubRepos = async (req, res) => {
    try {
        const oauthAccount = await OAuthAccount.findOne({
            UserId: req.user.id,
            Provider: 'github'
        });

        if (!oauthAccount || !oauthAccount.AccessToken) {
            return res.status(404).json({ message: 'GitHub account is not connected' });
        }

        const page = Math.max(Number.parseInt(String(req.query.page || '1'), 10) || 1, 1);
        const perPage = Math.min(Math.max(Number.parseInt(String(req.query.per_page || '30'), 10) || 30, 1), 100);
        const sort = ['created', 'updated', 'pushed', 'full_name'].includes(String(req.query.sort || 'updated'))
            ? String(req.query.sort || 'updated')
            : 'updated';
        const direction = ['asc', 'desc'].includes(String(req.query.direction || 'desc'))
            ? String(req.query.direction || 'desc')
            : 'desc';
        const visibility = ['all', 'public', 'private'].includes(String(req.query.visibility || 'all'))
            ? String(req.query.visibility || 'all')
            : 'all';

        const githubUrl = new URL('https://api.github.com/user/repos');
        githubUrl.searchParams.set('page', String(page));
        githubUrl.searchParams.set('per_page', String(perPage));
        githubUrl.searchParams.set('sort', sort);
        githubUrl.searchParams.set('direction', direction);
        githubUrl.searchParams.set('visibility', visibility);

        const response = await fetch(githubUrl.toString(), {
            headers: {
                Accept: 'application/vnd.github+json',
                Authorization: `Bearer ${oauthAccount.AccessToken}`,
                'User-Agent': 'ReadMeMaybe'
            }
        });

        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({
                message: data.message || 'Failed to fetch GitHub repositories',
                scopes: oauthAccount.Scopes || []
            });
        }

        const repos = data.map((repo) => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            private: repo.private,
            description: repo.description,
            defaultBranch: repo.default_branch,
            htmlUrl: repo.html_url,
            cloneUrl: repo.clone_url,
            language: repo.language,
            visibility: repo.visibility || (repo.private ? 'private' : 'public'),
            updatedAt: repo.updated_at,
            pushedAt: repo.pushed_at
        }));

        return res.status(200).json({
            repos,
            page,
            perPage,
            scopes: oauthAccount.Scopes || []
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server Error' });
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

const forgotPassword = async (req, res) => {
    try {
        const normalizedEmail = (req.body?.Email || '').trim().toLowerCase();

        if (normalizedEmail) {
            const user = await User.findOne({ Email: normalizedEmail });

            if (user) {
                const resetToken = jwt.sign(
                    { id: user._id.toString(), type: 'password-reset' },
                    getJwtSecret(),
                    { expiresIn: '15m' }
                );

                const resetUrl = buildResetPasswordUrl(resetToken);
                await sendEmail(
                    user.Email,
                    'Reset your ReadMeMaybe password',
                    `
                    <h2>Password reset requested</h2>
                    <p>We received a request to reset your ReadMeMaybe password.</p>
                    <p>Click the button below to choose a new password:</p>
                    <p><a href="${resetUrl}">Reset Password</a></p>
                    <p>This link expires in 15 minutes.</p>
                    <p>If you did not request this, you can safely ignore this email.</p>
                    `
                );
            }
        }

        return res.status(200).json({
            message: 'If that email exists, a reset link has been sent.'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { Password = '' } = req.body;

        if (!token) {
            return res.status(400).json({ message: 'Reset token is required.' });
        }

        if (typeof Password !== 'string' || Password.trim().length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
        }

        const decoded = jwt.verify(token, getJwtSecret());
        if (decoded.type !== 'password-reset' || !decoded.id) {
            return res.status(400).json({ message: 'Invalid or expired reset link.' });
        }

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset link.' });
        }

        user.hashedPassword = await bcrypt.hash(Password, 12);
        await user.save();

        await JwtSession.updateMany(
            { UserId: user._id, RevokedAt: null },
            { RevokedAt: new Date() }
        );

        return res.status(200).json({ message: 'Password reset successful. Please sign in.' });
    } catch (error) {
        console.error(error);
        return res.status(400).json({ message: 'Invalid or expired reset link.' });
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
        // get the user
        const user = await User.findById(req.user.id).select('-hashedPassword');
        if (!user) return res.status(400).json({message:'User not found.'});
        res.status(200).json(user);
    }catch (err){
        console.error(err);
        res.status(500).json({message: 'Server Error'});
    }
};

const verifyEmail = async (req, res) => {
    try{
        // get email jwt token
        const { token } = req.params;

        if(!token){
            return res.status(400).send('Invalid verification link.');
        }

        // decode the token and get the user
        const decode = jwt.verify(token, getJwtSecret());
        const user = await User.findById(decode.id);

        if(!user) return res.status(400).send('User not found.');

        // check if user is verified, if not verify them
        if(user.EmailVerified){
            return res.send('Email is already verified');
        }

        user.EmailVerified = true;
        await user.save();

        res.send('Email was successfully verified! You may now login.');
    } catch(err){
        console.error(err);
        res.status(400).send('Invalid verification link');
    }
};

module.exports = {
    register,
    login,
    forgotPassword,
    resetPassword,
    refresh,
    logout,
    me,
    verifyEmail,
    githubStart,
    githubCallback,
    githubRepos
};
