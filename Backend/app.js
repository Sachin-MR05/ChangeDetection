require("dotenv").config();
const express = require("express");
const cors = require("cors");
const apiRoutes = require("./routes");

const app = express();

// Middleware - Allow multiple frontend origins
app.use(cors({ 
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "https://change-detection-gamma.vercel.app"],
  credentials: true
}));
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API routes
app.use("/api", apiRoutes);

const responseHelper = require("./utils/responseHelper");
const { INTERNAL_ERROR } = require("./constants/errorCodes");

// Central error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  return responseHelper.error(
    res,
    INTERNAL_ERROR,
    "An unexpected internal server error occurred.",
    null,
    500
  );
});

const PORT = process.env.PORT || 3000;
const { initializeUserTable } = require('./models/userModel');
const { initializeHistoryTable } = require('./models/historyModel');
const { initializeAoiTable } = require('./models/aoiModel');

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initializeUserTable();
  await initializeHistoryTable();
  await initializeAoiTable();
});
