import { Capacitor } from "@capacitor/core";

/**
 * Returns true only when DPMP runs inside
 * the native Android Capacitor application.
 *
 * Normal web browsers always return false.
 */
export function isAndroidApp(): boolean {
  return (
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "android"
  );
}
