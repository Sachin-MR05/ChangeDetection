const express = require("express");
const router = express.Router();
const { validateDetectionRequest } = require("../middleware/validator");
const { attachUserIfPresent } = require("../middleware/authMiddleware");
const { detectChange } = require("../controllers/detectionController");

/**
 * @route POST /api/change-detection
 * @desc Submit a new change detection job
 * @access Public
 */
router.post("/", attachUserIfPresent, validateDetectionRequest, detectChange);

module.exports = router;
