/**
 * Error code to user-friendly message mapping
 */

export const ERROR_MESSAGES = {
  // Input validation errors
  INVALID_AOI: "Please select a valid area of interest on the map",
  AOI_TOO_SMALL: "Selected area is too small. Please draw a larger region",
  AOI_TOO_LARGE: "Selected area is too large. Maximum allowed: 10,000 km²",
  INVALID_COORDINATES: "Invalid coordinates. Please redraw your area",
  
  // Date validation errors
  INVALID_DATE: "Please select valid dates for analysis",
  INVALID_DATE_RANGE: "Past date must be earlier than current date",
  DATE_IN_FUTURE: "Cannot select future dates",
  DATE_RANGE_TOO_LARGE: "Date range is too large. Maximum allowed: 2 years",
  DATE_TOO_OLD: "Historical data not available for dates older than 5 years",
  
  // Data availability errors
  NO_IMAGERY_AVAILABLE: "No satellite imagery available for the selected dates and area. Please try different dates or enable fallback mode",
  CLOUD_COVERAGE_HIGH: "Cloud coverage too high in available imagery. Try adjusting the cloud threshold",
  
  // System errors
  MODEL_FAILURE: "Change detection model encountered an error. Please try again",
  INTERNAL_ERROR: "An internal server error occurred. Our team has been notified",
  VALIDATION_ERROR: "Request validation failed. Please check your inputs",
  NETWORK_ERROR: "Unable to connect to server. Please check your internet connection",
  TIMEOUT_ERROR: "Request timed out. The area may be too large or the server is busy",
  
  // Default
  UNKNOWN_ERROR: "An unexpected error occurred. Please try again"
};

/**
 * Maps backend error codes to user-friendly messages
 * @param {string} errorCode - Error code from backend
 * @param {string} fallbackMessage - Optional fallback message
 * @returns {string} User-friendly error message
 */
export function getErrorMessage(errorCode, fallbackMessage = null) {
  // Check if we have a mapped message
  if (ERROR_MESSAGES[errorCode]) {
    return ERROR_MESSAGES[errorCode];
  }
  
  // Return fallback or default
  return fallbackMessage || ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Categorizes errors for UI handling
 * @param {string} errorCode - Error code from backend
 * @returns {string} Error category: 'input', 'data', 'system', 'network'
 */
export function getErrorCategory(errorCode) {
  const inputErrors = [
    'INVALID_AOI', 'AOI_TOO_SMALL', 'AOI_TOO_LARGE', 'INVALID_COORDINATES',
    'INVALID_DATE', 'INVALID_DATE_RANGE', 'DATE_IN_FUTURE', 
    'DATE_RANGE_TOO_LARGE', 'DATE_TOO_OLD', 'VALIDATION_ERROR'
  ];
  
  const dataErrors = [
    'NO_IMAGERY_AVAILABLE', 'CLOUD_COVERAGE_HIGH'
  ];
  
  const systemErrors = [
    'MODEL_FAILURE', 'INTERNAL_ERROR', 'TIMEOUT_ERROR'
  ];
  
  const networkErrors = [
    'NETWORK_ERROR'
  ];
  
  if (inputErrors.includes(errorCode)) return 'input';
  if (dataErrors.includes(errorCode)) return 'data';
  if (systemErrors.includes(errorCode)) return 'system';
  if (networkErrors.includes(errorCode)) return 'network';
  
  return 'unknown';
}

/**
 * Determines if error is retryable
 * @param {string} errorCode - Error code from backend
 * @returns {boolean} True if user should retry
 */
export function isRetryableError(errorCode) {
  const retryable = [
    'NETWORK_ERROR', 'TIMEOUT_ERROR', 'INTERNAL_ERROR', 
    'MODEL_FAILURE', 'NO_IMAGERY_AVAILABLE'
  ];
  
  return retryable.includes(errorCode);
}
