const R = 6371000; // Earth radius in meters

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

/**
 * Returns distance in meters between two GPS coordinates
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number}
 */
export function getDistance(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Returns compass bearing in degrees (0-360) from point A to point B
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number}
 */
export function getBearing(lat1, lng1, lat2, lng2) {
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Returns closest leader from array, with distanceMeters attached
 * @param {number} hikerLat
 * @param {number} hikerLng
 * @param {Array<{ lastLocation?: { lat: number; lng: number } }>} leaders
 * @returns {{ distanceMeters: number } | null}
 */
export function findClosestLeader(hikerLat, hikerLng, leaders) {
  return (
    leaders
      .filter((l) => l.lastLocation)
      .map((l) => ({
        ...l,
        distanceMeters: getDistance(
          hikerLat,
          hikerLng,
          l.lastLocation.lat,
          l.lastLocation.lng
        ),
      }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)[0] || null
  );
}
