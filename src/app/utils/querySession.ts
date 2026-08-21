/**
 * Persistencia de query strings de listados (filtros/paginación) por pathname.
 * Sobrevive navegación por menú en la misma pestaña; se limpia al cerrar
 * pestaña/navegador (sessionStorage) y al cerrar sesión (clearAllQuerySessions).
 */

const PREFIX = "pcinbox-admin:list-query:";

function normalizePathname(pathname: string): string {
  if (!pathname) return "/";
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function storageKey(pathname: string): string {
  return `${PREFIX}${normalizePathname(pathname)}`;
}

export function saveQuerySession(pathname: string, search: string): void {
  if (typeof window === "undefined") return;
  const key = storageKey(pathname);
  const normalized =
    !search || search === "?"
      ? ""
      : search.startsWith("?")
        ? search
        : `?${search}`;

  try {
    if (!normalized) {
      sessionStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, normalized);
  } catch {
    // private mode / quota
  }
}

export function readQuerySession(pathname: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(pathname));
    if (!raw || raw === "?") return null;
    return raw.startsWith("?") ? raw : `?${raw}`;
  } catch {
    return null;
  }
}

export function clearAllQuerySessions(): void {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(PREFIX)) keys.push(key);
    }
    keys.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // ignore
  }
}
