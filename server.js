const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });
const mongoose = require('mongoose');

process.on('uncaughtException', err => {
  console.log(err.name, err.message);
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  //arg 1 stands for unhandled rejection
  process.exit(1);
});

const app = require('./app');

// DATABASE
const db = process.env.DATABASE.replace(/<PASSWORD>/, process.env.ADMIN_PW);

mongoose
  .connect(db, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  })
  .then(() => console.log('Database connected'));

// SERVER
const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

process.on('unhandledRejection', err => {
  console.log(err.name, err.message);
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  //close server, then end application
  server.close(() => {
    process.exit(1);
  });
});
