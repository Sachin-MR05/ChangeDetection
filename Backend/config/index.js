const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  storageDir: process.env.STORAGE_DIR || path.join(__dirname, "../../data"),
  useDemoMode: process.env.USE_DEMO_MODE === "true",
  copernicus: {
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    endpoint: process.env.COPERNICUS_ENDPOINT,
    tokenUrl: process.env.TOKEN_URL,
  },
  pythonServiceUrl: process.env.PYTHON_SERVICE_URL || "http://localhost:5000",
};

module.exports = config;
