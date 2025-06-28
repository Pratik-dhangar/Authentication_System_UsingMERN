import bcrypt from 'bcryptjs';  // to encrypt password and then store it
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import transporter from '../config/nodemailer.js';


export const register = async (req, res)=>{
    const {name, email, password} = req.body;

    if(!name || !email || !password){
        return res.json({success: false, message: 'Missing Details'})
    } 

    try {
        const existingUser = await userModel.findOne({email});
        if (existingUser) {
            return res.json({success: false, message: "User Already Exists!"});         
        }
        const hashedPassword = await bcrypt.hash(password, 10); //password encryption
        const user =  new userModel({name, email, password: hashedPassword});   //will get from user input and create user in db
        await user.save();  // new user saved in db 

        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn: '7d'});   //"_id" is default id given to a new user in mongodb  ** using user_id jwt token is created and expiry time is set to 7day

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', //on local environment it will run on http otherwise on https.
            sameSite: process.env.NODE_ENV === 'production' ? 'none': 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 day in milliseconds 
        });
// sending email
        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: 'Ram Ram BHai',
            text: `Welcome to my website. your account has been created with email id: ${email}`
        }
        await transporter.sendMail(mailOptions);

        return res.json({success: true});

    } catch (error) {
        res.json({success: false, message: error.message});
    }
}


export const login = async (req, res)=>{
    const {email, password} = req.body;
    
    if(!email || !password){
        return res.json({success: false, message: 'Email & Password are required'})
    }
    try {
       const user = await userModel.findOne({email});
       if(!user){
        return res.json({success: false, message: 'Invalid Email'})
       }
       const isMatch = await bcrypt.compare(password, user.password);
    
       if(!isMatch){
        return res.json({success: false, message: 'Invalid Password'})
       }
        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn: '7d'});   //"_id" is default id given to a new user in mongodb  ** using user_id jwt token is created and expiry time is set to 7day

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', //on local environment it will run on http otherwise on https.
            sameSite: process.env.NODE_ENV === 'production' ? 'none': 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 day in milliseconds 
        });

        return res.json({success: true});

    } catch (error) {
        return res.json({success: false, message: error.message});
    }
}



export const logout = async(req, res)=>{
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none': 'strict'
        })

        return res.json({success: true, message:"Logged Out"});
        
    } catch (error) {
         return res.json({success: false, message: error.message});
    }
}

// send otp to user email
export const sendVerifyOtp = async(req, res)=>{
    try {
        const {userId} = req.body;
        const user = await userModel.findById(userId);

        if(user.isAccountVerified){
            return res.json({success: false, message: "Account already Verified"});
        }
       const otp = String(Math.floor(100000 + Math.random() * 900000));
       user.verifyOtp = otp;
       user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000;

       await user.save();
       const mailOptions = {
         from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: 'Account Verification OTP',
            text: `Your Verification OTP is ${otp}. verify your account using this OTP.`
       }
       await transporter.sendMail(mailOptions);
        return res.json({success: true, message: "Verification otp sent on email"});
    } catch (error) {
         return res.json({success: false, message: error.message});
    }
}