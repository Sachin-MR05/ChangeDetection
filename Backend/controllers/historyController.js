const responseHelper = require('../utils/responseHelper');
const { VALIDATION_ERROR, INTERNAL_ERROR } = require('../constants/errorCodes');
const { createHistoryEntry, getHistoryByUserId } = require('../models/historyModel');

/**
 * Save a detection result to history
 * POST /api/history
 */
const saveHistory = async (req, res) => {
  try {
    const { change_percentage, start_date, end_date, bounding_box } = req.body;
    const userId = req.user.id;
    
    console.log(`[BACKEND] saveHistory request for user ${userId}:`, { change_percentage, start_date, end_date });

    // Basic validation
    if (change_percentage === undefined || !start_date || !end_date) {
      return responseHelper.error(res, VALIDATION_ERROR, "change_percentage, start_date, and end_date are required", null, 400);
    }

    const entry = await createHistoryEntry(userId, change_percentage, start_date, end_date, bounding_box || null);
    console.log(`[BACKEND] History entry saved successfully with ID: ${entry.id}`);
    return responseHelper.success(res, entry, "History entry saved successfully");
  } catch (error) {
    console.error('Save history error:', error);
    return responseHelper.error(res, INTERNAL_ERROR, "Server error while saving history", null, 500);
  }
};

/**
 * Get all detection history for the authenticated user
 * GET /api/history
 */
const getHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`[BACKEND] getHistory request for user ${userId}`);
    const history = await getHistoryByUserId(userId);
    console.log(`[BACKEND] Found ${history.length} history entries for user ${userId}`);

    return responseHelper.success(res, history, "History fetched successfully");
  } catch (error) {
    console.error('Get history error:', error);
    return responseHelper.error(res, INTERNAL_ERROR, "Server error while fetching history", null, 500);
  }
};

module.exports = {
  saveHistory,
  getHistory
};
