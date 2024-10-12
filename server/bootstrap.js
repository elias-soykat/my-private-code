const mongoose = require('mongoose');
const process = require('process');
require('dotenv').config();
const app = require('./app');
const config = require('./config');

process.on('uncaughtException', (err) => {
  console.error(
    `[${new Date().toISOString()}] Uncaught Exception: ${err.name} - ${
      err.message
    }`
  );
  console.error('Shutting down due to uncaught exception...');
  process.exit(1);
});

(async () => {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error(`Failed to connect to MongoDB: ${err.message}`);
    process.exit(1);
  }
})();

(() => {
  const server = app.listen(config.PORT, () =>
    console.log(`App running on port ${config.PORT}`)
  );

  process.on('unhandledRejection', (err) => {
    console.error(
      `[${new Date().toISOString()}] Unhandled Rejection: ${err.name} - ${
        err.message
      }`
    );
    console.error('Shutting down due to unhandled rejection...');
    server.close(() => {
      process.exit(1);
    });
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('Process terminated');
    });
  });
})();
