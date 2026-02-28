import { useState, useEffect } from "react";

/**
 * Returns device compass heading. Uses webkitCompassHeading (iOS) or alpha (Android).
 * iOS 13+ requires requestPermission from user gesture.
 * @returns {{ heading: number|null; error: string|null; requestPermission: () => Promise<boolean> }}
 */
export function useCompass() {
  const [heading, setHeading] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState(null);

  const requestPermission = async () => {
    if (typeof DeviceOrientationEvent?.requestPermission === "function") {
      try {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res === "granted") {
          setPermissionGranted(true);
          return true;
        }
        setError("Compass permission denied");
        return false;
      } catch (err) {
        setError(err.message || "Compass permission error");
        return false;
      }
    }
    setPermissionGranted(true);
    return true;
  };

  useEffect(() => {
    if (!permissionGranted) return;

    const handler = (e) => {
      if (e.webkitCompassHeading !== undefined) {
        setHeading(e.webkitCompassHeading);
      } else if (e.alpha !== null) {
        setHeading((360 - e.alpha) % 360);
      }
    };

    window.addEventListener("deviceorientation", handler, true);
    return () => window.removeEventListener("deviceorientation", handler, true);
  }, [permissionGranted]);

  return { heading, error, requestPermission };
}
