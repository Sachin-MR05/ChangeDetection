const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All history routes require authentication
router.use(authenticateToken);

// POST /api/history - Save a detection result
router.post('/', historyController.saveHistory);

// GET /api/history - Get all history for the user
router.get('/', historyController.getHistory);

module.exports = router;
