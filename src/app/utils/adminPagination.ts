/**
 * Página 1-based en URL (como cotizaciones / reservas / proveedores).
 * Compat: `page=0` legacy se trata como página 1.
 */
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
