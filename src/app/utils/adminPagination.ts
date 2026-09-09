import { useCallback, useRef } from "react";

export function parsePageParam(
  raw: string | null | undefined,
  fallback = 1,
): number {
  const n = parseInt(String(raw ?? fallback), 10);
  if (!Number.isFinite(n) || n < 1) {
    return n === 0 ? 1 : fallback;
  }
  return n;
}

export function parsePageSizeParam(
  raw: string | null | undefined,
  fallback = 25,
): number {
  const n = parseInt(String(raw ?? fallback), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return n;
}

/** Lee un query param de la barra real del navegador (más fiable al hidratar). */
export function readWindowSearchParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(key);
}

/**
 * Resuelve page 1-based: searchParams de Next, con fallback a window.location
 * para evitar que el primer paint vacío pise ?page=N al recargar.
 */
export function resolvePageParam(
  searchParamsPage: string | null | undefined,
  fallback = 1,
): number {
  return parsePageParam(
    searchParamsPage || readWindowSearchParam("page"),
    fallback,
  );
}

export function resolvePageSizeParam(
  searchParamsPageSize: string | null | undefined,
  fallback = 25,
): number {
  return parsePageSizeParam(
    searchParamsPageSize || readWindowSearchParam("pageSize"),
    fallback,
  );
}

/**
 * Evita el write state→URL del primer mount (pisa ?page=N / restore de session).
 * Usar al inicio del efecto que llama setQueryParams con page.
 */
export function useSkipInitialUrlWrite(): () => boolean {
  const skipRef = useRef(true);
  return useCallback(() => {
    if (!skipRef.current) return false;
    skipRef.current = false;
    return true;
  }, []);
}
