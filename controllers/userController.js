const User = require('../models/userModel');
const catchAsync=require('../utils/catchAsync');
const AppError=require('../utils/appError');
const factory=require("./handlerFactory")


const filterObj=(obj,...allowedFields)=>{
  let newObj={};
  Object.keys(obj).forEach(el=>{
    if(allowedFields.includes(el)) newObj[el]=obj[el];
  })
  return newObj;
}
exports.getMe=(req,res,next)=>{
  req.params.id=req.user.id;
  next();
}

exports.updateMe=catchAsync(async(req,res,next)=>{
  if(req.body.password ||req.body.passwordConfirm){
    return next(new AppError("this route is not for password updates.Please use /updateMyPassword.",400))
  }
  const filteredBody=filterObj(req.body,'name','email');
  const updatedUser=await User.findByIdAndUpdate(req.user.id,filteredBody,{new:true,runValidaters:true});
  res.status(200).json({
    status:"Success",
    data:{
      user:updatedUser
    }
  })
})
exports.deleteMe=catchAsync(async(req,res,next)=>{
  await User.findByIdAndUpdate(req.user.id,{active:false});

  res.status(204).json({
    status:'success',
    message:"deleted",
    data:null
  })
})
  exports.createUser=(req,res)=>{
    res.status(500).json({
      status:"error",
      message:"this route is not defined! please use signup instead"
    })
  }
  exports.getAllUsers=factory.getAll(User);
  exports.getUser=factory.getOne(User);
  exports.updateUser=factory.updateOne(User);
  exports.deleteUser=factory.deleteOne(User);