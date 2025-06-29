import bcrypt from 'bcryptjs';  // to encrypt password and then store it
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import transporter from '../config/nodemailer.js';
import { decrypt } from 'dotenv';


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
        const userId = req.user.id;
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


export const verifyEmail = async (req, res) => {
    const userId = req.user.id;
    const {otp} =  req.body;
    if(!userId || !otp){
        return res.json({success: false, message: "Missing details"});
    }
    try {
        const user = await userModel.findById(userId);

        if(!user){
            return res.json({success: false, message: "user not found"});
        }

        if(user.verifyOtp === '' || user.verifyOtp !== otp){
            return res.json({success: false, message: "invalid OTP"});
        } 

        if(user.verifyOtpExpireAt < Date.now()){
             return res.json({success: false, message: "OTP Expired"});
        }

        user.isAccountVerified = true;
        user.verifyOtp = '';
        user.verifyOtpExpireAt= 0;
        
        await user.save();
        return res.json({success: true, message: "Email Verified Successfully"});
    } catch (error) {
        return res.json({success: false, message: error.message});
    }
}

// to check if user is Authenticated
export const isAuthenticated = async (req, res) => {
    try {
        return res.json({success: true});
    } catch (error) {
         res.json({success:false,message: error.message});
    }
}


// send password reset otp

export const sendResetOtp = async(req, res)=>{
    const {email} = req.body;

    if(!email){
        return res.json({success: false, message:"Email is required"});
    }

    try {
        const user = await userModel.findOne({email});
        if(!user){
            return res.json({success: false, message:"user not found"});
        }
        const otp = String(Math.floor(100000 + Math.random() * 900000));
       user.resetOtp = otp;
       user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000;  //15 min

       await user.save();
       const mailOptions = {
         from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: 'Password Reset OTP',
            text: `OTP for resetting your password is ${otp}. `
       }
       await transporter.sendMail(mailOptions);
        return res.json({success: true, message: "otp sent to your email"});
        
    } catch (error) {
        return res.json({success: false, message:error.message});
    }
}


// reset user password

export const resetPassword = async(req, res)=>{
    const {email, otp, newPassword} = req.body;

    if(!email || !otp || !newPassword){
        return res.json({success: false, message:"email, otp and new password are required"});
    }
    try {
        const user = await userModel.findOne({email});

        if(!user){
            return res.json({success: false, message:"User not found"});
        }
        if(user.resetOtp === '' || user.resetOtp !== otp){
            return res.json({success: false, message: "Invalid OTP"});
        }

        if(user.resetOtpExpireAt < Date.now()){
              return res.json({success: false, message: "OTP Expired"});
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        user.resetOtp = '';
        user.resetOtpExpireAt = 0;

        await user.save();

        return res.json({success: true, message: "Password has been reset Successfully"});

    } catch (error) {
        return res.json({success: false, message: error.message});
    }
}