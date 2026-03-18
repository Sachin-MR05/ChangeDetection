/**
 * Client-side validation utilities
 */

// Configuration constants
const VALIDATION_LIMITS = {
  AOI_MIN_AREA_KM2: 1, // Minimum 1 km²
  AOI_MAX_AREA_KM2: 10000, // Maximum 10,000 km²
  MAX_DATE_RANGE_DAYS: 730, // 2 years
  MAX_HISTORICAL_DAYS: 1825, // 5 years
};

/**
 * Calculate area of a bounding box in square kilometers
 * @param {Array<number>} bbox - [minLon, minLat, maxLon, maxLat]
 * @returns {number} Area in km²
 */
export function calculateBBoxArea(bbox) {
  if (!bbox || bbox.length !== 4) return 0;
  
  const [minLon, minLat, maxLon, maxLat] = bbox;
  
  // Approximate calculation (good enough for validation)
  // 1 degree latitude ≈ 111 km
  // 1 degree longitude varies by latitude
  const latHeight = (maxLat - minLat) * 111;
  const lonWidth = (maxLon - minLon) * 111 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180);
  
  return Math.abs(latHeight * lonWidth);
}

/**
 * Validate AOI selection
 * @param {Object} aoi - Area of interest object
 * @returns {Object} { valid: boolean, error: string|null, areaKm2: number }
 */
export function validateAOI(aoi) {
  if (!aoi) {
    return { valid: false, error: 'AOI_REQUIRED', areaKm2: 0 };
  }
  
  if (!aoi.bbox || aoi.bbox.length !== 4) {
    return { valid: false, error: 'INVALID_AOI', areaKm2: 0 };
  }
  
  const areaKm2 = calculateBBoxArea(aoi.bbox);
  
  if (areaKm2 < VALIDATION_LIMITS.AOI_MIN_AREA_KM2) {
    return { valid: false, error: 'AOI_TOO_SMALL', areaKm2 };
  }
  
  if (areaKm2 > VALIDATION_LIMITS.AOI_MAX_AREA_KM2) {
    return { valid: false, error: 'AOI_TOO_LARGE', areaKm2 };
  }
  
  return { valid: true, error: null, areaKm2 };
}

/**
 * Validate date selection
 * @param {string} t1 - Past date (ISO format)
 * @param {string} t2 - Current date (ISO format)
 * @returns {Object} { valid: boolean, error: string|null }
 */
export function validateDates(t1, t2) {
  if (!t1 || !t2) {
    return { valid: false, error: 'INVALID_DATE' };
  }
  
  const date1 = new Date(t1);
  const date2 = new Date(t2);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if dates are valid
  if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
    return { valid: false, error: 'INVALID_DATE' };
  }
  
  // Check for future dates
  if (date1 > today || date2 > today) {
    return { valid: false, error: 'DATE_IN_FUTURE' };
  }
  
  // Check if t1 < t2
  if (date1 >= date2) {
    return { valid: false, error: 'INVALID_DATE_RANGE' };
  }
  
  // Check date range (max 2 years)
  const daysDiff = (date2 - date1) / (1000 * 60 * 60 * 24);
  if (daysDiff > VALIDATION_LIMITS.MAX_DATE_RANGE_DAYS) {
    return { valid: false, error: 'DATE_RANGE_TOO_LARGE' };
  }
  
  // Check historical limit (5 years from today)
  const daysFromToday = (today - date1) / (1000 * 60 * 60 * 24);
  if (daysFromToday > VALIDATION_LIMITS.MAX_HISTORICAL_DAYS) {
    return { valid: false, error: 'DATE_TOO_OLD' };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate complete detection request
 * @param {Object} params - { aoi, t1, t2 }
 * @returns {Object} { valid: boolean, errors: Array<string> }
 */
export function validateDetectionRequest({ aoi, t1, t2 }) {
  const errors = [];
  
  const aoiValidation = validateAOI(aoi);
  if (!aoiValidation.valid) {
    errors.push(aoiValidation.error);
  }
  
  const dateValidation = validateDates(t1, t2);
  if (!dateValidation.valid) {
    errors.push(dateValidation.error);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    details: {
      areaKm2: aoiValidation.areaKm2
    }
  };
}

export { VALIDATION_LIMITS };
