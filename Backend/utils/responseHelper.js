/**
 * Standard utility for formatting API responses
 */

/**
 * Send a success response
 * @param {Object} res Express response object
 * @param {Object} data Result payload
 * @param {Object} metadata Optional metadata
 * @param {number} statusCode HTTP status code (default 200)
 */
const success = (res, data, metadata = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    status: "success",
    result: data,
    metadata: metadata,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send an error response
 * @param {Object} res Express response object
 * @param {string} errorCode Standardized error code
 * @param {string} message Human-readable message
 * @param {any} details Optional error details
 * @param {number} statusCode HTTP status code (default 400)
 */
const error = (res, errorCode, message, details = null, statusCode = 400) => {
  const response = {
    status: "error",
    error: {
      code: errorCode,
      message: message,
    },
    timestamp: new Date().toISOString(),
  };

  if (details) {
    response.error.details = details;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  success,
  error,
};
