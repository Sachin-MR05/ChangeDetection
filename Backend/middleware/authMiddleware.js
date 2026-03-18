const jwt = require('jsonwebtoken');
const responseHelper = require('../utils/responseHelper');
const { VALIDATION_ERROR } = require('../constants/errorCodes');

/**
 * JWT Authentication Middleware
 * Extracts token from Authorization header, verifies it, and attaches user to req
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return responseHelper.error(res, VALIDATION_ERROR, "Access denied. No token provided.", null, 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, iat, exp }
    console.log(`[AUTH] User ${decoded.email} authenticated successfully`);
    next();
  } catch (err) {
    return responseHelper.error(res, VALIDATION_ERROR, "Invalid or expired token.", null, 403);
  }
};

/**
 * Best-effort JWT parsing for routes that work for anonymous users too.
 * If a valid token is present, req.user is populated; otherwise the request continues.
 */
const attachUserIfPresent = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log(`[AUTH] Optional auth attached user ${decoded.email}`);
  } catch (err) {
    console.warn('[AUTH] Optional auth ignored invalid token');
  }

  next();
};

module.exports = { authenticateToken, attachUserIfPresent };
