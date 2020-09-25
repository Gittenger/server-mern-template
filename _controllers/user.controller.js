const User = require('./../_models/user.model');
const handlers = require('./_handlerFactory');

const { getAll, getOne } = handlers;

// CRUD
exports.getAllUsers = getAll(User);
exports.getUser = getOne(User);

// UNDEFINED
exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined. Please use the signup page.',
  });
};
