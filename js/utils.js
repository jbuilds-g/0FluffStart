/**
 * Pure Utility Functions
 */

/**
 * Generates a unique identifier using crypto.randomUUID if available,
 * with a fallback timestamp/random string generator.
 * @returns {string} Unique identifier
 */
export const generateId = () =>
  typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : "id_" +
      Date.now() +
      "_" +
      Math.floor(performance.now() * 1000) +
      "_" +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

/**
 * Creates a debounced version of a function that delays execution.
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Validates and sanitizes URLs against malicious schemes.
 * @param {string} url - Raw URL string
 * @returns {string} Sanitized URL string
 */
export function sanitizeUrl(url) {
  if (!url) return "#";
  const trimmed = url.trim();
  if (/^(https?:\/\/|mailto:|tel:|\/|\.\/)/i.test(trimmed)) {
    return trimmed;
  }
  if (/^[a-z0-9+-.]+:/i.test(trimmed)) {
    return "#";
  }
  return `https://${trimmed}`;
}
