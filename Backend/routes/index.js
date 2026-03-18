const express = require("express");
const router = express.Router();
const changeDetectionRoutes = require("./changeDetection");
const resultsRoutes = require("./results");
const authRoutes = require("./auth");
const historyRoutes = require("./history");
const aoiRoutes = require("./aois");

router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Primary Change Detection Endpoint
router.use("/change-detection", changeDetectionRoutes);

// Results serving endpoint
router.use("/results", resultsRoutes);

// Auth endpoints
router.use("/auth", authRoutes);

// History endpoints
router.use("/history", historyRoutes);

// AOI management
router.use("/aois", aoiRoutes);

module.exports = router;
