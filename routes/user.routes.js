const express = require('express');
const userController = require('../_controllers/user.controller');
const authController = require('../_controllers/auth.controller');

const {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  getMyId,
  updateMe,
  deleteMe,
} = userController;

const {
  signup,
  login,
  protect,
  forgotPassword,
  resetPassword,
  updatePassword,
  restrictTo,
} = authController;

const router = express.Router();

// UNPROTECTED ROUTES
router.post('/signup', signup);
router.post('/login', login);
router.post('/forgotPassword', forgotPassword);
router.patch('/resetPassword/:resetToken', resetPassword);

// ALL ROUTES PAST THIS MIDDLEWARE PROTECTED
// LOGGED IN USERS ONLY
router.use(protect);

// ME
router.get('/me', getMyId, getUser);
router.patch('/updateMe', updateMe);
router.patch('/deleteMe', deleteMe);
router.patch('/updateMyPassword', updatePassword);

//RESTRICT FOLLOWING ROUTES TO ADMINS ONLY
router.use(restrictTo('admin'));

//ADMIN-ONLY CRUD ROUTES
router.route('/').get(getAllUsers);
router.route('/:id').get(getUser).patch(updateUser).delete(deleteUser);

module.exports = router;
