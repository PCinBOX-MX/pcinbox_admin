/**
 * Parse JSON sin tumbar la UI si el payload viene corrupto.
 */
export function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value !== "string") {
    return (value as T) ?? fallback;
  }
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}
