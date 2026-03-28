const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  backendUrl: process.env.BACKEND_URL || "http://localhost:3000",
  storageDir: process.env.STORAGE_DIR || path.join(__dirname, "../../data"),
  useDemoMode: process.env.USE_DEMO_MODE === "true",
  sendImagesAsBase64: process.env.SEND_IMAGES_AS_BASE64 === "true",
  copernicus: {
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    endpoint: process.env.COPERNICUS_ENDPOINT,
    tokenUrl: process.env.TOKEN_URL,
  },
  pythonServiceUrl: process.env.PYTHON_SERVICE_URL || "http://localhost:5000",
};

// Debug logging
console.log(`[CONFIG] BACKEND_URL: ${config.backendUrl}`);
console.log(`[CONFIG] SEND_IMAGES_AS_BASE64 env value: "${process.env.SEND_IMAGES_AS_BASE64}"`);
console.log(`[CONFIG] sendImagesAsBase64 parsed as: ${config.sendImagesAsBase64}`);
console.log(`[CONFIG] PYTHON_SERVICE_URL: ${config.pythonServiceUrl}`);

module.exports = config;
