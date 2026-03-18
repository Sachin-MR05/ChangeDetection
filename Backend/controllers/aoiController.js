const responseHelper = require('../utils/responseHelper');
const { VALIDATION_ERROR, INTERNAL_ERROR } = require('../constants/errorCodes');
const {
  createAoiEntry,
  getAoisByUser,
  updateAoiMonitoring,
  getAoiHistory
} = require('../models/aoiModel');

const saveAoi = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, bbox, monitoring_frequency, alert_threshold } = req.body;

    console.log('📝 saveAoi request - userId:', userId, 'name:', name, 'bbox type:', typeof bbox, 'bbox:', JSON.stringify(bbox).substring(0, 100));

    let parsedBbox = bbox;
    if (typeof bbox === 'string') {
      try {
        parsedBbox = JSON.parse(bbox);
      } catch {
        // Try to convert from Postgres array string format
        parsedBbox = bbox.replace(/[{}]/g, '').split(',').map(Number);
      }
    }
    
    console.log('✅ parsedBbox:', parsedBbox, 'is array:', Array.isArray(parsedBbox), 'length:', parsedBbox?.length);

    if (!name || !Array.isArray(parsedBbox) || parsedBbox.length !== 4 || parsedBbox.some(isNaN)) {
      console.warn('❌ Validation failed - name:', name, 'isArray:', Array.isArray(parsedBbox), 'length:', parsedBbox?.length);
      return responseHelper.error(res, VALIDATION_ERROR, 'Name and a 4-value bounding box are required', null, 400);
    }

    const entry = await createAoiEntry(
      userId,
      name,
      parsedBbox,
      monitoring_frequency,
      alert_threshold
    );

    console.log('🎉 AOI saved successfully:', entry.id);
    return responseHelper.success(res, entry, 'AOI saved successfully');
  } catch (error) {
    console.error('❌ saveAoi error:', error.message);
    console.error('Stack:', error.stack);
    return responseHelper.error(res, INTERNAL_ERROR, 'Failed to save AOI', null, 500);
  }
};

const listAois = async (req, res) => {
  try {
    const userId = req.user.id;
    const aois = await getAoisByUser(userId);
    return responseHelper.success(res, aois, 'AOIs fetched');
  } catch (error) {
    console.error('listAois error:', error);
    return responseHelper.error(res, INTERNAL_ERROR, 'Failed to fetch AOIs', null, 500);
  }
};

const updateMonitoring = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { monitoring_frequency, alert_threshold } = req.body;

    if (!id) {
      return responseHelper.error(res, VALIDATION_ERROR, 'AOI id is required', null, 400);
    }

    const updated = await updateAoiMonitoring(userId, id, monitoring_frequency, alert_threshold);

    if (!updated) {
      return responseHelper.error(res, VALIDATION_ERROR, 'AOI not found', null, 404);
    }

    return responseHelper.success(res, updated, 'Monitoring updated');
  } catch (error) {
    console.error('updateMonitoring error:', error);
    return responseHelper.error(res, INTERNAL_ERROR, 'Failed to update monitoring settings', null, 500);
  }
};

const fetchAoiHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!id) {
      return responseHelper.error(res, VALIDATION_ERROR, 'AOI id is required', null, 400);
    }

    const history = await getAoiHistory(userId, id);
    return responseHelper.success(res, history, 'AOI history retrieved');
  } catch (error) {
    console.error('fetchAoiHistory error:', error);
    return responseHelper.error(res, INTERNAL_ERROR, 'Failed to fetch AOI history', null, 500);
  }
};

module.exports = {
  saveAoi,
  listAois,
  updateMonitoring,
  fetchAoiHistory
};
