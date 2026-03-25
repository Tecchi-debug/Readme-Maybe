const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    try{
        const{ FirstName, LastName, Login, Email, Password} = req.body;

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

        // generate JWT 
        const jwtToken = jwt.sign({id: newUser._id}, process.env.JWT_SECRET, {expiresIn: '1h'});

        //return on success
        res.status(201).json({jwtToken, user: newUser});
    }catch (error){
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
};

const login = async (req, res) => {

};

module.exports = {register, login};
