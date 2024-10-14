const process = require('process');

module.exports = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT || 3001,
  MONGO_URI: process.env.MONGO_URI,
  FRONTEND_LIVE_URL: process.env.FRONTEND_LIVE_URL,
  JWT_COOKIES_EXPIRES_IN: process.env.JWT_COOKIES_EXPIRES_IN,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  EMAIL_USERNAME: process.env.EMAIL_USERNAME,
  EMAIL_APP_PASSWORD: process.env.EMAIL_APP_PASSWORD,
};
