"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, TextField } from "@mui/material";
import UtilsService from "../services/utils";
import { useTheContext } from "../hooks/global.hook";
import usePermissions from "../hooks/usePermissions";
import {
  PosBranch,
  PosCartLine,
  PosCashPaymentSummary,
  PosCashSession,
  PosPaymentLine,
  PosPaymentMethod,
  PosProductHit,
  PosProductSerial,
  PosSale,
  PosServiceIntake,
  SELLER_MAX_DISCOUNT_PCT,
  canCancelPosSale,
  isPosProductOutOfStock,
  settlePosPayments,
} from "../interfaces/pos/pos.interface";
import { formatMoney, formatPosFolio } from "./posFormat";
import {
  loadQzSettings,
  saveQzSettings,
  DEFAULT_QZ_SETTINGS,
  type QzPosSettings,
} from "./qz/qzSettings";
import {
  listQzPrinters,
  openCashDrawerQz,
  printPosTicketQz,
  qzErrorMessage,
  QzPdfPrinterError,
  isQzPdfOrVirtualPrinter,
} from "./qz/qzPos";
import { formatPosBranchUiLabel } from "../interfaces/pos/posBranchDisplay";
import { useQueryParams } from "../hooks/useQueryParams";
import WarrantySheetPdf, {
  buildWarrantyPdfRows,
} from "./warranty/WarrantySheetPdf";
import { cartWarrantyToPayload, posWarrantySelectable } from "./posWarranty";

const BRANCH_STORAGE_KEY = "pcinbox-pos-branchId";
const CASH_HINT_KEY = "pcinbox-pos-cash-hint";
const DRAFT_KEY_V1 = "pcinbox-pos-draft-v1";
const DRAFT_KEY = "pcinbox-pos-draft-v2";
/** Persist filters to URL/session quickly (reload / menú). */
const FILTER_URL_DEBOUNCE_MS = 150;
/** Debounce API fetch for text filters. */
const FILTER_FETCH_DEBOUNCE_MS = 400;
/** Búsqueda en carrito (cliente): debounce para no filtrar en cada tecla. */
const CART_SEARCH_DEBOUNCE_MS = 350;
/** Líneas visibles por página en el carrito. */
const CART_PAGE_SIZE = 3;

type PosTab = "cobrar" | "historial" | "caja" | "garantias";

const POS_TABS = new Set<PosTab>(["cobrar", "historial", "caja", "garantias"]);

function parsePosTab(raw: string | null | undefined): PosTab {
  const v = String(raw || "").trim().toLowerCase();
  if (POS_TABS.has(v as PosTab)) return v as PosTab;
  return "cobrar";
}

type CashHint = {
  branchId: number;
  open: boolean;
  idCashSession?: number | null;
  at?: number;
};

/** Captura «Agregar sin catálogo» (sobrevive F5 / navegación). */
export type PosManualEquipRow = {
  key: string;
  quantity: string;
  description: string;
  serialNumber: string;
  conditionPreset: string;
  conditionOther: string;
};

export type PosManualCapture = {
  open: boolean;
  kind: "product" | "service";
  serviceType: string;
  name: string;
  price: string;
  qty: string;
  upc: string;
  equipRows: PosManualEquipRow[];
  failure: string;
  techObs: string;
  /** UI garantía: months | years | none | service_center | "" */
  warrantyChoice?: "" | "months" | "years" | "none" | "service_center";
  warrantyAmount?: number | "";
};

type PosCashFormsDraft = {
  openingFloat: string;
  closingCounted: string;
  differenceReason: string;
  cashMoveAmount: string;
  cashMoveReason: string;
  cashNotes: string;
};

type PosSerialFormsDraft = {
  serialQuery: string;
  rmaNotes: string;
  newSerialProductId: string;
  newSerialNumber: string;
};

type PosDraftV2 = {
  v: 2;
  /** Pestaña activa del módulo POS. */
  tab: PosTab;
  /** Búsqueda de catálogo en Cobrar. */
  search: string;
  cartSearch: string;
  cartPage: number;
  cart: PosCartLine[];
  customerName: string;
  guestEmail: string;
  phoneLada: string;
  guestPhone: string;
  payments: PosPaymentLine[];
  notes: string;
  requiredFactura: boolean;
  quoteInput: string;
  linkedQuoteNumber: string | null;
  manualCapture: PosManualCapture | null;
  cashForms: PosCashFormsDraft;
  serialForms: PosSerialFormsDraft;
  /** Última venta cobrada (reimprimir / resumen). */
  lastSale: PosSale | null;
  ticketOpen: boolean;
  /** Paneles abiertos (se rehidratan con fetch). */
  detailSaleId: number | null;
  warrantyDetailId: number | null;
  cancelReason: string;
  inventoryReason: string;
};

const EMPTY_CASH_FORMS: PosCashFormsDraft = {
  openingFloat: "0",
  closingCounted: "",
  differenceReason: "",
  cashMoveAmount: "",
  cashMoveReason: "",
  cashNotes: "",
};

const EMPTY_SERIAL_FORMS: PosSerialFormsDraft = {
  serialQuery: "",
  rmaNotes: "",
  newSerialProductId: "",
  newSerialNumber: "",
};

function newPosIdempotencyKey() {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  return `pos_${rand}`.slice(0, 64);
}

function normalizeManualCapture(raw: unknown): PosManualCapture | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const equipRows = Array.isArray(m.equipRows)
    ? m.equipRows
        .filter((row) => row && typeof row === "object")
        .slice(0, 40)
        .map((row, idx) => {
          const r = row as Record<string, unknown>;
          return {
            key: String(r.key || `eq-restored-${idx}`),
            quantity: String(r.quantity ?? "1"),
            description: String(r.description ?? ""),
            serialNumber: String(r.serialNumber ?? ""),
            conditionPreset: String(r.conditionPreset || "Buen estado"),
            conditionOther: String(r.conditionOther ?? ""),
          };
        })
    : [];
  return {
    open: Boolean(m.open),
    kind: m.kind === "service" ? "service" : "product",
    serviceType: String(m.serviceType || "Mantenimiento"),
    name: String(m.name || ""),
    price: String(m.price || ""),
    qty: String(m.qty || "1"),
    upc: String(m.upc || ""),
    equipRows:
      equipRows.length > 0
        ? equipRows
        : [
            {
              key: `eq-${Date.now()}`,
              quantity: "1",
              description: "",
              serialNumber: "",
              conditionPreset: "Buen estado",
              conditionOther: "",
            },
          ],
    failure: String(m.failure || ""),
    techObs: String(m.techObs || ""),
    warrantyChoice: ((): PosManualCapture["warrantyChoice"] => {
      const c = String(m.warrantyChoice || "").trim();
      if (
        c === "months" ||
        c === "years" ||
        c === "none" ||
        c === "service_center"
      ) {
        return c;
      }
      return "";
    })(),
    warrantyAmount: (() => {
      if (m.warrantyAmount === "" || m.warrantyAmount == null) return "";
      const n = Number(m.warrantyAmount);
      return Number.isFinite(n) && n > 0 ? Math.round(n) : "";
    })(),
  };
}

function draftHasContent(draft: PosDraftV2): boolean {
  const m = draft.manualCapture;
  const hasManual =
    Boolean(m?.open) ||
    Boolean(m?.name?.trim()) ||
    Boolean(m?.price?.trim()) ||
    Boolean(m?.failure?.trim()) ||
    Boolean(m?.techObs?.trim()) ||
    Boolean(m?.upc?.trim()) ||
    Boolean(m?.warrantyChoice) ||
    m?.kind === "service" ||
    (m?.serviceType != null && m.serviceType !== "Mantenimiento") ||
    Boolean(
      m?.equipRows?.some(
        (r) =>
          Boolean(r.description?.trim()) ||
          Boolean(r.serialNumber?.trim()) ||
          Boolean(r.conditionOther?.trim()) ||
          (r.conditionPreset && r.conditionPreset !== "Buen estado"),
      ),
    );
  const cash = draft.cashForms || EMPTY_CASH_FORMS;
  const hasCashForms =
    (cash.openingFloat.trim() !== "" && cash.openingFloat.trim() !== "0") ||
    Boolean(cash.closingCounted.trim()) ||
    Boolean(cash.differenceReason.trim()) ||
    Boolean(cash.cashMoveAmount.trim()) ||
    Boolean(cash.cashMoveReason.trim()) ||
    Boolean(cash.cashNotes.trim());
  const serial = draft.serialForms || EMPTY_SERIAL_FORMS;
  const hasSerialForms =
    Boolean(serial.serialQuery.trim()) ||
    Boolean(serial.rmaNotes.trim()) ||
    Boolean(serial.newSerialProductId.trim()) ||
    Boolean(serial.newSerialNumber.trim());
  return (
    draft.tab !== "cobrar" ||
    Boolean(draft.search.trim()) ||
    Boolean(draft.cartSearch.trim()) ||
    draft.cartPage > 1 ||
    draft.cart.length > 0 ||
    Boolean(draft.customerName.trim()) ||
    Boolean(draft.guestEmail.trim()) ||
    Boolean(draft.guestPhone.trim()) ||
    draft.phoneLada !== "+52" ||
    draft.payments.length > 0 ||
    Boolean(draft.notes.trim()) ||
    draft.requiredFactura ||
    Boolean(draft.linkedQuoteNumber) ||
    Boolean(draft.quoteInput.trim()) ||
    hasManual ||
    hasCashForms ||
    hasSerialForms ||
    Boolean(draft.lastSale) ||
    Boolean(draft.ticketOpen) ||
    draft.detailSaleId != null ||
    draft.warrantyDetailId != null ||
    Boolean(draft.cancelReason?.trim()) ||
    Boolean(draft.inventoryReason?.trim())
  );
}

function normalizeCashForms(raw: unknown): PosCashFormsDraft {
  if (!raw || typeof raw !== "object") return { ...EMPTY_CASH_FORMS };
  const c = raw as Record<string, unknown>;
  return {
    openingFloat: String(c.openingFloat ?? "0"),
    closingCounted: String(c.closingCounted ?? ""),
    differenceReason: String(c.differenceReason ?? ""),
    cashMoveAmount: String(c.cashMoveAmount ?? ""),
    cashMoveReason: String(c.cashMoveReason ?? ""),
    cashNotes: String(c.cashNotes ?? ""),
  };
}

function normalizeSerialForms(raw: unknown): PosSerialFormsDraft {
  if (!raw || typeof raw !== "object") return { ...EMPTY_SERIAL_FORMS };
  const s = raw as Record<string, unknown>;
  return {
    serialQuery: String(s.serialQuery ?? ""),
    rmaNotes: String(s.rmaNotes ?? ""),
    newSerialProductId: String(s.newSerialProductId ?? ""),
    newSerialNumber: String(s.newSerialNumber ?? ""),
  };
}

function readPosDraft(): PosDraftV2 | null {
  if (typeof window === "undefined") return null;
  try {
    const rawV2 = localStorage.getItem(DRAFT_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as Partial<PosDraftV2> & { v?: number };
      if (parsed && parsed.v === 2 && Array.isArray(parsed.cart)) {
        return {
          v: 2,
          tab: parsePosTab(parsed.tab),
          search: String(parsed.search || ""),
          cartSearch: String(parsed.cartSearch || ""),
          cartPage: Math.max(1, Number(parsed.cartPage) || 1),
          cart: parsed.cart,
          customerName: String(parsed.customerName || ""),
          guestEmail: String(parsed.guestEmail || ""),
          phoneLada: String(parsed.phoneLada || "+52"),
          guestPhone: String(parsed.guestPhone || ""),
          payments: Array.isArray(parsed.payments) ? parsed.payments : [],
          notes: String(parsed.notes || ""),
          requiredFactura: Boolean(parsed.requiredFactura),
          quoteInput: String(parsed.quoteInput || ""),
          linkedQuoteNumber: parsed.linkedQuoteNumber || null,
          manualCapture: normalizeManualCapture(parsed.manualCapture),
          cashForms: normalizeCashForms(parsed.cashForms),
          serialForms: normalizeSerialForms(parsed.serialForms),
          lastSale:
            parsed.lastSale && typeof parsed.lastSale === "object"
              ? (parsed.lastSale as PosSale)
              : null,
          ticketOpen: Boolean(parsed.ticketOpen),
          detailSaleId:
            parsed.detailSaleId != null &&
            Number.isSafeInteger(Number(parsed.detailSaleId))
              ? Number(parsed.detailSaleId)
              : null,
          warrantyDetailId:
            parsed.warrantyDetailId != null &&
            Number.isSafeInteger(Number(parsed.warrantyDetailId))
              ? Number(parsed.warrantyDetailId)
              : null,
          cancelReason: String(parsed.cancelReason || ""),
          inventoryReason: String(parsed.inventoryReason || ""),
        };
      }
    }
    // Migrar v1 (sessionStorage legacy).
    const rawV1 =
      sessionStorage.getItem(DRAFT_KEY_V1) || localStorage.getItem(DRAFT_KEY_V1);
    if (!rawV1) return null;
    const legacy = JSON.parse(rawV1) as {
      v?: number;
      cart?: PosCartLine[];
      customerName?: string;
      guestEmail?: string;
      phoneLada?: string;
      guestPhone?: string;
      payments?: PosPaymentLine[];
      notes?: string;
      requiredFactura?: boolean;
      quoteInput?: string;
      linkedQuoteNumber?: string | null;
    };
    if (!legacy || !Array.isArray(legacy.cart)) return null;
    return {
      v: 2,
      tab: "cobrar",
      search: "",
      cartSearch: "",
      cartPage: 1,
      cart: legacy.cart,
      customerName: String(legacy.customerName || ""),
      guestEmail: String(legacy.guestEmail || ""),
      phoneLada: String(legacy.phoneLada || "+52"),
      guestPhone: String(legacy.guestPhone || ""),
      payments: Array.isArray(legacy.payments) ? legacy.payments : [],
      notes: String(legacy.notes || ""),
      requiredFactura: Boolean(legacy.requiredFactura),
      quoteInput: String(legacy.quoteInput || ""),
      linkedQuoteNumber: legacy.linkedQuoteNumber || null,
      manualCapture: null,
      cashForms: { ...EMPTY_CASH_FORMS },
      serialForms: { ...EMPTY_SERIAL_FORMS },
      lastSale: null,
      ticketOpen: false,
      detailSaleId: null,
      warrantyDetailId: null,
      cancelReason: "",
      inventoryReason: "",
    };
  } catch {
    return null;
  }
}

function writePosDraft(draft: PosDraftV2 | null) {
  if (typeof window === "undefined") return;
  try {
    if (!draft) {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(DRAFT_KEY_V1);
      sessionStorage.removeItem(DRAFT_KEY_V1);
      return;
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    // Limpia legacy para no rehidratar datos viejos.
    sessionStorage.removeItem(DRAFT_KEY_V1);
    localStorage.removeItem(DRAFT_KEY_V1);
  } catch {
    // ignore quota / private mode
  }
}

function clearPosDraft() {
  writePosDraft(null);
}

function readCashHint(): CashHint | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem(CASH_HINT_KEY) ||
      sessionStorage.getItem(CASH_HINT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CashHint;
    if (!parsed || !Number.isSafeInteger(Number(parsed.branchId))) return null;
    return {
      branchId: Number(parsed.branchId),
      open: Boolean(parsed.open),
      idCashSession:
        parsed.idCashSession != null ? Number(parsed.idCashSession) : null,
      at: parsed.at,
    };
  } catch {
    return null;
  }
}

function writeCashHint(hint: CashHint | null) {
  if (typeof window === "undefined") return;
  try {
    if (!hint) {
      localStorage.removeItem(CASH_HINT_KEY);
      sessionStorage.removeItem(CASH_HINT_KEY);
      return;
    }
    const payload = JSON.stringify({ ...hint, at: Date.now() });
    localStorage.setItem(CASH_HINT_KEY, payload);
    sessionStorage.removeItem(CASH_HINT_KEY);
  } catch {
    // ignore quota / private mode
  }
}

function readStoredBranchId(): number | null {
  if (typeof window === "undefined") return null;
  const n = Number(localStorage.getItem(BRANCH_STORAGE_KEY));
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function parseListPage(raw: string | null | undefined, fallback = 1): number {
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < 1) return fallback;
  return Math.min(n, 9_999);
}

function shouldSearchProducts(q: string): boolean {
  const term = q.trim();
  if (!term) return false;
  if (term.length >= 2) return true;
  return /^\d{8,}$/.test(term);
}

function isValidEmailFormat(email: string): boolean {
  const v = email.trim();
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isValidPhoneDigits(phone: string): boolean {
  const v = phone.trim();
  if (!v) return true;
  return /^\d{10}$/.test(v);
}

function roundMoney(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function lineTotal(unitPrice: number, quantity: number, discountPct: number) {
  return roundMoney(unitPrice * quantity * (1 - discountPct / 100));
}

function firstImage(imageUrl: unknown): string | null {
  if (!imageUrl) return null;
  if (typeof imageUrl === "string") {
    const t = imageUrl.trim();
    if (!t) return null;
    if (t.startsWith("[") || t.startsWith("{")) {
      try {
        return firstImage(JSON.parse(t));
      } catch {
        return t;
      }
    }
    return t;
  }
  if (Array.isArray(imageUrl) && imageUrl[0]) return String(imageUrl[0]);
  if (typeof imageUrl === "object" && imageUrl !== null) {
    const values = Object.values(imageUrl as Record<string, unknown>);
    if (values[0]) return String(values[0]);
  }
  return null;
}

export default function usePos() {
  const { requestGet, requestPost } = UtilsService();
  const { setDataModal, socketCron, socketCronReady } = useTheContext();
  const { isAdmin, hydrated, can } = usePermissions();
  const { searchParams, setQueryParams } = useQueryParams();

  const tabFromUrl = parsePosTab(searchParams.get("tab"));
  const [tab, setTabState] = useState<PosTab>(tabFromUrl);
  const tabSyncLockRef = useRef(false);
  const draftHydratedRef = useRef(false);

  useEffect(() => {
    if (tabSyncLockRef.current) {
      tabSyncLockRef.current = false;
      return;
    }
    setTabState((prev) => (prev === tabFromUrl ? prev : tabFromUrl));
  }, [tabFromUrl]);

  const setTab = useCallback(
    (next: PosTab) => {
      if (next === tab) {
        // Re-click: solo anclar al inicio del POS (sin pelear con la URL).
        if (typeof window !== "undefined") {
          const root = document.querySelector(".pos-page-root");
          if (root) {
            const y =
              root.getBoundingClientRect().top + window.scrollY - 12;
            window.scrollTo({ top: Math.max(0, y), behavior: "auto" });
          }
        }
        return;
      }
      tabSyncLockRef.current = true;
      setTabState(next);
      // Actualizar snapshot ya: el flush de cleanup no debe reescribir tab vieja.
      if (draftSnapshotRef.current) {
        draftSnapshotRef.current = { ...draftSnapshotRef.current, tab: next };
      }
      setQueryParams({ tab: next === "cobrar" ? null : next });
      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => {
          const root = document.querySelector(".pos-page-root");
          if (!root) return;
          const y = root.getBoundingClientRect().top + window.scrollY - 12;
          window.scrollTo({ top: Math.max(0, y), behavior: "auto" });
        });
      }
    },
    [setQueryParams, tab],
  );

  const [branches, setBranches] = useState<PosBranch[]>([]);
  // null hasta hidratar localStorage (evita mismatch SSR).
  const [branchId, setBranchId] = useState<number | null>(null);
  const [cashOpen, setCashOpen] = useState(false);
  const [cashSession, setCashSession] = useState<PosCashSession | null>(null);
  const [cashExpected, setCashExpected] = useState<number | null>(null);
  const [cashPaymentSummary, setCashPaymentSummary] =
    useState<PosCashPaymentSummary | null>(null);
  /** loading | ready | error — evita mostrar “cerrada” sin verificar. */
  const [cashSync, setCashSync] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [cashSyncMessage, setCashSyncMessage] = useState<string | null>(null);
  const [cashLoading, setCashLoading] = useState(true);
  const [cashSessions, setCashSessions] = useState<PosCashSession[]>([]);
  const [cashSessionsPage, setCashSessionsPage] = useState(() =>
    parseListPage(searchParams.get("cPage")),
  );
  const [cashSessionsTotalPages, setCashSessionsTotalPages] = useState(0);
  const [cashSessionsTotal, setCashSessionsTotal] = useState(0);
  const [cashSessionsLoading, setCashSessionsLoading] = useState(false);
  const [openingFloat, setOpeningFloat] = useState("0");
  const [closingCounted, setClosingCounted] = useState("");
  const [differenceReason, setDifferenceReason] = useState("");
  const [cashMoveAmount, setCashMoveAmount] = useState("");
  const [cashMoveReason, setCashMoveReason] = useState("");
  const [cashNotes, setCashNotes] = useState("");
  const [cashBusy, setCashBusy] = useState(false);
  const [cashSessionDetail, setCashSessionDetail] =
    useState<PosCashSession | null>(null);
  const [cashSessionDetailLoading, setCashSessionDetailLoading] =
    useState(false);
  const [qzSettings, setQzSettings] = useState<QzPosSettings>(() => ({
    ...DEFAULT_QZ_SETTINGS,
  }));
  const [qzPrinters, setQzPrinters] = useState<string[]>([]);
  const [qzBusy, setQzBusy] = useState(false);
  const [serialQuery, setSerialQuery] = useState("");
  const [serialHits, setSerialHits] = useState<PosProductSerial[]>([]);
  const [serialSearching, setSerialSearching] = useState(false);
  const [serialDetail, setSerialDetail] = useState<PosProductSerial | null>(
    null,
  );
  const [rmaNotes, setRmaNotes] = useState("");
  const [rmaBusy, setRmaBusy] = useState(false);
  const [newSerialProductId, setNewSerialProductId] = useState("");
  const [newSerialNumber, setNewSerialNumber] = useState("");
  const [newSerialBusy, setNewSerialBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<PosProductHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState<PosCartLine[]>([]);
  const [cartSearch, setCartSearch] = useState("");
  const [cartSearchDebounced, setCartSearchDebounced] = useState("");
  const [cartPage, setCartPage] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [phoneLada, setPhoneLada] = useState("+52");
  const [guestPhone, setGuestPhone] = useState("");
  const [payments, setPayments] = useState<PosPaymentLine[]>([]);
  const [notes, setNotes] = useState("");
  const [requiredFactura, setRequiredFactura] = useState(false);
  const [quoteInput, setQuoteInput] = useState("");
  const [linkedQuoteNumber, setLinkedQuoteNumber] = useState<string | null>(
    null,
  );
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quotePageAlert, setQuotePageAlert] = useState<{
    type: "error" | "warning" | "success";
    title: string;
    message: string;
    sections?: Array<{ title: string; items: string[] }>;
  } | null>(null);
  const [charging, setCharging] = useState(false);
  const [lastSale, setLastSale] = useState<PosSale | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);

  const [history, setHistory] = useState<PosSale[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(() =>
    parseListPage(searchParams.get("hPage")),
  );
  const [historyTotalPages, setHistoryTotalPages] = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyFolio, setHistoryFolio] = useState(
    () => searchParams.get("hFolio") || "",
  );
  const [historyCustomer, setHistoryCustomer] = useState(
    () => searchParams.get("hCustomer") || "",
  );
  const [historyFrom, setHistoryFrom] = useState(
    () => searchParams.get("hFrom") || "",
  );
  const [historyTo, setHistoryTo] = useState(
    () => searchParams.get("hTo") || "",
  );
  const [historyStatus, setHistoryStatus] = useState(
    () => searchParams.get("hStatus") || "",
  );
  const [detailSale, setDetailSale] = useState<PosSale | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const cancelPasswordRef = useRef("");
  const [cancelling, setCancelling] = useState(false);
  const [inventoryReason, setInventoryReason] = useState("");

  const [warranties, setWarranties] = useState<PosSale[]>([]);
  const [warrantiesLoading, setWarrantiesLoading] = useState(false);
  const [warrantiesPage, setWarrantiesPage] = useState(() =>
    parseListPage(searchParams.get("wPage")),
  );
  const [warrantiesTotalPages, setWarrantiesTotalPages] = useState(0);
  const [warrantiesTotal, setWarrantiesTotal] = useState(0);
  const [warrantyFolio, setWarrantyFolio] = useState(
    () => searchParams.get("wFolio") || "",
  );
  const [warrantyCustomer, setWarrantyCustomer] = useState(
    () => searchParams.get("wCustomer") || "",
  );
  const [warrantySaleId, setWarrantySaleId] = useState(
    () => searchParams.get("wSaleId") || "",
  );
  const [warrantyFrom, setWarrantyFrom] = useState(
    () => searchParams.get("wFrom") || "",
  );
  const [warrantyTo, setWarrantyTo] = useState(
    () => searchParams.get("wTo") || "",
  );
  const [warrantyDetail, setWarrantyDetail] = useState<PosSale | null>(null);

  const searchRef = useRef<HTMLInputElement | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chargeLockRef = useRef(false);
  const chargeIdempotencyKeyRef = useRef<string | null>(null);
  const chargeConfirmOpenRef = useRef(false);
  const draftSnapshotRef = useRef<PosDraftV2 | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [manualCapture, setManualCapture] = useState<PosManualCapture | null>(
    null,
  );
  const [pendingDetailSaleId, setPendingDetailSaleId] = useState<number | null>(
    null,
  );
  const [pendingWarrantyDetailId, setPendingWarrantyDetailId] = useState<
    number | null
  >(null);

  const maxDiscount = isAdmin ? 100 : SELLER_MAX_DISCOUNT_PCT;

  const cancelGate = useMemo(() => {
    if (!detailSale) {
      return { allowed: false, reason: null as string | null };
    }
    return canCancelPosSale({
      status: detailSale.status,
      createdAt: detailSale.createdAt,
      canCancel: can("pos.cancel"),
      canOverride: can("pos.cancel.override"),
    });
  }, [detailSale, can]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let discountTotal = 0;
    for (const line of cart) {
      const base = roundMoney(line.unitPrice * line.quantity);
      const total = lineTotal(line.unitPrice, line.quantity, line.discountPct);
      subtotal = roundMoney(subtotal + base);
      discountTotal = roundMoney(discountTotal + (base - total));
    }
    return {
      subtotal,
      discountTotal,
      total: roundMoney(subtotal - discountTotal),
    };
  }, [cart]);

  const paidSum = useMemo(
    () => roundMoney(payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)),
    [payments],
  );

  const settlement = useMemo(
    () => settlePosPayments(totals.total, payments),
    [totals.total, payments],
  );

  const remaining = settlement.remaining;
  const changeDue = settlement.changeDue;

  const loadBranches = useCallback(async () => {
    const res = await requestGet("/pos/branches", { silent: true });
    const list: PosBranch[] = res?.data?.data || [];
    setBranches(list);
    const cashId =
      Number(res?.data?.cashBranchId) ||
      Number(res?.data?.cashBranch?.idBranche) ||
      list.find((b) => (b as PosBranch & { isCashPoint?: boolean }).isCashPoint)
        ?.idBranche ||
      list.find((b) => Number(b.providerId) === 1)?.idBranche ||
      null;
    if (cashId) {
      setBranchId((prev) => prev ?? cashId);
      if (!readStoredBranchId()) {
        localStorage.setItem(BRANCH_STORAGE_KEY, String(cashId));
      }
    }
  }, [requestGet]);

  useEffect(() => {
    void loadBranches().catch(() => undefined);
  }, [loadBranches]);

  // Evita hydration mismatch: localStorage solo después del mount.
  // UNA sola vez: si depende de setQueryParams, cada cambio de URL re-hidrata,
  // fuerza tab=caja del draft y deja cashSync en "loading" sin re-fetch.
  useEffect(() => {
    if (draftHydratedRef.current) return;
    draftHydratedRef.current = true;

    setQzSettings(loadQzSettings());
    const storedBranch = readStoredBranchId();
    const hint = readCashHint();
    if (storedBranch) {
      setBranchId((prev) => prev ?? storedBranch);
      if (hint?.open && hint.branchId === storedBranch) {
        setCashOpen(true);
        setCashSync("loading");
        setCashSyncMessage("Verificando sesión de caja…");
      }
    }

    const draft = readPosDraft();
    // Aplicar siempre que exista borrador (cualquier checkbox/select/captura).
    if (draft) {
      setCart(Array.isArray(draft.cart) ? draft.cart : []);
      setCustomerName(draft.customerName || "");
      setGuestEmail(draft.guestEmail || "");
      setPhoneLada(draft.phoneLada || "+52");
      setGuestPhone(draft.guestPhone || "");
      setPayments(Array.isArray(draft.payments) ? draft.payments : []);
      setNotes(draft.notes || "");
      setRequiredFactura(Boolean(draft.requiredFactura));
      setQuoteInput(draft.quoteInput || "");
      setLinkedQuoteNumber(draft.linkedQuoteNumber || null);
      setManualCapture(draft.manualCapture);
      setSearch(draft.search || "");
      setCartSearch(draft.cartSearch || "");
      setCartPage(Math.max(1, Number(draft.cartPage) || 1));
      setOpeningFloat(draft.cashForms?.openingFloat || "0");
      setClosingCounted(draft.cashForms?.closingCounted || "");
      setDifferenceReason(draft.cashForms?.differenceReason || "");
      setCashMoveAmount(draft.cashForms?.cashMoveAmount || "");
      setCashMoveReason(draft.cashForms?.cashMoveReason || "");
      setCashNotes(draft.cashForms?.cashNotes || "");
      setSerialQuery(draft.serialForms?.serialQuery || "");
      setRmaNotes(draft.serialForms?.rmaNotes || "");
      setNewSerialProductId(draft.serialForms?.newSerialProductId || "");
      setNewSerialNumber(draft.serialForms?.newSerialNumber || "");
      setLastSale(draft.lastSale || null);
      setTicketOpen(Boolean(draft.ticketOpen) && Boolean(draft.lastSale));
      setCancelReason(draft.cancelReason || "");
      setInventoryReason(draft.inventoryReason || "");
      if (draft.detailSaleId != null) {
        setPendingDetailSaleId(draft.detailSaleId);
      }
      if (draft.warrantyDetailId != null) {
        setPendingWarrantyDetailId(draft.warrantyDetailId);
      }
      draftSnapshotRef.current = draft;
      // Restaurar pestaña si la URL no trae `tab` (vuelva al módulo / F5 sin query).
      const urlTab = new URLSearchParams(window.location.search).get("tab");
      if (!urlTab && draft.tab && draft.tab !== "cobrar") {
        tabSyncLockRef.current = true;
        setTabState(draft.tab);
        setQueryParams({ tab: draft.tab });
      }
    }
    setDraftReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only hydrate
  }, []);

  const buildLiveDraft = useCallback((): PosDraftV2 => {
    return {
      v: 2,
      tab,
      search,
      cartSearch,
      cartPage,
      cart,
      customerName,
      guestEmail,
      phoneLada,
      guestPhone,
      payments,
      notes,
      requiredFactura,
      quoteInput,
      linkedQuoteNumber,
      manualCapture,
      cashForms: {
        openingFloat,
        closingCounted,
        differenceReason,
        cashMoveAmount,
        cashMoveReason,
        cashNotes,
      },
      serialForms: {
        serialQuery,
        rmaNotes,
        newSerialProductId,
        newSerialNumber,
      },
      lastSale,
      ticketOpen,
      detailSaleId: detailSale?.idPosSale ?? null,
      warrantyDetailId: warrantyDetail?.idPosSale ?? null,
      cancelReason,
      inventoryReason,
    };
  }, [
    tab,
    search,
    cartSearch,
    cartPage,
    cart,
    customerName,
    guestEmail,
    phoneLada,
    guestPhone,
    payments,
    notes,
    requiredFactura,
    quoteInput,
    linkedQuoteNumber,
    manualCapture,
    openingFloat,
    closingCounted,
    differenceReason,
    cashMoveAmount,
    cashMoveReason,
    cashNotes,
    serialQuery,
    rmaNotes,
    newSerialProductId,
    newSerialNumber,
    lastSale,
    ticketOpen,
    detailSale,
    warrantyDetail,
    cancelReason,
    inventoryReason,
  ]);

  // Borrador del módulo POS: escribir en cada cambio (sin debounce que pierda datos).
  useEffect(() => {
    if (!draftReady) return;
    const snapshot = buildLiveDraft();
    draftSnapshotRef.current = snapshot;
    writePosDraft(snapshot);
  }, [draftReady, buildLiveDraft]);

  // Flush extra al ocultar/cerrar pestaña o salir del módulo.
  useEffect(() => {
    if (!draftReady) return;
    const flush = () => {
      const snap = buildLiveDraft();
      draftSnapshotRef.current = snap;
      writePosDraft(snap);
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [draftReady, buildLiveDraft]);

  // Reabrir detalle de venta / garantía tras F5.
  useEffect(() => {
    if (!draftReady || pendingDetailSaleId == null) return;
    const id = pendingDetailSaleId;
    setPendingDetailSaleId(null);
    void (async () => {
      try {
        const res = await requestGet(`/pos/sales/${id}`, { silent: true });
        const sale = (res?.data?.data || null) as PosSale | null;
        if (sale) setDetailSale(sale);
      } catch {
        // ignore
      }
    })();
  }, [draftReady, pendingDetailSaleId, requestGet]);

  useEffect(() => {
    if (!draftReady || pendingWarrantyDetailId == null) return;
    const id = pendingWarrantyDetailId;
    setPendingWarrantyDetailId(null);
    void (async () => {
      try {
        const res = await requestGet(`/pos/sales/${id}`, { silent: true });
        const sale = (res?.data?.data || null) as PosSale | null;
        if (sale) setWarrantyDetail(sale);
      } catch {
        // ignore
      }
    })();
  }, [draftReady, pendingWarrantyDetailId, requestGet]);

  const applyCashStatusPayload = useCallback(
    (branch: number, data: any) => {
      const isOpen = Boolean(data?.open);
      const session = data?.session || null;
      setCashOpen(isOpen);
      setCashSession(session);
      setCashExpected(
        data?.expectedCash != null ? Number(data.expectedCash) : null,
      );
      setCashPaymentSummary(
        data?.paymentSummary
          ? {
              salesCount: Number(data.paymentSummary.salesCount) || 0,
              salesTotal: Number(data.paymentSummary.salesTotal) || 0,
              byMethod: data.paymentSummary.byMethod || {},
            }
          : null,
      );
      writeCashHint({
        branchId: branch,
        open: isOpen,
        idCashSession: session?.idCashSession
          ? Number(session.idCashSession)
          : null,
      });
      setCashSync("ready");
      setCashSyncMessage(null);
      return isOpen;
    },
    [],
  );

  const loadCashStatus = useCallback(
    async (opts?: { retries?: number }) => {
      if (!branchId) {
        setCashOpen(false);
        setCashSession(null);
        setCashExpected(null);
        setCashPaymentSummary(null);
        setCashSync("ready");
        setCashSyncMessage(null);
        setCashLoading(false);
        return false;
      }
      const retries = Math.max(0, opts?.retries ?? 2);
      setCashLoading(true);
      setCashSync((prev) => (prev === "ready" ? prev : "loading"));
      let lastError: unknown = null;
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const res = await requestGet(
            `/pos/cash/status?branchId=${branchId}`,
            { silent: true },
          );
          // Acepta { data: { open } } o { open } según wrapper.
          const payload = res?.data?.data ?? res?.data;
          if (
            payload == null ||
            typeof payload !== "object" ||
            !("open" in payload)
          ) {
            throw new Error("Respuesta de caja incompleta");
          }
          const isOpen = applyCashStatusPayload(branchId, payload);
          setCashLoading(false);
          return isOpen;
        } catch (error) {
          lastError = error;
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
          }
        }
      }
      // Fallo: NO marcar cerrada. Conservar hint abierto si aplica.
      const hint = readCashHint();
      const keepOpen = Boolean(
        hint?.open && hint.branchId === branchId,
      );
      setCashOpen(keepOpen);
      setCashSync("error");
      setCashSyncMessage(
        keepOpen
          ? "No se pudo verificar la caja. La última sesión conocida sigue abierta; reintenta."
          : "No se pudo verificar si la caja está abierta. Reintenta antes de abrir otra.",
      );
      console.warn("[POS] loadCashStatus failed:", lastError);
      setCashLoading(false);
      return null;
    },
    [branchId, requestGet, applyCashStatusPayload],
  );

  const loadCashSessions = useCallback(
    async (page = 1) => {
      if (!branchId) {
        setCashSessions([]);
        setCashSessionsPage(1);
        setCashSessionsTotalPages(0);
        setCashSessionsTotal(0);
        return;
      }
      setCashSessionsLoading(true);
      try {
        const params = new URLSearchParams({
          branchId: String(branchId),
          page: String(page),
          limit: "10",
        });
        const res = await requestGet(`/pos/cash/sessions?${params}`, {
          silent: true,
        });
        setCashSessions(res?.data?.data || []);
        setCashSessionsPage(res?.data?.pagination?.page || page);
        setCashSessionsTotalPages(res?.data?.pagination?.totalPages || 0);
        setCashSessionsTotal(res?.data?.pagination?.total || 0);
      } catch {
        setCashSessions([]);
        setCashSessionsTotalPages(0);
        setCashSessionsTotal(0);
      } finally {
        setCashSessionsLoading(false);
      }
    },
    [branchId, requestGet],
  );

  // Siempre sincronizar caja cuando hay bodega (cualquier pestaña / al refrescar).
  useEffect(() => {
    if (!branchId) return;
    void loadCashStatus({ retries: 2 }).catch(() => undefined);
  }, [branchId, loadCashStatus]);

  const loadCashSessionsRef = useRef(loadCashSessions);
  loadCashSessionsRef.current = loadCashSessions;
  const cashSessionsPageParam = searchParams.get("cPage");

  useEffect(() => {
    if (tab !== "caja" || !branchId) return;
    void loadCashSessionsRef.current(parseListPage(cashSessionsPageParam));
  }, [tab, branchId, cashSessionsPageParam]);

  const goCashSessionsPage = useCallback(
    (page: number) => {
      setQueryParams({ cPage: page <= 1 ? null : page });
    },
    [setQueryParams],
  );

  const openCash = useCallback(async () => {
    if (!branchId) return;
    setCashBusy(true);
    try {
      const res = await requestPost(
        {
          branchId,
          openingFloat: Number(openingFloat) || 0,
          notes: cashNotes || null,
        },
        "/pos/cash/open",
      );
      setCashNotes("");
      const opened = res?.data?.data ?? res?.data;
      // openCashSession devuelve la sesión aplanada (+ alreadyOpen).
      if (opened?.idCashSession != null || opened?.alreadyOpen) {
        setCashOpen(true);
        if (opened?.idCashSession != null) {
          setCashSession(opened as PosCashSession);
          if (opened.expectedCash != null) {
            setCashExpected(Number(opened.expectedCash));
          }
        }
        writeCashHint({
          branchId,
          open: true,
          idCashSession:
            opened?.idCashSession != null
              ? Number(opened.idCashSession)
              : null,
        });
        setCashSync("ready");
        setCashSyncMessage(null);
      }
      await loadCashStatus({ retries: 2 });
      setQueryParams({ cPage: null });
      await loadCashSessions(1);
      const alreadyOpen = Boolean(opened?.alreadyOpen);
      setDataModal({
        isOpen: true,
        title: alreadyOpen ? "Caja ya abierta" : "Caja abierta",
        content: alreadyOpen
          ? "Había una sesión abierta en esta bodega. Ya puedes cobrar en efectivo."
          : "Ya puedes cobrar en efectivo en esta bodega.",
        type: "success",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
    } catch {
      // Si el backend viejo aún responde 400 “ya abierta”, resincronizar.
      await loadCashStatus({ retries: 2 });
    } finally {
      setCashBusy(false);
    }
  }, [
    branchId,
    openingFloat,
    cashNotes,
    requestPost,
    loadCashStatus,
    loadCashSessions,
    setQueryParams,
    setDataModal,
  ]);

  const addCashMovement = useCallback(
    async (type: "cash_in" | "cash_out") => {
      if (!branchId) return;
      const amount = Number(cashMoveAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setDataModal({
          isOpen: true,
          title: "Monto inválido",
          content:
            "Indica cuánto efectivo vas a meter o sacar del cajón (mayor a cero).",
          type: "warning",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
        });
        return;
      }
      if (cashMoveReason.trim().length < 5) {
        setDataModal({
          isOpen: true,
          title: "Motivo requerido",
          content:
            "Escribe por qué mueves el efectivo (ej. fondo extra, gasto, envío a oficina). Mínimo 5 caracteres.",
          type: "warning",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
        });
        return;
      }
      setCashBusy(true);
      try {
        await requestPost(
          {
            branchId,
            type,
            amount,
            reason: cashMoveReason.trim(),
          },
          "/pos/cash/movements",
        );
        setCashMoveAmount("");
        setCashMoveReason("");
        await loadCashStatus();
      } catch {
        // handled
      } finally {
        setCashBusy(false);
      }
    },
    [
      branchId,
      cashMoveAmount,
      cashMoveReason,
      requestPost,
      loadCashStatus,
      setDataModal,
    ],
  );

  const closeCash = useCallback(async () => {
    if (!branchId) return;
    const counted = Number(closingCounted);
    if (!Number.isFinite(counted) || counted < 0) {
      setDataModal({
        isOpen: true,
        title: "Conteo inválido",
        content: "Indica el efectivo contado al cierre.",
        type: "warning",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
      return;
    }
    const expected = Number(cashExpected ?? 0);
    const previewDiff =
      Math.round((counted - expected + Number.EPSILON) * 100) / 100;
    const hasDiff = Math.abs(previewDiff) > 0.009;
    if (hasDiff && differenceReason.trim().length < 5) {
      setDataModal({
        isOpen: true,
        title: "Motivo de descuadre",
        content: `Hay diferencia de ${formatMoney(previewDiff)}. Debes explicar el descuadre (mín. 5 caracteres) antes de cerrar.`,
        type: "warning",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
      return;
    }

    const confirmClose = async () => {
      setCashBusy(true);
      try {
        const res = await requestPost(
          {
            branchId,
            closingCounted: counted,
            notes: cashNotes || null,
            differenceReason: hasDiff ? differenceReason.trim() : null,
          },
          "/pos/cash/close",
        );
        const diff = res?.data?.data?.difference;
        setClosingCounted("");
        setDifferenceReason("");
        setCashNotes("");
        setCashOpen(false);
        setCashSession(null);
        setCashExpected(null);
        setCashPaymentSummary(null);
        writeCashHint({ branchId, open: false, idCashSession: null });
        setCashSync("ready");
        setCashSyncMessage(null);
        await loadCashStatus({ retries: 2 });
        await loadCashSessions(1);
        setDataModal({
          isOpen: true,
          title: hasDiff ? "Corte con descuadre" : "Corte cerrado",
          content:
            diff != null
              ? `Diferencia: ${formatMoney(Number(diff))}${
                  hasDiff && differenceReason.trim()
                    ? ` · Motivo: ${differenceReason.trim()}`
                    : ""
                }`
              : "Sesión de caja cerrada.",
          type: hasDiff ? "warning" : "success",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
        });
      } catch {
        // handled
      } finally {
        setCashBusy(false);
      }
    };

    if (hasDiff) {
      setDataModal({
        isOpen: true,
        title: "Confirmar descuadre",
        content: `Vas a cerrar con diferencia de ${formatMoney(previewDiff)}. Motivo: «${differenceReason.trim()}». ¿Continuar?`,
        type: "warning",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => {
          setDataModal((p) => ({ ...p, isOpen: false }));
          await confirmClose();
        },
      });
      return;
    }

    await confirmClose();
  }, [
    branchId,
    closingCounted,
    cashExpected,
    differenceReason,
    cashNotes,
    requestPost,
    loadCashStatus,
    loadCashSessions,
    setDataModal,
  ]);

  const openCashSessionDetail = useCallback(
    async (id: number) => {
      setCashSessionDetailLoading(true);
      try {
        const res = await requestGet(`/pos/cash/sessions/${id}`, {
          silent: true,
        });
        setCashSessionDetail(res?.data?.data || null);
      } catch {
        setCashSessionDetail(null);
        setDataModal({
          isOpen: true,
          title: "No se cargó la sesión",
          content: "No se pudo cargar el detalle de la sesión.",
          type: "error",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
        });
      } finally {
        setCashSessionDetailLoading(false);
      }
    },
    [requestGet, setDataModal],
  );

  const hasCashPayment = useMemo(
    () => payments.some((p) => p.method === "efectivo_sucursal"),
    [payments],
  );
  const productSearchGen = useRef(0);

  const runProductSearch = useCallback(
    async (q: string) => {
      if (!shouldSearchProducts(q)) {
        productSearchGen.current += 1;
        setHits([]);
        setSearching(false);
        return;
      }
      const gen = ++productSearchGen.current;
      setSearching(true);
      try {
        const res = await Promise.race([
          requestGet(
            `/pos/products/search?q=${encodeURIComponent(q.trim())}`,
            { silent: true },
          ),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("search_timeout")), 15000);
          }),
        ]);
        if (gen !== productSearchGen.current) return;
        const body = res?.data;
        const list = Array.isArray(body?.data)
          ? body.data
          : Array.isArray(body)
            ? body
            : [];
        setHits(list);
      } catch {
        if (gen !== productSearchGen.current) return;
        setHits([]);
      } finally {
        if (gen === productSearchGen.current) setSearching(false);
      }
    },
    [requestGet],
  );

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      void runProductSearch(search);
    }, 280);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search, runProductSearch]);

  // Precio / stock / active del cron → hits visibles + líneas del carrito POS.
  useEffect(() => {
    const cronSocket = socketCron?.current;
    if (!cronSocket || !socketCronReady) return;

    const onCronUpdate = (payload: unknown) => {
      const updates = Array.isArray(payload) ? payload : [payload];
      if (!updates.length) return;

      const matchUpdate = (idProduct: number) =>
        updates.find(
          (u: any) => Number(u?.idProduct) === Number(idProduct),
        ) as
          | {
              idProduct: number;
              price?: number;
              stock?: number;
              active?: number;
              branches?: Record<string, number>;
            }
          | undefined;

      const patchStocksByBranch = (
        stocksByBranch: PosCartLine["stocksByBranch"] | undefined,
        branchMap: Record<string, number>,
      ) => {
        if (!stocksByBranch?.length) return stocksByBranch;
        return stocksByBranch.map((st) => {
          const keys = [st.name, st.label, st.city, String(st.branchId)]
            .filter(Boolean)
            .map((k) => String(k).toLowerCase());
          const matchKey = Object.keys(branchMap).find((bk) =>
            keys.some(
              (k) =>
                k === bk.toLowerCase() ||
                k.includes(bk.toLowerCase()) ||
                bk.toLowerCase().includes(k),
            ),
          );
          if (!matchKey) return st;
          return {
            ...st,
            stock: Math.max(0, Number(branchMap[matchKey]) || 0),
          };
        });
      };

      setHits((prev) => {
        if (!prev.length) return prev;
        let changed = false;
        const next = prev.map((hit) => {
          const update = matchUpdate(hit.idProduct);
          if (!update) return hit;
          changed = true;

          let stockGlobal =
            update.stock != null
              ? Math.max(0, Number(update.stock) || 0)
              : hit.stockGlobal;
          let stocksByBranch = hit.stocksByBranch;

          if (update.branches && Object.keys(update.branches).length > 0) {
            const branchMap = update.branches;
            if (hit.stocksByBranch?.length) {
              stocksByBranch = patchStocksByBranch(
                hit.stocksByBranch,
                branchMap,
              );
              stockGlobal = (stocksByBranch ?? []).reduce(
                (sum, st) => sum + Math.max(0, Number(st.stock) || 0),
                0,
              );
            } else {
              stockGlobal = Object.values(branchMap).reduce(
                (sum, qty) => sum + Math.max(0, Number(qty) || 0),
                0,
              );
            }
          }

          const active =
            update.active != null ? Number(update.active) : undefined;
          const inStock =
            active != null
              ? active === 1 && stockGlobal > 0
              : stockGlobal > 0;

          const priceRaw =
            update.price != null ? Number(update.price) : undefined;

          return {
            ...hit,
            price:
              priceRaw != null && Number.isFinite(priceRaw)
                ? priceRaw
                : hit.price,
            stockGlobal,
            stocksByBranch,
            inStock,
          };
        });
        return changed ? next : prev;
      });

      setCart((prev) => {
        if (!prev.length) return prev;
        let changed = false;
        const next = prev.map((line) => {
          if (line.isManual) return line;
          const update = matchUpdate(line.productId);
          if (!update) return line;
          changed = true;

          let stocksByBranch = line.stocksByBranch;
          let stockBranch = line.stockBranch;

          if (update.branches && Object.keys(update.branches).length > 0) {
            stocksByBranch =
              patchStocksByBranch(line.stocksByBranch, update.branches) ??
              line.stocksByBranch;
            if (line.branchId != null && stocksByBranch?.length) {
              const st = stocksByBranch.find(
                (s) => Number(s.branchId) === Number(line.branchId),
              );
              if (st) stockBranch = Math.max(0, Number(st.stock) || 0);
            } else if (update.stock != null) {
              stockBranch = Math.max(0, Number(update.stock) || 0);
            }
          } else if (update.stock != null) {
            stockBranch = Math.max(0, Number(update.stock) || 0);
          }

          const priceRaw =
            update.price != null ? Number(update.price) : undefined;

          const quantity =
            Number(line.providerId) === 1 &&
            stockBranch > 0 &&
            line.quantity > stockBranch
              ? stockBranch
              : line.quantity;

          return {
            ...line,
            unitPrice:
              priceRaw != null && Number.isFinite(priceRaw)
                ? roundMoney(priceRaw)
                : line.unitPrice,
            stocksByBranch,
            stockBranch,
            quantity,
          };
        });
        return changed ? next : prev;
      });
    };

    cronSocket.on("updatedStockCron", onCronUpdate);
    return () => {
      cronSocket.off("updatedStockCron", onCronUpdate);
    };
  }, [socketCron, socketCronReady]);

  const addProduct = useCallback(
    (product: PosProductHit, chosenBranchId?: number | null) => {
      const tracksStock = true;

      // Validación interna: no se puede forzar agregar sin stock (UI deshabilitada ≠ bypass).
      if (tracksStock && isPosProductOutOfStock(product)) {
        setDataModal({
          isOpen: true,
          title: "Sin stock",
          content: `«${product.name}» no tiene existencia disponible. No se puede agregar al carrito.`,
          type: "warning",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
        });
        return;
      }

      const stocks = product.stocksByBranch || [];
      const needsBranch = stocks.length > 0;
      let branchIdLine: number | null =
        chosenBranchId ??
        product.suggestedBranchId ??
        stocks.find((st) => st.stock > 0)?.branchId ??
        stocks[0]?.branchId ??
        null;

      if (needsBranch) {
        if (branchIdLine == null) {
          setDataModal({
            isOpen: true,
            title: "Elige bodega",
            content: `«${product.name}» requiere elegir bodega (${product.providerName || "proveedor"}).`,
            type: "warning",
            showActions: true,
            onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
            onConfirm: async () =>
              setDataModal((p) => ({ ...p, isOpen: false })),
          });
          return;
        }
        if (tracksStock) {
          const stockRow = stocks.find((st) => st.branchId === branchIdLine);
          const available = stockRow?.stock ?? 0;
          if (available <= 0) {
            setDataModal({
              isOpen: true,
              title: "Sin stock",
              content: `«${product.name}» no tiene existencia en ${stockRow?.label || "esa bodega"}.`,
              type: "warning",
              showActions: true,
              onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
              onConfirm: async () =>
                setDataModal((p) => ({ ...p, isOpen: false })),
            });
            return;
          }
        }
      } else if (tracksStock && product.stockGlobal <= 0) {
        setDataModal({
          isOpen: true,
          title: "Sin stock",
          content: `«${product.name}» no tiene existencia global.`,
          type: "warning",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
        });
        return;
      }

      const branchMeta = stocks.find((st) => st.branchId === branchIdLine);
      const stockCap = tracksStock
        ? needsBranch
          ? branchMeta?.stock ?? 0
          : product.stockGlobal
        : 999999;
      const lineKey = `p-${product.idProduct}-b-${branchIdLine ?? "g"}`;

      setCart((prev) => {
        const existing = prev.find((l) => l.key === lineKey);
        if (existing) {
          const nextQty = existing.quantity + 1;
          if (tracksStock && nextQty > stockCap) {
            setDataModal({
              isOpen: true,
              title: "Stock insuficiente",
              content: `Solo hay ${stockCap} unidad(es) en ${branchMeta?.label || "inventario"}.`,
              type: "warning",
              showActions: true,
              onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
              onConfirm: async () =>
                setDataModal((p) => ({ ...p, isOpen: false })),
            });
            return prev;
          }
          return prev.map((l) =>
            l.key === lineKey
              ? {
                  ...l,
                  quantity: nextQty,
                  stockBranch: stockCap,
                  serials: [
                    ...l.serials,
                    ...Array(Math.max(0, nextQty - l.serials.length)).fill(""),
                  ].slice(0, nextQty),
                }
              : l,
          );
        }
        return [
          ...prev,
          {
            key: lineKey,
            productId: product.idProduct,
            name: product.name,
            sku: product.sku,
            upc: product.upc,
            unitPrice: product.price,
            quantity: 1,
            discountPct: 0,
            branchId: branchIdLine,
            branchLabel: branchMeta
              ? formatPosBranchUiLabel({
                  name: branchMeta.name,
                  label: branchMeta.label,
                  city: branchMeta.city,
                })
              : Number(product.providerId) === 1
                ? "PCinBOX-León"
                : null,
            stockBranch: stockCap,
            stocksByBranch: stocks,
            imageUrl: firstImage(product.image_url),
            requiresSerial: Boolean(product.requiresSerial),
            warrantyMonths:
              Number(product.providerId) === 2 ||
              (Number(product.providerId) === 1 && Boolean(product.isPC))
                ? 12
                : product.warrantyMonths ?? null,
            warrantyMode:
              Number(product.providerId) === 2 ||
              (Number(product.providerId) === 1 && Boolean(product.isPC))
                ? "months"
                : product.warrantyMode ?? null,
            warrantyUnit: "months" as const,
            isPC: Boolean(product.isPC),
            serials: [""],
            isManual: false,
            providerId: product.providerId ?? null,
          },
        ];
      });
      setSearch("");
      setHits([]);
      searchRef.current?.focus();
    },
    [setDataModal],
  );

  const addManualLine = useCallback(
    (input: {
      name: string;
      unitPrice: number;
      quantity?: number;
      upc?: string;
      sku?: string;
      warrantyMode?: string | null;
      warrantyMonths?: number | null;
      warrantyUnit?: "months" | "years" | null;
      serials?: string[];
      manualKind?: "product" | "service";
      serviceIntake?: PosServiceIntake | null;
    }) => {
      const manualKind =
        input.manualKind === "service" ? "service" : "product";
      const name = String(input.name || "").trim();
      const unitPrice = Number(input.unitPrice);
      const quantity = Math.max(1, Math.round(Number(input.quantity) || 1));
      if (name.length < 2) {
        setDataModal({
          isOpen: true,
          title: "Nombre requerido",
          content:
            manualKind === "service"
              ? "Escribe el nombre del servicio (mín. 2 caracteres)."
              : "Escribe el nombre del producto manual (mín. 2 caracteres).",
          type: "warning",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
        });
        return false;
      }
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        setDataModal({
          isOpen: true,
          title: "Precio requerido",
          content:
            manualKind === "service"
              ? "Captura el precio unitario del servicio (debe ser mayor a 0)."
              : "Captura el precio unitario del producto (debe ser mayor a 0).",
          type: "warning",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
        });
        return false;
      }
      if (!Number.isFinite(quantity) || quantity < 1) {
        setDataModal({
          isOpen: true,
          title: "Cantidad inválida",
          content: "La cantidad debe ser al menos 1.",
          type: "warning",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
        });
        return false;
      }
      const warrantyMode = String(input.warrantyMode || "").trim();
      if (!warrantyMode) {
        setDataModal({
          isOpen: true,
          title: "Garantía requerida",
          content:
            "Elige la garantía (meses, años, no aplica o centro de servicio).",
          type: "warning",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
        });
        return false;
      }
      let warrantyMonths: number | null = null;
      let warrantyUnit: "months" | "years" | null = null;
      if (warrantyMode === "months") {
        const n = Number(input.warrantyMonths);
        if (!Number.isFinite(n) || n <= 0) {
          setDataModal({
            isOpen: true,
            title: "Garantía requerida",
            content: "Indica la duración de la garantía.",
            type: "warning",
            showActions: true,
            onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
            onConfirm: async () =>
              setDataModal((p) => ({ ...p, isOpen: false })),
          });
          return false;
        }
        warrantyMonths = Math.round(n);
        warrantyUnit =
          input.warrantyUnit === "years" ? "years" : "months";
      } else if (
        warrantyMode !== "none" &&
        warrantyMode !== "service_center"
      ) {
        setDataModal({
          isOpen: true,
          title: "Garantía inválida",
          content: "Elige una opción de garantía válida.",
          type: "warning",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
        });
        return false;
      }
      let serviceIntake: PosServiceIntake | null = null;
      if (manualKind === "service") {
        const intake = input.serviceIntake;
        const equipment = Array.isArray(intake?.equipment)
          ? intake!.equipment
              .map((row) => ({
                quantity: Math.max(
                  1,
                  Math.round(Number(row.quantity) || 1),
                ),
                description: String(row.description || "").trim(),
                serialNumber: String(row.serialNumber || "").trim(),
                physicalCondition: String(row.physicalCondition || "").trim(),
              }))
              .filter((row) => row.description.length > 0)
          : [];
        const failure = String(
          intake?.failureOrRequestedService || "",
        ).trim();
        if (equipment.length < 1) {
          setDataModal({
            isOpen: true,
            title: "Datos del equipo",
            content:
              "Agrega al menos un equipo/componente con descripción en la tabla.",
            type: "warning",
            showActions: true,
            onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
            onConfirm: async () =>
              setDataModal((p) => ({ ...p, isOpen: false })),
          });
          return false;
        }
        if (
          equipment.some((row) => row.physicalCondition.length < 1)
        ) {
          setDataModal({
            isOpen: true,
            title: "Estado físico",
            content:
              "Indica el estado físico de cada equipo (si eliges Otro, escribe el detalle).",
            type: "warning",
            showActions: true,
            onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
            onConfirm: async () =>
              setDataModal((p) => ({ ...p, isOpen: false })),
          });
          return false;
        }
        if (failure.length < 2) {
          setDataModal({
            isOpen: true,
            title: "Falla o servicio",
            content: "Describe la falla o el servicio solicitado.",
            type: "warning",
            showActions: true,
            onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
            onConfirm: async () =>
              setDataModal((p) => ({ ...p, isOpen: false })),
          });
          return false;
        }
        serviceIntake = {
          serviceType: String(intake?.serviceType || name).trim() || name,
          equipment,
          failureOrRequestedService: failure.slice(0, 4000),
          technicalObservationsOnReceipt: String(
            intake?.technicalObservationsOnReceipt || "",
          )
            .trim()
            .slice(0, 4000),
        };
      }
      const serialsRaw =
        manualKind === "service"
          ? []
          : Array.isArray(input.serials)
            ? input.serials
            : [];
      const serials = [
        ...serialsRaw.map((s) => String(s || "")),
        ...Array(Math.max(0, quantity - serialsRaw.length)).fill(""),
      ].slice(0, quantity);
      const lineKey = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setCart((prev) => [
        ...prev,
        {
          key: lineKey,
          productId: 0,
          name,
          sku:
            manualKind === "service"
              ? null
              : String(input.sku || "").trim() || null,
          upc:
            manualKind === "service"
              ? null
              : String(input.upc || "").trim() || null,
          unitPrice: roundMoney(unitPrice),
          quantity,
          discountPct: 0,
          branchId: null,
          branchLabel:
            manualKind === "service" ? "Servicio adicional" : "Captura manual",
          stockBranch: 999999,
          stocksByBranch: [],
          imageUrl: null,
          requiresSerial: false,
          warrantyMode:
            warrantyMode === "none" || warrantyMode === "service_center"
              ? warrantyMode
              : "months",
          warrantyMonths,
          warrantyUnit,
          serials,
          isManual: true,
          manualKind,
          serviceIntake,
        },
      ]);
      return true;
    },
    [setDataModal],
  );

  const updateLine = useCallback(
    (lineKey: string, patch: Partial<PosCartLine>) => {
      setCart((prev) =>
        prev.map((l) => {
          if (l.key !== lineKey) return l;
          const safePatch = l.isManual
            ? patch
            : (() => {
                const { unitPrice: _ignoredPrice, ...rest } = patch;
                return rest;
              })();
          const next = { ...l, ...safePatch };
          if (!Number.isFinite(next.quantity) || next.quantity < 1) {
            next.quantity = 1;
          }
          if (
            !next.isManual &&
            Number(next.providerId) === 1 &&
            next.stockBranch > 0 &&
            next.quantity > next.stockBranch
          ) {
            next.quantity = next.stockBranch;
          }
          if (next.isManual && "unitPrice" in safePatch) {
            const p = Number(next.unitPrice);
            if (!Number.isFinite(p) || p <= 0) {
              next.unitPrice = l.unitPrice; // no permitir 0 / vacío en captura manual
            } else {
              next.unitPrice = roundMoney(p);
            }
          } else if (next.isManual && Number.isFinite(Number(next.unitPrice))) {
            next.unitPrice = roundMoney(Math.max(0, Number(next.unitPrice)));
          }
          next.discountPct = 0;
          if (next.serials.length < next.quantity) {
            next.serials = [
              ...next.serials,
              ...Array(next.quantity - next.serials.length).fill(""),
            ];
          } else if (next.serials.length > next.quantity) {
            next.serials = next.serials.slice(0, next.quantity);
          }
          return next;
        }),
      );
    },
    [],
  );

  const setLineSerial = useCallback(
    (lineKey: string, index: number, value: string) => {
      setCart((prev) =>
        prev.map((l) => {
          if (l.key !== lineKey) return l;
          const serials = [...l.serials];
          serials[index] = value;
          return { ...l, serials };
        }),
      );
    },
    [],
  );

  const removeLine = useCallback((lineKey: string) => {
    setCart((prev) => prev.filter((l) => l.key !== lineKey));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCartSearch("");
    setCartSearchDebounced("");
    setCartPage(1);
    setPayments([]);
    setCustomerName("");
    setGuestEmail("");
    setPhoneLada("+52");
    setGuestPhone("");
    setNotes("");
    setRequiredFactura(false);
    setQuoteInput("");
    setLinkedQuoteNumber(null);
    setQuotePageAlert(null);
    setManualCapture(null);
    chargeIdempotencyKeyRef.current = null;
    // Solo limpia la venta en curso; conserva pestaña, caja, series y última venta.
    const next: PosDraftV2 = {
      v: 2,
      tab,
      search,
      cartSearch: "",
      cartPage: 1,
      cart: [],
      customerName: "",
      guestEmail: "",
      phoneLada: "+52",
      guestPhone: "",
      payments: [],
      notes: "",
      requiredFactura: false,
      quoteInput: "",
      linkedQuoteNumber: null,
      manualCapture: null,
      cashForms: {
        openingFloat,
        closingCounted,
        differenceReason,
        cashMoveAmount,
        cashMoveReason,
        cashNotes,
      },
      serialForms: {
        serialQuery,
        rmaNotes,
        newSerialProductId,
        newSerialNumber,
      },
      lastSale,
      ticketOpen: false,
      detailSaleId: detailSale?.idPosSale ?? null,
      warrantyDetailId: warrantyDetail?.idPosSale ?? null,
      cancelReason,
      inventoryReason,
    };
    draftSnapshotRef.current = next;
    writePosDraft(next);
  }, [
    tab,
    search,
    openingFloat,
    closingCounted,
    differenceReason,
    cashMoveAmount,
    cashMoveReason,
    cashNotes,
    serialQuery,
    rmaNotes,
    newSerialProductId,
    newSerialNumber,
    lastSale,
    detailSale,
    warrantyDetail,
    cancelReason,
    inventoryReason,
  ]);

  // Debounce búsqueda del carrito (no filtrar en cada tecla).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCartSearchDebounced(cartSearch.trim());
    }, CART_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [cartSearch]);

  useEffect(() => {
    setCartPage(1);
  }, [cartSearchDebounced]);

  const cartFiltered = useMemo(() => {
    const q = cartSearchDebounced.toLowerCase();
    if (!q) return cart;
    return cart.filter((line) => {
      const haystack = [
        line.name,
        line.sku,
        line.upc,
        line.branchLabel,
        ...(line.serials || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [cart, cartSearchDebounced]);

  const cartFilteredTotal = cartFiltered.length;
  const cartTotalPages =
    cartFilteredTotal > 0
      ? Math.ceil(cartFilteredTotal / CART_PAGE_SIZE)
      : 0;

  useEffect(() => {
    if (cartTotalPages <= 0) {
      setCartPage(1);
      return;
    }
    setCartPage((p) => (p > cartTotalPages ? cartTotalPages : p < 1 ? 1 : p));
  }, [cartTotalPages]);

  const cartPageItems = useMemo(() => {
    if (cartFilteredTotal === 0) return [];
    const page = Math.min(Math.max(cartPage, 1), Math.max(cartTotalPages, 1));
    const start = (page - 1) * CART_PAGE_SIZE;
    return cartFiltered.slice(start, start + CART_PAGE_SIZE);
  }, [cartFiltered, cartFilteredTotal, cartPage, cartTotalPages]);

  const goCartPage = useCallback((page: number) => {
    setCartPage(Math.max(1, page));
  }, []);

  const requestClearCart = useCallback(() => {
    if (cart.length === 0) return;
    setDataModal({
      isOpen: true,
      title: "Vaciar carrito",
      content:
        "¿Seguro que quieres vaciar el carrito? Se quitarán productos, pagos y datos del cliente de esta venta.",
      type: "warning",
      showActions: true,
      onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
      onConfirm: async () => {
        setDataModal((p) => ({ ...p, isOpen: false }));
        clearCart();
      },
    });
  }, [cart.length, clearCart, setDataModal]);

  const showQuoteFeedback = useCallback(
    (opts: {
      type: "error" | "warning" | "success";
      title: string;
      message: string;
      sections?: Array<{ title: string; items: string[] }>;
    }) => {
      // Solo alert de página (sin modal) para errores/avisos de cotización.
      setQuotePageAlert({
        type: opts.type,
        title: opts.title,
        message: opts.message,
        sections: opts.sections?.filter((s) => s.items.length > 0),
      });
    },
    [],
  );

  const applyQuoteToCart = useCallback(
    (payload: {
      quoteNumber: string;
      items: Array<
        PosProductHit & { quantity: number; quoteStoreId: number | null }
      >;
      missingProductIds?: string[];
      inactiveProducts?: Array<{ idProduct: number; name: string }>;
      expired?: boolean;
      customer?: {
        name?: string | null;
        email?: string | null;
        phone?: string | null;
      };
    }) => {
      const nextCart: PosCartLine[] = [];
      const skippedInactive: string[] = [];
      const skippedNoStock: string[] = [];
      const adjustedStock: string[] = [];
      const otherWarnings: string[] = [];

      for (const inactive of payload.inactiveProducts || []) {
        skippedInactive.push(
          inactive.name || `Producto #${inactive.idProduct}`,
        );
      }

      if (payload.missingProductIds?.length) {
        otherWarnings.push(
          `${payload.missingProductIds.length} producto(s) ya no existen en catálogo`,
        );
      }

      for (const product of payload.items) {
        const stocks = product.stocksByBranch || [];
        const needsBranch = stocks.length > 0;
        // Cotización: validar existencia en DB para PCinBOX, TechSmart y DicoTech.
        const tracksStock = true;
        let branchIdLine: number | null =
          product.suggestedBranchId ??
          stocks.find((st) => st.stock > 0)?.branchId ??
          stocks[0]?.branchId ??
          null;

        const qtyWanted = Math.max(1, Math.round(Number(product.quantity) || 1));
        let quantity = qtyWanted;

        if (needsBranch) {
          if (branchIdLine == null) {
            otherWarnings.push(
              `«${product.name}» requiere elegir bodega (sin sugerencia)`,
            );
            continue;
          }
          if (tracksStock) {
            const stockRow = stocks.find((st) => st.branchId === branchIdLine);
            const stockCap = stockRow?.stock ?? 0;
            if (stockCap <= 0) {
              skippedNoStock.push(
                `${product.name} (${stockRow?.label || "bodega"})`,
              );
              continue;
            }
            if (quantity > stockCap) {
              adjustedStock.push(
                `${product.name}: cotizado ${qtyWanted} → disponible ${stockCap}`,
              );
              quantity = stockCap;
            }
          }
        } else if (tracksStock && product.stockGlobal <= 0) {
          skippedNoStock.push(`${product.name} (existencia global)`);
          continue;
        } else if (tracksStock && quantity > product.stockGlobal) {
          adjustedStock.push(
            `${product.name}: cotizado ${qtyWanted} → disponible ${product.stockGlobal}`,
          );
          quantity = product.stockGlobal;
        }

        const branchMeta = stocks.find((st) => st.branchId === branchIdLine);
        const stockCap = tracksStock
          ? needsBranch
            ? branchMeta?.stock ?? 0
            : product.stockGlobal
          : 999999;
        const lineKey = `p-${product.idProduct}-b-${branchIdLine ?? "g"}`;
        const existing = nextCart.find((l) => l.key === lineKey);
        if (existing) {
          const merged = tracksStock
            ? Math.min(stockCap, existing.quantity + quantity)
            : existing.quantity + quantity;
          if (tracksStock && merged < existing.quantity + quantity) {
            adjustedStock.push(
              `${product.name}: se limitó al stock disponible (${stockCap})`,
            );
          }
          existing.quantity = merged;
          existing.serials = Array(merged).fill("");
          existing.stockBranch = stockCap;
          continue;
        }

        nextCart.push({
          key: lineKey,
          productId: product.idProduct,
          name: product.name,
          sku: product.sku,
          upc: product.upc,
          unitPrice: product.price,
          quantity,
          discountPct: 0,
          branchId: branchIdLine,
          branchLabel: branchMeta
            ? formatPosBranchUiLabel({
                name: branchMeta.name,
                label: branchMeta.label,
                city: branchMeta.city,
              })
            : Number(product.providerId) === 1
              ? "PCinBOX-León"
              : null,
          stockBranch: stockCap,
          stocksByBranch: stocks,
          imageUrl: firstImage(product.image_url),
          requiresSerial: Boolean(product.requiresSerial),
          warrantyMonths:
            Number(product.providerId) === 2 ||
            (Number(product.providerId) === 1 && Boolean(product.isPC))
              ? 12
              : product.warrantyMonths ?? null,
          warrantyMode:
            Number(product.providerId) === 2 ||
            (Number(product.providerId) === 1 && Boolean(product.isPC))
              ? "months"
              : product.warrantyMode ?? null,
          warrantyUnit: "months" as const,
          isPC: Boolean(product.isPC),
          serials: Array(quantity).fill(""),
          isManual: false,
          providerId: product.providerId ?? null,
        });
      }

      const sections = [
        {
          title: "Inactivos (no importados)",
          items: skippedInactive,
        },
        {
          title: "Sin stock (no importados)",
          items: skippedNoStock,
        },
        {
          title: "Cantidad ajustada por stock",
          items: adjustedStock,
        },
        {
          title: "Otros avisos",
          items: otherWarnings,
        },
      ].filter((s) => s.items.length > 0);

      const skippedCount =
        skippedInactive.length +
        skippedNoStock.length +
        (payload.missingProductIds?.length || 0);

      if (nextCart.length === 0) {
        showQuoteFeedback({
          type: "error",
          title: "Sin productos cargables",
          message:
            "Ningún producto de la cotización pudo importarse (inactivos, sin stock o fuera de catálogo).",
          sections,
        });
        return;
      }

      setCart(nextCart);
      setLinkedQuoteNumber(payload.quoteNumber);
      setQuoteInput(payload.quoteNumber);

      if (payload.customer?.name && !customerName.trim()) {
        setCustomerName(payload.customer.name);
      }
      if (payload.customer?.email && !guestEmail.trim()) {
        setGuestEmail(payload.customer.email);
      }
      if (payload.customer?.phone && !guestPhone.trim()) {
        const digits = String(payload.customer.phone).replace(/\D/g, "");
        if (digits.length >= 10) {
          setGuestPhone(digits.slice(-10));
        }
      }

      const hasSkips = sections.length > 0;
      showQuoteFeedback({
        type: hasSkips ? "warning" : "success",
        title: "Cotización cargada",
        message: hasSkips
          ? `Se importaron ${nextCart.length} línea(s) disponibles de ${payload.quoteNumber}. ${skippedCount > 0 ? `${skippedCount} no importado(s)` : "Hay avisos"}${adjustedStock.length ? `; ${adjustedStock.length} con cantidad ajustada` : ""}. Detalle abajo:`
          : `Se importaron ${nextCart.length} línea(s) de la cotización ${payload.quoteNumber}.`,
        sections,
      });
    },
    [customerName, guestEmail, guestPhone, showQuoteFeedback],
  );

  const loadQuote = useCallback(async () => {
    const raw = quoteInput.trim().replace(/^#/, "").toUpperCase();
    if (!raw) {
      showQuoteFeedback({
        type: "warning",
        title: "Cotización",
        message: "Ingresa el número de cotización.",
      });
      return;
    }

    const runFetch = async () => {
      setQuoteLoading(true);
      setQuotePageAlert(null);
      try {
        const res = await requestGet(
          `/pos/quotes/${encodeURIComponent(raw)}`,
          { silent: true },
        );
        const data = res?.data?.data;
        if (!data?.quoteNumber || !Array.isArray(data.items)) {
          showQuoteFeedback({
            type: "error",
            title: "No se pudo cargar",
            message:
              res?.data?.message ||
              "No se pudo cargar la cotización. Verifica el número o pide una cotización nueva (vigencia 5 días).",
          });
          return;
        }
        applyQuoteToCart(data);
      } catch (e: any) {
        const code = String(e?.response?.data?.code || "");
        const apiMessage = String(e?.response?.data?.message || "").trim();
        const isExpired =
          code === "QUOTE_EXPIRED" || e?.response?.status === 410;
        const isMissing =
          code === "QUOTE_NOT_FOUND" || e?.response?.status === 404;
        showQuoteFeedback({
          type: "error",
          title: isExpired
            ? "Cotización vencida o eliminada"
            : isMissing
              ? "Cotización no disponible"
              : "No se pudo cargar",
          message:
            apiMessage ||
            (isExpired || isMissing
              ? "Los PDF de cotización se eliminan automáticamente a los 5 días desde su creación, por lo que ya no se pueden cargar sus productos al POS. Solicita una cotización nueva desde la tienda."
              : e?.message || "No se encontró la cotización."),
        });
      } finally {
        setQuoteLoading(false);
      }
    };

    if (cart.length > 0) {
      setDataModal({
        isOpen: true,
        title: "Reemplazar carrito",
        content:
          "El carrito tiene productos. ¿Reemplazarlos con los de la cotización?",
        type: "warning",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => {
          setDataModal((p) => ({ ...p, isOpen: false }));
          await runFetch();
        },
      });
      return;
    }

    await runFetch();
  }, [
    applyQuoteToCart,
    cart.length,
    quoteInput,
    requestGet,
    setDataModal,
    showQuoteFeedback,
  ]);

  const clearLinkedQuote = useCallback(() => {
    setLinkedQuoteNumber(null);
  }, []);

  const dismissQuotePageAlert = useCallback(() => {
    setQuotePageAlert(null);
  }, []);

  const addPayment = useCallback(
    (method: PosPaymentMethod = "efectivo_sucursal") => {
      // Inputs vacíos: el cajero captura el monto (no prellenar 0 ni el restante).
      setPayments((prev) => [
        ...prev,
        {
          id: `pay-${Date.now()}-${prev.length}`,
          method,
          amount: null,
          reference: "",
        },
      ]);
    },
    [],
  );

  const updatePayment = useCallback(
    (id: string, patch: Partial<PosPaymentLine>) => {
      setPayments((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const next = { ...p, ...patch };
          // Al pasar a método con cambio, el monto recibido vuelve a vacío.
          if (
            (patch.method === "efectivo_sucursal" || patch.method === "otro") &&
            p.method !== patch.method &&
            patch.amount === undefined
          ) {
            next.amount = null;
          }
          return next;
        }),
      );
    },
    [],
  );

  const removePayment = useCallback((id: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const executeCharge = useCallback(async () => {
    if (chargeLockRef.current || charging) return;
    chargeLockRef.current = true;
    setCharging(true);
    try {
      if (!chargeIdempotencyKeyRef.current) {
        chargeIdempotencyKeyRef.current = newPosIdempotencyKey();
      }
      const idempotencyKey = chargeIdempotencyKeyRef.current;
      const phoneDigits = guestPhone.trim();
      const fullPhone = `${phoneLada} ${phoneDigits}`.trim();
      const usesCash = payments.some((p) => p.method === "efectivo_sucursal");
      const res = await requestPost(
        {
          idempotencyKey,
          branchId,
          customerUserId: null,
          customerName: customerName.trim(),
          customerEmail: guestEmail.trim() || null,
          customerPhone: fullPhone,
          notes: notes || null,
          requiredFactura: requiredFactura ? 1 : 0,
          quoteNumber: linkedQuoteNumber || null,
          items: cart.map((l) => ({
            productId: l.isManual ? "manual" : l.productId,
            manual: Boolean(l.isManual),
            manualKind: l.isManual
              ? l.manualKind === "service"
                ? "service"
                : "product"
              : undefined,
            name: l.isManual ? l.name : undefined,
            sku: l.isManual ? l.sku : undefined,
            upc: l.isManual ? l.upc : undefined,
            warrantyMonths: cartWarrantyToPayload(l).warrantyMonths,
            warrantyMode: cartWarrantyToPayload(l).warrantyMode,
            warrantyUnit: cartWarrantyToPayload(l).warrantyUnit,
            requiresSerial:
              l.isManual && l.manualKind !== "service"
                ? Boolean(l.requiresSerial)
                : undefined,
            serviceIntake:
              l.isManual && l.manualKind === "service" && l.serviceIntake
                ? l.serviceIntake
                : undefined,
            branchId: l.branchId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountPct: 0,
            serials: l.serials.map((s) => s.trim()).filter(Boolean),
          })),
          payments: payments.map((p) => ({
            method: p.method,
            amount: Number(p.amount) || 0,
            reference: p.reference || null,
          })),
        },
        "/pos/sales",
      );
      const sale: PosSale = res?.data?.data;
      setLastSale(sale);
      setTicketOpen(false);
      clearCart();
      if (usesCash) void loadCashStatus();

      const qz = loadQzSettings();
      if (sale && qz.autoPrintOnCharge) {
        void printPosTicketQz(sale, {
          openDrawer: usesCash && qz.openDrawerOnCash,
        }).catch((err) => {
          if (usesCash && qz.openDrawerOnCash) {
            void openCashDrawerQz().catch(() => undefined);
          }
          setDataModal({
            isOpen: true,
            title: "No se pudo imprimir el ticket",
            content:
              qzErrorMessage(err) ||
              "La venta quedó registrada, pero el ticket no se envió a la impresora. Puedes reimprimirlo desde la última venta o el historial.",
            type: "error",
            showActions: true,
            onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
            onConfirm: async () =>
              setDataModal((p) => ({ ...p, isOpen: false })),
          });
        });
      } else if (usesCash && qz.openDrawerOnCash) {
        void openCashDrawerQz().catch(() => undefined);
      }
      // Cobro OK: sin modal de éxito (el resumen queda en «Última venta»).
      // Solo se avisa si falla la impresión automática arriba.
    } catch {
      // error modal handled by UtilsService — conservar idempotencyKey para reintento
    } finally {
      chargeLockRef.current = false;
      setCharging(false);
    }
  }, [
    branchId,
    cart,
    payments,
    customerName,
    guestEmail,
    guestPhone,
    phoneLada,
    notes,
    requiredFactura,
    linkedQuoteNumber,
    charging,
    requestPost,
    clearCart,
    loadCashStatus,
    setDataModal,
  ]);

  const charge = useCallback(async () => {
    if (chargeLockRef.current || chargeConfirmOpenRef.current || charging) return;

    if (cart.length === 0) {
      setDataModal({
        isOpen: true,
        title: "Carrito vacío",
        content: "Agrega productos antes de cobrar.",
        type: "warning",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
      return;
    }

    for (const line of cart) {
      if (line.isManual && (!Number.isFinite(line.unitPrice) || line.unitPrice <= 0)) {
        setDataModal({
          isOpen: true,
          title: "Precio inválido",
          content: `«${line.name}» necesita un precio unitario mayor a 0.`,
          type: "warning",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
        });
        return;
      }
      if (!Number.isFinite(line.quantity) || line.quantity < 1) {
        setDataModal({
          isOpen: true,
          title: "Cantidad inválida",
          content: `«${line.name}» necesita cantidad al menos 1.`,
          type: "warning",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
        });
        return;
      }
      if (line.isManual && line.manualKind === "service") {
        const eq = line.serviceIntake?.equipment || [];
        const failure = String(
          line.serviceIntake?.failureOrRequestedService || "",
        ).trim();
        if (eq.length < 1) {
          setDataModal({
            isOpen: true,
            title: "Datos del equipo",
            content: `El servicio «${line.name}» necesita al menos un equipo/componente.`,
            type: "warning",
            showActions: true,
            onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
            onConfirm: async () =>
              setDataModal((p) => ({ ...p, isOpen: false })),
          });
          return;
        }
        if (failure.length < 2) {
          setDataModal({
            isOpen: true,
            title: "Falla o servicio",
            content: `El servicio «${line.name}» necesita la falla o servicio solicitado.`,
            type: "warning",
            showActions: true,
            onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
            onConfirm: async () =>
              setDataModal((p) => ({ ...p, isOpen: false })),
          });
          return;
        }
      }
    }

    if (totals.total <= 0) {
      setDataModal({
        isOpen: true,
        title: "Total inválido",
        content: "El total de la venta debe ser mayor a 0.",
        type: "warning",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
      return;
    }

    if (customerName.trim().length < 2) {
      setDataModal({
        isOpen: true,
        title: "Cliente requerido",
        content: "Escribe el nombre del cliente (mín. 2 caracteres) antes de cobrar.",
        type: "warning",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
      return;
    }

    if (!guestPhone.trim()) {
      setDataModal({
        isOpen: true,
        title: "Teléfono requerido",
        content: "Captura el teléfono del cliente (10 dígitos).",
        type: "warning",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
      return;
    }

    if (!isValidPhoneDigits(guestPhone)) {
      setDataModal({
        isOpen: true,
        title: "Teléfono inválido",
        content: "El teléfono debe tener exactamente 10 dígitos.",
        type: "warning",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
      return;
    }

    if (payments.length === 0) {
      setDataModal({
        isOpen: true,
        title: "Sin formas de pago",
        content: "Agrega al menos una forma de pago.",
        type: "warning",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
      return;
    }

    if (settlement.nonCashOverpay > 0.009) {
      setDataModal({
        isOpen: true,
        title: "Monto de pago excedido",
        content:
          "Tarjeta o transferencia no pueden superar el total. Usa efectivo u «Otro» si el cliente paga de más (ahí se calcula el cambio).",
        type: "warning",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
      return;
    }

    if (!settlement.balanced) {
      setDataModal({
        isOpen: true,
        title: "Falta por pagar",
        content: `Falta por cubrir ${formatMoney(remaining)}.`,
        type: "warning",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
      return;
    }

    if (
      payments.some(
        (p) =>
          p.amount == null ||
          !Number.isFinite(p.amount) ||
          p.amount <= 0,
      )
    ) {
      setDataModal({
        isOpen: true,
        title: "Monto inválido",
        content: "Cada forma de pago debe tener un monto mayor a 0.",
        type: "warning",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
      return;
    }

    if (
      payments.some(
        (p) => p.method === "otro" && p.reference.trim().length < 2,
      )
    ) {
      setDataModal({
        isOpen: true,
        title: "Especifica el método",
        content:
          "En forma de pago «Otro» escribe cómo pagó el cliente (mín. 2 caracteres).",
        type: "warning",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
      return;
    }

    const usesCash = payments.some((p) => p.method === "efectivo_sucursal");
    if (usesCash && !cashOpen) {
      const synced = await loadCashStatus({ retries: 2 });
      if (synced !== true) {
        setDataModal({
          isOpen: true,
          title:
            synced === null ? "No se pudo verificar la caja" : "Caja cerrada",
          content:
            synced === null
              ? "No confirmamos si hay caja abierta. Reintenta en unos segundos; no asumas que está cerrada."
              : "Abre caja en la pestaña Caja antes de cobrar en efectivo. Tarjeta o transferencia no lo requieren.",
          type: "warning",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
        });
        return;
      }
    }

    for (const line of cart) {
      if ((line.stocksByBranch?.length || 0) > 0 && line.branchId == null) {
        setDataModal({
          isOpen: true,
          title: "Elige bodega",
          content: `«${line.name}» necesita bodega de origen.`,
          type: "warning",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
        });
        return;
      }
    }

    for (const line of cart) {
      if (!line.requiresSerial) continue;
      const filled = line.serials.map((s) => s.trim()).filter(Boolean);
      if (filled.length !== line.quantity) {
        setDataModal({
          isOpen: true,
          title: "Faltan números de serie",
          content: `«${line.name}» requiere ${line.quantity} número(s) de serie.`,
          type: "warning",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
        });
        return;
      }
    }

    for (const line of cart) {
      if (
        !posWarrantySelectable({
          providerId: line.providerId,
          isPC: line.isPC,
          isManual: line.isManual,
        })
      ) {
        continue;
      }
      const mode = String(line.warrantyMode || "").trim();
      if (!mode) {
        setDataModal({
          isOpen: true,
          title: "Garantía requerida",
          content: `Elige la garantía de «${line.name}» (meses, años, no aplica o centro de servicio).`,
          type: "warning",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
        });
        return;
      }
      if (
        mode === "months" &&
        (!(Number(line.warrantyMonths) > 0) ||
          !line.warrantyUnit)
      ) {
        setDataModal({
          isOpen: true,
          title: "Duración de garantía",
          content: `Indica cuántos meses o años de garantía para «${line.name}».`,
          type: "warning",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
        });
        return;
      }
    }

    chargeConfirmOpenRef.current = true;
    setDataModal({
      isOpen: true,
      title: "Confirmar cobro",
      type: "warning",
      showActions: true,
      maxWidth: "420px",
      confirmLabel: "Cobrar ahora",
      cancelLabel: "Volver",
      content: (
        <div
          style={{
            textAlign: "left",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.5,
              color: "#57534e",
            }}
          >
            Revisa el total antes de registrar la venta.
          </p>
          <div
            style={{
              borderRadius: 14,
              border: "1px solid rgba(187, 61, 75, 0.2)",
              background:
                "linear-gradient(165deg, rgba(187, 61, 75, 0.08) 0%, #fff 55%)",
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#a8a29e",
                marginBottom: 4,
              }}
            >
              Cliente
            </div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "#1c1917",
                letterSpacing: "-0.02em",
              }}
            >
              {customerName.trim()}
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: changeDue > 0.009 ? "1fr 1fr" : "1fr",
              gap: 10,
            }}
          >
            <div
              style={{
                borderRadius: 14,
                background: "#1c1917",
                color: "#fff",
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  opacity: 0.65,
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Total a cobrar
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatMoney(totals.total)}
              </div>
            </div>
            {changeDue > 0.009 ? (
              <div
                style={{
                  borderRadius: 14,
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  color: "#065f46",
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    opacity: 0.8,
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Cambio
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatMoney(changeDue)}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ),
      onClose: () => {
        chargeConfirmOpenRef.current = false;
        setDataModal((p) => ({ ...p, isOpen: false }));
      },
      onConfirm: async () => {
        chargeConfirmOpenRef.current = false;
        setDataModal((p) => ({ ...p, isOpen: false }));
        await executeCharge();
      },
    });
  }, [
    cart,
    payments,
    remaining,
    changeDue,
    settlement,
    totals.total,
    customerName,
    guestPhone,
    cashOpen,
    charging,
    loadCashStatus,
    setDataModal,
    executeCharge,
  ]);

  const loadHistory = useCallback(
    async (
      page = 1,
      overrides?: {
        folio?: string;
        customer?: string;
        from?: string;
        to?: string;
        status?: string;
      },
    ) => {
      setHistoryLoading(true);
      try {
        const folio = (overrides?.folio ?? historyFolio).trim();
        const customer = (overrides?.customer ?? historyCustomer).trim();
        const fromDay = overrides?.from ?? historyFrom;
        const toDay = overrides?.to ?? historyTo;
        const status = overrides?.status ?? historyStatus;

        const params = new URLSearchParams({
          page: String(page),
          limit: "15",
        });
        if (branchId) params.set("branchId", String(branchId));
        if (folio) params.set("folio", folio);
        if (customer) params.set("customerName", customer);
        if (status) params.set("status", status);
        if (fromDay) {
          const start = new Date(`${fromDay}T00:00:00`);
          if (!Number.isNaN(start.getTime())) {
            params.set("from", start.toISOString());
          }
        }
        if (toDay) {
          const end = new Date(`${toDay}T23:59:59.999`);
          if (!Number.isNaN(end.getTime())) {
            params.set("to", end.toISOString());
          }
        }
        const res = await requestGet(`/pos/sales?${params.toString()}`, {
          silent: true,
        });
        setHistory(res?.data?.data || []);
        setHistoryPage(res?.data?.pagination?.page || page);
        setHistoryTotalPages(res?.data?.pagination?.totalPages || 0);
        setHistoryTotal(res?.data?.pagination?.total || 0);
      } catch {
        setHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    },
    [
      branchId,
      historyFolio,
      historyCustomer,
      historyFrom,
      historyTo,
      historyStatus,
      requestGet,
    ],
  );

  const loadHistoryRef = useRef(loadHistory);
  loadHistoryRef.current = loadHistory;
  const historySelfSyncRef = useRef(false);
  const historySuppressLiveRef = useRef(false);
  const historyLastFetchKeyRef = useRef("");
  const historyUrlTimerRef = useRef<number | null>(null);
  const historyFetchTimerRef = useRef<number | null>(null);
  const historyFiltersRef = useRef({
    folio: historyFolio,
    customer: historyCustomer,
    from: historyFrom,
    to: historyTo,
    status: historyStatus,
  });
  historyFiltersRef.current = {
    folio: historyFolio,
    customer: historyCustomer,
    from: historyFrom,
    to: historyTo,
    status: historyStatus,
  };
  const historySearchParamsRef = useRef(searchParams);
  historySearchParamsRef.current = searchParams;

  const historyFilterFetchKey = useCallback(
    (page: number) => {
      const f = historyFiltersRef.current;
      return [
        page,
        f.folio.trim(),
        f.customer.trim(),
        f.from,
        f.to,
        f.status,
        branchId ?? "",
      ].join("|");
    },
    [branchId],
  );

  const persistHistoryFiltersUrl = useCallback(() => {
    if (historySuppressLiveRef.current) return;
    const folio = historyFiltersRef.current.folio.trim();
    const customer = historyFiltersRef.current.customer.trim();
    const from = historyFiltersRef.current.from;
    const to = historyFiltersRef.current.to;
    const status = historyFiltersRef.current.status;
    const sp = historySearchParamsRef.current;
    if (
      folio === (sp.get("hFolio") || "") &&
      customer === (sp.get("hCustomer") || "") &&
      from === (sp.get("hFrom") || "") &&
      to === (sp.get("hTo") || "") &&
      status === (sp.get("hStatus") || "")
    ) {
      return;
    }
    historySelfSyncRef.current = true;
    setQueryParams({
      hPage: null,
      hFolio: folio || null,
      hCustomer: customer || null,
      hFrom: from || null,
      hTo: to || null,
      hStatus: status || null,
    });
  }, [setQueryParams]);

  const fetchHistoryWithLocalFilters = useCallback(
    (page = 1) => {
      if (historySuppressLiveRef.current) return;
      const folio = historyFiltersRef.current.folio.trim();
      const customer = historyFiltersRef.current.customer.trim();
      const from = historyFiltersRef.current.from;
      const to = historyFiltersRef.current.to;
      const status = historyFiltersRef.current.status;
      const key = historyFilterFetchKey(page);
      if (historyLastFetchKeyRef.current === key) return;
      historyLastFetchKeyRef.current = key;
      void loadHistoryRef.current(page, { folio, customer, from, to, status });
    },
    [historyFilterFetchKey],
  );

  const flushHistoryLiveFilters = useCallback(() => {
    if (historyUrlTimerRef.current != null) {
      window.clearTimeout(historyUrlTimerRef.current);
      historyUrlTimerRef.current = null;
    }
    if (historyFetchTimerRef.current != null) {
      window.clearTimeout(historyFetchTimerRef.current);
      historyFetchTimerRef.current = null;
    }
    persistHistoryFiltersUrl();
    fetchHistoryWithLocalFilters(1);
  }, [persistHistoryFiltersUrl, fetchHistoryWithLocalFilters]);

  const clearHistoryFilters = useCallback(() => {
    historySuppressLiveRef.current = true;
    historyFiltersRef.current = {
      folio: "",
      customer: "",
      from: "",
      to: "",
      status: "",
    };
    setHistoryFolio("");
    setHistoryCustomer("");
    setHistoryFrom("");
    setHistoryTo("");
    setHistoryStatus("");
    historySelfSyncRef.current = true;
    historyLastFetchKeyRef.current = historyFilterFetchKey(1);
    setQueryParams({
      hPage: null,
      hFolio: null,
      hCustomer: null,
      hFrom: null,
      hTo: null,
      hStatus: null,
    });
    void loadHistoryRef.current(1, {
      folio: "",
      customer: "",
      from: "",
      to: "",
      status: "",
    });
    window.setTimeout(() => {
      historySuppressLiveRef.current = false;
    }, 0);
  }, [setQueryParams, historyFilterFetchKey]);

  const goHistoryPage = useCallback(
    (page: number) => {
      setQueryParams({ hPage: page <= 1 ? null : page });
    },
    [setQueryParams],
  );

  const historyQueryKey = [
    searchParams.get("hPage"),
    searchParams.get("hFolio"),
    searchParams.get("hCustomer"),
    searchParams.get("hFrom"),
    searchParams.get("hTo"),
    searchParams.get("hStatus"),
  ].join("|");

  useEffect(() => {
    if (tab !== "historial") return;
    if (historySelfSyncRef.current) {
      historySelfSyncRef.current = false;
      return;
    }
    const page = parseListPage(searchParams.get("hPage"));
    const folio = searchParams.get("hFolio") || "";
    const customer = searchParams.get("hCustomer") || "";
    const from = searchParams.get("hFrom") || "";
    const to = searchParams.get("hTo") || "";
    const status = searchParams.get("hStatus") || "";
    setHistoryFolio(folio);
    setHistoryCustomer(customer);
    setHistoryFrom(from);
    setHistoryTo(to);
    setHistoryStatus(status);
    historyLastFetchKeyRef.current = [
      page,
      folio,
      customer,
      from,
      to,
      status,
      branchId ?? "",
    ].join("|");
    void loadHistoryRef.current(page, { folio, customer, from, to, status });
  }, [tab, branchId, historyQueryKey, searchParams]);

  // Text: URL pronto (persistencia), fetch con debounce más largo
  useEffect(() => {
    if (tab !== "historial") return;
    historyUrlTimerRef.current = window.setTimeout(() => {
      historyUrlTimerRef.current = null;
      persistHistoryFiltersUrl();
    }, FILTER_URL_DEBOUNCE_MS);
    historyFetchTimerRef.current = window.setTimeout(() => {
      historyFetchTimerRef.current = null;
      persistHistoryFiltersUrl();
      fetchHistoryWithLocalFilters(1);
    }, FILTER_FETCH_DEBOUNCE_MS);
    return () => {
      if (historyUrlTimerRef.current != null) {
        window.clearTimeout(historyUrlTimerRef.current);
        historyUrlTimerRef.current = null;
      }
      if (historyFetchTimerRef.current != null) {
        window.clearTimeout(historyFetchTimerRef.current);
        historyFetchTimerRef.current = null;
      }
    };
  }, [
    tab,
    historyFolio,
    historyCustomer,
    persistHistoryFiltersUrl,
    fetchHistoryWithLocalFilters,
  ]);

  // Fechas / estado: inmediato
  useEffect(() => {
    if (tab !== "historial") return;
    persistHistoryFiltersUrl();
    fetchHistoryWithLocalFilters(1);
  }, [
    tab,
    historyFrom,
    historyTo,
    historyStatus,
    persistHistoryFiltersUrl,
    fetchHistoryWithLocalFilters,
  ]);

  const loadWarranties = useCallback(
    async (
      page = 1,
      overrides?: {
        folio?: string;
        customer?: string;
        saleId?: string;
        from?: string;
        to?: string;
      },
    ) => {
      setWarrantiesLoading(true);
      try {
        const folio = (overrides?.folio ?? warrantyFolio).trim();
        const customer = (overrides?.customer ?? warrantyCustomer).trim();
        const saleId = (overrides?.saleId ?? warrantySaleId).trim();
        const fromDay = overrides?.from ?? warrantyFrom;
        const toDay = overrides?.to ?? warrantyTo;

        const params = new URLSearchParams({
          page: String(page),
          limit: "15",
          status: "completed",
          hasSerials: "1",
        });
        if (branchId) params.set("branchId", String(branchId));
        if (folio) params.set("folio", folio);
        if (customer) params.set("customerName", customer);
        if (saleId) params.set("saleId", saleId.replace(/^#/, ""));
        if (fromDay) {
          const start = new Date(`${fromDay}T00:00:00`);
          if (!Number.isNaN(start.getTime())) {
            params.set("from", start.toISOString());
          }
        }
        if (toDay) {
          const end = new Date(`${toDay}T23:59:59.999`);
          if (!Number.isNaN(end.getTime())) {
            params.set("to", end.toISOString());
          }
        }
        const res = await requestGet(`/pos/sales?${params.toString()}`, {
          silent: true,
        });
        setWarranties(res?.data?.data || []);
        setWarrantiesPage(res?.data?.pagination?.page || page);
        setWarrantiesTotalPages(res?.data?.pagination?.totalPages || 0);
        setWarrantiesTotal(res?.data?.pagination?.total || 0);
      } catch {
        setWarranties([]);
      } finally {
        setWarrantiesLoading(false);
      }
    },
    [
      branchId,
      warrantyFolio,
      warrantyCustomer,
      warrantySaleId,
      warrantyFrom,
      warrantyTo,
      requestGet,
    ],
  );

  const loadWarrantiesRef = useRef(loadWarranties);
  loadWarrantiesRef.current = loadWarranties;
  const warrantySelfSyncRef = useRef(false);
  const warrantySuppressLiveRef = useRef(false);
  const warrantyLastFetchKeyRef = useRef("");
  const warrantyUrlTimerRef = useRef<number | null>(null);
  const warrantyFetchTimerRef = useRef<number | null>(null);
  const warrantyFiltersRef = useRef({
    folio: warrantyFolio,
    customer: warrantyCustomer,
    saleId: warrantySaleId,
    from: warrantyFrom,
    to: warrantyTo,
  });
  warrantyFiltersRef.current = {
    folio: warrantyFolio,
    customer: warrantyCustomer,
    saleId: warrantySaleId,
    from: warrantyFrom,
    to: warrantyTo,
  };
  const warrantySearchParamsRef = useRef(searchParams);
  warrantySearchParamsRef.current = searchParams;

  const warrantyFilterFetchKey = useCallback(
    (page: number) => {
      const f = warrantyFiltersRef.current;
      return [
        page,
        f.folio.trim(),
        f.customer.trim(),
        f.saleId.trim(),
        f.from,
        f.to,
        branchId ?? "",
      ].join("|");
    },
    [branchId],
  );

  const persistWarrantyFiltersUrl = useCallback(() => {
    if (warrantySuppressLiveRef.current) return;
    const folio = warrantyFiltersRef.current.folio.trim();
    const customer = warrantyFiltersRef.current.customer.trim();
    const saleId = warrantyFiltersRef.current.saleId.trim();
    const from = warrantyFiltersRef.current.from;
    const to = warrantyFiltersRef.current.to;
    const sp = warrantySearchParamsRef.current;
    if (
      folio === (sp.get("wFolio") || "") &&
      customer === (sp.get("wCustomer") || "") &&
      saleId === (sp.get("wSaleId") || "") &&
      from === (sp.get("wFrom") || "") &&
      to === (sp.get("wTo") || "")
    ) {
      return;
    }
    warrantySelfSyncRef.current = true;
    setQueryParams({
      wPage: null,
      wFolio: folio || null,
      wCustomer: customer || null,
      wSaleId: saleId || null,
      wFrom: from || null,
      wTo: to || null,
    });
  }, [setQueryParams]);

  const fetchWarrantiesWithLocalFilters = useCallback(
    (page = 1) => {
      if (warrantySuppressLiveRef.current) return;
      const folio = warrantyFiltersRef.current.folio.trim();
      const customer = warrantyFiltersRef.current.customer.trim();
      const saleId = warrantyFiltersRef.current.saleId.trim();
      const from = warrantyFiltersRef.current.from;
      const to = warrantyFiltersRef.current.to;
      const key = warrantyFilterFetchKey(page);
      if (warrantyLastFetchKeyRef.current === key) return;
      warrantyLastFetchKeyRef.current = key;
      void loadWarrantiesRef.current(page, {
        folio,
        customer,
        saleId,
        from,
        to,
      });
    },
    [warrantyFilterFetchKey],
  );

  const flushWarrantyLiveFilters = useCallback(() => {
    if (warrantyUrlTimerRef.current != null) {
      window.clearTimeout(warrantyUrlTimerRef.current);
      warrantyUrlTimerRef.current = null;
    }
    if (warrantyFetchTimerRef.current != null) {
      window.clearTimeout(warrantyFetchTimerRef.current);
      warrantyFetchTimerRef.current = null;
    }
    persistWarrantyFiltersUrl();
    fetchWarrantiesWithLocalFilters(1);
  }, [persistWarrantyFiltersUrl, fetchWarrantiesWithLocalFilters]);

  const clearWarrantyFilters = useCallback(() => {
    warrantySuppressLiveRef.current = true;
    warrantyFiltersRef.current = {
      folio: "",
      customer: "",
      saleId: "",
      from: "",
      to: "",
    };
    setWarrantyFolio("");
    setWarrantyCustomer("");
    setWarrantySaleId("");
    setWarrantyFrom("");
    setWarrantyTo("");
    warrantySelfSyncRef.current = true;
    warrantyLastFetchKeyRef.current = warrantyFilterFetchKey(1);
    setQueryParams({
      wPage: null,
      wFolio: null,
      wCustomer: null,
      wSaleId: null,
      wFrom: null,
      wTo: null,
    });
    void loadWarrantiesRef.current(1, {
      folio: "",
      customer: "",
      saleId: "",
      from: "",
      to: "",
    });
    window.setTimeout(() => {
      warrantySuppressLiveRef.current = false;
    }, 0);
  }, [setQueryParams, warrantyFilterFetchKey]);

  const goWarrantiesPage = useCallback(
    (page: number) => {
      setQueryParams({ wPage: page <= 1 ? null : page });
    },
    [setQueryParams],
  );

  const warrantyQueryKey = [
    searchParams.get("wPage"),
    searchParams.get("wFolio"),
    searchParams.get("wCustomer"),
    searchParams.get("wSaleId"),
    searchParams.get("wFrom"),
    searchParams.get("wTo"),
  ].join("|");

  useEffect(() => {
    if (tab !== "garantias") return;
    if (warrantySelfSyncRef.current) {
      warrantySelfSyncRef.current = false;
      return;
    }
    const page = parseListPage(searchParams.get("wPage"));
    const folio = searchParams.get("wFolio") || "";
    const customer = searchParams.get("wCustomer") || "";
    const saleId = searchParams.get("wSaleId") || "";
    const from = searchParams.get("wFrom") || "";
    const to = searchParams.get("wTo") || "";
    setWarrantyFolio(folio);
    setWarrantyCustomer(customer);
    setWarrantySaleId(saleId);
    setWarrantyFrom(from);
    setWarrantyTo(to);
    warrantyLastFetchKeyRef.current = [
      page,
      folio,
      customer,
      saleId,
      from,
      to,
      branchId ?? "",
    ].join("|");
    void loadWarrantiesRef.current(page, {
      folio,
      customer,
      saleId,
      from,
      to,
    });
  }, [tab, branchId, warrantyQueryKey, searchParams]);

  useEffect(() => {
    if (tab !== "garantias") return;
    warrantyUrlTimerRef.current = window.setTimeout(() => {
      warrantyUrlTimerRef.current = null;
      persistWarrantyFiltersUrl();
    }, FILTER_URL_DEBOUNCE_MS);
    warrantyFetchTimerRef.current = window.setTimeout(() => {
      warrantyFetchTimerRef.current = null;
      persistWarrantyFiltersUrl();
      fetchWarrantiesWithLocalFilters(1);
    }, FILTER_FETCH_DEBOUNCE_MS);
    return () => {
      if (warrantyUrlTimerRef.current != null) {
        window.clearTimeout(warrantyUrlTimerRef.current);
        warrantyUrlTimerRef.current = null;
      }
      if (warrantyFetchTimerRef.current != null) {
        window.clearTimeout(warrantyFetchTimerRef.current);
        warrantyFetchTimerRef.current = null;
      }
    };
  }, [
    tab,
    warrantyFolio,
    warrantyCustomer,
    warrantySaleId,
    persistWarrantyFiltersUrl,
    fetchWarrantiesWithLocalFilters,
  ]);

  useEffect(() => {
    if (tab !== "garantias") return;
    persistWarrantyFiltersUrl();
    fetchWarrantiesWithLocalFilters(1);
  }, [
    tab,
    warrantyFrom,
    warrantyTo,
    persistWarrantyFiltersUrl,
    fetchWarrantiesWithLocalFilters,
  ]);

  // Al salir / recargar: no perder lo tecleado pendiente de debounce
  const flushHistoryLiveFiltersRef = useRef(flushHistoryLiveFilters);
  flushHistoryLiveFiltersRef.current = flushHistoryLiveFilters;
  const flushWarrantyLiveFiltersRef = useRef(flushWarrantyLiveFilters);
  flushWarrantyLiveFiltersRef.current = flushWarrantyLiveFilters;

  useEffect(() => {
    const flushPendingFilters = () => {
      flushHistoryLiveFiltersRef.current();
      flushWarrantyLiveFiltersRef.current();
    };
    window.addEventListener("pagehide", flushPendingFilters);
    return () => {
      window.removeEventListener("pagehide", flushPendingFilters);
      flushPendingFilters();
    };
  }, []);

  const openWarrantyDetail = useCallback(
    async (id: number) => {
      const res = await requestGet(`/pos/sales/${id}`, { silent: true });
      setWarrantyDetail(res?.data?.data || null);
    },
    [requestGet],
  );

  const openWarrantySheet = useCallback(
    (id: number) => {
      void (async () => {
        const preview = window.open("about:blank", "_blank");
        try {
          const res = await requestGet(`/pos/sales/${id}`, { silent: true });
          const sale = (res?.data?.data || null) as PosSale | null;
          if (!sale) {
            throw new Error("Venta no encontrada.");
          }
          if (sale.status !== "completed") {
            throw new Error(
              "La hoja de garantía solo aplica a ventas completadas con series entregadas.",
            );
          }
          const rows = buildWarrantyPdfRows(sale);
          if (!rows.length) {
            throw new Error(
              "Esta venta no tiene números de serie para garantía.",
            );
          }

          const { pdf } = await import("@react-pdf/renderer");
          const blob = await pdf(<WarrantySheetPdf sale={sale} />).toBlob();
          const url = URL.createObjectURL(blob);
          if (preview && !preview.closed) {
            preview.location.href = url;
          } else {
            window.open(url, "_blank", "noopener,noreferrer");
          }
          // Liberar después de que el visor cargue.
          window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch (e: any) {
          if (preview && !preview.closed) preview.close();
          setDataModal({
            isOpen: true,
            title: "Hoja de garantía",
            content:
              e?.message ||
              "No se pudo generar la hoja de garantía en PDF.",
            type: "error",
            showActions: true,
            onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
            onConfirm: async () =>
              setDataModal((p) => ({ ...p, isOpen: false })),
          });
        }
      })();
    },
    [requestGet, setDataModal],
  );

  const openDetail = useCallback(
    async (id: number) => {
      const res = await requestGet(`/pos/sales/${id}`, { silent: true });
      setDetailSale(res?.data?.data || null);
      setCancelReason("");
      cancelPasswordRef.current = "";
    },
    [requestGet],
  );

  const cancelSale = useCallback(async () => {
    if (!detailSale) return;
    if (!cancelGate.allowed) {
      setDataModal({
        isOpen: true,
        title: "Cancelación no permitida",
        content: cancelGate.reason || "No puedes cancelar esta venta.",
        type: "warning",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
      return;
    }
    if (cancelReason.trim().length < 3) {
      setDataModal({
        isOpen: true,
        title: "Motivo requerido",
        content: "Escribe un motivo de cancelación (mín. 3 caracteres).",
        type: "warning",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
      return;
    }

    const reason = cancelReason.trim();
    const saleId = detailSale.idPosSale;

    const openPasswordModal = (errorMessage?: string) => {
      cancelPasswordRef.current = "";
      // Input no controlado: el content del modal global no se re-renderiza
      // con el state de usePos; value={state} dejaba el campo trabado en "".
      setDataModal({
        isOpen: true,
        title: "Confirmar cancelación",
        type: "warning",
        showActions: true,
        confirmLabel: "Cancelar venta",
        cancelLabel: "Volver",
        loading: false,
        maxWidth: "440px",
        content: (
          <div style={{ textAlign: "left", width: "100%" }}>
            <p style={{ margin: "0 0 12px", color: "#4b5563", fontSize: 15 }}>
              Se restaurará el inventario, se liberarán series y, si hubo
              efectivo, se descontará de la caja. Confirma con tu contraseña de
              administrador.
            </p>
            {errorMessage ? (
              <Alert severity="error" sx={{ mb: 1.5, textAlign: "left" }}>
                {errorMessage}
              </Alert>
            ) : null}
            <TextField
              key={`cancel-pwd-${errorMessage || "ok"}-${Date.now()}`}
              fullWidth
              size="small"
              type="password"
              label="Contraseña de administrador"
              autoComplete="current-password"
              autoFocus
              defaultValue=""
              onChange={(e) => {
                cancelPasswordRef.current = e.target.value;
              }}
              helperText="La misma contraseña con la que inicias sesión"
              error={Boolean(errorMessage)}
              inputProps={{
                "data-testid": "pos-cancel-password",
              }}
            />
          </div>
        ),
        onClose: () => {
          cancelPasswordRef.current = "";
          setDataModal((p) => ({ ...p, isOpen: false, loading: false }));
        },
        onConfirm: async () => {
          const password = cancelPasswordRef.current.trim();
          if (!password) {
            openPasswordModal(
              "Escribe tu contraseña de administrador para continuar.",
            );
            return;
          }

          setDataModal((p) => ({ ...p, loading: true }));
          setCancelling(true);
          try {
            const res = await requestPost(
              { reason, password },
              `/pos/sales/${saleId}/cancel`,
              { silent: true },
            );
            cancelPasswordRef.current = "";
            setCancelReason("");
            setDetailSale(res?.data?.data || null);
            await loadHistory(historyPage);
            void loadCashStatus();
            setDataModal({
              isOpen: true,
              title: "Venta cancelada",
              content: res?.data?.message || "Cancelación registrada.",
              type: "success",
              showActions: true,
              onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
              onConfirm: async () =>
                setDataModal((p) => ({ ...p, isOpen: false })),
            });
          } catch (error: any) {
            const apiMessage =
              error?.response?.data?.message ||
              error?.message ||
              "No se pudo cancelar la venta.";
            // Mantener modal abierto; el Alert va dentro (silent evita modal global).
            openPasswordModal(String(apiMessage));
          } finally {
            setCancelling(false);
          }
        },
      });
    };

    openPasswordModal();
  }, [
    detailSale,
    cancelGate,
    cancelReason,
    requestPost,
    loadHistory,
    historyPage,
    loadCashStatus,
    setDataModal,
  ]);

  const openTicketHtml = useCallback(async (id: number) => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";
    const token = localStorage.getItem("token") || "";
    const res = await fetch(`${base}/pos/sales/${id}/ticket`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const html = await res.text();
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }, []);

  const printTicket = useCallback(
    async (
      saleOrId: PosSale | number,
      opts?: { openDrawer?: boolean; preferHtml?: boolean },
    ) => {
      try {
        let sale: PosSale | null =
          typeof saleOrId === "number" ? null : saleOrId;
        if (!sale) {
          const res = await requestGet(`/pos/sales/${saleOrId}`, {
            silent: true,
          });
          sale = res?.data?.data || null;
        }
        if (!sale) throw new Error("Venta no encontrada");

        if (opts?.preferHtml) {
          await openTicketHtml(sale.idPosSale);
          return;
        }

        try {
          await printPosTicketQz(sale, {
            openDrawer: Boolean(opts?.openDrawer),
          });
        } catch (qzErr) {
          const isPdfPrinter =
            qzErr instanceof QzPdfPrinterError ||
            isQzPdfOrVirtualPrinter(loadQzSettings().printerName);
          await openTicketHtml(sale.idPosSale);
          setDataModal({
            isOpen: true,
            title: isPdfPrinter
              ? "Usa la vista previa para imprimir"
              : "Ticket en el navegador",
            content: isPdfPrinter
              ? qzErrorMessage(qzErr) +
                " Se abrió la vista previa HTML: desde ahí puedes Imprimir o Guardar como PDF."
              : qzErrorMessage(qzErr) +
                " Se abrió el ticket HTML como respaldo.",
            type: "warning",
            showActions: true,
            onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
            onConfirm: async () =>
              setDataModal((p) => ({ ...p, isOpen: false })),
          });
        }
      } catch {
        setDataModal({
          isOpen: true,
          title: "Error",
          content: "No se pudo imprimir el ticket.",
          type: "error",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
        });
      }
    },
    [openTicketHtml, requestGet, setDataModal],
  );

  const openTicket = useCallback(
    (id: number, opts?: { folio?: string | null }) => {
      const folioLabel = opts?.folio
        ? ` del folio ${formatPosFolio(opts.folio)}`
        : "";
      setDataModal({
        isOpen: true,
        title: "Imprimir ticket",
        content: `¿Deseas imprimir el ticket${folioLabel}?`,
        type: "info",
        showActions: true,
        confirmLabel: "Imprimir",
        cancelLabel: "Cancelar",
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => {
          setDataModal((p) => ({ ...p, isOpen: false }));
          await printTicket(id);
        },
      });
    },
    [printTicket, setDataModal],
  );

  const refreshQzPrinters = useCallback(async () => {
    setQzBusy(true);
    try {
      const list = await listQzPrinters();
      setQzPrinters(list);
      const current = loadQzSettings();
      if (!current.printerName && list.length === 1) {
        const next = saveQzSettings({ printerName: list[0] });
        setQzSettings(next);
      }
      if (list.length === 0) {
        setDataModal({
          isOpen: true,
          title: "Sin impresoras detectadas",
          content:
            "QZ Tray respondió, pero Windows no listó ninguna impresora. " +
            "1) Instala el driver de la térmica y verifica que aparezca en " +
            "Configuración → Bluetooth y dispositivos → Impresoras. " +
            "2) Imprime una página de prueba desde Windows. " +
            "3) Deja QZ Tray abierto, permite este sitio en Site Manager y " +
            "vuelve a pulsar «Detectar impresoras».",
          type: "warning",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () =>
            setDataModal((p) => ({ ...p, isOpen: false })),
        });
      }
      return list;
    } catch (err) {
      setDataModal({
        isOpen: true,
        title: "Impresora",
        content: qzErrorMessage(err),
        type: "warning",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
      return [] as string[];
    } finally {
      setQzBusy(false);
    }
  }, [setDataModal]);

  const updateQzSettings = useCallback((patch: Partial<QzPosSettings>) => {
    setQzSettings(saveQzSettings(patch));
  }, []);

  const testQzPrint = useCallback(async () => {
    setQzBusy(true);
    try {
      const sample: PosSale = {
        idPosSale: 0,
        folio: "PRUEBA-QZ",
        branchId: branchId || 0,
        branchName: "Prueba",
        branchCity: null,
        cashierUserId: 0,
        cashierName: "PCinBOX",
        customerUserId: null,
        customerName: "Cliente prueba",
        customerPhone: "+52 4771234567",
        status: "completed",
        subtotal: 100,
        discountTotal: 0,
        total: 100,
        notes: "Ticket de prueba QZ Tray",
        cancelReason: null,
        cancelledAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: [
          {
            idPosSaleItem: 1,
            productId: 0,
            productName: "Producto de prueba",
            productSku: null,
            productUpc: null,
            quantity: 1,
            unitPrice: 100,
            discountPct: 0,
            lineTotal: 100,
          },
        ],
        payments: [
          {
            idPosPayment: 1,
            method: "efectivo_sucursal",
            amount: 100,
            reference: "Recibido 100.00",
            createdAt: new Date().toISOString(),
          },
        ],
      };
      await printPosTicketQz(sample, { openDrawer: false });
      setDataModal({
        isOpen: true,
        title: "Impresión enviada",
        content: "Se envió un ticket de prueba a la impresora.",
        type: "success",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
    } catch (err) {
      setDataModal({
        isOpen: true,
        title: "Impresora",
        content: qzErrorMessage(err),
        type: "error",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
    } finally {
      setQzBusy(false);
    }
  }, [branchId, setDataModal]);

  const testQzDrawer = useCallback(async () => {
    setQzBusy(true);
    try {
      await openCashDrawerQz();
    } catch (err) {
      setDataModal({
        isOpen: true,
        title: "Impresora",
        content: qzErrorMessage(err),
        type: "error",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
    } finally {
      setQzBusy(false);
    }
  }, [setDataModal]);

  // Nueva clave de cobro si cambia el contenido de la venta (conservar clave si falla el POST).
  useEffect(() => {
    if (chargeLockRef.current) return;
    chargeIdempotencyKeyRef.current = null;
  }, [
    cart,
    payments,
    customerName,
    guestEmail,
    guestPhone,
    phoneLada,
    notes,
    requiredFactura,
    linkedQuoteNumber,
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "F4") {
        e.preventDefault();
        if (tab === "cobrar" && !charging && !chargeLockRef.current && !chargeConfirmOpenRef.current) {
          void charge();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab, charging, charge]);

  const searchSerials = useCallback(async () => {
    if (serialQuery.trim().length < 2) {
      setSerialHits([]);
      return;
    }
    setSerialSearching(true);
    try {
      const res = await requestGet(
        `/pos/serials/search?q=${encodeURIComponent(serialQuery.trim())}`,
        { silent: true },
      );
      setSerialHits(res?.data?.data || []);
    } catch {
      setSerialHits([]);
    } finally {
      setSerialSearching(false);
    }
  }, [serialQuery, requestGet]);

  const openSerialDetail = useCallback(
    async (serialNumber: string) => {
      try {
        const res = await requestGet(
          `/pos/serials/${encodeURIComponent(serialNumber)}`,
          { silent: true },
        );
        setSerialDetail(res?.data?.data || null);
        setRmaNotes("");
      } catch {
        setSerialDetail(null);
      }
    },
    [requestGet],
  );

  const markRma = useCallback(async () => {
    if (!serialDetail) return;
    setRmaBusy(true);
    try {
      const res = await requestPost(
        {
          serialNumber: serialDetail.serialNumber,
          notes: rmaNotes || null,
        },
        "/pos/serials/rma",
      );
      setSerialDetail(res?.data?.data || null);
      await searchSerials();
      setDataModal({
        isOpen: true,
        title: "RMA registrado",
        content: res?.data?.message || "Serie marcada como RMA.",
        type: "success",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
    } catch {
      // handled
    } finally {
      setRmaBusy(false);
    }
  }, [serialDetail, rmaNotes, requestPost, searchSerials, setDataModal]);

  const registerSerial = useCallback(async () => {
    const productId = Number(newSerialProductId);
    const serialNumber = newSerialNumber.trim();
    if (!Number.isSafeInteger(productId) || productId <= 0 || !serialNumber) {
      setDataModal({
        isOpen: true,
        title: "Datos incompletos",
        content: "Indica id de producto y número de serie.",
        type: "warning",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
      return;
    }
    setNewSerialBusy(true);
    try {
      await requestPost(
        {
          productId,
          serialNumber,
          branchId: branchId || null,
        },
        "/pos/serials",
      );
      setNewSerialNumber("");
      setSerialQuery(serialNumber);
      await searchSerials();
      setDataModal({
        isOpen: true,
        title: "Serie registrada",
        content: "Quedó como disponible en inventario serializado.",
        type: "success",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
    } catch {
      // handled
    } finally {
      setNewSerialBusy(false);
    }
  }, [
    newSerialProductId,
    newSerialNumber,
    branchId,
    requestPost,
    searchSerials,
    setDataModal,
  ]);

  const toggleRequiresSerial = useCallback(
    async (lineKey: string, productId: number, requiresSerial: boolean) => {
      const line = cart.find((l) => l.key === lineKey);
      if (line?.isManual) {
        setCart((prev) =>
          prev.map((l) =>
            l.key === lineKey ? { ...l, requiresSerial } : l,
          ),
        );
        return;
      }
      if (!isAdmin) {
        setDataModal({
          isOpen: true,
          title: "Sin permiso",
          content: "Solo un administrador puede marcar serie obligatoria en catálogo.",
          type: "warning",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
        });
        return;
      }
      try {
        await requestPost(
          { requiresSerial },
          `/pos/products/${productId}/serial-config`,
        );
        setCart((prev) =>
          prev.map((l) =>
            l.key === lineKey ? { ...l, requiresSerial } : l,
          ),
        );
      } catch {
        // handled
      }
    },
    [cart, isAdmin, requestPost, setDataModal],
  );

  const [inventoryRows, setInventoryRows] = useState<
    Array<{
      idInventoryMovement: number;
      productName: string | null;
      productSku: string | null;
      branchName: string | null;
      delta: number;
      reason: string;
      refType: string | null;
      refId: string | null;
      note: string | null;
      createdAt: string;
    }>
  >([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  const loadInventory = useCallback(async () => {
    setInventoryLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "40" });
      if (branchId) params.set("branchId", String(branchId));
      if (inventoryReason) params.set("reason", inventoryReason);
      const res = await requestGet(`/pos/inventory/movements?${params}`, {
        silent: true,
      });
      setInventoryRows(res?.data?.data || []);
    } catch {
      setInventoryRows([]);
    } finally {
      setInventoryLoading(false);
    }
  }, [branchId, inventoryReason, requestGet]);

  return {
    hydrated,
    draftReady,
    isAdmin,
    maxDiscount,
    cancelGate,
    tab,
    setTab,
    branches,
    branchId,
    setBranchId,
    search,
    setSearch,
    hits,
    searching,
    searchRef,
    cart,
    cartSearch,
    setCartSearch,
    cartPageItems,
    cartFilteredTotal,
    cartPage,
    cartTotalPages,
    cartPageSize: CART_PAGE_SIZE,
    goCartPage,
    addProduct,
    addManualLine,
    updateLine,
    removeLine,
    setLineSerial,
    clearCart,
    requestClearCart,
    manualCapture,
    setManualCapture,
    customerName,
    setCustomerName,
    guestEmail,
    setGuestEmail,
    phoneLada,
    setPhoneLada,
    guestPhone,
    setGuestPhone,
    emailValid: isValidEmailFormat(guestEmail),
    phoneValid: isValidPhoneDigits(guestPhone),
    payments,
    addPayment,
    updatePayment,
    removePayment,
    notes,
    setNotes,
    requiredFactura,
    setRequiredFactura,
    quoteInput,
    setQuoteInput,
    linkedQuoteNumber,
    quoteLoading,
    loadQuote,
    clearLinkedQuote,
    quotePageAlert,
    dismissQuotePageAlert,
    totals,
    paidSum,
    remaining,
    changeDue,
    settlement,
    charging,
    charge,
    lastSale,
    ticketOpen,
    setTicketOpen,
    openTicket,
    printTicket,
    qzSettings,
    qzPrinters,
    qzBusy,
    refreshQzPrinters,
    updateQzSettings,
    testQzPrint,
    testQzDrawer,
    history,
    historyLoading,
    historyPage,
    historyTotalPages,
    historyTotal,
    historyFolio,
    setHistoryFolio,
    historyCustomer,
    setHistoryCustomer,
    historyFrom,
    setHistoryFrom,
    historyTo,
    setHistoryTo,
    historyStatus,
    setHistoryStatus,
    loadHistory,
    goHistoryPage,
    clearHistoryFilters,
    warranties,
    warrantiesLoading,
    warrantiesPage,
    warrantiesTotalPages,
    warrantiesTotal,
    warrantyFolio,
    setWarrantyFolio,
    warrantyCustomer,
    setWarrantyCustomer,
    warrantySaleId,
    setWarrantySaleId,
    warrantyFrom,
    setWarrantyFrom,
    warrantyTo,
    setWarrantyTo,
    loadWarranties,
    goWarrantiesPage,
    clearWarrantyFilters,
    warrantyDetail,
    setWarrantyDetail,
    openWarrantyDetail,
    openWarrantySheet,
    detailSale,
    setDetailSale,
    openDetail,
    cancelReason,
    setCancelReason,
    cancelSale,
    cancelling,
    lineTotal,
    cashOpen,
    cashSession,
    cashExpected,
    cashPaymentSummary,
    cashLoading,
    cashSync,
    cashSyncMessage,
    cashSessions,
    cashSessionsPage,
    cashSessionsTotalPages,
    cashSessionsTotal,
    cashSessionsLoading,
    loadCashSessions,
    goCashSessionsPage,
    openingFloat,
    setOpeningFloat,
    closingCounted,
    setClosingCounted,
    differenceReason,
    setDifferenceReason,
    cashMoveAmount,
    setCashMoveAmount,
    cashMoveReason,
    setCashMoveReason,
    cashNotes,
    setCashNotes,
    cashBusy,
    openCash,
    addCashMovement,
    closeCash,
    openCashSessionDetail,
    cashSessionDetail,
    setCashSessionDetail,
    cashSessionDetailLoading,
    hasCashPayment,
    loadCashStatus,
    serialQuery,
    setSerialQuery,
    serialHits,
    serialSearching,
    searchSerials,
    serialDetail,
    setSerialDetail,
    openSerialDetail,
    rmaNotes,
    setRmaNotes,
    markRma,
    rmaBusy,
    newSerialProductId,
    setNewSerialProductId,
    newSerialNumber,
    setNewSerialNumber,
    newSerialBusy,
    registerSerial,
    toggleRequiresSerial,
    inventoryRows,
    inventoryLoading,
    inventoryReason,
    setInventoryReason,
    loadInventory,
  };
}
