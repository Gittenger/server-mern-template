const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'User must have a name.'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide an email address'],
    unique: true,
    lowercase: true,
    validate: [
      validator.isEmail,
      'Email address is not valid. Please provide a valid email address.',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // this validator only works on CREATE/SAVE, NOT on UPDATE
      // when updating, use SAVE method to ensure password confirmation is validated
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  photo: String,
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

// DOCUMENT MIDDLEWARE, this = DOC
//
// password encryption for when setting or changing password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

// edit passwordChangedAt field on change, not on creation
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) next();

  //   set 1 second in past to ensure field is created prior to JWT being issued
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// QUERY MIDDLEWARE, this = query
//
// don't find/login users that are inactive (deleted)
userSchema.pre(/^find/, function (next) {
  // adding this specification to current query
  this.find({ active: { $ne: false } });
  next();
});

// STATIC METHODS
//
// compare request pw to encrypted pw
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// check if password was changed after JWT issued, thus requiring reauthentication
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    // format time stamp in seconds, then turn into base ten int
    //  JWT time stamps are in seconds (NumericDate values)
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimeStamp;
  }
  return false;
};

// generate password reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
