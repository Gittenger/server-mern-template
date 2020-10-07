const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const userRouter = require('./routes/user.routes');

const app = express();

// MIDDLEWARES
app.use(morgan('dev'));
app.use(
  bodyParser.json({
    limit: '10kb',
  })
);
app.use(cors());

// MOUNTING ROUTES MIDDLEWARES
app.use('/api/users', userRouter);

module.exports = app;
