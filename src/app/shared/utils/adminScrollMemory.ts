/**
 * Persistencia de scroll para F5 en pcinbox_admin.
 * El shell corto de React aplastaba Y→0 y el saver lo guardaba; eso se evita.
 */

const SCROLL_KEY = "pcinbox.admin.scrollY";
const SCROLL_PATH_KEY = "pcinbox.admin.scrollPath";
/** Compat POS */
const POS_SCROLL_KEY = "pos.pageScrollY";

export function readAdminScrollY(pathname?: string | null): number {
  if (typeof window === "undefined") return 0;
  const path = pathname || window.location.pathname;
  try {
    const savedPath = sessionStorage.getItem(SCROLL_PATH_KEY);
    // Otra ruta en la misma sesión: no reutilizar Y ajeno (en F5 el path coincide).
    if (savedPath && savedPath !== path) return 0;
  } catch {
    /* ignore */
  }

  for (const key of [SCROLL_KEY, POS_SCROLL_KEY]) {
    for (const store of [sessionStorage, localStorage]) {
      try {
        const n = Number(store.getItem(key));
        if (Number.isFinite(n) && n > 0) return n;
      } catch {
        /* ignore */
      }
    }
  }
  return 0;
}

export function writeAdminScrollY(
  y: number,
  opts?: { allowClear?: boolean; pathname?: string | null },
): void {
  if (typeof window === "undefined") return;
  const next = Math.max(0, Math.round(y));
  const prev = readAdminScrollY(opts?.pathname);
  // Nunca borrar un Y útil con ≈0 (boot / loading shell).
  if (!opts?.allowClear && next <= 12 && prev > 12) return;

  const raw = String(next);
  const path = opts?.pathname || window.location.pathname;
  try {
    sessionStorage.setItem(SCROLL_KEY, raw);
    sessionStorage.setItem(SCROLL_PATH_KEY, path);
    sessionStorage.setItem(POS_SCROLL_KEY, raw);
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(SCROLL_KEY, raw);
    localStorage.setItem(POS_SCROLL_KEY, raw);
  } catch {
    /* ignore */
  }
}

export function getPageScrollY(): number {
  if (typeof window === "undefined") return 0;
  const se = document.scrollingElement;
  return (
    window.scrollY ||
    se?.scrollTop ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  );
}

export function setPageScrollY(y: number): void {
  if (typeof window === "undefined" || y < 0) return;
  const top = Math.round(y);
  const se = document.scrollingElement as HTMLElement | null;
  if (se) se.scrollTop = top;
  window.scrollTo(0, top);
  document.documentElement.scrollTop = top;
  document.body.scrollTop = top;
}

export function getMaxPageScrollY(): number {
  if (typeof window === "undefined") return 0;
  const se = document.scrollingElement || document.documentElement;
  const height = Math.max(
    se?.scrollHeight || 0,
    document.documentElement?.scrollHeight || 0,
    document.body?.scrollHeight || 0,
  );
  return Math.max(0, height - window.innerHeight);
}

/**
 * Restaura Y guardado cuando el documento ya tiene altura suficiente.
 * Devuelve cleanup.
 */
export function startAdminScrollRestore(pathname?: string | null): () => void {
  if (typeof window === "undefined") return () => undefined;

  const savedY = readAdminScrollY(pathname);
  if (savedY <= 0) return () => undefined;

  let stopped = false;
  let stable = 0;
  const timers: number[] = [];
  let intervalId = 0;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    timers.forEach((id) => window.clearTimeout(id));
    if (intervalId) window.clearInterval(intervalId);
    writeAdminScrollY(Math.max(getPageScrollY(), savedY), { pathname });
  };

  const tick = () => {
    if (stopped) return;
    const max = getMaxPageScrollY();
    // Esperar a que la página tenga scroll real (no el shell vacío).
    if (max < Math.min(80, savedY * 0.25) && max < savedY - 40) {
      stable = 0;
      return;
    }
    const target = Math.min(savedY, Math.max(max, 0));
    if (target <= 0) return;
    if (Math.abs(getPageScrollY() - target) > 6) {
      setPageScrollY(target);
      stable = 0;
      return;
    }
    stable += 1;
    if (stable >= 5) stop();
  };

  tick();
  intervalId = window.setInterval(tick, 40);
  for (const ms of [0, 30, 80, 160, 300, 500, 800, 1200, 1800, 2600, 4000, 6000]) {
    timers.push(window.setTimeout(tick, ms));
  }
  timers.push(window.setTimeout(stop, 8000));

  return stop;
}
