const SCROLL_KEY = "pos.pageScrollY";
const SCROLL_KEY_LEGACY = "pos.pageScroll";

export function readPosScrollY(): number {
  if (typeof window === "undefined") return 0;
  for (const store of [sessionStorage, localStorage]) {
    try {
      const n = Number(store.getItem(SCROLL_KEY));
      if (Number.isFinite(n) && n > 0) return n;
    } catch {
      /* ignore */
    }
  }
  try {
    const raw = sessionStorage.getItem(SCROLL_KEY_LEGACY);
    if (raw) {
      const y = Number((JSON.parse(raw) as { y?: number })?.y);
      if (Number.isFinite(y) && y > 0) return y;
    }
  } catch {
    /* ignore */
  }
  return 0;
}

type WriteOpts = {
  /** No bajar del valor ya guardado. */
  floor?: boolean;
  /** Permite guardar 0 / valores bajos (scroll intencional al tope). */
  allowClear?: boolean;
};

/**
 * Persiste Y en session + local.
 * Por defecto NO reemplaza un Y positivo con ≈0 (evita el wipe del loading shell en F5).
 */
export function writePosScrollY(y: number, opts: WriteOpts | boolean = {}): void {
  if (typeof window === "undefined") return;
  const options: WriteOpts =
    typeof opts === "boolean" ? { floor: opts } : opts ?? {};

  let next = Math.max(0, Math.round(y));
  const prev = readPosScrollY();
  if (options.floor) next = Math.max(next, prev);
  if (!options.allowClear && next <= 8 && prev > 8) return;

  const raw = String(next);
  try {
    sessionStorage.setItem(SCROLL_KEY, raw);
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(SCROLL_KEY, raw);
  } catch {
    /* ignore */
  }
}

export function getWindowScrollY(): number {
  if (typeof window === "undefined") return 0;
  return (
    window.scrollY ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  );
}

export function setWindowScrollY(y: number): void {
  if (typeof window === "undefined" || y < 0) return;
  const top = Math.round(y);
  window.scrollTo(0, top);
  document.documentElement.scrollTop = top;
  document.body.scrollTop = top;
}

export function getMaxWindowScrollY(): number {
  if (typeof window === "undefined") return 0;
  return Math.max(
    0,
    (document.documentElement?.scrollHeight || 0) - window.innerHeight,
  );
}
