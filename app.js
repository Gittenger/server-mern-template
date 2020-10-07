const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');

//SECURITY
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

//ERROR HANDLERS
const AppError = require('./utils/appError');
const globalErrorHandler = require('./_controllers/errorController');

//ROUTERS
const userRouter = require('./routes/user.routes');

//
//INITIALIZE
const app = express();

//
// GLOBAL MIDDLEWARES
app.use(morgan('dev'));
// request time field for use in responses
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});
app.use(
  bodyParser.json({
    limit: '10kb',
  })
);
app.use(cors());

// SECURITY MIDDLEWARE

// SET SECURITY HTTP HEADERS
app.use(helmet());

// RATE LIMITER --100/hr
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message:
    'Too many requests from this IP address. Please try again in one hour.',
});
app.use('/api', limiter);

// NOSQL QUERY INJECTION
app.use(mongoSanitize());

// XSS ATTACKS -- DATA SANITIZATION
app.use(xss());

// PARAMS POLLUTION
app.use(
  hpp({
    whitelist: [
      // put allowed rest parameters here
    ],
  })
);

// SERVING STATIC FILES
app.use(express.static(`${__dirname}/_public`));

// MOUNTING ROUTES MIDDLEWARES
app.use('/api/users', userRouter);

//ALL UNHANDLED ROUTES
//handle all verbs using app.all, * = everything
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
