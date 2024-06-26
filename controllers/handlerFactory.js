const catchAsync=require("../utils/catchAsync");
const AppError=require("../utils/appError");
const APIFeatures=require('../utils/apiFeatures');





exports.deleteOne=Model=>catchAsync(async (req, res,next) => {
    const doc=await Model.findByIdAndDelete(req.params.id);
    if(!doc){
      return next(new AppError(`No document found with that id`,404));
    }
    res.status(204).json({
      status: 'success',
      data: null,
    });
});

exports.updateOne=Model=>catchAsync(async (req, res,next) => {
  const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidator: true,
  });
  if(!doc){
    return next(new AppError(`No doc found with that id`,404));
  }
  res.status(200).json({
    status: 'success',
    data: {
      data:doc,
    },
  });
});
exports.createOne=Model=>catchAsync(async (req, res,next) => {
  const newdoc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
         data:newdoc,
      },
    });
});
exports.getOne=(Model,popOptions)=>catchAsync(async (req, res,next) => {
  let query=await Model.findById(req.params.id);
  if(popOptions) query=query.populate(popOptions);

  const doc = await query;
  if(!doc){
    return next(new AppError(`No doc found with that id`,404));
  }
  //doc.findOne({_id: req.params.id})
  res.status(200).json({
    status: 'success',
    data: {
      doc,
    },
  });

});
exports.getAll=Model=>catchAsync(async (req, res,next) => {
  let filter={}
    if(req.params.tourId) filter={tour:req.params.tourId}
  //execute query
  const features = new APIFeatures(Model.find(filter), req.query).filter().sort()
    .limitFields().paginate();
  // const doc = await features.query.explain();
  const doc = await features.query;

  // const tours = await query;


  res.status(200).json({
    status: 'success',
    results: doc.length,
    data: {
      data:doc,
    },
  });
});