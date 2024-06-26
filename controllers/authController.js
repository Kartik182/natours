const {promisify}=require('util');
const jwt=require('jsonwebtoken');
const User=require('../models/userModel');
const catchAsync=require("../utils/catchAsync");
const AppError=require("../utils/appError");
const sendEmail=require("../utils/email");
const crypto=require('crypto');


const signToken=id=>{
    return jwt.sign({id},process.env.JWT_SECRET,{
        expiresIn:process.env.JWT_EXPIRES_IN
    })
}
const createSendToken=(user,statusCode,res)=>{
    const token=signToken(user._id);
    const cookieOptions={
        expires:new Date(Date.now()+process.env.JWT_COOKIE_EXPIRES_IN*24*60*60*1000),
        httpOnly:true
    }
    if(process.env.NODE_ENV==='production') cookieOptions.secure=true;
    res.cookie('jwt',token,cookieOptions);
    user.password=undefined;
    res.status(statusCode).json({
        status: 'success',
        token,
        data:{
            user
        }        
    });

}
exports.signup=catchAsync(async(req,res,next)=>{
    const newUser=await User.create({
        name:req.body.name,
        email:req.body.email,
        password:req.body.password,
        passwordConfirm:req.body.passwordConfirm
    });
    createSendToken(newUser,201,res);
});
exports.login=catchAsync(async(req,res,next)=>{
    const {email,password}=req.body;
    if(!email ||!password){
        return next(new AppError('Please provide email and password!',400));
    }
    const user=await User.findOne({email:email}).select('+password');
    if(!user||!(await user.correctPassword(password,user.password))){
        return  next(new AppError('Incorrect email or password',401));
    }
    createSendToken(user,200,res);
})
exports.protect=catchAsync(async(req,res,next)=>{
    let token;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        token=req.headers.authorization.split(" ")[1];
    }
    if(!token){
        return next(new AppError("you are not logged in! Please log in to get access",401));
    }
    console.log(token);
    //verification token
    const decoded=await promisify(jwt.verify)(token,process.env.JWT_SECRET);
    //check if user still exists
    const currentUser=await User.findById(decoded.id);
    if(!currentUser) return next(new AppError("the user belonging to the token does no longer exists"));
    //check if user changed password after the token was issued
    if(currentUser.changedPasswordAfter(decoded.iat)) return next(new AppError("User recently changed password! please log in again",401));
    //grant access to protected route 
    req.user=currentUser;
    next();
})
exports.restrictTo=(...roles)=>{
    return (req,res,next)=>{
        if(!roles.includes(req.user.role)){
            return next(new AppError("you do not have permission to perform this action",403));
        }
        next();
    }
}
exports.forgotPassword=catchAsync(async(req,res,next)=>{
    const user =await User.findOne({email:req.body.email});
    if(!user){
        return next(new AppError("there is no user with email address",401));
    }
    const resetToken=user.createPasswordResetToken();
    await user.save({validateBeforeSave:false});
    const resetURL=`${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
    const message=`Forgot your password? Submit a PATCH request with your new password and passwordCofirm to:${resetURL}.\nIf you didn't forget your password,please ignore this eamil!`;
    // try{
    await sendEmail({
        email:user.email,
        subject:'Your password rest token(valid for 10 min)',
        message
    });
    // }catch(err){
    //     user.passwordResetToken=undefined;
    //     user.passwordResetExpires=undefined;
    //     await user.save({validateBeforeSave:false});
    //     return next(new AppError("there was an error sending the email.try again later"),500)

    // }
    res.status(200).json({
        status:"success",
        message:"Token sent to email"
    });
})
exports.resetPassword=catchAsync(async(req,res,next)=>{
    console.log(req.body);
    const hashedToken=crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user=await User.findOne({passwordResetToken:hashedToken,passwordResetExpires:{$gt:Date.now()}});

    if(!user){
        return next(new AppError("Token is invalid or expired"),400);
    }
    user.password=req.body.password;
    user.passwordConfirm=req.body.passwordConfirm;
    user.passwordResetToken=undefined;
    user.passwordResetExpires=undefined;
    await user.save();
    createSendToken(user,201,res);
})
exports.updatePassword=catchAsync(async(req,res,next)=>{
    const user=await User.findById(req.user.id).select('+password');
    if(!(await user.correctPassword(req.body.passwordCurrent,user.password))){
        return next(new AppError("Your current password is wrong"),401)
    }
    user.password=req.body.password;
    user.passwordConfirm=req.body.passwordConfirm;
    await user.save();
    
    createSendToken(user,200,res);
})