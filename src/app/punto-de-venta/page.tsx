"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  CircularProgress,
  MenuItem,
  TextField,
  type SxProps,
  type Theme,
} from "@mui/material";
import {
  Banknote,
  History,
  PenLine,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
  Wallet,
  Eye,
  ExternalLink,
  Shield,
  X,
  FileText,
  FileX2,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock3,
  ChevronRight,
  CircleDollarSign,
} from "lucide-react";
import AdminPageShell from "../shared/components/layout/AdminPageShell";
import EmptyState from "../shared/components/common/emptyState/EmptyState";
import ModernPagination from "../shared/components/common/paginator/ModernPagination";
import usePermissions from "../hooks/usePermissions";
import {
  POS_CASH_MOVEMENT_LABELS,
  POS_PAYMENT_LABELS,
  POS_PAYMENT_OPTIONS,
  POS_PHONE_LADAS,
  PosCashMovementType,
  PosPaymentMethod,
  PosProductHit,
  PosSaleStatus,
  isPosProductOutOfStock,
} from "../interfaces/pos/pos.interface";
import { formatPosBranchUiLabel } from "../interfaces/pos/posBranchDisplay";
import usePos from "./usePos";
import { formatMoney, formatQty, moneyToWordsEsMx } from "./posFormat";
import {
  getMaxWindowScrollY,
  getWindowScrollY,
  readPosScrollY,
  setWindowScrollY,
  writePosScrollY,
} from "./posScrollMemory";

import styles from "./punto-de-venta.module.css";

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    backgroundColor: "#fff",
    transition: "box-shadow 160ms ease",
    "&:hover fieldset": { borderColor: "#bb3d4b" },
    "&.Mui-focused": {
      boxShadow: "0 0 0 3px rgba(187, 61, 75, 0.16)",
    },
    "&.Mui-focused fieldset": { borderColor: "#bb3d4b" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#bb3d4b" },
};

const money = formatMoney;
const qty = formatQty;

const FALLBACK_IMG =
  "https://ik.imagekit.io/pcinboxkit/logos/logo.png?updatedAt=1759534318587";

function resolveProductImage(imageUrl: unknown): string {
  if (!imageUrl) return FALLBACK_IMG;
  if (typeof imageUrl === "string") {
    const t = imageUrl.trim();
    if (!t) return FALLBACK_IMG;
    if (t.startsWith("[") || t.startsWith("{")) {
      try {
        return resolveProductImage(JSON.parse(t));
      } catch {
        return t;
      }
    }
    return t;
  }
  if (Array.isArray(imageUrl)) {
    const first = imageUrl.find((x) => typeof x === "string" && x.trim());
    return first ? String(first) : FALLBACK_IMG;
  }
  if (typeof imageUrl === "object") {
    const values = Object.values(imageUrl as Record<string, unknown>);
    const first = values.find((x) => typeof x === "string" && String(x).trim());
    return first ? String(first) : FALLBACK_IMG;
  }
  return FALLBACK_IMG;
}

const statusBadge = (status: PosSaleStatus) => {
  if (status === "cancelled") return styles.badgeCancelled;
  if (status === "pending_payment") return styles.badgePending;
  return styles.badgeCompleted;
};

const statusLabel = (status: PosSaleStatus) => {
  if (status === "cancelled") return "Cancelada";
  if (status === "pending_payment") return "Pendiente de pago";
  return "Completada";
};

function FacturaFlag({ required }: { required: boolean }) {
  return (
    <span
      className={`${styles.facturaFlag} ${
        required ? styles.facturaFlagOn : styles.facturaFlagOff
      }`}
      title={required ? "Cliente solicitó factura" : "No se solicitó factura"}
    >
      <span className={styles.facturaFlagIcon} aria-hidden>
        {required ? (
          <FileText size={13} strokeWidth={2.4} />
        ) : (
          <FileX2 size={13} strokeWidth={2.4} />
        )}
      </span>
      <span className={styles.facturaFlagText}>
        <span className={styles.facturaFlagLabel}>
          {required ? "Factura" : "Sin factura"}
        </span>
        <span className={styles.facturaFlagHint}>
          {required ? "Solicitada" : "No requerida"}
        </span>
      </span>
    </span>
  );
}

const serialStatusLabel = (status?: string | null) => {
  const key = String(status || "")
    .trim()
    .toLowerCase();
  if (key === "sold") return "Vendido";
  if (key === "available") return "Disponible";
  if (key === "returned") return "Devuelto";
  if (key === "rma") return "En garantía (RMA)";
  if (key === "reserved") return "Reservado";
  return status || "—";
};

function productThumb(url?: string | null, className?: string) {
  const cls = className || styles.hitImg;
  const frame =
    cls === styles.hitImgLg
      ? styles.hitImgLgFrame
      : cls === styles.hitImg
        ? styles.hitImgFrame
        : null;
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={cls}
      src={url || FALLBACK_IMG}
      alt=""
      loading="lazy"
    />
  );
  return frame ? <span className={frame}>{img}</span> : img;
}

/** Campo numérico que permite vaciar al editar (sin atascarse en 0). */
function formatPosNumberDisplay(
  value: string | number,
  integer: boolean,
): string {
  if (value === "" || value === null || value === undefined) return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (integer) return formatQty(n);
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** Vista con miles mientras se escribe (draft ya sin comas). */
function formatPosNumberDraft(draft: string, integer: boolean): string {
  if (draft === "") return "";
  if (integer) {
    const digits = draft.replace(/\D/g, "");
    if (!digits) return "";
    return formatQty(Number(digits));
  }
  const cleaned = draft.replace(/,/g, "");
  if (cleaned === ".") return "0.";
  const match = cleaned.match(/^(\d*)(?:\.(\d*))?$/);
  if (!match) return draft;
  const intRaw = match[1] ?? "";
  const hasDot = cleaned.includes(".");
  const decRaw = match[2];
  const intFmt =
    intRaw === ""
      ? hasDot
        ? "0"
        : ""
      : Number(intRaw).toLocaleString("en-US");
  if (!hasDot) return intFmt;
  return `${intFmt}.${decRaw ?? ""}`;
}

function parsePosNumberInput(raw: string, integer: boolean): string {
  let v = String(raw ?? "").trim();
  if (!v) return "";
  v = v.replace(/,/g, "");
  if (!integer) {
    // ya sin comas; punto decimal
  }
  return v;
}

function PosNumberField({
  label,
  value,
  onCommit,
  integer = false,
  sx,
  fullWidth,
  className,
  emptyAs = "",
  moneyInWords,
}: {
  label: string;
  value: string | number;
  onCommit: (raw: string) => void;
  integer?: boolean;
  sx?: SxProps<Theme>;
  fullWidth?: boolean;
  className?: string;
  /** Valor a confirmar si el campo queda vacío al salir. */
  emptyAs?: string;
  /** Mostrar monto en letras debajo (default: sí si no es entero). */
  moneyInWords?: boolean;
}) {
  const committed =
    value === null || value === undefined ? "" : String(value);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(committed);

  useEffect(() => {
    if (!focused) setDraft(committed);
  }, [committed, focused]);

  // Siempre con comas en UI; al API/estado van números sin formato.
  const display = focused
    ? formatPosNumberDraft(draft, integer)
    : formatPosNumberDisplay(committed, integer);

  const showWords = moneyInWords ?? !integer;
  const liveRaw = focused ? draft : committed;
  const liveNum = Number(String(liveRaw).replace(/,/g, ""));
  const wordsLabel =
    showWords && Number.isFinite(liveNum) && String(liveRaw).trim() !== ""
      ? moneyToWordsEsMx(liveNum)
      : "";

  return (
    <div className={`${styles.posNumberField}${className ? ` ${className}` : ""}`}>
      <TextField
        size="small"
        label={label}
        fullWidth={fullWidth ?? true}
        value={display}
        onFocus={() => {
          setFocused(true);
          setDraft(committed);
        }}
        onChange={(e) => {
          let v = e.target.value.replace(/,/g, "");
          if (integer) {
            v = v.replace(/\D/g, "");
          } else if (v !== "" && !/^\d*\.?\d*$/.test(v)) {
            return;
          }
          setDraft(v);
          if (v.trim() !== "" && v !== ".") onCommit(v);
        }}
        onBlur={() => {
          setFocused(false);
          const trimmed = parsePosNumberInput(draft, integer);
          const raw = trimmed === "" || trimmed === "." ? emptyAs : trimmed;
          onCommit(raw);
        }}
        sx={sx ?? fieldSx}
        inputProps={{ inputMode: integer ? "numeric" : "decimal" }}
      />
      {showWords ? (
        <p
          className={`${styles.moneyWords}${wordsLabel ? "" : ` ${styles.moneyWordsEmpty}`}`}
          aria-live="polite"
        >
          {wordsLabel || "—"}
        </p>
      ) : null}
    </div>
  );
}

/** Evita que el guardado pise el Y mientras corre el restore. */
let posScrollRestoreLock = false;

export default function PuntoDeVentaPage() {
  const { can, hydrated } = usePermissions();
  const pos = usePos();
  const historyListRef = useRef<HTMLDivElement>(null);
  const warrantiesTableRef = useRef<HTMLDivElement>(null);
  const cashSessionsListRef = useRef<HTMLDivElement>(null);
  const cartListRef = useRef<HTMLDivElement>(null);
  const posTopSentinelRef = useRef<HTMLDivElement>(null);
  const [posTopStuck, setPosTopStuck] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualKind, setManualKind] = useState<"product" | "service">(
    "product",
  );
  const [manualServiceType, setManualServiceType] =
    useState("Mantenimiento");
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualQty, setManualQty] = useState("1");
  const [manualUpc, setManualUpc] = useState("");
  // Evita hydration mismatch de MUI TextField (useId distinto SSR vs cliente).
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    setClientReady(true);
  }, []);

  // Restore PRIMERO (useLayoutEffect): lock antes de que el saver pueda escribir 0.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    try {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
    } catch {
      /* ignore */
    }

    const savedY = readPosScrollY();
    if (savedY <= 0) return;

    let stopped = false;
    let stableHits = 0;
    let intervalId: number | undefined;
    let resizeObserver: ResizeObserver | undefined;
    const timers: number[] = [];
    posScrollRestoreLock = true;

    const stop = () => {
      if (stopped) return;
      stopped = true;
      posScrollRestoreLock = false;
      timers.forEach((id) => window.clearTimeout(id));
      timers.length = 0;
      if (intervalId) window.clearInterval(intervalId);
      intervalId = undefined;
      resizeObserver?.disconnect();
      resizeObserver = undefined;
      writePosScrollY(Math.max(getWindowScrollY(), savedY), { floor: true });
    };

    const tryRestore = () => {
      if (stopped) return;
      const targetSaved = Math.max(savedY, readPosScrollY());
      const maxScroll = getMaxWindowScrollY();
      if (maxScroll < 8) {
        stableHits = 0;
        return;
      }
      const target = Math.min(targetSaved, maxScroll);
      if (Math.abs(getWindowScrollY() - target) > 6) {
        setWindowScrollY(target);
        stableHits = 0;
        return;
      }
      stableHits += 1;
      if (maxScroll + 40 >= targetSaved && stableHits >= 10) stop();
    };

    tryRestore();
    intervalId = window.setInterval(tryRestore, 50);
    for (const ms of [
      0, 16, 50, 100, 200, 400, 700, 1100, 1600, 2200, 3000, 4500, 6500, 9000,
    ]) {
      timers.push(window.setTimeout(tryRestore, ms));
    }
    timers.push(window.setTimeout(stop, 10000));

    try {
      resizeObserver = new ResizeObserver(() => tryRestore());
      resizeObserver.observe(document.documentElement);
      if (document.body) resizeObserver.observe(document.body);
    } catch {
      /* ignore */
    }

    // Cuando el POS real monta, observar también su root.
    const rootWatch = window.setInterval(() => {
      const root = document.querySelector(".pos-page-root");
      if (root && resizeObserver) {
        try {
          resizeObserver.observe(root);
        } catch {
          /* ignore */
        }
        window.clearInterval(rootWatch);
      }
    }, 100);
    timers.push(rootWatch);

    return () => stop();
  }, []);

  // Guardar scroll (después del restore layout). Nunca pisa Y con 0 en boot.
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Si aún hay Y pendiente, mantener lock hasta que el restore lo suelte.
    if (readPosScrollY() > 0 && getWindowScrollY() < readPosScrollY() - 40) {
      posScrollRestoreLock = true;
    }

    const lastYRef = { current: Math.max(getWindowScrollY(), readPosScrollY()) };

    let raf = 0;
    const onScroll = () => {
      const y = getWindowScrollY();
      if (posScrollRestoreLock) {
        lastYRef.current = Math.max(lastYRef.current, y);
        return;
      }
      lastYRef.current = y;
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        writePosScrollY(lastYRef.current, { allowClear: true });
      });
    };

    const flush = () => {
      const y = getWindowScrollY();
      const out = y > 8 ? y : Math.max(lastYRef.current, readPosScrollY());
      if (out > 0) writePosScrollY(out, { floor: true });
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, {
      passive: true,
      capture: true,
    });
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      flush();
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Re-aplicar cuando el POS deja el shell de loading.
  useLayoutEffect(() => {
    if (!clientReady || typeof window === "undefined") return;
    const savedY = readPosScrollY();
    if (savedY <= 0) return;

    const apply = () => {
      const max = getMaxWindowScrollY();
      if (max < 8) return;
      setWindowScrollY(Math.min(readPosScrollY() || savedY, max));
    };

    apply();
    const timers = [50, 200, 600, 1200, 2000].map((ms) =>
      window.setTimeout(apply, ms),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [clientReady]);

  useEffect(() => {
    const sentinel = posTopSentinelRef.current;
    if (!sentinel) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setPosTopStuck(!entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0,
        rootMargin: "-56px 0px 0px 0px",
      },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [clientReady]);

  const SERVICE_PRESETS = [
    "Mantenimiento",
    "Revisión",
    "Armado",
    "Instalación",
    "Diagnóstico",
    "Otro",
  ] as const;

  const resetManualForm = () => {
    setManualKind("product");
    setManualServiceType("Mantenimiento");
    setManualName("");
    setManualPrice("");
    setManualQty("1");
    setManualUpc("");
  };

  const submitManual = () => {
    const price = Number(manualPrice);
    const qty = parseInt(manualQty, 10);
    const resolvedName =
      manualKind === "service"
        ? manualServiceType === "Otro"
          ? manualName
          : manualName.trim()
            ? `${manualServiceType}: ${manualName.trim()}`
            : manualServiceType
        : manualName;
    const ok = pos.addManualLine({
      name: resolvedName,
      unitPrice: price,
      quantity: Number.isFinite(qty) ? qty : 1,
      upc: manualKind === "product" ? manualUpc : undefined,
      manualKind,
    });
    if (ok) {
      resetManualForm();
      setManualOpen(false);
    }
  };

  if (!clientReady) {
    return (
      <AdminPageShell
        title="Punto de Venta"
        subtitle="Cobro en bodega con el mismo catálogo e inventario de la tienda"
      >
        <div className={`${styles.posPage} pos-page-root`}>
          <div className={styles.posLoadingShell}>
            <CircularProgress size={20} sx={{ color: "#bb3d4b" }} />
            Cargando punto de venta…
          </div>
        </div>
      </AdminPageShell>
    );
  }

  if (hydrated && !can("pos.manage")) {
    return (
      <AdminPageShell title="Punto de Venta" subtitle="Acceso restringido">
        <EmptyState
          title="Sin permiso"
          description="Tu rol no puede operar el Punto de Venta."
        />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Punto de Venta"
      subtitle="Cobro en bodega con el mismo catálogo e inventario de la tienda"
    >
      <div className={`${styles.posPage} pos-page-root`}>
        <div
          ref={posTopSentinelRef}
          className={styles.posTopSentinel}
          aria-hidden
        />
        <div
          className={`${styles.posTopSticky}${
            posTopStuck ? ` ${styles.posTopStickyStuck}` : ""
          }`}
        >
        <div className={styles.posTop}>
          <div className={styles.posTabs}>
            <button
              type="button"
              className={`${styles.posTab} ${pos.tab === "cobrar" ? styles.posTabActive : ""}`}
              onClick={() => pos.setTab("cobrar")}
            >
              <span className={styles.posTabIcon}>
                <ShoppingCart size={15} strokeWidth={2.25} />
              </span>
              Cobrar
            </button>
            <button
              type="button"
              className={`${styles.posTab} ${pos.tab === "historial" ? styles.posTabActive : ""}`}
              onClick={() => pos.setTab("historial")}
            >
              <span className={styles.posTabIcon}>
                <History size={15} strokeWidth={2.25} />
              </span>
              Historial
            </button>
            <button
              type="button"
              className={`${styles.posTab} ${pos.tab === "garantias" ? styles.posTabActive : ""}`}
              onClick={() => pos.setTab("garantias")}
            >
              <span className={styles.posTabIcon}>
                <Shield size={15} strokeWidth={2.25} />
              </span>
              Garantías
            </button>
            <button
              type="button"
              className={`${styles.posTab} ${pos.tab === "caja" ? styles.posTabActive : ""}`}
              onClick={() => pos.setTab("caja")}
            >
              <span className={styles.posTabIcon}>
                <Wallet size={15} strokeWidth={2.25} />
              </span>
              Caja
            </button>
          </div>

          <div className={styles.branchPicker}>
            <div className={styles.headerActions}>
              <span
                className={`${styles.cashStatusPill} ${
                  pos.cashLoading || pos.cashSync === "loading"
                    ? styles.cashStatusPillPending
                    : pos.cashSync === "error"
                      ? styles.cashStatusPillWarn
                      : pos.cashOpen
                        ? styles.cashStatusPillOpen
                        : styles.cashStatusPillClosed
                }`}
                title={
                  pos.cashSyncMessage ||
                  (pos.cashOpen && pos.cashSession
                    ? `Sesión #${pos.cashSession.idCashSession}`
                    : pos.cashSync === "error"
                      ? "No se pudo verificar el estado de caja"
                      : "Sin caja abierta")
                }
              >
                <span className={styles.cashStatusDot} />
                {pos.cashLoading || pos.cashSync === "loading"
                  ? "Verificando caja…"
                  : pos.cashSync === "error"
                    ? pos.cashOpen
                      ? "Caja abierta · sin verificar"
                      : "Caja sin verificar"
                    : pos.cashOpen
                      ? "Caja abierta"
                      : "Caja cerrada"}
              </span>
              {pos.cashSync === "error" ? (
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  disabled={pos.cashLoading}
                  onClick={() => void pos.loadCashStatus({ retries: 3 })}
                >
                  Reintentar
                </button>
              ) : null}
              {!(pos.cashLoading || pos.cashSync === "loading") &&
              !pos.cashOpen &&
              pos.cashSync === "ready" ? (
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => pos.setTab("caja")}
                >
                  <Wallet size={14} />
                  Abrir caja
                </button>
              ) : pos.cashOpen ? (
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => pos.setTab("caja")}
                >
                  <Wallet size={14} />
                  Ver caja
                </button>
              ) : null}
              <button
                type="button"
                className={styles.drawerBtn}
                disabled={pos.qzBusy || !pos.qzSettings.printerName}
                title={
                  pos.qzSettings.printerName
                    ? "Abre el cajón físico (sin cobrar)"
                    : "Primero elige impresora en la pestaña Caja"
                }
                onClick={() => void pos.testQzDrawer()}
              >
                <Banknote size={14} />
                Abrir cajón de dinero
              </button>
            </div>
          </div>
        </div>
        </div>

        {pos.tab === "cobrar" ? (
          <div className={styles.posTabBody}>
          <div className={styles.cobrarWorkspace}>
            {pos.cashSync === "error" && pos.branchId ? (
              <div className={styles.cashBanner}>
                <Wallet size={16} />
                <span>
                  {pos.cashSyncMessage ||
                    "No se pudo verificar el estado de la caja. No asumas que está cerrada."}
                </span>
                <div className={styles.cashBannerActions}>
                  <button
                    type="button"
                    className={styles.chargeBtn}
                    style={{ marginTop: 0, width: "auto", padding: "10px 16px" }}
                    disabled={pos.cashLoading}
                    onClick={() => void pos.loadCashStatus({ retries: 3 })}
                  >
                    {pos.cashLoading ? "Verificando…" : "Reintentar"}
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => pos.setTab("caja")}
                  >
                    Ir a Caja
                  </button>
                </div>
              </div>
            ) : null}
            {pos.cashSync === "ready" && !pos.cashOpen && pos.branchId ? (
              <div className={styles.cashBanner}>
                <Wallet size={16} />
                <span>
                  Caja cerrada. Ábrela aquí si vas a cobrar en efectivo (tarjeta
                  y transferencia no la requieren).
                </span>
                <div className={styles.cashBannerActions}>
                  <PosNumberField
                    label="Efectivo inicial (fondo)"
                    value={pos.openingFloat}
                    emptyAs="0"
                    onCommit={(raw) => pos.setOpeningFloat(raw || "0")}
                    sx={{ ...fieldSx, minWidth: 140, maxWidth: 160 }}
                  />
                  <button
                    type="button"
                    className={styles.chargeBtn}
                    style={{ marginTop: 0, width: "auto", padding: "10px 16px" }}
                    disabled={pos.cashBusy}
                    onClick={() => void pos.openCash()}
                  >
                    {pos.cashBusy ? "Abriendo…" : "Abrir caja"}
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => pos.setTab("caja")}
                  >
                    Ir a Caja
                  </button>
                </div>
              </div>
            ) : null}
            {pos.cashOpen && pos.cashExpected != null ? (
              <div className={`${styles.cashBanner} ${styles.cashBannerOk}`}>
                <Wallet size={16} />
                <span>
                  Caja abierta · esperado {money(pos.cashExpected)}
                  {pos.hasCashPayment ? " · esta venta incluye efectivo" : ""}
                </span>
              </div>
            ) : null}

            <section className={styles.customerBar} aria-label="Datos de la venta">
              <div className={styles.customerBarLabel}>
                <p className={styles.panelEyebrow}>Cliente</p>
                <h2>Datos de la venta</h2>
              </div>
              <div className={styles.customerBarFields}>
                <TextField
                  fullWidth
                  size="small"
                  label="Nombre del cliente"
                  value={pos.customerName}
                  onChange={(e) => pos.setCustomerName(e.target.value)}
                  sx={fieldSx}
                  required
                />
                <div className={styles.phoneRow}>
                  <TextField
                    select
                    size="small"
                    label="Código de país (lada)"
                    value={pos.phoneLada}
                    onChange={(e) => pos.setPhoneLada(e.target.value)}
                    className={styles.ladaSelect}
                    sx={fieldSx}
                  >
                    {POS_PHONE_LADAS.map((lada) => (
                      <MenuItem key={lada} value={lada}>
                        {lada}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    fullWidth
                    size="small"
                    label="Teléfono"
                    value={pos.guestPhone}
                    onChange={(e) => {
                      const digits = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10);
                      pos.setGuestPhone(digits);
                    }}
                    sx={fieldSx}
                    error={Boolean(pos.guestPhone.trim()) && !pos.phoneValid}
                    helperText={
                      pos.guestPhone.trim() && !pos.phoneValid
                        ? "Deben ser 10 dígitos"
                        : undefined
                    }
                    inputProps={{ inputMode: "numeric", maxLength: 10 }}
                    required
                  />
                </div>
              </div>
            </section>

            <div className={styles.cobrarColumns}>
            <section className={`${styles.posPanel} ${styles.catalogPanel}`}>
              <div className={styles.posPanelHead}>
                <div className={styles.posPanelHeadRow}>
                  <div>
                    <p className={styles.panelEyebrow}>Catálogo</p>
                    <h2>Buscar y agregar</h2>
                  </div>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => setManualOpen((v) => !v)}
                  >
                    <PenLine size={14} />
                    {manualOpen ? "Cerrar captura manual" : "Agregar sin catálogo"}
                  </button>
                </div>
              </div>
              <div className={styles.posPanelBody}>
                <div className={styles.catalogTools}>
                <div className={styles.quoteBox}>
                  <div className={styles.manualHead}>
                    <strong>Cotización</strong>
                    <span>Vigencia 5 días. Carga productos al carrito.</span>
                  </div>
                  {pos.quotePageAlert ? (
                    <div
                      className={`${styles.quotePageAlert} ${
                        pos.quotePageAlert.type === "error"
                          ? styles.quotePageAlertError
                          : pos.quotePageAlert.type === "warning"
                            ? styles.quotePageAlertWarning
                            : styles.quotePageAlertSuccess
                      }`}
                      role="alert"
                    >
                      <div>
                        <strong>{pos.quotePageAlert.title}</strong>
                        <p>{pos.quotePageAlert.message}</p>
                      </div>
                      <button
                        type="button"
                        className={styles.quoteAlertClose}
                        aria-label="Cerrar aviso"
                        onClick={pos.dismissQuotePageAlert}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : null}
                  <div className={styles.quoteRow}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Número de cotización"
                      value={pos.quoteInput}
                      onChange={(e) => pos.setQuoteInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void pos.loadQuote();
                        }
                      }}
                      sx={fieldSx}
                      placeholder="Ej. 1726060800000"
                    />
                    <button
                      type="button"
                      className={`${styles.primaryBtn} ${styles.quoteLoadBtn}`}
                      disabled={pos.quoteLoading}
                      onClick={() => void pos.loadQuote()}
                    >
                      {pos.quoteLoading ? "Cargando…" : "Cargar cotización"}
                    </button>
                  </div>
                  {pos.linkedQuoteNumber ? (
                    <div className={styles.quoteLinked}>
                      <span>
                        Cotización vinculada:{" "}
                        <strong>{pos.linkedQuoteNumber}</strong>
                      </span>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={pos.clearLinkedQuote}
                      >
                        Desvincular cotización
                      </button>
                    </div>
                  ) : null}
                </div>
                {manualOpen ? (
                  <div className={styles.manualBox}>
                    <div className={styles.manualHead}>
                      <strong>Captura sin catálogo</strong>
                      <span>
                        Producto o servicio adicional. No descuenta inventario.
                      </span>
                    </div>
                    <div className={styles.manualKindToggle} role="tablist">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={manualKind === "product"}
                        className={`${styles.manualKindBtn} ${
                          manualKind === "product"
                            ? styles.manualKindBtnActive
                            : ""
                        }`}
                        onClick={() => setManualKind("product")}
                      >
                        Producto
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={manualKind === "service"}
                        className={`${styles.manualKindBtn} ${
                          manualKind === "service"
                            ? styles.manualKindBtnActive
                            : ""
                        }`}
                        onClick={() => setManualKind("service")}
                      >
                        Servicio adicional
                      </button>
                    </div>
                    <div className={styles.manualGrid}>
                      {manualKind === "service" ? (
                        <TextField
                          select
                          fullWidth
                          size="small"
                          label="Tipo de servicio"
                          value={manualServiceType}
                          onChange={(e) =>
                            setManualServiceType(e.target.value)
                          }
                          sx={fieldSx}
                        >
                          {SERVICE_PRESETS.map((s) => (
                            <MenuItem key={s} value={s}>
                              {s}
                            </MenuItem>
                          ))}
                        </TextField>
                      ) : (
                        <TextField
                          fullWidth
                          size="small"
                          label="Nombre del artículo"
                          value={manualName}
                          onChange={(e) => setManualName(e.target.value)}
                          sx={fieldSx}
                        />
                      )}
                      {manualKind === "service" &&
                      manualServiceType === "Otro" ? (
                        <TextField
                          fullWidth
                          size="small"
                          label="Nombre del servicio"
                          value={manualName}
                          onChange={(e) => setManualName(e.target.value)}
                          placeholder="Ej. Limpieza profunda de PC"
                          sx={fieldSx}
                        />
                      ) : null}
                      <PosNumberField
                        label="Precio unitario"
                        value={manualPrice}
                        emptyAs="0"
                        onCommit={(raw) => setManualPrice(raw)}
                      />
                      <PosNumberField
                        label="Cantidad"
                        integer
                        value={manualQty}
                        emptyAs="1"
                        onCommit={(raw) => {
                          const digits = String(raw)
                            .replace(/\D/g, "")
                            .slice(0, 6);
                          setManualQty(digits || "1");
                        }}
                      />
                      {manualKind === "product" ? (
                        <TextField
                          fullWidth
                          size="small"
                          label="Código de barras (opcional)"
                          value={manualUpc}
                          onChange={(e) => setManualUpc(e.target.value)}
                          sx={fieldSx}
                        />
                      ) : null}
                    </div>
                    {manualKind === "service" &&
                    manualServiceType !== "Otro" ? (
                      <TextField
                        fullWidth
                        size="small"
                        label="Detalle (opcional)"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        placeholder="Describe el trabajo con el detalle que necesites…"
                        multiline
                        minRows={6}
                        maxRows={16}
                        sx={{
                          ...fieldSx,
                          "& .MuiInputBase-root": {
                            alignItems: "flex-start",
                          },
                        }}
                      />
                    ) : null}
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      onClick={submitManual}
                      disabled={
                        manualKind === "service"
                          ? manualServiceType === "Otro"
                            ? manualName.trim().length < 2
                            : false
                          : manualName.trim().length < 2
                      }
                    >
                      <Plus
                        size={14}
                        style={{ display: "inline", marginRight: 4 }}
                      />
                      {manualKind === "service"
                        ? "Agregar servicio"
                        : "Agregar producto"}
                    </button>
                  </div>
                ) : null}
                <div className={styles.searchBlock}>
                  <div className={styles.searchBlockHead}>
                    <strong>Catálogo</strong>
                    <span>Busca por nombre, clave o código de barras.</span>
                  </div>
                  <div className={styles.searchCombobox}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Buscar o escanear"
                    placeholder="Nombre, clave o código de barras…"
                    value={pos.search}
                    onChange={(e) => pos.setSearch(e.target.value)}
                    inputRef={pos.searchRef}
                    sx={fieldSx}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      const hit = pos.hits.find(
                        (h: PosProductHit) => !isPosProductOutOfStock(h),
                      );
                      if (!hit) {
                        e.preventDefault();
                        return;
                      }
                      e.preventDefault();
                      const stocks = hit.stocksByBranch || [];
                      if (stocks.length === 1) {
                        pos.addProduct(hit, stocks[0].branchId);
                      } else if (stocks.length > 1) {
                        const one = stocks.filter((st) => st.stock > 0);
                        if (one.length === 1) {
                          pos.addProduct(hit, one[0].branchId);
                        } else {
                          pos.addProduct(hit, hit.suggestedBranchId);
                        }
                      } else {
                        pos.addProduct(hit, null);
                      }
                    }}
                    InputProps={{
                      startAdornment: (
                        <Search
                          size={18}
                          style={{ marginRight: 8, color: "#9ca3af" }}
                        />
                      ),
                      endAdornment: pos.searching ? (
                        <CircularProgress size={18} />
                      ) : null,
                    }}
                  />
                  {pos.searching ||
                  pos.hits.length > 0 ||
                  pos.search.trim().length > 0 ? (
                    <div
                      className={styles.hitsDropdown}
                      role="listbox"
                      aria-label="Coincidencias del catálogo"
                    >
                      {pos.searching && pos.hits.length === 0 ? (
                        <div className={styles.hitsDropdownLoading}>
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div key={`sk-${i}`} className={styles.hitSkeleton}>
                              <div className={styles.hitSkeletonImg} />
                              <div className={styles.hitSkeletonBody}>
                                <div className={styles.hitSkeletonLine} />
                                <div className={styles.hitSkeletonLineShort} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : pos.hits.length === 0 ? (
                        <div className={styles.hitsDropdownEmpty}>
                          Sin coincidencias. Prueba otro término o «Agregar sin
                          catálogo».
                        </div>
                      ) : (
                        <div className={styles.hits}>
                          {pos.hits.map((hit: PosProductHit) => {
                      const img = resolveProductImage(hit.image_url);
                      const stocks = hit.stocksByBranch || [];
                      const outOfStock = isPosProductOutOfStock(hit);
                      const stockTotal =
                        stocks.length > 0
                          ? stocks.reduce(
                              (sum, st) =>
                                sum + Math.max(0, Number(st.stock) || 0),
                              0,
                            )
                          : Number(hit.stockGlobal) || 0;
                      const singleBranch =
                        stocks.length === 1 ? stocks[0] : null;
                      const multiBranch = stocks.length > 1;
                      const metaBits = [
                        hit.sku ? `SKU ${hit.sku}` : null,
                        hit.upc ? `UPC ${hit.upc}` : null,
                        hit.category || null,
                      ].filter(Boolean);

                      const addFromHit = () => {
                        if (outOfStock) return;
                        if (stocks.length === 1) {
                          pos.addProduct(hit, stocks[0].branchId);
                        } else if (stocks.length > 1) {
                          const one = stocks.filter((st) => st.stock > 0);
                          if (one.length === 1) {
                            pos.addProduct(hit, one[0].branchId);
                          } else {
                            pos.addProduct(hit, hit.suggestedBranchId);
                          }
                        } else {
                          pos.addProduct(hit, null);
                        }
                      };

                      return (
                        <article
                          key={hit.idProduct}
                          className={`${styles.hitCard} ${
                            outOfStock ? styles.hitCardOutOfStock : ""
                          }`}
                        >
                          <button
                            type="button"
                            className={styles.hitMain}
                            disabled={outOfStock}
                            title={
                              outOfStock
                                ? "Sin existencia — no se puede agregar"
                                : multiBranch
                                  ? "Elige una bodega, o clic para la sugerida"
                                  : "Agregar al carrito"
                            }
                            aria-disabled={outOfStock}
                            onClick={addFromHit}
                          >
                            <div className={styles.hitMedia}>
                              <div className={styles.hitMediaImg}>
                                {productThumb(img, styles.hitImgLg)}
                              </div>
                              {outOfStock ? (
                                <span className={styles.hitMediaBadge}>
                                  Agotado
                                </span>
                              ) : null}
                            </div>

                            <div className={styles.hitBody}>
                              <h3
                                className={styles.hitTitle}
                                title={
                                  hit.name || `Producto #${hit.idProduct}`
                                }
                              >
                                {hit.name || `Producto #${hit.idProduct}`}
                              </h3>

                              <div className={styles.hitMetaRow}>
                                {outOfStock ? (
                                  <span className={styles.chipOutOfStock}>
                                    Sin stock
                                  </span>
                                ) : null}
                                {hit.providerName ? (
                                  <span
                                    className={styles.chip}
                                    title={hit.providerName}
                                  >
                                    {hit.providerName}
                                  </span>
                                ) : null}
                                {hit.marca ? (
                                  <span
                                    className={styles.chipMuted}
                                    title={hit.marca}
                                  >
                                    {hit.marca}
                                  </span>
                                ) : null}
                              </div>

                              {metaBits.length > 0 ? (
                                <p className={styles.hitMeta}>
                                  {metaBits.join("  ·  ")}
                                </p>
                              ) : null}

                              {!multiBranch &&
                              singleBranch &&
                              !outOfStock ? (
                                <div className={styles.hitStockLine}>
                                  <span>
                                    {formatPosBranchUiLabel({
                                      name: singleBranch.name,
                                      label: singleBranch.label,
                                      city: singleBranch.city,
                                      fallback: String(singleBranch.branchId),
                                    })}
                                  </span>
                                  <span className={styles.hitStockQty}>
                                    {singleBranch.stock}
                                  </span>
                                </div>
                              ) : null}

                              {!multiBranch &&
                              !singleBranch &&
                              !outOfStock ? (
                                <div className={styles.hitStockLine}>
                                  <span>Disponible</span>
                                  <span className={styles.hitStockQty}>
                                    {stockTotal}
                                  </span>
                                </div>
                              ) : null}
                            </div>

                            <div className={styles.hitSide}>
                              <div className={styles.hitPriceBlock}>
                                <div className={styles.hitPrice}>
                                  {money(hit.price)}
                                </div>
                              </div>
                              <span
                                className={
                                  outOfStock
                                    ? styles.hitCtaDisabled
                                    : styles.hitCta
                                }
                              >
                                {outOfStock ? (
                                  "Agotado"
                                ) : (
                                  <>
                                    <Plus size={15} strokeWidth={2.5} />
                                    Agregar
                                  </>
                                )}
                              </span>
                            </div>
                          </button>

                          {multiBranch ? (
                            <div className={styles.hitBranchRow}>
                              {stocks.map((st) => {
                                const empty = st.stock <= 0;
                                return (
                                  <button
                                    key={st.branchId}
                                    type="button"
                                    className={`${styles.hitBranch} ${
                                      empty ? styles.hitBranchEmpty : ""
                                    }`}
                                    disabled={empty || outOfStock}
                                    onClick={() =>
                                      pos.addProduct(hit, st.branchId)
                                    }
                                  >
                                    <span className={styles.hitBranchName}>
                                      {formatPosBranchUiLabel({
                                        name: st.name,
                                        label: st.label,
                                        city: st.city,
                                        fallback: String(st.branchId),
                                      })}
                                    </span>
                                    <span className={styles.hitBranchQty}>
                                      {st.stock}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                        </div>
                      )}
                    </div>
                  ) : null}
                  </div>
                </div>
                </div>
              </div>
            </section>

            <aside className={`${styles.posPanel} ${styles.cartPanel}`}>
              <div className={styles.posPanelHead}>
                <div className={styles.posPanelHeadRow}>
                  <div>
                    <p className={styles.panelEyebrow}>Cobro</p>
                    <h2>
                      <ShoppingCart size={18} strokeWidth={2.25} />
                      Carrito
                    </h2>
                    <p>
                      {pos.cart.length === 0
                        ? "Sin productos todavía"
                        : `${pos.cart.length} línea${pos.cart.length === 1 ? "" : "s"} · ${money(pos.totals.total)}`}
                    </p>
                  </div>
                </div>
              </div>
              <div className={styles.cartPanelBody}>
                <div className={styles.cartPanelScroll}>
                {pos.cart.length === 0 ? (
                  <div className={styles.cartEmpty}>
                    <EmptyState
                      compact
                      icon="orders"
                      title="Carrito vacío"
                      description="Agrega productos desde el buscador."
                    />
                  </div>
                ) : (
                  <>
                    <TextField
                      size="small"
                      label="Buscar en el carrito"
                      placeholder="Nombre, SKU, UPC o serie…"
                      value={pos.cartSearch}
                      onChange={(e) => pos.setCartSearch(e.target.value)}
                      fullWidth
                      sx={fieldSx}
                      InputProps={{
                        startAdornment: (
                          <Search
                            size={16}
                            strokeWidth={2.25}
                            style={{ marginRight: 8, color: "#78716c" }}
                          />
                        ),
                      }}
                    />
                    {pos.cartFilteredTotal === 0 ? (
                      <EmptyState
                        compact
                        icon="orders"
                        title="Sin coincidencias"
                        description="Prueba otro término o limpia la búsqueda."
                      />
                    ) : (
                      <>
                        {pos.cartFilteredTotal > 0 ? (
                          <div className={styles.cartPager}>
                            <ModernPagination
                              page={pos.cartPage}
                              pageCount={Math.max(pos.cartTotalPages, 1)}
                              totalItems={pos.cartFilteredTotal}
                              pageSize={pos.cartPageSize}
                              label="líneas"
                              scrollOnChange={false}
                              onPageChange={(p) => pos.goCartPage(p)}
                            />
                          </div>
                        ) : null}
                        <div ref={cartListRef} className={styles.cartList}>
                          {pos.cartPageItems.map((line) => (
                      <div key={line.key} className={styles.cartCard}>
                        <div className={styles.cartCardHead}>
                          {productThumb(
                            resolveProductImage(line.imageUrl),
                            styles.cartImg,
                          )}
                          <div className={styles.cartCardInfo}>
                            <div className={styles.cartLineName}>
                              {line.name}
                              {line.isManual ? (
                                <span
                                  className={`${styles.manualBadge} ${
                                    line.manualKind === "service"
                                      ? styles.manualBadgeService
                                      : ""
                                  }`}
                                >
                                  {line.manualKind === "service"
                                    ? "Servicio"
                                    : "Sin catálogo"}
                                </span>
                              ) : null}
                            </div>
                            <div className={styles.hitMeta}>
                              {[
                                line.sku && `SKU ${line.sku}`,
                                line.upc && `UPC ${line.upc}`,
                                line.branchLabel &&
                                  formatPosBranchUiLabel({
                                    label: line.branchLabel,
                                    name: line.stocksByBranch?.find(
                                      (s) => s.branchId === line.branchId,
                                    )?.name,
                                  }),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                            {line.isManual ? (
                              <div className={styles.cartUnitPriceEdit}>
                                <PosNumberField
                  label="Precio por unidad"
                                  value={line.unitPrice}
                                  emptyAs="0"
                                  onCommit={(raw) => {
                                    const n = Number(raw);
                                    pos.updateLine(line.key, {
                                      unitPrice:
                                        Number.isFinite(n) && n >= 0 ? n : 0,
                                    });
                                  }}
                                />
                              </div>
                            ) : (
                              <div className={styles.cartUnitPrice}>
                                <span className={styles.cartUnitPriceLabel}>
                                  Precio
                                </span>
                                <span className={styles.cartUnitPriceValue}>
                                  {money(line.unitPrice)}
                                </span>
                                <span className={styles.cartUnitPriceHint}>
                                  por unidad
                                </span>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            className={styles.dangerBtn}
                            onClick={() => pos.removeLine(line.key)}
                            aria-label="Quitar del carrito"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {line.isManual ? (
                          <p
                            className={styles.hitMeta}
                            style={{ marginBottom: 8 }}
                          >
                            {line.manualKind === "service"
                              ? "Servicio adicional · no descuenta inventario"
                              : "Captura manual · no descuenta inventario"}
                          </p>
                        ) : line.stocksByBranch?.length ? (
                          <TextField
                            select
                            fullWidth
                            size="small"
                            label="Bodega de origen"
                            value={line.branchId ?? ""}
                            onChange={(e) => {
                              const branchId = Number(e.target.value);
                              const st = line.stocksByBranch.find(
                                (s) => s.branchId === branchId,
                              );
                              pos.updateLine(line.key, {
                                branchId,
                                branchLabel: formatPosBranchUiLabel({
                                  name: st?.name,
                                  label: st?.label,
                                  city: st?.city,
                                }),
                                stockBranch: st?.stock ?? 0,
                              });
                            }}
                            sx={{ ...fieldSx, mb: 1 }}
                          >
                            {line.stocksByBranch.map((st) => (
                              <MenuItem
                                key={st.branchId}
                                value={st.branchId}
                                disabled={st.stock <= 0}
                              >
                                {formatPosBranchUiLabel({
                                  name: st.name,
                                  label: st.label,
                                  city: st.city,
                                })}{" "}
                                ({st.stock})
                              </MenuItem>
                            ))}
                          </TextField>
                        ) : (
                          <p
                            className={styles.hitMeta}
                            style={{ marginBottom: 8 }}
                          >
                            Existencia general (sin bodega)
                          </p>
                        )}
                        <div className={styles.cartControls}>
                          <PosNumberField
                            label="Cantidad"
                            integer
                            value={line.quantity}
                            emptyAs="1"
                            onCommit={(raw) => {
                              let n = parseInt(raw, 10);
                              if (!Number.isFinite(n) || n < 1) n = 1;
                              pos.updateLine(line.key, {
                                quantity: n,
                              });
                            }}
                          />
                        </div>
                        <div className={styles.cartLineTotal}>
                          <span>Importe de línea</span>
                          <strong>
                            {money(
                              pos.lineTotal(
                                line.unitPrice,
                                line.quantity,
                                0,
                              ),
                            )}
                          </strong>
                        </div>
                        <div className={styles.serialBlock}>
                          <div className={styles.serialHead}>
                            <span>
                              {line.requiresSerial
                                ? "Números de serie (obligatorio)"
                                : "Números de serie (opcional)"}
                            </span>
                            {pos.isAdmin || line.isManual ? (
                              <button
                                type="button"
                                className={styles.secondaryBtn}
                                onClick={() =>
                                  void pos.toggleRequiresSerial(
                                    line.key,
                                    line.productId,
                                    !line.requiresSerial,
                                  )
                                }
                              >
                                {line.requiresSerial
                                  ? "Serie opcional"
                                  : "Serie obligatoria"}
                              </button>
                            ) : null}
                          </div>
                          {Array.from({ length: line.quantity }).map((_, i) => (
                            <TextField
                              key={`${line.key}-sn-${i}`}
                              size="small"
                              fullWidth
                              label={`Número de serie ${i + 1}`}
                              value={line.serials[i] || ""}
                              onChange={(e) =>
                                pos.setLineSerial(
                                  line.key,
                                  i,
                                  e.target.value,
                                )
                              }
                              sx={{ ...fieldSx, mt: 0.75 }}
                              required={line.requiresSerial}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                        </div>
                        {pos.cartFilteredTotal > 0 ? (
                          <div className={styles.cartPager}>
                            <ModernPagination
                              page={pos.cartPage}
                              pageCount={Math.max(pos.cartTotalPages, 1)}
                              totalItems={pos.cartFilteredTotal}
                              pageSize={pos.cartPageSize}
                              label="líneas"
                              scrollTargetRef={cartListRef}
                              onPageChange={(p) => pos.goCartPage(p)}
                            />
                          </div>
                        ) : null}
                      </>
                    )}
                  </>
                )}
                </div>

                <div className={styles.cartFooterFixed}>
                <div className={styles.cartCheckoutBlock}>
                  <div className={styles.totalsBox}>
                    <div className={styles.totalsRow}>
                      <span>Subtotal</span>
                      <span>{money(pos.totals.subtotal)}</span>
                    </div>
                    <div className={styles.totalsRow}>
                      <span>Pagado</span>
                      <span>{money(pos.settlement.paidApplied)}</span>
                    </div>
                    <div className={styles.totalsRow}>
                      <span>Falta por pagar</span>
                      <strong
                        className={
                          pos.remaining > 0.009
                            ? styles.totalsWarn
                            : styles.totalsOk
                        }
                      >
                        {money(pos.remaining)}
                      </strong>
                    </div>
                    {pos.changeDue > 0.009 ? (
                      <div className={styles.totalsRow}>
                        <span>Cambio</span>
                        <strong className={styles.totalsOk}>
                          {money(pos.changeDue)}
                        </strong>
                      </div>
                    ) : null}
                    <div className={styles.totalsGrand}>
                      <span>Total</span>
                      <span>{money(pos.totals.total)}</span>
                    </div>
                  </div>

                  <div className={styles.checkoutZone}>
                    <div className={styles.toolbarRow}>
                      <strong className={styles.checkoutZoneTitle}>
                        <Banknote size={14} /> Formas de pago
                      </strong>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => pos.addPayment("efectivo_sucursal")}
                      >
                        <Plus size={14} />
                        Agregar pago
                      </button>
                    </div>
                    {pos.payments.length > 0 ? (
                      <div className={styles.payList}>
                        {pos.payments.map((p) => (
                          <div key={p.id} className={styles.payLine}>
                            <TextField
                              select
                              size="small"
                              label="Forma de pago"
                              value={p.method}
                              onChange={(e) =>
                                pos.updatePayment(p.id, {
                                  method: e.target.value as PosPaymentMethod,
                                })
                              }
                              className={styles.payLineMethod}
                              fullWidth
                              sx={fieldSx}
                            >
                              {POS_PAYMENT_OPTIONS.map((m) => (
                                <MenuItem key={m} value={m}>
                                  {POS_PAYMENT_LABELS[m]}
                                </MenuItem>
                              ))}
                            </TextField>
                            <PosNumberField
                              className={styles.payLineAmount}
                              label={
                                p.method === "efectivo_sucursal"
                                  ? "Efectivo recibido"
                                  : "Monto a cobrar"
                              }
                              value={p.amount}
                              emptyAs="0"
                              moneyInWords={false}
                              onCommit={(raw) => {
                                const n = Number(raw);
                                pos.updatePayment(p.id, {
                                  amount: Number.isFinite(n) && n >= 0 ? n : 0,
                                });
                              }}
                            />
                            <TextField
                              size="small"
                              label="Referencia"
                              value={p.reference}
                              onChange={(e) =>
                                pos.updatePayment(p.id, {
                                  reference: e.target.value,
                                })
                              }
                              className={styles.payLineReference}
                              fullWidth
                              sx={fieldSx}
                            />
                            <div className={styles.payLineRemove}>
                              <button
                                type="button"
                                className={styles.dangerBtn}
                                onClick={() => pos.removePayment(p.id)}
                                aria-label="Quitar forma de pago"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.payHint}>
                        Agrega al menos una forma de pago para cobrar.
                      </p>
                    )}

                    <label
                      className={`${styles.facturaCheck} ${
                        pos.requiredFactura ? styles.facturaCheckActive : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={pos.requiredFactura}
                        onChange={(e) =>
                          pos.setRequiredFactura(e.target.checked)
                        }
                      />
                      <span className={styles.facturaCheckBody}>
                        <span className={styles.facturaCheckTitle}>
                          <FileText size={15} strokeWidth={2.4} />
                          Requiere factura
                        </span>
                        <span className={styles.facturaCheckHint}>
                          {pos.requiredFactura
                            ? "Esta venta quedará marcada para facturar"
                            : "Actívalo si el cliente necesita factura"}
                        </span>
                      </span>
                    </label>

                    <TextField
                      className={styles.saleNotesField}
                      fullWidth
                      size="small"
                      label="Notas de la venta"
                      value={pos.notes}
                      onChange={(e) => pos.setNotes(e.target.value)}
                      multiline
                      minRows={3}
                      maxRows={8}
                      placeholder="Observaciones de la venta (opcional)"
                      sx={fieldSx}
                    />
                  </div>
                </div>

                <div className={styles.cartChargeBar}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={pos.requestClearCart}
                    disabled={pos.cart.length === 0}
                  >
                    Vaciar carrito
                  </button>
                  <button
                    type="button"
                    className={styles.chargeBtn}
                    disabled={
                      pos.charging ||
                      pos.cart.length === 0 ||
                      !pos.customerName.trim() ||
                      !pos.guestPhone.trim() ||
                      !pos.phoneValid ||
                      pos.payments.length === 0 ||
                      !pos.settlement.balanced
                    }
                    onClick={() => {
                      (document.activeElement as HTMLElement | null)?.blur?.();
                      void pos.charge();
                    }}
                  >
                    {pos.charging
                      ? "Registrando venta…"
                      : pos.remaining > 0.009
                        ? `Falta ${money(pos.remaining)}`
                        : pos.changeDue > 0.009
                          ? `Cobrar · cambio ${money(pos.changeDue)}`
                          : `Cobrar ${money(pos.totals.total)}`}
                  </button>
                </div>
                </div>

                {pos.lastSale ? (
                  <div className={styles.postSaleBar}>
                    <div className={styles.postSaleInfo}>
                      <strong>Última venta {pos.lastSale.folio}</strong>
                      <span>
                        {money(pos.lastSale.total)} ·{" "}
                        {statusLabel(pos.lastSale.status)}
                        {pos.lastSale.quoteNumber
                          ? ` · Cotización ${pos.lastSale.quoteNumber}`
                          : ""}
                      </span>
                    </div>
                    <div className={styles.postSaleActions}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() =>
                          pos.openTicket(pos.lastSale!.idPosSale)
                        }
                      >
                        <Printer size={14} />
                        Imprimir ticket
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => pos.setTicketOpen(true)}
                      >
                        Ver resumen
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </aside>
            </div>
          </div>
          </div>
        ) : pos.tab === "caja" ? (
          <div className={`${styles.posTabBody} ${styles.cashLayout}`}>
            <section className={styles.cashPanel}>
              <div className={styles.cashPanelHead}>
                <div className={styles.cashPanelHeadRow}>
                  <div>
                    <p className={styles.panelEyebrow}>Efectivo</p>
                    <h2>
                      <Wallet size={20} strokeWidth={2.25} />
                      Control de caja
                    </h2>
                    <p>
                      Abre con fondo, registra entradas/salidas y cierra con
                      corte. Obligatorio para cobros en efectivo.
                    </p>
                  </div>
                  {pos.branchId &&
                  !(pos.cashLoading || pos.cashSync === "loading") ? (
                    <span
                      className={`${styles.cashLivePill} ${
                        pos.cashOpen
                          ? styles.cashLivePillOpen
                          : styles.cashLivePillClosed
                      }`}
                    >
                      <span className={styles.cashLiveDot} />
                      {pos.cashOpen ? "Sesión abierta" : "Caja cerrada"}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className={styles.cashPanelBody}>
                {!pos.branchId ? (
                  <EmptyState
                    title="Caja no disponible"
                    description="No se pudo resolver la bodega de cobro. Recarga la página o revisa que exista la bodega leon2."
                  />
                ) : pos.cashLoading || pos.cashSync === "loading" ? (
                  <div className={styles.cashLoadingBlock}>
                    <CircularProgress sx={{ color: "#bb3d4b" }} />
                    <p>Verificando si hay caja abierta…</p>
                  </div>
                ) : pos.cashSync === "error" && !pos.cashOpen ? (
                  <div className={styles.cashClosedCard}>
                    <EmptyState
                      title="No se pudo verificar la caja"
                      description={
                        pos.cashSyncMessage ||
                        "Un fallo de red no significa que la caja esté cerrada. Reintenta antes de abrir otra sesión."
                      }
                    />
                    <button
                      type="button"
                      className={styles.chargeBtn}
                      disabled={pos.cashLoading}
                      onClick={() => void pos.loadCashStatus({ retries: 3 })}
                    >
                      {pos.cashLoading
                        ? "Verificando…"
                        : "Reintentar verificación"}
                    </button>
                    <p className={styles.cashHint}>
                      Si acabas de abrir caja y ves esto, no abras otra:
                      reintenta o espera unos segundos.
                    </p>
                  </div>
                ) : !pos.cashOpen ? (
                  <div className={styles.cashClosedCard}>
                    <div>
                      <h3>Abrir turno de caja</h3>
                      <p>
                        Indica el fondo inicial en efectivo para empezar a
                        cobrar en mostrador.
                      </p>
                    </div>
                    <PosNumberField
                      label="Efectivo inicial (fondo)"
                      value={pos.openingFloat}
                      emptyAs=""
                      onCommit={(raw) => pos.setOpeningFloat(raw)}
                      sx={{ ...fieldSx, maxWidth: 260 }}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Notas (opcional)"
                      value={pos.cashNotes}
                      onChange={(e) => pos.setCashNotes(e.target.value)}
                      sx={fieldSx}
                    />
                    <button
                      type="button"
                      className={styles.chargeBtn}
                      disabled={pos.cashBusy}
                      onClick={() => void pos.openCash()}
                    >
                      {pos.cashBusy ? "Abriendo…" : "Abrir caja"}
                    </button>
                  </div>
                ) : (
                  <div className={styles.cashForm}>
                    {pos.cashSync === "error" ? (
                      <div
                        className={styles.cashBanner}
                        style={{ marginBottom: 0 }}
                      >
                        <Wallet size={16} />
                        <span>
                          {pos.cashSyncMessage ||
                            "Sesión abierta según el último dato local; no se pudo confirmar con el servidor."}
                        </span>
                        <div className={styles.cashBannerActions}>
                          <button
                            type="button"
                            className={styles.secondaryBtn}
                            disabled={pos.cashLoading}
                            onClick={() =>
                              void pos.loadCashStatus({ retries: 3 })
                            }
                          >
                            Reintentar
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className={styles.cashHero}>
                      <div className={styles.cashHeroTop}>
                        <div>
                          <p className={styles.cashHeroLabel}>
                            Efectivo esperado
                          </p>
                          <p className={styles.cashHeroAmount}>
                            {money(pos.cashExpected ?? 0)}
                          </p>
                        </div>
                        <div className={styles.cashHeroIcon} aria-hidden>
                          <CircleDollarSign size={22} strokeWidth={2.25} />
                        </div>
                      </div>
                      <div className={styles.cashMetaGrid}>
                        <div className={styles.cashMetaChip}>
                          <span>Sesión</span>
                          <strong>#{pos.cashSession?.idCashSession}</strong>
                        </div>
                        <div className={styles.cashMetaChip}>
                          <span>Abierta por</span>
                          <strong>
                            {pos.cashSession?.openedByName || "—"}
                          </strong>
                        </div>
                        <div className={styles.cashMetaChip}>
                          <span>Desde</span>
                          <strong>
                            {pos.cashSession?.openedAt
                              ? new Date(
                                  pos.cashSession.openedAt,
                                ).toLocaleString("es-MX")
                              : "—"}
                          </strong>
                        </div>
                        <div className={styles.cashMetaChip}>
                          <span>Fondo inicial</span>
                          <strong>
                            {money(pos.cashSession?.openingFloat || 0)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {pos.cashPaymentSummary ? (
                      <>
                        <h3 className={styles.cashSubhead}>
                          <Banknote size={14} />
                          Ventas del turno
                        </h3>
                        <div className={styles.cashStatGrid}>
                          <div className={styles.cashStatCard}>
                            <span>Ventas</span>
                            <strong>
                              {qty(pos.cashPaymentSummary.salesCount)}
                            </strong>
                          </div>
                          <div className={styles.cashStatCard}>
                            <span>Total cobrado</span>
                            <strong>
                              {money(pos.cashPaymentSummary.salesTotal)}
                            </strong>
                          </div>
                          {(
                            Object.entries(
                              pos.cashPaymentSummary.byMethod || {},
                            ) as [string, number][]
                          )
                            .filter(([, amount]) => Number(amount) > 0)
                            .map(([method, amount]) => (
                              <div
                                className={`${styles.cashStatCard} ${
                                  method === "efectivo_sucursal"
                                    ? styles.cashStatCardCash
                                    : ""
                                }`}
                                key={method}
                              >
                                <span>
                                  {POS_PAYMENT_LABELS[
                                    method as keyof typeof POS_PAYMENT_LABELS
                                  ] || method}
                                </span>
                                <strong>{money(amount)}</strong>
                              </div>
                            ))}
                          {(pos.cashPaymentSummary.cancelledCount || 0) > 0 ? (
                            <div className={styles.cashStatCard}>
                              <span>Canceladas</span>
                              <strong>
                                {pos.cashPaymentSummary.cancelledCount}
                              </strong>
                            </div>
                          ) : null}
                        </div>
                        <p className={styles.cashHint}>
                          El efectivo esperado del cajón usa: fondo + entradas +
                          ventas en efectivo − salidas − cancelaciones.
                        </p>
                      </>
                    ) : null}

                    <div className={styles.cashActionCard}>
                      <div className={styles.cashActionCardHead}>
                        <div>
                          <h3>Movimientos de efectivo</h3>
                          <p>
                            Solo cuando el dinero entra o sale del cajón sin
                            cobrar un producto.
                          </p>
                        </div>
                        <span className={styles.cashActionBadge}>Sin venta</span>
                      </div>
                      <div className={styles.cashMoveGrid}>
                        <PosNumberField
                          label="Monto en efectivo ($)"
                          value={pos.cashMoveAmount}
                          emptyAs=""
                          onCommit={(raw) => pos.setCashMoveAmount(raw)}
                        />
                        <TextField
                          size="small"
                          label="Motivo del movimiento"
                          placeholder="Ej. Fondo extra / gasto de papelería"
                          value={pos.cashMoveReason}
                          onChange={(e) =>
                            pos.setCashMoveReason(e.target.value)
                          }
                          helperText="Obligatorio. Explica por qué (mín. 5 caracteres)."
                          sx={fieldSx}
                        />
                      </div>
                      <div className={styles.cashMoveActions}>
                        <button
                          type="button"
                          className={styles.cashMoveBtnIn}
                          disabled={pos.cashBusy}
                          onClick={() => void pos.addCashMovement("cash_in")}
                          title="Suma dinero al cajón (no es una venta)"
                        >
                          <ArrowDownToLine size={16} strokeWidth={2.4} />
                          Meter efectivo
                        </button>
                        <button
                          type="button"
                          className={styles.cashMoveBtnOut}
                          disabled={pos.cashBusy}
                          onClick={() => void pos.addCashMovement("cash_out")}
                          title="Quita dinero del cajón (no es cancelación de venta)"
                        >
                          <ArrowUpFromLine size={16} strokeWidth={2.4} />
                          Sacar efectivo
                        </button>
                      </div>
                    </div>

                    <div className={styles.cashActionCard}>
                      <div className={styles.cashActionCardHead}>
                        <div>
                          <h3>Corte de caja</h3>
                          <p>
                            Cuenta el efectivo del cajón y cierra el turno.
                          </p>
                        </div>
                        <span className={styles.cashActionBadge}>Cierre</span>
                      </div>
                      <PosNumberField
                        label="Efectivo contado"
                        value={pos.closingCounted}
                        emptyAs=""
                        onCommit={(raw) => pos.setClosingCounted(raw)}
                        sx={{ ...fieldSx, maxWidth: 260 }}
                      />
                      {(() => {
                        const counted = Number(pos.closingCounted);
                        const expected = Number(pos.cashExpected ?? 0);
                        if (
                          !Number.isFinite(counted) ||
                          pos.closingCounted === ""
                        )
                          return null;
                        const diff =
                          Math.round(
                            (counted - expected + Number.EPSILON) * 100,
                          ) / 100;
                        const hasDiff = Math.abs(diff) > 0.009;
                        return (
                          <div className={styles.cashDiffBox}>
                            <div className={styles.cashDiffRow}>
                              <span>Esperado</span>
                              <strong>{money(expected)}</strong>
                            </div>
                            <div className={styles.cashDiffRow}>
                              <span>Contado</span>
                              <strong>{money(counted)}</strong>
                            </div>
                            <div
                              className={`${styles.cashDiffGrand} ${
                                hasDiff
                                  ? styles.cashDiffWarn
                                  : styles.cashDiffOk
                              }`}
                            >
                              <span>Diferencia</span>
                              <span>
                                {money(diff)}
                                {hasDiff
                                  ? diff > 0
                                    ? " (sobra)"
                                    : " (falta)"
                                  : " (cuadrado)"}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                      {(() => {
                        const counted = Number(pos.closingCounted);
                        const expected = Number(pos.cashExpected ?? 0);
                        const hasDiff =
                          pos.closingCounted !== "" &&
                          Number.isFinite(counted) &&
                          Math.abs(counted - expected) > 0.009;
                        if (!hasDiff) return null;
                        return (
                          <TextField
                            fullWidth
                            size="small"
                            required
                            label="Motivo del descuadre"
                            value={pos.differenceReason}
                            onChange={(e) =>
                              pos.setDifferenceReason(e.target.value)
                            }
                            helperText="Obligatorio si contado ≠ esperado (mín. 5 caracteres)."
                            sx={fieldSx}
                          />
                        );
                      })()}
                      <TextField
                        fullWidth
                        size="small"
                        label="Notas de cierre (opcional)"
                        value={pos.cashNotes}
                        onChange={(e) => pos.setCashNotes(e.target.value)}
                        sx={fieldSx}
                      />
                      <button
                        type="button"
                        className={styles.chargeBtn}
                        disabled={pos.cashBusy}
                        onClick={() => void pos.closeCash()}
                      >
                        {pos.cashBusy ? "Cerrando…" : "Cerrar caja (corte)"}
                      </button>
                    </div>

                    {(pos.cashSession?.movements?.length || 0) > 0 ? (
                      <>
                        <h3 className={styles.cashSubhead}>
                          <Clock3 size={14} />
                          Movimientos de la sesión
                        </h3>
                        <div
                          className={`${styles.scrollPanelSm} ${styles.cashMovementsTableWrap}`}
                        >
                          <table className={styles.historyTable}>
                            <thead>
                              <tr>
                                <th>Hora</th>
                                <th>Tipo</th>
                                <th>Monto</th>
                                <th>Motivo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pos.cashSession!.movements!.map((m) => (
                                <tr key={m.idCashMovement}>
                                  <td>
                                    {new Date(m.createdAt).toLocaleTimeString(
                                      "es-MX",
                                    )}
                                  </td>
                                  <td>
                                    {POS_CASH_MOVEMENT_LABELS[
                                      m.type as PosCashMovementType
                                    ] || m.type}
                                  </td>
                                  <td>{money(m.amount)}</td>
                                  <td>{m.reason || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            </section>

            <section
              className={`${styles.cashPanel} ${styles.cashSessionsPanel}`}
            >
              <div className={styles.cashPanelHead}>
                <p className={styles.panelEyebrow}>Turnos</p>
                <h2>Sesiones recientes</h2>
                <p>
                  Historial de aperturas y cortes. Clic en una fila para ver
                  movimientos.
                </p>
              </div>
              <div className={styles.cashPanelBody}>
                {!pos.branchId ? (
                  <EmptyState
                    title="Caja no disponible"
                    description="No se pudo resolver la bodega de cobro."
                  />
                ) : pos.cashSessionsLoading && pos.cashSessions.length === 0 ? (
                  <EmptyState
                    title="Cargando…"
                    description="Consultando sesiones de caja."
                  />
                ) : pos.cashSessions.length === 0 ? (
                  <EmptyState
                    title="Sin sesiones"
                    description="Aún no hay aperturas ni cortes. Abre caja a la izquierda para empezar el turno."
                  />
                ) : (
                  <>
                    {pos.cashSessionsTotal > 0 ? (
                      <div style={{ marginBottom: 12 }}>
                        <ModernPagination
                          page={pos.cashSessionsPage}
                          pageCount={Math.max(pos.cashSessionsTotalPages, 1)}
                          totalItems={pos.cashSessionsTotal}
                          pageSize={10}
                          scrollOnChange={false}
                          onPageChange={(p) => pos.goCashSessionsPage(p)}
                        />
                      </div>
                    ) : null}
                    <div
                      ref={cashSessionsListRef}
                      className={styles.cashSessionList}
                    >
                      {pos.cashSessions.map((s) => {
                        const diff = s.difference != null ? Number(s.difference) : null;
                        const hasDiff =
                          diff != null && Math.abs(diff) > 0.009;
                        return (
                          <button
                            type="button"
                            key={s.idCashSession}
                            className={styles.cashSessionRow}
                            onClick={() =>
                              void pos.openCashSessionDetail(s.idCashSession)
                            }
                            title="Ver detalle de movimientos"
                          >
                            <span className={styles.cashSessionId}>
                              #{s.idCashSession}
                            </span>
                            <div className={styles.cashSessionMain}>
                              <strong>
                                <Clock3 size={13} strokeWidth={2.4} />
                                {new Date(s.openedAt).toLocaleString("es-MX")}
                              </strong>
                              <span>
                                {s.status === "open" ? "En curso" : "Cerrada"}
                                {s.expectedCash != null
                                  ? ` · Esperado ${money(s.expectedCash)}`
                                  : ""}
                              </span>
                            </div>
                            <div className={styles.cashSessionSide}>
                              <span
                                className={`${styles.badge} ${
                                  s.status === "open"
                                    ? styles.badgeCompleted
                                    : styles.badgePending
                                }`}
                              >
                                {s.status === "open" ? "Abierta" : "Cerrada"}
                              </span>
                              {diff != null ? (
                                <span
                                  className={
                                    hasDiff
                                      ? styles.cashSessionDiffNeg
                                      : styles.cashSessionDiffOk
                                  }
                                >
                                  {hasDiff
                                    ? `Dif. ${money(diff)}`
                                    : "Cuadrada"}
                                </span>
                              ) : (
                                <ChevronRight
                                  size={16}
                                  className={styles.cashSessionChevron}
                                />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {pos.cashSessionsTotal > 0 ? (
                      <div style={{ marginTop: 4 }}>
                        <ModernPagination
                          page={pos.cashSessionsPage}
                          pageCount={Math.max(pos.cashSessionsTotalPages, 1)}
                          totalItems={pos.cashSessionsTotal}
                          pageSize={10}
                          scrollTargetRef={cashSessionsListRef}
                          onPageChange={(p) => pos.goCashSessionsPage(p)}
                        />
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </section>

            <section
              className={`${styles.cashPanel} ${styles.cashHwPanel}`}
            >
              <div className={styles.cashPanelHead}>
                <p className={styles.panelEyebrow}>Hardware</p>
                <h2>
                  <Printer size={20} strokeWidth={2.25} />
                  Impresora térmica y cajón
                </h2>
                <p>
                  Instala QZ Tray en esta PC, permite este sitio y elige la
                  impresora térmica. El cajón se abre por el kick en cobros con
                  efectivo.
                </p>
              </div>
              <div className={styles.cashPanelBody}>
                <div className={styles.cashHwGrid}>
                  <div className={styles.cashForm}>
                    <div className={styles.cashHwControls}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        disabled={pos.qzBusy}
                        onClick={() => void pos.refreshQzPrinters()}
                      >
                        {pos.qzBusy ? "Buscando…" : "Detectar impresoras"}
                      </button>
                      <TextField
                        select
                        size="small"
                        label="Impresora"
                        value={pos.qzSettings.printerName}
                        onChange={(e) =>
                          pos.updateQzSettings({
                            printerName: e.target.value,
                          })
                        }
                        sx={{ ...fieldSx, minWidth: 260 }}
                      >
                        <MenuItem value="">
                          <em>Sin seleccionar</em>
                        </MenuItem>
                        {(pos.qzPrinters.length
                          ? pos.qzPrinters
                          : pos.qzSettings.printerName
                            ? [pos.qzSettings.printerName]
                            : []
                        ).map((name) => (
                          <MenuItem key={name} value={name}>
                            {name}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        select
                        size="small"
                        label="Tipo de comando del cajón"
                        value={pos.qzSettings.drawerDialect}
                        onChange={(e) =>
                          pos.updateQzSettings({
                            drawerDialect: e.target.value as "epson" | "star",
                          })
                        }
                        sx={{ ...fieldSx, minWidth: 180 }}
                      >
                        <MenuItem value="epson">Epson / ESC-POS</MenuItem>
                        <MenuItem value="star">Star</MenuItem>
                      </TextField>
                    </div>
                    <p className={styles.cashHint}>
                      Elige la impresora térmica (Epson/Star). No uses
                      «Microsoft Print to PDF» ni similares: el ticket raw no
                      es un PDF. Para PDF usa la vista previa HTML.
                    </p>
                    <div className={styles.cashMoveActions}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        disabled={pos.qzBusy || !pos.qzSettings.printerName}
                        onClick={() => void pos.testQzPrint()}
                      >
                        Probar ticket
                      </button>
                      <button
                        type="button"
                        className={styles.drawerBtn}
                        disabled={pos.qzBusy || !pos.qzSettings.printerName}
                        onClick={() => void pos.testQzDrawer()}
                      >
                        Abrir cajón de dinero
                      </button>
                    </div>
                  </div>
                  <div className={styles.cashHwChecks}>
                    <label className={styles.cashHwCheck}>
                      <input
                        type="checkbox"
                        checked={pos.qzSettings.autoPrintOnCharge}
                        onChange={(e) =>
                          pos.updateQzSettings({
                            autoPrintOnCharge: e.target.checked,
                          })
                        }
                      />
                      <span>
                        Imprimir ticket al cobrar
                        <small>Envía ESC/POS al cobrar si QZ está activo.</small>
                      </span>
                    </label>
                    <label className={styles.cashHwCheck}>
                      <input
                        type="checkbox"
                        checked={pos.qzSettings.openDrawerOnCash}
                        onChange={(e) =>
                          pos.updateQzSettings({
                            openDrawerOnCash: e.target.checked,
                          })
                        }
                      />
                      <span>
                        Abrir cajón en cobros con efectivo
                        <small>Solo cuando hay pago en efectivo.</small>
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : pos.tab === "garantias" ? (
          <section className={`${styles.posTabBody} ${styles.posPanel}`}>
            <div className={styles.posPanelHead}>
              <div className={styles.historyHeadRow}>
                <div>
                  <p className={styles.panelEyebrow}>Series</p>
                  <h2>
                    <Shield size={18} strokeWidth={2.25} />
                    Garantías
                  </h2>
                  <p>
                    Ventas con número de serie: consulta e imprime la hoja de
                    garantía.
                  </p>
                </div>
                {!pos.warrantiesLoading && pos.warrantiesTotal > 0 ? (
                  <div className={styles.historyStat}>
                    <span className={styles.historyStatLabel}>Resultados</span>
                    <strong>{qty(pos.warrantiesTotal)}</strong>
                  </div>
                ) : null}
              </div>
            </div>
            <div className={styles.posPanelBody}>
              <div className={styles.historyFilters}>
                <TextField
                  size="small"
                  label="Cliente"
                  placeholder="Nombre del cliente"
                  value={pos.warrantyCustomer}
                  onChange={(e) => pos.setWarrantyCustomer(e.target.value)}
                  sx={{ ...fieldSx, minWidth: 180, flex: "1 1 180px" }}
                />
                <TextField
                  size="small"
                  label="Folio"
                  placeholder="PV-0000001"
                  value={pos.warrantyFolio}
                  onChange={(e) => pos.setWarrantyFolio(e.target.value)}
                  sx={{ ...fieldSx, minWidth: 150, flex: "1 1 140px" }}
                />
                <TextField
                  size="small"
                  label="Venta"
                  placeholder="#123 o 123"
                  value={pos.warrantySaleId}
                  onChange={(e) => pos.setWarrantySaleId(e.target.value)}
                  inputProps={{ inputMode: "numeric" }}
                  sx={{ ...fieldSx, minWidth: 120, flex: "0 1 120px" }}
                />
                <TextField
                  size="small"
                  type="date"
                  label="Desde"
                  value={pos.warrantyFrom}
                  onChange={(e) => pos.setWarrantyFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ ...fieldSx, minWidth: 150, flex: "1 1 140px" }}
                />
                <TextField
                  size="small"
                  type="date"
                  label="Hasta"
                  value={pos.warrantyTo}
                  onChange={(e) => pos.setWarrantyTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={
                    pos.warrantyFrom ? { min: pos.warrantyFrom } : undefined
                  }
                  sx={{ ...fieldSx, minWidth: 150, flex: "1 1 140px" }}
                />
                <div className={styles.historyFilterActions}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => pos.clearWarrantyFilters()}
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              {pos.warrantiesLoading ? (
                <div
                  style={{ display: "grid", placeItems: "center", padding: 40 }}
                >
                  <CircularProgress sx={{ color: "#bb3d4b" }} />
                </div>
              ) : pos.warranties.length === 0 ? (
                <EmptyState
                  title="Sin garantías"
                  description="Aún no hay ventas completadas con números de serie. Al cobrar productos con serie aparecerán aquí."
                />
              ) : (
                <>
                  {pos.warrantiesTotal > 0 ? (
                    <div style={{ marginBottom: 12 }}>
                      <ModernPagination
                        page={pos.warrantiesPage}
                        pageCount={Math.max(pos.warrantiesTotalPages, 1)}
                        totalItems={pos.warrantiesTotal}
                        pageSize={15}
                        scrollOnChange={false}
                        onPageChange={(p) => pos.goWarrantiesPage(p)}
                      />
                    </div>
                  ) : null}
                  <div
                    ref={warrantiesTableRef}
                    className={styles.scrollPanel}
                  >
                  <table className={styles.historyTable}>
                  <thead>
                    <tr>
                      <th>ID venta</th>
                      <th>Folio</th>
                      <th>Bodega</th>
                      <th>Fecha</th>
                      <th>Cliente</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pos.warranties.map((sale) => (
                      <tr key={sale.idPosSale}>
                        <td>#{sale.idPosSale}</td>
                        <td>{sale.folio}</td>
                        <td>
                          {formatPosBranchUiLabel({
                            name: sale.branchName,
                            city: sale.branchCity,
                            fallback: "—",
                          })}
                        </td>
                        <td>
                          {new Date(sale.createdAt).toLocaleString("es-MX", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: false,
                          })}
                        </td>
                        <td>{sale.customerName || "—"}</td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              type="button"
                              className={styles.secondaryBtn}
                              title="Imprimir hoja de garantía"
                              onClick={() =>
                                pos.openWarrantySheet(sale.idPosSale)
                              }
                            >
                              <Printer size={14} />
                            </button>
                            <button
                              type="button"
                              className={styles.secondaryBtn}
                              title="Ver detalle"
                              onClick={() =>
                                void pos.openWarrantyDetail(sale.idPosSale)
                              }
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                  </div>
                  {pos.warrantiesTotal > 0 ? (
                    <div style={{ marginTop: 16 }}>
                      <ModernPagination
                        page={pos.warrantiesPage}
                        pageCount={Math.max(pos.warrantiesTotalPages, 1)}
                        totalItems={pos.warrantiesTotal}
                        pageSize={15}
                        scrollTargetRef={warrantiesTableRef}
                        onPageChange={(p) => pos.goWarrantiesPage(p)}
                      />
                    </div>
                  ) : null}
                </>
              )}
            </div>

            {pos.warrantyDetail ? (
              <div
                className={styles.drawer}
                role="dialog"
                aria-modal="true"
                onClick={() => pos.setWarrantyDetail(null)}
              >
                <div
                  className={`${styles.drawerPanel} ${styles.detailDrawer} ${styles.warrantyDrawer}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={styles.detailHero}>
                    <div className={styles.detailHeroTop}>
                      <div>
                        <p className={styles.detailEyebrow}>Detalle de garantía</p>
                        <h3 className={styles.detailFolio}>
                          Venta #{pos.warrantyDetail.idPosSale}
                        </h3>
                        <p className={styles.detailWhen}>
                          Folio {pos.warrantyDetail.folio} ·{" "}
                          {new Date(
                            pos.warrantyDetail.createdAt,
                          ).toLocaleString("es-MX")}
                        </p>
                      </div>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => pos.setWarrantyDetail(null)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  <div className={styles.warrantyDrawerScroll}>
                    <div className={styles.detailItems}>
                      {pos.warrantyDetail.items.map((it) => {
                        const sku =
                          it.productSku &&
                          it.productSku !== "__POS_MANUAL__" &&
                          !/^manual$/i.test(it.productSku)
                            ? it.productSku
                            : null;
                        const upc =
                          it.productUpc &&
                          it.productUpc !== "__POS_MANUAL__" &&
                          !/^manual$/i.test(it.productUpc)
                            ? it.productUpc
                            : null;
                        return (
                          <div
                            key={it.idPosSaleItem}
                            className={styles.detailItem}
                          >
                            {productThumb(
                              resolveProductImage(it.productImage),
                            )}
                            <div className={styles.detailItemMain}>
                              <strong>
                                {qty(it.quantity)} × {it.productName}
                              </strong>
                              <div className={styles.detailItemMeta}>
                                {sku ? <span>SKU: {sku}</span> : null}
                                {upc ? <span>UPC: {upc}</span> : null}
                                <span>Precio: {money(it.unitPrice)}</span>
                                {Number(it.discountPct) > 0 ? (
                                  <span>
                                    Descuento {Number(it.discountPct)}%
                                  </span>
                                ) : null}
                                {it.branchLabel || it.branchName ? (
                                  <span>
                                    Bodega:{" "}
                                    {formatPosBranchUiLabel({
                                      name: it.branchName,
                                      label: it.branchLabel,
                                      city: it.branchCity,
                                    })}
                                  </span>
                                ) : null}
                              </div>
                              {it.serials && it.serials.length > 0 ? (
                                <div className={styles.detailSerialList}>
                                  {it.serials.map((s) => {
                                    const months =
                                      s.warrantyMonths != null &&
                                      Number(s.warrantyMonths) > 0
                                        ? Number(s.warrantyMonths)
                                        : null;
                                    const coverage =
                                      months == null
                                        ? "Según marca / centro de servicio"
                                        : months >= 12 && months % 12 === 0
                                          ? `${months / 12} año${
                                              months / 12 === 1 ? "" : "s"
                                            }`
                                          : `${months} mes${
                                              months === 1 ? "" : "es"
                                            }`;
                                    return (
                                      <div
                                        key={s.idProductSerial}
                                        className={styles.detailSerialCard}
                                      >
                                        <strong>
                                          Serie: {s.serialNumber}
                                        </strong>
                                        <span>Cobertura: {coverage}</span>
                                        {s.warrantyExpiresAt ? (
                                          <span>
                                            Garantía hasta:{" "}
                                            {new Date(
                                              s.warrantyExpiresAt,
                                            ).toLocaleDateString("es-MX")}
                                          </span>
                                        ) : null}
                                        {s.status ? (
                                          <span>
                                            Estado: {serialStatusLabel(s.status)}
                                          </span>
                                        ) : null}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span>Sin serie registrada</span>
                              )}
                            </div>
                            <div className={styles.detailItemPrice}>
                              {money(it.lineTotal)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className={styles.warrantyDrawerFooter}>
                    <button
                      type="button"
                      className={styles.chargeBtn}
                      onClick={() =>
                        pos.openWarrantySheet(pos.warrantyDetail!.idPosSale)
                      }
                    >
                      <Printer
                        size={14}
                        style={{ display: "inline", marginRight: 6 }}
                      />
                      Imprimir hoja de garantía
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : (
          <section className={`${styles.posTabBody} ${styles.posPanel}`}>
            <div className={styles.posPanelHead}>
              <div className={styles.historyHeadRow}>
                <div>
                  <p className={styles.panelEyebrow}>Ventas</p>
                  <h2>
                    <History size={18} strokeWidth={2.25} />
                    Historial de ventas
                  </h2>
                  <p>
                    Consulta, reimpresión de ticket y cancelaciones con
                    restauración de inventario.
                  </p>
                </div>
                {!pos.historyLoading && pos.historyTotal > 0 ? (
                  <div className={styles.historyStat}>
                    <span className={styles.historyStatLabel}>Resultados</span>
                    <strong>{qty(pos.historyTotal)}</strong>
                  </div>
                ) : null}
              </div>
            </div>
            <div className={styles.posPanelBody}>
              <div className={styles.historyFilters}>
                <TextField
                  size="small"
                  label="Folio"
                  placeholder="PV-0000001"
                  value={pos.historyFolio}
                  onChange={(e) => pos.setHistoryFolio(e.target.value)}
                  sx={{ ...fieldSx, minWidth: 160, flex: "1 1 140px" }}
                />
                <TextField
                  size="small"
                  label="Cliente"
                  placeholder="Nombre del cliente"
                  value={pos.historyCustomer}
                  onChange={(e) => pos.setHistoryCustomer(e.target.value)}
                  sx={{ ...fieldSx, minWidth: 180, flex: "1 1 180px" }}
                />
                <TextField
                  size="small"
                  type="date"
                  label="Desde"
                  value={pos.historyFrom}
                  onChange={(e) => pos.setHistoryFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ ...fieldSx, minWidth: 150, flex: "1 1 140px" }}
                />
                <TextField
                  size="small"
                  type="date"
                  label="Hasta"
                  value={pos.historyTo}
                  onChange={(e) => pos.setHistoryTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={
                    pos.historyFrom ? { min: pos.historyFrom } : undefined
                  }
                  sx={{ ...fieldSx, minWidth: 150, flex: "1 1 140px" }}
                />
                <TextField
                  select
                  size="small"
                  label="Estado"
                  value={pos.historyStatus}
                  onChange={(e) => pos.setHistoryStatus(e.target.value)}
                  sx={{ ...fieldSx, minWidth: 160, flex: "1 1 140px" }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="completed">Completada</MenuItem>
                  <MenuItem value="cancelled">Cancelada</MenuItem>
                  <MenuItem value="pending_payment">Pendiente de pago</MenuItem>
                </TextField>
                <div className={styles.historyFilterActions}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => pos.clearHistoryFilters()}
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              {pos.historyLoading ? (
                <div
                  style={{ display: "grid", placeItems: "center", padding: 48 }}
                >
                  <CircularProgress sx={{ color: "#bb3d4b" }} />
                </div>
              ) : pos.history.length === 0 ? (
                <EmptyState
                  title="Sin ventas"
                  description="Aún no hay ventas POS con estos filtros."
                />
              ) : (
                <>
                  {pos.historyTotal > 0 ? (
                    <div style={{ marginBottom: 12 }}>
                      <ModernPagination
                        page={pos.historyPage}
                        pageCount={Math.max(pos.historyTotalPages, 1)}
                        totalItems={pos.historyTotal}
                        pageSize={15}
                        scrollOnChange={false}
                        onPageChange={(p) => pos.goHistoryPage(p)}
                      />
                    </div>
                  ) : null}
                  <div ref={historyListRef} className={styles.historyList}>
                    {pos.history.map((sale) => {
                      const paySummary =
                        sale.payments?.length > 0
                          ? sale.payments
                              .map(
                                (p) =>
                                  POS_PAYMENT_LABELS[p.method] || p.method,
                              )
                              .join(" · ")
                          : "Sin pagos";
                      const itemCount = sale.items?.length || 0;
                      const qtyUnits = (sale.items || []).reduce(
                        (sum, it) => sum + Number(it.quantity || 0),
                        0,
                      );
                      const pieces = qtyUnits > 0 ? qtyUnits : itemCount;
                      const branchLabel =
                        sale.branchName || sale.branchCity
                          ? formatPosBranchUiLabel({
                              name: sale.branchName,
                              city: sale.branchCity,
                            })
                          : null;
                      const when = new Date(sale.createdAt);
                      const whenLabel = when.toLocaleString("es-MX", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      return (
                        <article
                          key={sale.idPosSale}
                          className={`${styles.historyCard} ${
                            sale.status === "cancelled"
                              ? styles.historyCardCancelled
                              : sale.status === "pending_payment"
                                ? styles.historyCardPending
                                : styles.historyCardCompleted
                          }`}
                        >
                          <div
                            className={styles.historyAccent}
                            aria-hidden
                          />
                          <div className={styles.historyCardBody}>
                            <div className={styles.historyCardHeader}>
                              <div className={styles.historyIdentity}>
                                <span className={styles.historyFolio}>
                                  {sale.folio}
                                </span>
                                <span
                                  className={`${styles.badge} ${statusBadge(sale.status)}`}
                                >
                                  {statusLabel(sale.status)}
                                </span>
                                <FacturaFlag
                                  required={Number(sale.requiredFactura) === 1}
                                />
                              </div>
                              <div className={styles.historyTotal}>
                                {money(sale.total)}
                              </div>
                            </div>

                            <div className={styles.historyCustomer}>
                              {sale.customerName || "Público general"}
                            </div>

                            <div className={styles.historyFacts}>
                              <span>{whenLabel}</span>
                              <span className={styles.historyFactSep} />
                              <span>{paySummary}</span>
                              <span className={styles.historyFactSep} />
                              <span>
                                {qty(pieces)}{" "}
                                {pieces === 1 ? "pieza" : "piezas"}
                              </span>
                              {branchLabel ? (
                                <>
                                  <span className={styles.historyFactSep} />
                                  <span>{branchLabel}</span>
                                </>
                              ) : null}
                              <span className={styles.historyFactSep} />
                              <span>PCinBOX</span>
                              {sale.customerPhone ? (
                                <>
                                  <span className={styles.historyFactSep} />
                                  <span>{sale.customerPhone}</span>
                                </>
                              ) : null}
                              {sale.quoteNumber ? (
                                <>
                                  <span className={styles.historyFactSep} />
                                  <span>Cot. {sale.quoteNumber}</span>
                                </>
                              ) : null}
                            </div>

                            <div className={styles.historyCardActions}>
                              <button
                                type="button"
                                className={styles.historyActionBtn}
                                onClick={() =>
                                  void pos.openDetail(sale.idPosSale)
                                }
                              >
                                <Eye size={15} strokeWidth={2.25} />
                                Detalle
                              </button>
                              <button
                                type="button"
                                className={styles.historyActionBtnPrimary}
                                onClick={() =>
                                  pos.openTicket(sale.idPosSale)
                                }
                              >
                                <Printer size={15} strokeWidth={2.25} />
                                Ticket
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  {pos.historyTotal > 0 ? (
                    <div style={{ marginTop: 16 }}>
                      <ModernPagination
                        page={pos.historyPage}
                        pageCount={Math.max(pos.historyTotalPages, 1)}
                        totalItems={pos.historyTotal}
                        pageSize={15}
                        scrollTargetRef={historyListRef}
                        onPageChange={(p) => pos.goHistoryPage(p)}
                      />
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </section>
        )}

        {pos.detailSale ? (
          <div
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            onClick={() => pos.setDetailSale(null)}
          >
            <div
              className={`${styles.drawerPanel} ${styles.detailDrawer}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.detailHero}>
                <div className={styles.detailHeroTop}>
                  <div>
                    <p className={styles.detailEyebrow}>Detalle de venta</p>
                    <h3 className={styles.detailFolio}>
                      {pos.detailSale.folio}
                    </h3>
                    <p className={styles.detailWhen}>
                      {new Date(pos.detailSale.createdAt).toLocaleString(
                        "es-MX",
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => pos.setDetailSale(null)}
                    aria-label="Cerrar"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className={styles.detailHeroBottom}>
                  <span
                    className={`${styles.badge} ${statusBadge(pos.detailSale.status)}`}
                  >
                    {statusLabel(pos.detailSale.status)}
                  </span>
                  <FacturaFlag
                    required={Number(pos.detailSale.requiredFactura) === 1}
                  />
                  <div className={styles.detailHeroTotal}>
                    <span>Total</span>
                    <strong>{money(pos.detailSale.total)}</strong>
                  </div>
                </div>
              </div>

              <div className={styles.detailGrid}>
                <div className={styles.detailTile}>
                  <span className={styles.historyMetaLabel}>Cliente</span>
                  <strong>{pos.detailSale.customerName || "—"}</strong>
                  {pos.detailSale.customerPhone ? (
                    <span className={styles.detailTileSub}>
                      {pos.detailSale.customerPhone}
                    </span>
                  ) : null}
                  {pos.detailSale.customerEmail ? (
                    <span className={styles.detailTileSub}>
                      {pos.detailSale.customerEmail}
                    </span>
                  ) : null}
                </div>
                <div className={styles.detailTile}>
                  <span className={styles.historyMetaLabel}>Vendedor</span>
                  <strong>PCinBOX</strong>
                </div>
                <div className={styles.detailTile}>
                  <span className={styles.historyMetaLabel}>Bodega / caja</span>
                  <strong>
                    {formatPosBranchUiLabel({
                      name: pos.detailSale.branchName,
                      city: pos.detailSale.branchCity,
                      fallback: "Bodega PCinBOX",
                    })}
                  </strong>
                </div>
                <div className={styles.detailTile}>
                  <span className={styles.historyMetaLabel}>Resumen</span>
                  <strong>
                    {pos.detailSale.items.length} producto
                    {pos.detailSale.items.length === 1 ? "" : "s"}
                  </strong>
                  <span className={styles.detailTileSub}>
                    Subtotal {money(pos.detailSale.subtotal)}
                  </span>
                </div>
              </div>

              <section className={styles.detailSection}>
                <h4>Productos</h4>
                <div className={styles.detailItems}>
                  {pos.detailSale.items.map((it) => (
                    <div key={it.idPosSaleItem} className={styles.detailItem}>
                      <div className={styles.detailItemMain}>
                        <strong>
                          {qty(it.quantity)} × {it.productName}
                        </strong>
                        {it.branchLabel || it.branchName ? (
                          <span>
                            Bodega:{" "}
                            {formatPosBranchUiLabel({
                              name: it.branchName,
                              label: it.branchLabel,
                              city: it.branchCity,
                            })}
                          </span>
                        ) : null}
                        {it.serials && it.serials.length > 0 ? (
                          <span>
                            Serie:{" "}
                            {it.serials.map((s) => s.serialNumber).join(", ")}
                          </span>
                        ) : null}
                      </div>
                      <div className={styles.detailItemPrice}>
                        {money(it.lineTotal)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className={styles.detailSection}>
                <h4>Pagos</h4>
                <div className={styles.detailPayments}>
                  {pos.detailSale.payments.map((p) => (
                    <div key={p.idPosPayment} className={styles.detailPayment}>
                      <span>
                        {POS_PAYMENT_LABELS[p.method] || p.method}
                        {p.reference ? (
                          <em className={styles.detailTileSub}>
                            {" "}
                            · {p.reference}
                          </em>
                        ) : null}
                      </span>
                      <strong>{money(p.amount)}</strong>
                    </div>
                  ))}
                </div>
              </section>

              {pos.detailSale.notes ? (
                <section className={styles.detailSection}>
                  <h4>Notas</h4>
                  <p className={styles.detailNotes}>{pos.detailSale.notes}</p>
                </section>
              ) : null}

              <div className={styles.drawerActions}>
                <button
                  type="button"
                  className={styles.chargeBtn}
                  style={{ marginTop: 0, width: "auto" }}
                  onClick={() => pos.openTicket(pos.detailSale!.idPosSale)}
                >
                  <Printer
                    size={14}
                    style={{ display: "inline", marginRight: 6 }}
                  />
                  Imprimir ticket
                </button>
                {pos.detailSale.status === "pending_payment" ? (
                  <>
                    {(pos.detailSale.checkoutLinkUrl ||
                      pos.detailSale.paymentLinkUrl) && (
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() =>
                          window.open(
                            pos.detailSale!.checkoutLinkUrl ||
                              pos.detailSale!.paymentLinkUrl!,
                            "_blank",
                          )
                        }
                      >
                        Abrir link de pago
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => void pos.retryPaymentLink()}
                    >
                      Generar otro link de pago
                    </button>
                    {pos.isAdmin ? (
                      <button
                        type="button"
                        className={styles.chargeBtn}
                        style={{ marginTop: 0, width: "auto" }}
                        onClick={() => void pos.confirmPayment()}
                      >
                        Marcar como pagado (admin)
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>

              {pos.detailSale.status !== "cancelled" ? (
                <div className={styles.detailCancelBox}>
                  {pos.cancelGate.allowed ? (
                    <>
                      <h4>Cancelación</h4>
                      <p className={styles.detailTileSub}>
                        Restaura inventario y registra el evento de auditoría.
                      </p>
                      <TextField
                        fullWidth
                        size="small"
                        label="Motivo de cancelación"
                        value={pos.cancelReason}
                        onChange={(e) => pos.setCancelReason(e.target.value)}
                        sx={{ ...fieldSx, mt: 1 }}
                        multiline
                        minRows={2}
                      />
                      <button
                        type="button"
                        className={styles.dangerBtn}
                        disabled={pos.cancelling}
                        onClick={() => void pos.cancelSale()}
                        style={{ marginTop: 10 }}
                      >
                        {pos.cancelling ? "Cancelando…" : "Cancelar venta"}
                      </button>
                    </>
                  ) : (
                    <p className={styles.detailWarn}>
                      {pos.cancelGate.reason ||
                        "No tienes permiso para cancelar esta venta."}
                    </p>
                  )}
                </div>
              ) : (
                <div className={styles.detailCancelBox}>
                  <h4>Venta cancelada</h4>
                  <p className={styles.detailWarn}>
                    Motivo: {pos.detailSale.cancelReason || "—"}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {pos.ticketOpen && pos.lastSale ? (
          <div
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            onClick={() => pos.setTicketOpen(false)}
          >
            <div
              className={styles.drawerPanel}
              style={{
                height: "auto",
                maxHeight: "90vh",
                placeSelf: "center",
                borderRadius: 16,
                width: "min(420px, 94vw)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ marginTop: 0 }}>Venta {pos.lastSale.folio}</h3>
              <p style={{ fontSize: 14 }}>
                Total {money(pos.lastSale.total)} ·{" "}
                {statusLabel(pos.lastSale.status)}
                {pos.lastSale.quoteNumber
                  ? ` · No. Cotización: ${pos.lastSale.quoteNumber}`
                  : ""}
              </p>
              {pos.lastPaymentLink ? (
                <p style={{ fontSize: 13, wordBreak: "break-all" }}>
                  Link de pago:{" "}
                  <a
                    href={pos.lastPaymentLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {pos.lastPaymentLink}
                  </a>
                </p>
              ) : null}
              <div className={styles.drawerActions}>
                <button
                  type="button"
                  className={styles.chargeBtn}
                  style={{ marginTop: 0 }}
                  onClick={() => pos.openTicket(pos.lastSale!.idPosSale)}
                >
                  <Printer
                    size={14}
                    style={{ display: "inline", marginRight: 6 }}
                  />
                  Imprimir ticket
                </button>
                {pos.lastPaymentLink ? (
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => window.open(pos.lastPaymentLink!, "_blank")}
                  >
                    Abrir link de pago
                  </button>
                ) : null}
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => pos.setTicketOpen(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {pos.cashSessionDetail || pos.cashSessionDetailLoading ? (
          <div
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            onClick={() => pos.setCashSessionDetail(null)}
          >
            <div
              className={`${styles.drawerPanel} ${styles.cashSessionModal}`}
              onClick={(e) => e.stopPropagation()}
            >
              {pos.cashSessionDetailLoading || !pos.cashSessionDetail ? (
                <div
                  style={{ display: "grid", placeItems: "center", padding: 32 }}
                >
                  <CircularProgress sx={{ color: "#bb3d4b" }} />
                </div>
              ) : (
                <>
                  <div className={styles.cashSessionModalHead}>
                    <div>
                      <p className={styles.detailEyebrow}>Caja</p>
                      <h3 className={styles.cashSessionModalTitle}>
                        Sesión #{pos.cashSessionDetail.idCashSession}
                      </h3>
                    </div>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => pos.setCashSessionDetail(null)}
                      aria-label="Cerrar"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className={styles.cashSessionModalBody}>
                    <div className={styles.totalsBox}>
                      <div className={styles.totalsRow}>
                        <span>Estado</span>
                        <strong>
                          {pos.cashSessionDetail.status === "open"
                            ? "Abierta"
                            : "Cerrada"}
                        </strong>
                      </div>
                      <div className={styles.totalsRow}>
                        <span>Abierta por</span>
                        <span>{pos.cashSessionDetail.openedByName || "—"}</span>
                      </div>
                      <div className={styles.totalsRow}>
                        <span>Desde</span>
                        <span>
                          {new Date(
                            pos.cashSessionDetail.openedAt,
                          ).toLocaleString("es-MX")}
                        </span>
                      </div>
                      {pos.cashSessionDetail.closedAt ? (
                        <div className={styles.totalsRow}>
                          <span>Cierre</span>
                          <span>
                            {new Date(
                              pos.cashSessionDetail.closedAt,
                            ).toLocaleString("es-MX")}
                            {pos.cashSessionDetail.closedByName
                              ? ` · ${pos.cashSessionDetail.closedByName}`
                              : ""}
                          </span>
                        </div>
                      ) : null}
                      <div className={styles.totalsRow}>
                        <span>Fondo inicial</span>
                        <span>
                          {money(pos.cashSessionDetail.openingFloat)}
                        </span>
                      </div>
                      <div className={styles.totalsRow}>
                        <span>Esperado</span>
                        <span>
                          {pos.cashSessionDetail.expectedCash != null
                            ? money(pos.cashSessionDetail.expectedCash)
                            : "—"}
                        </span>
                      </div>
                      <div className={styles.totalsRow}>
                        <span>Contado</span>
                        <span>
                          {pos.cashSessionDetail.closingCounted != null
                            ? money(pos.cashSessionDetail.closingCounted)
                            : "—"}
                        </span>
                      </div>
                      <div className={styles.totalsGrand}>
                        <span>Diferencia</span>
                        <span>
                          {pos.cashSessionDetail.difference != null
                            ? money(pos.cashSessionDetail.difference)
                            : "—"}
                        </span>
                      </div>
                      {pos.cashSessionDetail.differenceReason ? (
                        <div className={styles.totalsRow}>
                          <span>Motivo del descuadre</span>
                          <span>{pos.cashSessionDetail.differenceReason}</span>
                        </div>
                      ) : null}
                      {pos.cashSessionDetail.notes ? (
                        <div className={styles.totalsRow}>
                          <span>Notas</span>
                          <span style={{ whiteSpace: "pre-wrap" }}>
                            {pos.cashSessionDetail.notes}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className={styles.cashSessionMovesHead}>
                      <h4>Movimientos</h4>
                      {(pos.cashSessionDetail.movementsTotal ??
                        pos.cashSessionDetail.movements?.length ??
                        0) > 0 ? (
                        <span className={styles.cashSessionMovesCount}>
                          {pos.cashSessionDetail.movementsTotal ??
                            pos.cashSessionDetail.movements?.length}{" "}
                          en total
                        </span>
                      ) : null}
                    </div>

                    {(pos.cashSessionDetail.movements?.length || 0) === 0 ? (
                      <p className={styles.cashSessionEmptyMoves}>
                        Sin movimientos registrados.
                      </p>
                    ) : (
                      <div className={styles.scrollPanelSm}>
                        <table className={styles.historyTable}>
                          <thead>
                            <tr>
                              <th>Hora</th>
                              <th>Tipo</th>
                              <th>Monto</th>
                              <th>Motivo</th>
                              <th>Usuario</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pos.cashSessionDetail.movements!.map((m) => (
                              <tr key={m.idCashMovement}>
                                <td>
                                  {new Date(m.createdAt).toLocaleString(
                                    "es-MX",
                                  )}
                                </td>
                                <td>
                                  {POS_CASH_MOVEMENT_LABELS[
                                    m.type as PosCashMovementType
                                  ] || m.type}
                                </td>
                                <td>{money(m.amount)}</td>
                                <td>{m.reason || "—"}</td>
                                <td>{m.userName || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {(pos.cashSessionDetail.movementsTotal ?? 0) >
                    (pos.cashSessionDetail.movements?.length || 0) ? (
                      <a
                        className={styles.cashSessionViewAll}
                        href={`/punto-de-venta/caja/sesion/${pos.cashSessionDetail.idCashSession}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink size={15} strokeWidth={2.25} />
                        Ver todos los movimientos
                      </a>
                    ) : null}
                  </div>

                  <div className={styles.cashSessionModalFooter}>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => pos.setCashSessionDetail(null)}
                    >
                      Cerrar
                    </button>
                    {(pos.cashSessionDetail.movementsTotal ?? 0) > 0 ? (
                      <a
                        className={styles.primaryOutlineBtn}
                        href={`/punto-de-venta/caja/sesion/${pos.cashSessionDetail.idCashSession}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink size={14} strokeWidth={2.25} />
                        Abrir en pantalla completa
                      </a>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </AdminPageShell>
  );
}
