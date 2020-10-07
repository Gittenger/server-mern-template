const User = require('../_models/user.model');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const crypto = require('crypto');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

const signToken = id =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createAndSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT__COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  // only use secure option in production, otherwise won't be sent
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);

  //remove password from output (remember, won't save)
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, role, password, passwordConfirm } = req.body;
  // admin must be assigned by db admin
  if (role === 'admin') {
    return next(new AppError('Can not create new user as admin role', 403));
  }

  const newUser = await User.create({
    name,
    email,
    role,
    password,
    passwordConfirm,
  });

  createAndSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  // do email/password exist in input?
  if (!email | !password) {
    return next(new AppError('Please provide an email and a password', 400));
  }

  // check db for email and password
  // force selection of password since it is excluded in user schema
  const user = await User.findOne({ email }).select('+password');

  // check for user in db, and check password
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // create and send token
  createAndSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  // check if token exists
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return next(
      new AppError('You are not logged in. Please log in for access', 401)
    );
  }
  // check if token is valid/verified
  // run verify function, return promise, store result of promise in variable
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exists', 401)
    );
  }

  // check if user changed passwords after token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password. Please log in again', 401)
    );
  }

  // grant access to protected routes
  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(
      new AppError('You do not have permission to perform this action', 403)
    );
  }
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // find user based on email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with this email address', 404));
  }

  // generate random password reset token
  const resetToken = user.createPasswordResetToken();

  // turn off validators so encrypted token can be saved
  await user.save({ validateBeforeSave: false });

  // send token to email
  const resetUrl = `${req.protocol}://${req.get(
    'host'
  )}/api/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and password confirmation to: ${resetUrl}. If you didn't forget your password, just ignore this email`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (Valid for 10 minutes)',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later.',
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // get user based on token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // if token expired, no user returned
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: {
      $gt: Date.now(),
    },
  });

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // update changedPasswordAt field for current user
  // handled in middleware in user model

  // log the user in, send JWT
  createAndSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // logged in user info comes from protect function
  const user = await User.findById(req.user.id).select('+password');

  // check if current password sent in req matches db
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(
      new AppError('Incorrect password provided. Please try again', 401)
    );
  }
  // if correct, update pw
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // log user in, send JWT
  createAndSendToken(user, 200, res);
});
