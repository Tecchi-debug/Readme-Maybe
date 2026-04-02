const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try{
        //get token
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return res.status(401).json({message: 'No token found. Authorization denied'});

        //verify token
        const verToken = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Decoded: ", verToken);
        req.user = verToken;
        next();
    } catch(err){
        console.log("JWT Error: ", err.message);
        res.status(401).json({message: 'Token is not valid'});
    }
};

module.exports = {authMiddleware};