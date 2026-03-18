const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const config = require("../config");

/**
 * Serve raw satellite images (past.png, current.png)
 * @route GET /api/results/:requestId/raw/:filename
 */
router.get("/:requestId/raw/:filename", (req, res) => {
  const { requestId, filename } = req.params;
  
  // Security: Whitelist allowed filenames for raw images
  const allowedFiles = ['past.png', 'current.png'];
  if (!allowedFiles.includes(filename)) {
    return res.status(400).json({ error: "Invalid raw image file" });
  }
  
  // Construct safe file path
  const filePath = path.join(config.storageDir, requestId, "raw", filename);
  
  // Security: Prevent directory traversal
  const normalizedPath = path.normalize(filePath);
  const baseDir = path.join(config.storageDir, requestId, "raw");
  if (!normalizedPath.startsWith(baseDir)) {
    return res.status(403).json({ error: "Access denied" });
  }
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Raw image not found" });
  }
  
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Content-Type', 'image/png');
  
  res.sendFile(filePath);
});

/**
 * Serve result files (change maps, heatmaps)
 * @route GET /api/results/:requestId/:filename
 */
router.get("/:requestId/:filename", (req, res) => {
  const { requestId, filename } = req.params;
  
  // Security: Whitelist allowed file extensions
  const allowedExtensions = ['.png', '.jpg', '.jpeg', '.tif', '.tiff'];
  const ext = path.extname(filename).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return res.status(400).json({ error: "Invalid file type" });
  }
  
  // Construct safe file path
  const filePath = path.join(config.storageDir, requestId, "outputs", filename);
  
  // Security: Prevent directory traversal
  const normalizedPath = path.normalize(filePath);
  const baseDir = path.join(config.storageDir, requestId, "outputs");
  if (!normalizedPath.startsWith(baseDir)) {
    return res.status(403).json({ error: "Access denied" });
  }
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Result file not found" });
  }
  
  // Set appropriate headers for caching
  res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
  res.setHeader('Content-Type', ext === '.png' ? 'image/png' : 'image/jpeg');
  
  // Serve the file
  res.sendFile(filePath);
});

module.exports = router;
