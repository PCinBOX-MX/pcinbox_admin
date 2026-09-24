/**
 * Persistencia de query strings de listados (filtros/paginación) por pathname.
 * Sobrevive F5 y navegación por menú (localStorage). Se limpia al cerrar
 * sesión (clearAllQuerySessions).
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

function getStore(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function saveQuerySession(
  pathname: string,
  search: string,
  opts?: { allowEmpty?: boolean },
): void {
  const store = getStore();
  if (!store) return;
  const key = storageKey(pathname);
  const normalized =
    !search || search === "?"
      ? ""
      : search.startsWith("?")
        ? search
        : `?${search}`;

  try {
    if (!normalized) {
      // Por defecto no vaciar (p. ej. layout al ver path limpio).
      // Con allowEmpty=true (setQueryParams) sí: evita rehidratar ?tab=caja
      // tras ir a Cobrar / URL sin query.
      if (opts?.allowEmpty) {
        store.setItem(key, "");
        sessionStorage.removeItem(key);
      }
      return;
    }
    store.setItem(key, normalized);
    // Migra / limpia legacy sessionStorage.
    sessionStorage.removeItem(key);
  } catch {
    // private mode / quota
  }
}

export function readQuerySession(pathname: string): string | null {
  const store = getStore();
  if (!store) return null;
  try {
    const key = storageKey(pathname);
    const raw = store.getItem(key) || sessionStorage.getItem(key);
    if (!raw || raw === "?") return null;
    return raw.startsWith("?") ? raw : `?${raw}`;
  } catch {
    return null;
  }
}

export function clearQuerySession(pathname: string): void {
  if (typeof window === "undefined") return;
  try {
    const key = storageKey(pathname);
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function clearAllQuerySessions(): void {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PREFIX)) keys.push(key);
    }
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(PREFIX)) keys.push(key);
    }
    keys.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  } catch {
    // ignore
  }
}
