export function normalizeOrderId(
  value: number | string | null | undefined,
): string | null {
  if (value == null || value === "") return null;
  const normalized = String(value).trim();
  return normalized || null;
}

export function orderIdsMatch(
  a: number | string | null | undefined,
  b: number | string | null | undefined,
): boolean {
  const left = normalizeOrderId(a);
  const right = normalizeOrderId(b);
  if (!left || !right) return false;
  return left === right;
}
