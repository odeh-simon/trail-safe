/**
 * Formats a distance in meters into a human-readable string.
 * - Below 1000m: rounds to nearest whole meter → "42m"
 * - 1000m and above: converts to km with 1 decimal place → "1.5km"
 * - Null or undefined input: returns "—"
 *
 * @param {number|null|undefined} meters
 * @returns {string}
 */
export function formatDistance(meters) {
  if (meters == null || isNaN(meters)) return "—";
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.round(meters)}m`;
}
