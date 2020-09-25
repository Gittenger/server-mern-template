const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const morgan = require('morgan');
require('dotenv').config();

const userRouter = require('./routes/user.routes');

const app = express();

// DATABASE
const db = process.env.DATABASE.replace(/<PASSWORD>/, process.env.ADMIN_PW);

mongoose
  .connect(db, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Database connected'));

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

// BASIC SERVER
const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
