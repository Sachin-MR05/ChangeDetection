/**
 * Centralized API Service for Change Detection
 * All backend communication goes through this module
 */

const DEFAULT_LOCAL_BACKEND = 'http://localhost:3000';
const envBackendRaw = import.meta.env.VITE_BACKEND_URL;
const sanitizeBackendUrl = (candidate) => {
  if (!candidate) return '';
  let normalized = candidate.trim().replace(/\/$/, '');
  if (normalized.startsWith(':')) {
    normalized = `http://localhost${normalized}`;
  }
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `http://${normalized}`;
  }
  return normalized;
};
const envBackend = sanitizeBackendUrl(envBackendRaw);
const isDev = import.meta.env.MODE === 'development';
const originCandidate =
  envBackend ||
  (isDev ? DEFAULT_LOCAL_BACKEND : typeof window !== 'undefined' ? window.location.origin : '');
const API_BASE_URL = originCandidate ? `${originCandidate}/api` : '/api';

function extractPayload(json) {
  if (!json) return null;
  return json.result ?? json.data ?? json;
}

/**
 * Get the auth token from localStorage
 */
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

/**
 * Request change detection analysis
 * @param {Object} params - Detection parameters
 * @param {Object} params.aoi - Area of Interest (GeoJSON Feature with bbox)
 * @param {string} params.t1 - Past date (ISO format: YYYY-MM-DD)
 * @param {string} params.t2 - Current date (ISO format: YYYY-MM-DD)
 * @param {number} [params.cloudThreshold=20] - Max cloud coverage percentage
 * @returns {Promise<Object>} Detection result with metrics and outputs
 */
export async function changeDetection({ aoi, t1, t2, cloudThreshold = 20 }) {
  try {
    const response = await fetch(`${API_BASE_URL}/change-detection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        aoi,
        t1,
        t2,
        cloudThreshold
      })
    });

    const data = await response.json();

    // Handle error responses
    if (!response.ok) {
      const errorCode = data.error?.code || 'UNKNOWN_ERROR';
      const errorMessage = data.error?.message || 'An unexpected error occurred';
      
      return {
        success: false,
        errorCode,
        error: errorMessage
      };
    }

    const payload = extractPayload(data);
    return {
      success: true,
      data: payload
    };

  } catch (error) {
    // Network or parsing errors
    return {
      success: false,
      errorCode: 'NETWORK_ERROR',
      error: error.message || 'Failed to connect to server'
    };
  }
}

/**
 * Check backend health status
 * @returns {Promise<Object>} Health status
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    return { success: response.ok, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Register a new user
 * @param {Object} credentials - User credentials
 * @param {string} credentials.email
 * @param {string} credentials.password
 * @returns {Promise<Object>} Server response
 */
export async function registerUser({ email, password }) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Registration failed');
    const payload = extractPayload(data);
    return { success: true, ...payload };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Log in an existing user
 * @param {Object} credentials - User credentials
 * @param {string} credentials.email
 * @param {string} credentials.password
 * @returns {Promise<Object>} Server response
 */
export async function loginUser({ email, password }) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Login failed');
    const payload = extractPayload(data);
    return { success: true, ...payload };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Save a detection result to history
 * @param {Object} params
 * @param {number} params.change_percentage
 * @param {string} params.start_date
 * @param {string} params.end_date
 * @param {Array} params.bounding_box - [minLon, minLat, maxLon, maxLat]
 * @returns {Promise<Object>} Server response
 */
export async function saveHistory({ change_percentage, start_date, end_date, bounding_box }) {
  try {
    const response = await fetch(`${API_BASE_URL}/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ change_percentage, start_date, end_date, bounding_box })
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse saveHistory response as JSON. Body preview:', text.substring(0, 100));
      throw new Error(`Server returned non-JSON response: ${text.substring(0, 50)}...`);
    }
    if (!response.ok) throw new Error(data.error?.message || 'Failed to save history');
    const payload = extractPayload(data);
    return { success: true, data: payload };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Get all detection history for the authenticated user
 * @returns {Promise<Object>} Server response with history array
 */
export async function getHistory() {
  try {
    const response = await fetch(`${API_BASE_URL}/history`, {
      headers: {
        ...getAuthHeaders(),
      }
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse getHistory response as JSON. Body preview:', text.substring(0, 100));
      throw new Error(`Server returned non-JSON response: ${text.substring(0, 50)}...`);
    }
    if (!response.ok) throw new Error(data.error?.message || 'Failed to fetch history');
    const payload = extractPayload(data);
    return { success: true, data: payload };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function saveAOI({ name, bbox, monitoring_frequency = "continuous", alert_threshold = null }) {
  try {
    const response = await fetch(`${API_BASE_URL}/aois`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ name, bbox, monitoring_frequency, alert_threshold })
    });
    const text = await response.text();
    const data = JSON.parse(text);
    if (!response.ok) throw new Error(data.error?.message || 'Failed to save AOI');
    return { success: true, data: extractPayload(data) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function getAOIs() {
  try {
    const response = await fetch(`${API_BASE_URL}/aois`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    const text = await response.text();
    const data = JSON.parse(text);
    if (!response.ok) throw new Error(data.error?.message || 'Failed to fetch AOIs');
    return { success: true, data: extractPayload(data) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function getAOIHistory(aoiId) {
  try {
    const response = await fetch(`${API_BASE_URL}/aois/${aoiId}/history`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    const text = await response.text();
    const data = JSON.parse(text);
    if (!response.ok) throw new Error(data.error?.message || 'Failed to fetch AOI history');
    return { success: true, data: extractPayload(data) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function updateAOIMonitor({ id, monitoring_frequency, alert_threshold }) {
  try {
    const response = await fetch(`${API_BASE_URL}/aois/${id}/monitor`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ monitoring_frequency, alert_threshold })
    });
    const text = await response.text();
    const data = JSON.parse(text);
    if (!response.ok) throw new Error(data.error?.message || 'Failed to update monitor');
    return { success: true, data: extractPayload(data) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Update alert settings for an AOI
 * @param {string} aoiId - AOI ID
 * @param {Object} settings - Alert configuration
 * @param {string} settings.alert_type - 'change' | 'prediction'
 * @param {number} settings.alert_threshold - Percentage threshold
 * @param {string} settings.prediction_interval - 'monthly' | 'after_new_data' | 'custom'
 * @param {number} [settings.custom_days] - Days for custom interval
 * @returns {Promise<Object>} Updated alert settings
 */
export async function updateAOIAlerts({ aoiId, alert_type, alert_threshold, prediction_interval, custom_days = null }) {
  try {
    const response = await fetch(`${API_BASE_URL}/aois/${aoiId}/alerts`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ alert_type, alert_threshold, prediction_interval, custom_days })
    });
    const text = await response.text();
    const data = JSON.parse(text);
    if (!response.ok) throw new Error(data.error?.message || 'Failed to update alerts');
    return { success: true, data: extractPayload(data) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Get all alerts for user
 * @returns {Promise<Object>} User alerts
 */
export async function getAlerts() {
  try {
    const response = await fetch(`${API_BASE_URL}/alerts`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    const text = await response.text();
    const data = JSON.parse(text);
    if (!response.ok) throw new Error(data.error?.message || 'Failed to fetch alerts');
    return { success: true, data: extractPayload(data) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Get alerts for specific AOI
 * @param {string} aoiId - AOI ID
 * @returns {Promise<Object>} AOI alerts
 */
export async function getAOIAlerts(aoiId) {
  try {
    const response = await fetch(`${API_BASE_URL}/aois/${aoiId}/alerts`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    const text = await response.text();
    const data = JSON.parse(text);
    if (!response.ok) throw new Error(data.error?.message || 'Failed to fetch AOI alerts');
    return { success: true, data: extractPayload(data) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
