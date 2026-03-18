const Joi = require("joi");
const { 
  INVALID_AOI, 
  AOI_TOO_SMALL,
  AOI_TOO_LARGE,
  INVALID_COORDINATES,
  INVALID_DATE,
  INVALID_DATE_RANGE,
  DATE_IN_FUTURE,
  DATE_RANGE_TOO_LARGE,
  DATE_TOO_OLD
} = require("../constants/errorCodes");
const responseHelper = require("../utils/responseHelper");

// Configuration limits
const LIMITS = {
  AOI_MIN_AREA_KM2: 1,      // Minimum 1 km²
  AOI_MAX_AREA_KM2: 10000,  // Maximum 10,000 km²
  MAX_DATE_RANGE_DAYS: 730, // 2 years
  MAX_HISTORICAL_DAYS: 1825 // 5 years
};

/**
 * Calculate area of a bounding box in square kilometers
 * @param {Array<number>} bbox - [minLon, minLat, maxLon, maxLat]
 * @returns {number} Area in km²
 */
function calculateBBoxArea(bbox) {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  
  // Approximate calculation
  // 1 degree latitude ≈ 111 km
  // 1 degree longitude varies by latitude
  const latHeight = (maxLat - minLat) * 111;
  const lonWidth = (maxLon - minLon) * 111 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180);
  
  return Math.abs(latHeight * lonWidth);
}

// Helper for bbox range validation
const isValidBBox = (bbox) => {
  if (!bbox || bbox.length !== 4) return false;
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return (
    minLon >= -180 && minLon <= 180 &&
    maxLon >= -180 && maxLon <= 180 &&
    minLat >= -90 && minLat <= 90 &&
    maxLat >= -90 && maxLat <= 90 &&
    minLon < maxLon && minLat < maxLat
  );
};

const detectionSchema = Joi.object({
  aoi: Joi.object({
    type: Joi.string().valid("Feature", "Polygon", "MultiPolygon", "FeatureCollection", "BBox").required(),
    geometry: Joi.object().optional(),
    features: Joi.array().optional(),
    coordinates: Joi.array().optional(),
    bbox: Joi.array().items(Joi.number()).length(4).optional()
      .custom((value, helpers) => {
        if (!isValidBBox(value)) {
          return helpers.error("any.invalid");
        }
        return value;
      }),
  }).required().messages({
    "any.required": INVALID_AOI,
    "any.invalid": "INVALID_COORDINATES",
  }),
  t1: Joi.date().iso().max("now").required().messages({
    "date.format": INVALID_DATE,
    "date.max": "DATE_IN_FUTURE",
    "any.required": INVALID_DATE,
  }),
  t2: Joi.date().iso().max("now").greater(Joi.ref("t1")).required().messages({
    "date.format": INVALID_DATE,
    "date.max": "DATE_IN_FUTURE",
    "date.greater": "INVALID_DATE_RANGE",
    "any.required": INVALID_DATE,
  }),
  cloudThreshold: Joi.number().min(0).max(100).default(20),
  fallbackEnabled: Joi.boolean().default(false),
}).unknown(false);

const validateDetectionRequest = (req, res, next) => {
  const { error, value } = detectionSchema.validate(req.body);
  if (error) {
    const errorCode = error.details[0].message.includes("_") 
      ? error.details[0].message 
      : "VALIDATION_ERROR";
      
    return responseHelper.error(
      res, 
      errorCode, 
      error.details[0].message, 
      error.details.map((d) => d.message)
    );
  }
  
  // Additional server-side validation for AOI size
  if (value.aoi.bbox) {
    const areaKm2 = calculateBBoxArea(value.aoi.bbox);
    
    if (areaKm2 < LIMITS.AOI_MIN_AREA_KM2) {
      return responseHelper.error(
        res,
        AOI_TOO_SMALL,
        `AOI area (${areaKm2.toFixed(2)} km²) is below minimum (${LIMITS.AOI_MIN_AREA_KM2} km²)`,
        [{ areaKm2, minRequired: LIMITS.AOI_MIN_AREA_KM2 }]
      );
    }
    
    if (areaKm2 > LIMITS.AOI_MAX_AREA_KM2) {
      console.log(`[VALIDATION] Rejected oversized AOI: ${areaKm2.toFixed(2)} km²`);
      return responseHelper.error(
        res,
        AOI_TOO_LARGE,
        `AOI area (${areaKm2.toFixed(2)} km²) exceeds maximum (${LIMITS.AOI_MAX_AREA_KM2} km²)`,
        [{ areaKm2, maxAllowed: LIMITS.AOI_MAX_AREA_KM2 }]
      );
    }
  }
  
  // Additional date range validation
  const date1 = new Date(value.t1);
  const date2 = new Date(value.t2);
  const today = new Date();
  
  // Check date range (max 2 years)
  const daysDiff = (date2 - date1) / (1000 * 60 * 60 * 24);
  if (daysDiff > LIMITS.MAX_DATE_RANGE_DAYS) {
    return responseHelper.error(
      res,
      DATE_RANGE_TOO_LARGE,
      `Date range (${Math.floor(daysDiff)} days) exceeds maximum (${LIMITS.MAX_DATE_RANGE_DAYS} days)`,
      [{ daysDiff: Math.floor(daysDiff), maxAllowed: LIMITS.MAX_DATE_RANGE_DAYS }]
    );
  }
  
  // Check historical limit (5 years from today)
  const daysFromToday = (today - date1) / (1000 * 60 * 60 * 24);
  if (daysFromToday > LIMITS.MAX_HISTORICAL_DAYS) {
    return responseHelper.error(
      res,
      DATE_TOO_OLD,
      `Past date is too old (${Math.floor(daysFromToday)} days ago). Maximum: ${LIMITS.MAX_HISTORICAL_DAYS} days`,
      [{ daysAgo: Math.floor(daysFromToday), maxAllowed: LIMITS.MAX_HISTORICAL_DAYS }]
    );
  }
  
  req.body = value;
  next();
};

module.exports = { validateDetectionRequest, LIMITS };
