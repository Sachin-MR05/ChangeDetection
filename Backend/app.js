const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
console.log(`[STARTUP] Loading environment from .env`);

const express = require("express");
const cors = require("cors");

let apiRoutes;
try {
  apiRoutes = require("./routes");
  console.log(`[STARTUP] ✓ Routes loaded`);
} catch (err) {
  console.error(`[STARTUP] ✗ Failed to load routes:`, err.message);
  process.exit(1);
}

const app = express();

// Middleware - Allow multiple frontend origins
app.use(cors({ 
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "https://change-detection-gamma.vercel.app"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint (runs before db initialization)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static result files from /data directory
app.use('/api/results', (req, res, next) => {
  const dataPath = path.join(__dirname, '../data');
  const requestedPath = path.join(dataPath, req.path);
  
  // Security: Prevent directory traversal
  const normalizedPath = path.normalize(requestedPath);
  const normalizedDataPath = path.normalize(dataPath);
  if (!normalizedPath.startsWith(normalizedDataPath)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Try to send the file
  res.sendFile(requestedPath, (err) => {
    if (err && err.code !== 'ECONNABORTED') {
      next(); // File not found, continue to other routes
    }
  });
});

// API routes
app.use("/api", apiRoutes);

const responseHelper = require("./utils/responseHelper");
const { INTERNAL_ERROR } = require("./constants/errorCodes");

// Central error handler
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  console.error(err.stack);
  try {
    return responseHelper.error(
      res,
      INTERNAL_ERROR,
      "An unexpected internal server error occurred.",
      null,
      500
    );
  } catch (handlerErr) {
    console.error(`[FATAL] Error handler crashed:`, handlerErr.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;
const { initializeUserTable } = require('./models/userModel');
const { initializeHistoryTable } = require('./models/historyModel');
const { initializeAoiTable } = require('./models/aoiModel');

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`[STARTUP] Server starting on port ${PORT}`);
  
  // Log environment variables (not secrets)
  console.log(`[ENV] NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
  console.log(`[ENV] DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);
  console.log(`[ENV] PORT: ${PORT}`);
  
  try {
    console.log(`[DB] Initializing userTable...`);
    await initializeUserTable();
    console.log(`[DB] ✓ userTable initialized`);
  } catch (err) {
    console.error(`[DB] ✗ userTable failed:`, err.message);
    process.exit(1);
  }
  
  try {
    console.log(`[DB] Initializing historyTable...`);
    await initializeHistoryTable();
    console.log(`[DB] ✓ historyTable initialized`);
  } catch (err) {
    console.error(`[DB] ✗ historyTable failed:`, err.message);
    process.exit(1);
  }
  
  try {
    console.log(`[DB] Initializing aoiTable...`);
    await initializeAoiTable();
    console.log(`[DB] ✓ aoiTable initialized`);
  } catch (err) {
    console.error(`[DB] ✗ aoiTable failed:`, err.message);
    process.exit(1);
  }
  
  console.log(`[STARTUP] ✓ Server ready for requests`);
});

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error(`[FATAL] Uncaught exception:`, err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[FATAL] Unhandled rejection:`, reason);
  process.exit(1);
});
