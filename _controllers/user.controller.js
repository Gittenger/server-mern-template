const User = require('./../_models/user.model');
const catchAsync = require('../utils/catchAsync');
const handlers = require('./_handlerFactory');

const { getAll, getOne, updateOne, deleteOne } = handlers;

//create filtered object to filter thru select fields. for filtering allowed updates
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(field => {
    if (allowedFields.includes(field)) newObj[field] = obj[field];
  });
  return newObj;
};

//middleware to pass currently logged in user ID to getOne
exports.getMyId = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// CRUD
exports.getAllUsers = getAll(User);
exports.getUser = getOne(User);
exports.updateUser = updateOne(User);
exports.deleteUser = deleteOne(User);

// Special CRUD
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  //create error if user POSTS password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword',
        400
      )
    );
  }

  //update user document
  //only allow select properties to be changed, filter unwanted object fields
  const filteredBody = filterObj(req.body, 'name', 'email');

  //new option will return the new, updated object
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

// UNDEFINED
exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined. Please use the signup page.',
  });
};
