/**
 * src/services/api.js
 * ─────────────────────────────────────────────────────────────────────────────
 * API client layer communicating with the Express backend.
 * Endpoints:
 *   - GET  /api/incidents
 *   - GET  /api/incidents/analytics
 *   - POST /api/incidents
 *   - GET  /health
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api').replace(/\/$/, '');
const SERVER_ROOT = API_BASE_URL.replace(/\/api$/, '');

/**
 * Generic fetch wrapper with JSON parsing and standardized error handling.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.error || data?.detail || data?.message || `HTTP ${response.status}: ${response.statusText}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
      const connErr = new Error(`Cannot connect to backend server at ${API_BASE_URL}. Ensure the Express server is running.`);
      connErr.isNetworkError = true;
      throw connErr;
    }
    throw err;
  }
}

/**
 * Fetch all incidents, ordered by newest first.
 */
export async function getIncidents() {
  return request('/incidents');
}

/**
 * Fetch dashboard analytics (KPI metrics, distributions).
 */
export async function getAnalytics() {
  return request('/incidents/analytics');
}

/**
 * Submit a raw incident for AI enrichment & PostgreSQL persistence.
 * @param {Object} payload { date, location, short_cause, description }
 */
export async function createIncident(payload) {
  return request('/incidents', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Check backend liveness probe and health.
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${SERVER_ROOT}/health`, { method: 'GET' });
    if (!response.ok) return { status: 'error', statusCode: response.status };
    const data = await response.json();
    return { status: 'ok', data };
  } catch (err) {
    return { status: 'down', error: err.message };
  }
}
