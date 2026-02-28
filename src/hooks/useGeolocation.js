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

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setAccuracy(pos.coords.accuracy ?? null);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message || "Geolocation error");
        setLoading(false);
      },
      { enableHighAccuracy, timeout }
    );

    return () => navigator.geolocation?.clearWatch?.(id);
  }, [enableHighAccuracy, timeout]);

  return { lat, lng, accuracy, error, loading };
}
