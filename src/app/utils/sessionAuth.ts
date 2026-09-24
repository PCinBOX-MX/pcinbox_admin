/**
 * Distingue cierre de sesión voluntario vs expiración real (401).
 * El flag vive en sessionStorage para cubrir 401 en vuelo tras quitar el token.
 */

const VOLUNTARY_LOGOUT_KEY = "pcinbox-admin:voluntary-logout";

export function markVoluntaryLogout(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(VOLUNTARY_LOGOUT_KEY, "1");
  } catch {
    // private mode / quota
  }
}

export function isVoluntaryLogoutPending(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(VOLUNTARY_LOGOUT_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearVoluntaryLogout(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(VOLUNTARY_LOGOUT_KEY);
  } catch {
    // ignore
  }
}
