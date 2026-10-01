import { QZ_SETTINGS_STORAGE_KEY } from "@/app/punto-de-venta/qz/qzSettings";

/**
 * Preferencias de este equipo (impresora/cajón QZ, etc.).
 * Deben sobrevivir a logout / sesión expirada (localStorage.clear).
 */
export const DEVICE_PREF_STORAGE_KEYS = [QZ_SETTINGS_STORAGE_KEY] as const;

/** Limpia localStorage conservando prefs de hardware del POS. */
export function clearLocalStorageKeepingDevicePrefs() {
  if (typeof window === "undefined") return;

  const kept: Array<[string, string]> = [];
  for (const key of DEVICE_PREF_STORAGE_KEYS) {
    try {
      const value = localStorage.getItem(key);
      if (value != null) kept.push([key, value]);
    } catch {
      /* ignore */
    }
  }

  localStorage.clear();

  for (const [key, value] of kept) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  }
}
