# Skill: Geolocation & Compass

## useGeolocation hook
Returns: { lat, lng, accuracy, error, loading }
Uses navigator.geolocation.watchPosition for continuous updates.
Works offline — GPS chip does not need internet.
Request: { enableHighAccuracy: true, timeout: 10000 }

## useCompass hook
Returns: { heading, error }
Uses DeviceOrientationEvent.webkitCompassHeading (iOS) or
calculated from alpha (Android).
IMPORTANT: iOS 13+ requires DeviceOrientationEvent.requestPermission().
Must be called from a user gesture (button tap).

## Bearing Calculation
Use haversine.js getBearing(lat1, lng1, lat2, lng2) → degrees 0-360
Subtract device heading from bearing to get relative compass direction.

## Distance Calculation
Use haversine.js getDistance(lat1, lng1, lat2, lng2) → meters
