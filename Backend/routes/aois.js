const express = require('express');
const router = express.Router();
const aoiController = require('../controllers/aoiController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.post('/', aoiController.saveAoi);
router.get('/', aoiController.listAois);
router.put('/:id/monitor', aoiController.updateMonitoring);
router.get('/:id/history', aoiController.fetchAoiHistory);

module.exports = router;
