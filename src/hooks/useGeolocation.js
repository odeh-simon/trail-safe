import { useState, useEffect } from "react";

/**
 * Returns GPS coordinates and accuracy. Uses watchPosition for continuous updates.
 * Works offline — GPS chip does not need internet.
 * @param {{ enableHighAccuracy?: boolean; timeout?: number }} [opts]
 * @returns {{ lat: number|null; lng: number|null; accuracy: number|null; error: string|null; loading: boolean }}
 */
export function useGeolocation(opts = {}) {
  const { enableHighAccuracy = true, timeout = 10000 } = opts;
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setLoading(false);
      return;
    }

    let watchId = null;
    let fallbackId = null;
    let resolved = false;

    const onSuccess = (pos) => {
      resolved = true;
      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);
      setAccuracy(pos.coords.accuracy ?? null);
      setError(null);
      setLoading(false);
    };

    const onError = (err) => {
      if (enableHighAccuracy && !resolved) {
        fallbackId = navigator.geolocation.watchPosition(
          onSuccess,
          (fallbackErr) => {
            setError(fallbackErr.message || "Geolocation error");
            setLoading(false);
          },
          { enableHighAccuracy: false, timeout: 15000 }
        );
      } else {
        setError(err.message || "Geolocation error");
        setLoading(false);
      }
    };

    watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy,
      timeout,
    });

    return () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      if (fallbackId != null) navigator.geolocation.clearWatch(fallbackId);
    };
  }, [enableHighAccuracy, timeout]);

  return { lat, lng, accuracy, error, loading };
}
