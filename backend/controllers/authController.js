const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/mailer');

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
            hashedPassword,
            isVerified: false
        });

        // generate email jwt token
        const emailToken = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1d'});

        // email url
        const url = `http://localhost:${process.env.PORT}/api/auth/verify/${emailToken}`;

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

        //return on success
        res.status(201).json({user: newUser, message:'User registered. Please check email to verify your account.'});
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

        // check if user is verified, if not do not let them login
        if(!returnUser.isVerified){
            return res.status(400).json({message: 'Please verify email to login.'});
        }

        // compare the password
        const match = await bcrypt.compare(Password, returnUser.hashedPassword);
        if(!match){
            return res.status(400).json({message: 'Incorrect Password'});
        }

        // generate jwt token
        const jwtToken = jwt.sign({id: returnUser._id}, process.env.JWT_SECRET, {expiresIn: '1h'});

        // return on success
        res.status(201).json({jwtToken, user: returnUser});
    }catch(error){
        console.error(error);
        res.status(500).json({message: 'Server Error'})
    }
};

const me = async(req, res) => {
    try{
        // get the user
        const user = await User.findById(req.user.id).select('-Password');
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
        const decode = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decode.id);

        if(!user) return res.status(400).send('User not found.');

        // check if user is verified, if not verify them
        if(user.isVerified){
            return res.send('Email is already verified');
        }

        user.isVerified = true;
        await user.save();

        res.send('Email was successfully verified! You may now login.');
    } catch(err){
        console.error(err);
        res.status(400).send('Invalid verification link');
    }
};

module.exports = {register, login, me, verifyEmail};
