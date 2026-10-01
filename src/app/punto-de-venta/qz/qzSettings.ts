export type QzDrawerDialect = "epson" | "star";

export type QzPosSettings = {
  printerName: string;
  drawerDialect: QzDrawerDialect;
  autoPrintOnCharge: boolean;
  openDrawerOnCash: boolean;
};

const STORAGE_KEY = "pcinbox.pos.qz.settings.v1";

/** Exportado para whitelist de prefs de equipo al limpiar sesión. */
export const QZ_SETTINGS_STORAGE_KEY = STORAGE_KEY;

export const DEFAULT_QZ_SETTINGS: QzPosSettings = {
  printerName: "",
  drawerDialect: "epson",
  autoPrintOnCharge: true,
  openDrawerOnCash: true,
};

export function loadQzSettings(): QzPosSettings {
  if (typeof window === "undefined") return { ...DEFAULT_QZ_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_QZ_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<QzPosSettings>;
    return {
      ...DEFAULT_QZ_SETTINGS,
      ...parsed,
      printerName: String(parsed.printerName || ""),
      drawerDialect:
        parsed.drawerDialect === "star" ? "star" : "epson",
      autoPrintOnCharge: parsed.autoPrintOnCharge !== false,
      openDrawerOnCash: parsed.openDrawerOnCash !== false,
    };
  } catch {
    return { ...DEFAULT_QZ_SETTINGS };
  }
}

export function saveQzSettings(patch: Partial<QzPosSettings>): QzPosSettings {
  const next = { ...loadQzSettings(), ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
