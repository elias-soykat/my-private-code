const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const AppError = require('./utils/appError');
const userRouter = require('./routes/userRoutes');
const linkRouter = require('./routes/linkRoutes');
const globalErrorHandler = require('./controllers/errorController');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const config = require('./config');

const app = express();
if (config.NODE_ENV === 'production') app.use(morgan('dev'));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(mongoSanitize());
app.use(xss());
app.use(helmet());

app.use('/api/v1/users', userRouter);
app.use('/api/v1/links', linkRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
