const jwt = require('jsonwebtoken');
const JwtSession = require('../models/JwtSession');
const { getJwtSecret } = require('../services/secretsManager');

const authMiddleware = async (req, res, next) => {
    try{
        //get token
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return res.status(401).json({message: 'No token found. Authorization denied'});

        //verify token
        const verToken = jwt.verify(token, getJwtSecret());
        if (verToken.type && verToken.type !== 'access') {
            return res.status(401).json({message: 'Access token is required'});
        }

        if (verToken.jti) {
            const session = await JwtSession.findOne({
                UserId: verToken.id,
                Jti: verToken.jti,
                RevokedAt: null
            });

            if (!session || session.ExpiresAt <= new Date()) {
                return res.status(401).json({message: 'Session is no longer valid'});
            }
        }

        req.user = verToken;
        next();
    } catch(err){
        console.log("JWT Error: ", err.message);
        res.status(401).json({message: 'Token is not valid'});
    }
};

module.exports = {authMiddleware};
