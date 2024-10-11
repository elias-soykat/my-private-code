const mongoose = require("mongoose");
require("dotenv").config();
const app = require("./app");

process.on("uncaughtException", (err) => {
  console.error(
    `[${new Date().toISOString()}] Uncaught Exception: ${err.name} - ${
      err.message
    }`
  );
  console.error("Shutting down due to uncaught exception...");
  process.exit(1);
});

(async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error(`Failed to connect to MongoDB: ${err.message}`);
    process.exit(1);
  }
})();

const port = process.env.PORT || 3001;
(() => {
  const server = app.listen(port, () =>
    console.log(`App running on port ${port}`)
  );

  process.on("unhandledRejection", (err) => {
    console.error(
      `[${new Date().toISOString()}] Unhandled Rejection: ${err.name} - ${
        err.message
      }`
    );
    console.error("Shutting down due to unhandled rejection...");
    server.close(() => {
      process.exit(1);
    });
  });

  process.on("SIGTERM", () => {
    console.log("SIGTERM received. Shutting down gracefully...");
    server.close(() => {
      console.log("Process terminated");
    });
  });
})();
