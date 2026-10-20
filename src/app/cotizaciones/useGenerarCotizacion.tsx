"use client";

import { pdf } from "@react-pdf/renderer";
import { AxiosError } from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryParams } from "../hooks/useQueryParams";
import { saveQuerySession } from "../utils/querySession";
import { parsePageParam, readWindowSearchParam } from "../utils/adminPagination";
import { useTheContext } from "../hooks/global.hook";
import UtilsService from "../services/utils";
import { normalizeCronStockPayload } from "../utils/cronStockLiveSync";
import { patchQuoteLiveLines } from "./quoteCronSync";
import CotizacionPdf, {
  QuoteDetailLevel,
  QuotePdfLine,
} from "./pdf/CotizacionPdf";
import QuoteStockWarning, {
  buildQuoteStockIncidents,
  QuoteAvailability,
} from "./QuoteStockWarning";

export type QuoteBranchStock = {
  branchId: number;
  label: string;
  stock: number;
};

export type QuoteCatalogProduct = {
  idProduct: number;
  name: string;
  description: string | null;
  caracteristicas: unknown;
  price: number;
  image_url: unknown;
  upc: string | null;
  sku: string | null;
  active?: boolean;
  stock?: number;
  stocksByBranch?: QuoteBranchStock[];
  kind?: string | null;
};

export type QuoteDraftLine = QuoteCatalogProduct & { quantity: number | "" };

export const QUOTE_LADA_OPTIONS = [
  "+52",
  "+1",
  "+34",
  "+54",
  "+57",
  "+56",
  "+51",
  "+58",
] as const;

const DRAFT_KEY = "pcinbox-admin-quote-draft-v1";
const ADDED_ORDER_KEY = "pcinbox-admin-quote-added-order";

export type AdminQuoteDraft = {
  open: boolean;
  customerName: string;
  customerLada: string;
  customerPhone: string;
  includeAssembly: boolean;
  lines: QuoteDraftLine[];
  importedQuotes: LocalImportedQuote[];
};

type LocalImportedQuote = {
  quoteNumber: string;
  productIds: number[];
};

const emptyDraft = (): AdminQuoteDraft => ({
  open: false,
  customerName: "",
  customerLada: "+52",
  customerPhone: "",
  includeAssembly: false,
  lines: [],
  importedQuotes: [],
});

function draftHasContent(draft: AdminQuoteDraft): boolean {
  return (
    draft.open ||
    Boolean(draft.customerName.trim()) ||
    Boolean(draft.customerPhone.trim()) ||
    draft.includeAssembly ||
    draft.lines.length > 0
  );
}

function normalizeDraftLine(raw: unknown): QuoteDraftLine | null {
  if (!raw || typeof raw !== "object") return null;
  const line = raw as Record<string, unknown>;
  const idProduct = Number(line.idProduct);
  const name = String(line.name || "").trim();
  const quantity = normalizeQuantity(line.quantity);
  const price = Number(line.price);
  if (!Number.isSafeInteger(idProduct) || idProduct <= 0 || !name) return null;
  if (quantity === null) return null;
  if (!Number.isFinite(price) || price < 0) return null;
  return {
    idProduct,
    name: name.slice(0, 180),
    description:
      typeof line.description === "string" ? line.description : null,
    caracteristicas: line.caracteristicas ?? null,
    price,
    image_url: line.image_url ?? null,
    upc: typeof line.upc === "string" ? line.upc : null,
    sku: typeof line.sku === "string" ? line.sku : null,
    active: line.active === true,
    stock: Number.isFinite(Number(line.stock)) ? Number(line.stock) : 0,
    stocksByBranch: Array.isArray(line.stocksByBranch)
      ? line.stocksByBranch
          .map((branch) => {
            if (!branch || typeof branch !== "object") return null;
            const item = branch as Record<string, unknown>;
            const branchId = Number(item.branchId);
            const label = String(item.label || "").trim();
            const stock = Number(item.stock);
            if (!Number.isSafeInteger(branchId) || branchId <= 0 || !label) {
              return null;
            }
            return {
              branchId,
              label: label.slice(0, 80),
              stock: Number.isFinite(stock) ? stock : 0,
            };
          })
          .filter((branch): branch is QuoteBranchStock => Boolean(branch))
      : [],
    quantity,
  };
}

function normalizeImportedQuotes(raw: unknown): LocalImportedQuote[] {
  if (!Array.isArray(raw)) return [];
  const next: LocalImportedQuote[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const quoteNumber = String(record.quoteNumber || "")
      .trim()
      .replace(/^#/, "")
      .toUpperCase();
    if (!quoteNumber || seen.has(quoteNumber)) continue;
    const productIds = [
      ...new Set(
        (Array.isArray(record.productIds) ? record.productIds : [])
          .map((id) => Number(id))
          .filter((id) => Number.isSafeInteger(id) && id > 0),
      ),
    ];
    if (productIds.length === 0) continue;
    seen.add(quoteNumber);
    next.push({ quoteNumber, productIds });
  }
  return next.slice(0, 20);
}

export function readAdminQuoteDraft(): AdminQuoteDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AdminQuoteDraft>;
    const lada = QUOTE_LADA_OPTIONS.includes(
      parsed.customerLada as (typeof QUOTE_LADA_OPTIONS)[number],
    )
      ? String(parsed.customerLada)
      : "+52";
    const lines = Array.isArray(parsed.lines)
      ? parsed.lines
          .map(normalizeDraftLine)
          .filter((line): line is QuoteDraftLine => Boolean(line))
          .slice(0, 100)
      : [];
    return {
      open: parsed.open === true,
      customerName: String(parsed.customerName || "").slice(0, 120),
      customerLada: lada,
      customerPhone: String(parsed.customerPhone || "").replace(/\D/g, "").slice(0, 10),
      includeAssembly: parsed.includeAssembly === true,
      lines,
      importedQuotes: normalizeImportedQuotes(parsed.importedQuotes),
    };
  } catch {
    return null;
  }
}

export function patchAdminQuoteDraft(partial: Partial<AdminQuoteDraft>) {
  if (typeof window === "undefined") return;
  const next = { ...(readAdminQuoteDraft() ?? emptyDraft()), ...partial };
  if (!draftHasContent(next)) {
    sessionStorage.removeItem(DRAFT_KEY);
    return;
  }
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
}

export function clearAdminQuoteDraft() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DRAFT_KEY);
}

function normalizeQuantity(value: unknown): number | "" | null {
  if (value === "" || value === null || value === undefined) return "";
  const quantity = Math.round(Number(value));
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) return null;
  return quantity;
}

function quantityOrOne(value: number | ""): number {
  const quantity = Math.round(Number(value));
  if (!Number.isInteger(quantity) || quantity < 1) return 1;
  return Math.min(999, quantity);
}

const CART_PAGE_SIZE = 4;

type CartPayload = {
  data: Array<QuoteDraftLine & { quantity: number | null }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  totalAmount: number;
  importedQuotes: string[];
};

function cartPageFromLocation(): number {
  return parsePageParam(readWindowSearchParam("cartPage"), 1);
}

function rememberCartPage(page: number) {
  if (typeof window === "undefined") return;
  const current = new URLSearchParams(window.location.search);
  if (page <= 1) current.delete("cartPage");
  else current.set("cartPage", String(page));
  const next = current.toString();
  saveQuerySession(window.location.pathname, next ? `?${next}` : "", {
    allowEmpty: true,
  });
}

function mapCartLine(
  line: QuoteDraftLine & { quantity?: number | null },
): QuoteDraftLine {
  const quantity =
    line.quantity == null || (line.quantity as unknown) === ""
      ? ""
      : Number(line.quantity);
  return {
    ...line,
    quantity:
      quantity === "" || !Number.isFinite(Number(quantity))
        ? ""
        : Number(quantity),
  };
}

function sliceLocalCart(lines: QuoteDraftLine[], page: number) {
  const total = lines.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / CART_PAGE_SIZE);
  const safePage =
    total === 0 ? 1 : Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * CART_PAGE_SIZE;
  const pageLines = lines.slice(start, start + CART_PAGE_SIZE);
  const totalAmount = lines.reduce(
    (sum, line) =>
      sum + Number(line.price || 0) * (line.quantity === "" ? 0 : line.quantity),
    0,
  );
  return {
    data: pageLines,
    pagination: {
      page: safePage,
      limit: CART_PAGE_SIZE,
      total,
      totalPages,
    },
    totalAmount: Math.round((totalAmount + Number.EPSILON) * 100) / 100,
  };
}

function readStoredAddedOrder(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(sessionStorage.getItem(ADDED_ORDER_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((id) => Number(id))
      .filter((id) => Number.isSafeInteger(id) && id > 0);
  } catch {
    return [];
  }
}

function persistAddedOrder(ids: number[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ADDED_ORDER_KEY, JSON.stringify(ids));
}

function clearStoredAddedOrder() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ADDED_ORDER_KEY);
}

/** El primero que se agregó queda arriba; los siguientes, debajo. */
function sortByAddedOrder<T extends { idProduct: number }>(
  lines: T[],
  order: number[],
): T[] {
  if (order.length === 0) return lines;
  const rank = new Map(order.map((id, index) => [id, index]));
  return [...lines].sort((left, right) => {
    const leftRank = rank.get(left.idProduct);
    const rightRank = rank.get(right.idProduct);
    if (leftRank == null && rightRank == null) return 0;
    if (leftRank == null) return 1;
    if (rightRank == null) return -1;
    return leftRank - rightRank;
  });
}

function reconcileAddedOrder(
  order: number[],
  serverIds: number[],
  pinIds: number[] = [],
): number[] {
  const present = new Set(serverIds);
  const known = new Set(order);
  const newPins = pinIds.filter((id) => present.has(id) && !known.has(id));
  const newPinSet = new Set(newPins);
  const kept = order.filter((id) => present.has(id));
  const keptSet = new Set(kept);
  const missing = serverIds.filter((id) => !keptSet.has(id) && !newPinSet.has(id));
  return [...kept, ...missing, ...newPins];
}

function cartIsComplete(payload: CartPayload): boolean {
  const total = Number(payload.pagination?.total) || 0;
  return payload.data.length >= total;
}

function asCartPayload(raw: unknown): CartPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Partial<CartPayload>;
  if (!Array.isArray(body.data) || !body.pagination) return null;
  return {
    data: body.data,
    pagination: body.pagination,
    totalAmount: Number(body.totalAmount) || 0,
    importedQuotes: Array.isArray(body.importedQuotes)
      ? body.importedQuotes
          .map((quote) => String(quote || "").trim())
          .filter(Boolean)
      : [],
  };
}

const money = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

function errorText(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message || fallback;
}

function resetLabel(resetAt?: string): string {
  const resetDate = resetAt ? new Date(resetAt) : null;
  if (resetDate && !Number.isNaN(resetDate.getTime())) {
    return resetDate.toLocaleString("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }
  return "dentro de las próximas 24 horas";
}

function limitMessage(resetAt?: string): string {
  return `Ya generaste 3 cotizaciones para esta misma configuración. Podrás volver a generarla ${resetLabel(resetAt)}. También puedes modificar productos, cantidades o bodega.`;
}

export default function useGenerarCotizacion(onCreated: () => void) {
  const { requestGet, requestPost, requestDelete } = UtilsService();
  const { setQueryParams } = useQueryParams();
  const { setDataModal, socketCron, socketCronReady } = useTheContext();
  const [hydratedDraft, setHydratedDraft] = useState(false);
  const [cartReady, setCartReady] = useState(false);
  const skipPersist = useRef(false);
  const usesServerCart = useRef(true);
  const legacyLines = useRef<QuoteDraftLine[]>([]);
  const allLines = useRef<QuoteDraftLine[]>([]);
  const localImports = useRef<LocalImportedQuote[]>([]);
  const cartPageRef = useRef(cartPageFromLocation());
  const loadSequence = useRef(0);
  const qtyTimers = useRef(new Map<number, number>());
  const qtyEpoch = useRef(new Map<number, number>());
  const pendingQty = useRef(new Map<number, number | "">());
  const linesRef = useRef<QuoteDraftLine[]>([]);
  const cartCountRef = useRef(0);
  const addedOrder = useRef<number[]>([]);
  const orderedLines = useRef<QuoteDraftLine[]>([]);
  const pendingPins = useRef<number[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerLada, setCustomerLada] = useState("+52");
  const [customerPhone, setCustomerPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [includeAssembly, setIncludeAssembly] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QuoteCatalogProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [lines, setLines] = useState<QuoteDraftLine[]>([]);
  const [cartPage, setCartPage] = useState(cartPageFromLocation);
  const [cartTotalCount, setCartTotalCount] = useState(0);
  const [cartTotalPages, setCartTotalPages] = useState(0);
  const [cartAmount, setCartAmount] = useState(0);
  const [generating, setGenerating] = useState<QuoteDetailLevel | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [importedQuotes, setImportedQuotes] = useState<string[]>([]);
  const [importNumber, setImportNumber] = useState("");
  const [importing, setImporting] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const searchSequence = useRef(0);
  const runLock = useRef(false);
  linesRef.current = lines;
  cartCountRef.current = cartTotalCount;

  const overlayPending = useCallback((pageLines: QuoteDraftLine[]) => {
    if (pendingQty.current.size === 0) return pageLines;
    return pageLines.map((line) => {
      const pending = pendingQty.current.get(line.idProduct);
      return pending === undefined ? line : { ...line, quantity: pending };
    });
  }, []);

  const paintOrdered = useCallback(
    (
      lines: QuoteDraftLine[],
      page: number,
      meta: {
        totalAmount: number;
        importedQuotes: string[];
        total: number;
      },
    ) => {
      const ordered = sortByAddedOrder(lines, addedOrder.current);
      orderedLines.current = ordered;
      const local = sliceLocalCart(ordered, page);
      const visible = overlayPending(local.data);
      setLines(visible);
      cartPageRef.current = local.pagination.page;
      setCartPage(local.pagination.page);
      setCartTotalCount(meta.total);
      setCartTotalPages(local.pagination.totalPages);
      if (pendingQty.current.size === 0) setCartAmount(meta.totalAmount);
      setImportedQuotes(meta.importedQuotes);
      setQueryParams({
        cartPage: local.pagination.page <= 1 ? null : local.pagination.page,
      });
      rememberCartPage(local.pagination.page);
    },
    [overlayPending, setQueryParams],
  );

  const applyCart = useCallback(
    (payload: CartPayload) => {
      const incoming = payload.data.map((line) => mapCartLine(line));
      const serverIds = incoming.map((line) => line.idProduct);
      if (!cartIsComplete(payload)) {
        if (
          orderedLines.current.length > 0 &&
          orderedLines.current.length === payload.pagination.total
        ) {
          const byId = new Map(incoming.map((line) => [line.idProduct, line]));
          const merged = orderedLines.current.map((line) => {
            const next = byId.get(line.idProduct);
            if (!next) return line;
            const pending = pendingQty.current.get(line.idProduct);
            return {
              ...line,
              ...next,
              quantity: pending === undefined ? next.quantity : pending,
            };
          });
          paintOrdered(merged, cartPageRef.current, {
            totalAmount: payload.totalAmount,
            importedQuotes: payload.importedQuotes,
            total: payload.pagination.total,
          });
          return;
        }
        const known = new Set(addedOrder.current);
        const pinsOnPage = pendingPins.current.filter((id) =>
          serverIds.includes(id),
        );
        pendingPins.current = pendingPins.current.filter(
          (id) => !serverIds.includes(id),
        );
        for (const id of serverIds) {
          if (!known.has(id) && !pinsOnPage.includes(id)) {
            addedOrder.current.push(id);
            known.add(id);
          }
        }
        for (const id of pinsOnPage) {
          if (!addedOrder.current.includes(id)) addedOrder.current.push(id);
        }
        persistAddedOrder(addedOrder.current);
        setLines(overlayPending(sortByAddedOrder(incoming, addedOrder.current)));
        cartPageRef.current = payload.pagination.page;
        setCartPage(payload.pagination.page);
        setCartTotalCount(payload.pagination.total);
        setCartTotalPages(payload.pagination.totalPages);
        if (pendingQty.current.size === 0) setCartAmount(payload.totalAmount);
        setImportedQuotes(payload.importedQuotes);
        setQueryParams({
          cartPage:
            payload.pagination.page <= 1 ? null : payload.pagination.page,
        });
        rememberCartPage(payload.pagination.page);
        return;
      }

      const pins = pendingPins.current;
      pendingPins.current = [];
      const previous = addedOrder.current.slice();
      const newPins = pins.filter(
        (id) => serverIds.includes(id) && !previous.includes(id),
      );
      const nextOrder = reconcileAddedOrder(
        addedOrder.current,
        serverIds,
        newPins,
      );
      addedOrder.current = nextOrder;
      persistAddedOrder(nextOrder);
      const lastPin = [...newPins]
        .reverse()
        .find((id) => serverIds.includes(id));
      const orderedPreview = sortByAddedOrder(incoming, nextOrder);
      const placed =
        lastPin == null
          ? -1
          : orderedPreview.findIndex((line) => line.idProduct === lastPin);
      const page =
        placed >= 0
          ? Math.floor(placed / CART_PAGE_SIZE) + 1
          : cartPageRef.current;
      paintOrdered(incoming, page, {
        totalAmount: payload.totalAmount,
        importedQuotes: payload.importedQuotes,
        total: payload.pagination.total,
      });
    },
    [overlayPending, paintOrdered, setQueryParams],
  );

  const readCart = useCallback(
    async (page: number, viewAll = false) => {
      const params = new URLSearchParams({ page: String(page) });
      if (viewAll) params.set("view", "all");
      const response = await requestGet(
        `/cotizaciones/admin/cart?${params.toString()}`,
        { silent: true },
      );
      const payload = asCartPayload(response.data);
      if (!payload) throw new Error("cart");
      return payload;
    },
    [requestGet],
  );

  const loadPreviewLines = useCallback(async (): Promise<QuotePdfLine[]> => {
    const toPdf = (line: QuoteDraftLine): QuotePdfLine => {
      const pending = pendingQty.current.get(line.idProduct);
      const visible = linesRef.current.find(
        (item) => item.idProduct === line.idProduct,
      );
      const quantity =
        pending !== undefined
          ? pending
          : visible
            ? visible.quantity
            : line.quantity;
      return {
        idProduct: line.idProduct,
        name: line.name,
        description: line.description,
        caracteristicas: line.caracteristicas,
        price: Number(line.price) || 0,
        quantity: quantityOrOne(quantity),
        imageUrl: line.image_url,
        upc: line.upc,
      };
    };

    if (!usesServerCart.current) {
      return sortByAddedOrder(allLines.current, addedOrder.current).map(toPdf);
    }
    const payload = await readCart(1, true);
    const lines = payload.data.map((line) => mapCartLine(line));
    if (cartIsComplete(payload)) {
      const nextOrder = reconcileAddedOrder(
        addedOrder.current,
        lines.map((line) => line.idProduct),
      );
      addedOrder.current = nextOrder;
      persistAddedOrder(nextOrder);
    }
    return sortByAddedOrder(lines, addedOrder.current).map(toPdf);
  }, [readCart]);

  const showLocalCart = useCallback(
    (source: QuoteDraftLine[], page: number) => {
      usesServerCart.current = false;
      allLines.current = source;
      addedOrder.current = source.map((line) => line.idProduct);
      orderedLines.current = source;
      persistAddedOrder(addedOrder.current);
      const ids = new Set(source.map((line) => line.idProduct));
      localImports.current = localImports.current
        .map((quote) => ({
          ...quote,
          productIds: quote.productIds.filter((id) => ids.has(id)),
        }))
        .filter((quote) => quote.productIds.length > 0);
      setImportedQuotes(localImports.current.map((quote) => quote.quoteNumber));
      patchAdminQuoteDraft({
        lines: source,
        importedQuotes: localImports.current,
      });
      const local = sliceLocalCart(source, page);
      setLines(local.data);
      cartPageRef.current = local.pagination.page;
      setCartPage(local.pagination.page);
      setCartTotalCount(local.pagination.total);
      setCartTotalPages(local.pagination.totalPages);
      setCartAmount(local.totalAmount);
      setQueryParams({
        cartPage: local.pagination.page <= 1 ? null : local.pagination.page,
      });
      rememberCartPage(local.pagination.page);
    },
    [setQueryParams],
  );

  useEffect(() => {
    const cronSocket = socketCron?.current;
    if (!cronSocket || !socketCronReady) return;

    const onCronUpdate = (payload: unknown) => {
      const updates = normalizeCronStockPayload(payload);
      if (updates.length === 0) return;

      setResults((current) => patchQuoteLiveLines(current, updates) ?? current);

      if (!usesServerCart.current) {
        const next = patchQuoteLiveLines(allLines.current, updates);
        if (next) showLocalCart(next, cartPageRef.current);
        return;
      }
      if (cartCountRef.current === 0) return;

      const visible = patchQuoteLiveLines(linesRef.current, updates);
      if (visible) setLines(visible);

      void requestPost(
        { updates, page: cartPageRef.current },
        "/cotizaciones/admin/cart/live",
        { silent: true },
      )
        .then((response) => {
          const body = response.data as { changed?: boolean };
          if (body?.changed === false) return;
          const payload = asCartPayload(response.data);
          if (payload) applyCart(payload);
        })
        .catch(() => undefined);
    };

    cronSocket.on("updatedStockCron", onCronUpdate);
    return () => {
      cronSocket.off("updatedStockCron", onCronUpdate);
    };
  }, [applyCart, requestPost, showLocalCart, socketCron, socketCronReady]);

  useEffect(() => {
    addedOrder.current = readStoredAddedOrder();
    const draft = readAdminQuoteDraft();
    legacyLines.current = draft?.lines ?? [];
    localImports.current = draft?.importedQuotes ?? [];
    if (draft) {
      setCustomerName(draft.customerName);
      setCustomerLada(draft.customerLada);
      setCustomerPhone(draft.customerPhone);
      setIncludeAssembly(draft.includeAssembly);
    }
    setHydratedDraft(true);
  }, []);

  useEffect(() => {
    if (!hydratedDraft || skipPersist.current) return;
    patchAdminQuoteDraft({
      customerName,
      customerLada,
      customerPhone,
      includeAssembly,
      ...(usesServerCart.current ? {} : { lines: allLines.current }),
    });
  }, [
    customerLada,
    customerName,
    customerPhone,
    hydratedDraft,
    includeAssembly,
    cartReady,
  ]);

  useEffect(() => {
    if (!hydratedDraft) return;
    let cancelled = false;
    const page = cartPageFromLocation();
    const sequence = ++loadSequence.current;

    const load = async () => {
      try {
        let payload = await readCart(1, true);
        const legacy = legacyLines.current;
        if (
          payload.pagination.total === 0 &&
          legacy.length > 0 &&
          sequence === loadSequence.current
        ) {
          const response = await requestPost(
            { lines: legacy, page },
            "/cotizaciones/admin/cart/replace",
            { silent: true },
          );
          const replaced = asCartPayload(response.data);
          if (!replaced) throw new Error("cart");
          payload = cartIsComplete(replaced)
            ? replaced
            : await readCart(1, true);
          pendingPins.current = legacy
            .map((line) => line.idProduct)
            .filter((id) => !addedOrder.current.includes(id));
          legacyLines.current = [];
          patchAdminQuoteDraft({ lines: [], importedQuotes: [] });
        }
        if (cancelled || sequence !== loadSequence.current) return;
        usesServerCart.current = true;
        legacyLines.current = [];
        patchAdminQuoteDraft({ lines: [], importedQuotes: [] });
        applyCart(payload);
      } catch {
        if (cancelled || sequence !== loadSequence.current) return;
        showLocalCart(legacyLines.current, page);
      } finally {
        if (!cancelled && sequence === loadSequence.current) setCartReady(true);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [applyCart, hydratedDraft, readCart, requestPost, showLocalCart]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const sequence = ++searchSequence.current;
    const timer = window.setTimeout(async () => {
      try {
        const response = await requestGet(
          `/cotizaciones/admin/products/search?q=${encodeURIComponent(term)}`,
          { silent: true },
        );
        if (sequence !== searchSequence.current) return;
        const payload = response.data as { data?: QuoteCatalogProduct[] };
        setResults(Array.isArray(payload.data) ? payload.data : []);
      } catch (requestError) {
        if (sequence !== searchSequence.current) return;
        setResults([]);
        setError(
          errorText(requestError, "No se pudieron buscar productos."),
        );
      } finally {
        if (sequence === searchSequence.current) setSearching(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query, requestGet]);

  const addProduct = useCallback(
    async (product: QuoteCatalogProduct) => {
      setError("");
      setQuery("");
      setResults([]);
      if (!usesServerCart.current) {
        const current = allLines.current;
        const existing = current.find((line) => line.idProduct === product.idProduct);
        const next = existing
          ? current.map((line) =>
              line.idProduct === product.idProduct
                ? {
                    ...line,
                    quantity:
                      line.quantity === ""
                        ? 1
                        : Math.min(999, line.quantity + 1),
                  }
                : line,
            )
          : current.length >= 100
            ? current
            : [...current, { ...product, quantity: 1 }];
        const placed = next.findIndex((line) => line.idProduct === product.idProduct);
        const page = Math.floor(Math.max(placed, 0) / CART_PAGE_SIZE) + 1;
        showLocalCart(next, page);
        return;
      }
      try {
        const alreadyThere =
          addedOrder.current.includes(product.idProduct) ||
          orderedLines.current.some((line) => line.idProduct === product.idProduct);
        if (!alreadyThere) pendingPins.current = [product.idProduct];
        const response = await requestPost(
          product,
          "/cotizaciones/admin/cart/lines",
          { silent: true },
        );
        let payload = asCartPayload(response.data);
        if (!payload) throw new Error("cart");
        if (!cartIsComplete(payload)) payload = await readCart(1, true);
        applyCart(payload);
      } catch (requestError) {
        pendingPins.current = pendingPins.current.filter(
          (id) => id !== product.idProduct,
        );
        setError(errorText(requestError, "No se pudo agregar el producto."));
      }
    },
    [applyCart, readCart, requestPost, showLocalCart],
  );

  const setQuantity = useCallback(
    (idProduct: number, quantity: number | "") => {
      const next = quantity === "" ? "" : normalizeQuantity(quantity);
      if (next === null) return;
      const previous = linesRef.current.find((line) => line.idProduct === idProduct);
      if (previous && usesServerCart.current) {
        const oldQty = previous.quantity === "" ? 0 : previous.quantity;
        const newQty = next === "" ? 0 : next;
        setCartAmount((amount) =>
          money(amount + Number(previous.price || 0) * (newQty - oldQty)),
        );
      }
      setLines((current) =>
        current.map((line) =>
          line.idProduct === idProduct ? { ...line, quantity: next } : line,
        ),
      );
      orderedLines.current = orderedLines.current.map((line) =>
        line.idProduct === idProduct ? { ...line, quantity: next } : line,
      );
      if (!usesServerCart.current) {
        const nextLines = allLines.current.map((line) =>
          line.idProduct === idProduct ? { ...line, quantity: next } : line,
        );
        showLocalCart(nextLines, cartPageRef.current);
        return;
      }
      pendingQty.current.set(idProduct, next);
      const existing = qtyTimers.current.get(idProduct);
      if (existing) window.clearTimeout(existing);
      const timer = window.setTimeout(() => {
        qtyTimers.current.delete(idProduct);
        const value = pendingQty.current.get(idProduct);
        const ticket = (qtyEpoch.current.get(idProduct) ?? 0) + 1;
        qtyEpoch.current.set(idProduct, ticket);
        void requestPost(
          {
            idProduct,
            quantity: value === "" ? null : value,
            page: cartPageRef.current,
          },
          "/cotizaciones/admin/cart/lines/quantity",
          { silent: true },
        )
          .then((response) => {
            if (qtyEpoch.current.get(idProduct) !== ticket) return;
            if (pendingQty.current.get(idProduct) === value) {
              pendingQty.current.delete(idProduct);
            }
            const payload = asCartPayload(response.data);
            if (payload) applyCart(payload);
          })
          .catch((requestError) => {
            if (qtyEpoch.current.get(idProduct) !== ticket) return;
            setError(errorText(requestError, "No se pudo actualizar la cantidad."));
          });
      }, 400);
      qtyTimers.current.set(idProduct, timer);
    },
    [applyCart, requestPost, showLocalCart],
  );

  const lineOrderSource = useCallback(() => {
    if (!usesServerCart.current) return allLines.current;
    if (orderedLines.current.length > 0) return orderedLines.current;
    return linesRef.current;
  }, []);

  const commitLineOrder = useCallback(
    (next: number[], page: number) => {
      addedOrder.current = next;
      persistAddedOrder(next);
      const sorted = sortByAddedOrder(lineOrderSource(), next);
      if (!usesServerCart.current) {
        showLocalCart(sorted, page);
        return;
      }
      if (
        orderedLines.current.length > 0 &&
        orderedLines.current.length === cartCountRef.current
      ) {
        orderedLines.current = sorted;
        const local = sliceLocalCart(sorted, page);
        setLines(overlayPending(local.data));
        cartPageRef.current = local.pagination.page;
        setCartPage(local.pagination.page);
        setCartTotalPages(local.pagination.totalPages);
        setQueryParams({
          cartPage: local.pagination.page <= 1 ? null : local.pagination.page,
        });
        rememberCartPage(local.pagination.page);
        return;
      }
      setLines(overlayPending(sorted));
    },
    [lineOrderSource, overlayPending, setQueryParams, showLocalCart],
  );

  const orderWithLines = useCallback(
    (fromId: number) => {
      const next = addedOrder.current.slice();
      for (const line of lineOrderSource()) {
        if (!next.includes(line.idProduct)) next.push(line.idProduct);
      }
      if (!next.includes(fromId)) return null;
      return next;
    },
    [lineOrderSource],
  );

  const reorderLine = useCallback(
    (fromId: number, toId: number) => {
      if (fromId === toId) return;
      const next = orderWithLines(fromId);
      if (!next) return;
      const from = next.indexOf(fromId);
      const to = next.indexOf(toId);
      if (from < 0 || to < 0) return;
      const [moved] = next.splice(from, 1);
      if (moved == null) return;
      next.splice(to, 0, moved);
      const page = Math.floor(to / CART_PAGE_SIZE) + 1;
      commitLineOrder(next, page);
    },
    [commitLineOrder, orderWithLines],
  );

  const moveLineToNeighborPage = useCallback(
    (fromId: number, direction: "previous" | "next") => {
      const next = orderWithLines(fromId);
      if (!next) return;
      const pageCount = Math.max(1, Math.ceil(next.length / CART_PAGE_SIZE));
      const page = cartPageRef.current;
      if (direction === "previous" && page <= 1) return;
      if (direction === "next" && page >= pageCount) return;
      const from = next.indexOf(fromId);
      if (from < 0) return;
      const pageStart = (page - 1) * CART_PAGE_SIZE;
      const indexAfterRemoval =
        direction === "previous" ? pageStart - 1 : pageStart + CART_PAGE_SIZE;
      const [moved] = next.splice(from, 1);
      if (moved == null) return;
      const index = Math.max(0, Math.min(indexAfterRemoval, next.length));
      next.splice(index, 0, moved);
      commitLineOrder(next, direction === "previous" ? page - 1 : page + 1);
    },
    [commitLineOrder, orderWithLines],
  );

  const removeLine = useCallback(
    (idProduct: number) => {
      if (!usesServerCart.current) {
        showLocalCart(
          allLines.current.filter((line) => line.idProduct !== idProduct),
          cartPageRef.current,
        );
        return;
      }
      void requestDelete(
        `/cotizaciones/admin/cart/lines/${idProduct}?page=${cartPageRef.current}`,
        { silent: true },
      )
        .then(async (response) => {
          let payload = asCartPayload(response.data);
          if (!payload) return;
          if (!cartIsComplete(payload)) payload = await readCart(1, true);
          applyCart(payload);
        })
        .catch((requestError) => {
          setError(errorText(requestError, "No se pudo quitar el producto."));
        });
    },
    [applyCart, readCart, requestDelete, showLocalCart],
  );

  const goToCartPage = useCallback(
    (page: number) => {
      const safePage = Math.max(1, Math.trunc(page) || 1);
      cartPageRef.current = safePage;
      setCartPage(safePage);
      setQueryParams({ cartPage: safePage <= 1 ? null : safePage });
      rememberCartPage(safePage);
      if (!usesServerCart.current) {
        showLocalCart(allLines.current, safePage);
        return;
      }
      if (
        orderedLines.current.length > 0 &&
        orderedLines.current.length === cartCountRef.current
      ) {
        const local = sliceLocalCart(orderedLines.current, safePage);
        setLines(overlayPending(local.data));
        cartPageRef.current = local.pagination.page;
        setCartPage(local.pagination.page);
        setCartTotalPages(local.pagination.totalPages);
        if (local.pagination.page !== safePage) {
          setQueryParams({
            cartPage: local.pagination.page <= 1 ? null : local.pagination.page,
          });
          rememberCartPage(local.pagination.page);
        }
        return;
      }
      const sequence = ++loadSequence.current;
      void readCart(safePage)
        .then((payload) => {
          if (sequence !== loadSequence.current) return;
          applyCart(payload);
        })
        .catch((requestError) => {
          if (sequence !== loadSequence.current) return;
          setError(errorText(requestError, "No se pudo cambiar de página."));
        });
    },
    [applyCart, overlayPending, readCart, setQueryParams, showLocalCart],
  );

  const importQuote = useCallback(async () => {
    const quoteNumber = importNumber.trim().replace(/^#/, "");
    if (!quoteNumber) {
      setNotice("");
      setError("Escribe el número de cotización.");
      return;
    }
    setImporting(true);
    setError("");
    setNotice("");
    try {
      const response = await requestGet(
        `/cotizaciones/admin/import/${encodeURIComponent(quoteNumber)}`,
        { silent: true },
      );
      const imported = (
        response.data as {
          data?: {
            quoteNumber?: string;
            customerName?: string;
            customerPhone?: string;
            includeAssembly?: boolean;
            missing?: number;
            lines?: QuoteDraftLine[];
          };
        }
      ).data;
      const source = Array.isArray(imported?.lines) ? imported.lines : [];
      if (!imported || source.length === 0) {
        throw new Error("empty");
      }
      const ready = source.map((line) => ({
        ...line,
        quantity: quantityOrOne(line.quantity),
      }));
      const folio = String(imported.quoteNumber || quoteNumber)
        .trim()
        .replace(/^#/, "")
        .toUpperCase();
      if (!usesServerCart.current) {
        const merged = [...allLines.current];
        let page = cartPageRef.current;
        for (const line of ready) {
          const index = merged.findIndex((item) => item.idProduct === line.idProduct);
          const add = quantityOrOne(line.quantity);
          if (index >= 0) {
            const existing = merged[index];
            if (!existing) continue;
            const base = existing.quantity === "" ? 0 : existing.quantity;
            merged[index] = {
              ...existing,
              quantity: Math.min(999, base + add),
            };
            continue;
          }
          if (merged.length >= 100) {
            throw new Error("full");
          }
          merged.push(line);
          page = Math.floor((merged.length - 1) / CART_PAGE_SIZE) + 1;
        }
        localImports.current = [
          ...localImports.current.filter((quote) => quote.quoteNumber !== folio),
          { quoteNumber: folio, productIds: ready.map((line) => line.idProduct) },
        ];
        showLocalCart(merged, page);
      } else {
        const merged = await requestPost(
          { lines: ready, quoteNumber: folio },
          "/cotizaciones/admin/cart/merge",
          { silent: true },
        );
        const known = new Set([
          ...addedOrder.current,
          ...orderedLines.current.map((line) => line.idProduct),
        ]);
        pendingPins.current = ready
          .map((line) => line.idProduct)
          .filter((id) => !known.has(id));
        let payload = asCartPayload(merged.data);
        if (!payload) throw new Error("cart");
        if (!cartIsComplete(payload)) payload = await readCart(1, true);
        applyCart(payload);
      }
      const phone = String(imported.customerPhone || "").trim();
      const match = phone.match(/^(\+\d{1,3})\s+(\d+)$/);
      const ladaCandidate = match?.[1] || "+52";
      const lada = QUOTE_LADA_OPTIONS.includes(
        ladaCandidate as (typeof QUOTE_LADA_OPTIONS)[number],
      )
        ? ladaCandidate
        : "+52";
      const digits = (match?.[2] || phone.replace(/\D/g, "")).slice(0, 10);
      setCustomerName(String(imported.customerName || "").slice(0, 120));
      setCustomerLada(lada);
      setCustomerPhone(digits);
      setPhoneError("");
      setIncludeAssembly(imported.includeAssembly === true);
      try {
        await requestPost(
          {},
          `/cotizaciones/admin/import/${encodeURIComponent(folio)}`,
          { silent: true },
        );
      } catch (markError) {
        setError(
          errorText(
            markError,
            "Los productos se cargaron, pero no se pudo marcar la cotización como importada.",
          ),
        );
        return;
      }
      const missing = Number(imported.missing) || 0;
      setNotice(
        missing > 0
          ? `Cotización ${folio} importada. Sus productos se sumaron al carrito. ${missing} ya no están en el catálogo.`
          : `Cotización ${folio} importada. Sus productos se sumaron a los que ya tenías.`,
      );
    } catch (requestError) {
        pendingPins.current = [];
        setError(
          errorText(
            requestError,
            requestError instanceof Error && requestError.message === "full"
              ? "El carrito admite como máximo 100 productos."
              : "No se pudo importar la cotización.",
          ),
        );
    } finally {
      setImporting(false);
    }
  }, [applyCart, importNumber, readCart, requestGet, requestPost, showLocalCart]);

  const performUnlink = useCallback(
    async (quoteNumber: string) => {
      const response = await requestPost(
        { page: cartPageRef.current },
        `/cotizaciones/admin/import/${encodeURIComponent(quoteNumber)}/unlink`,
        { silent: true },
      );
      const body = response.data as {
        removed?: number;
        productIds?: number[];
        quoteNumber?: string;
      };
      const productIds = new Set(
        (Array.isArray(body.productIds) ? body.productIds : [])
          .map((id) => Number(id))
          .filter((id) => Number.isSafeInteger(id) && id > 0),
      );
      let removed = Number(body.removed) || 0;
      if (!usesServerCart.current) {
        const before = allLines.current.length;
        const next = allLines.current.filter(
          (line) => !productIds.has(line.idProduct),
        );
        removed = before - next.length;
        const folioKey = String(body.quoteNumber || quoteNumber)
          .trim()
          .replace(/^#/, "")
          .toUpperCase();
        localImports.current = localImports.current.filter(
          (quote) => quote.quoteNumber !== folioKey,
        );
        showLocalCart(next, cartPageRef.current);
      } else {
        let payload = asCartPayload(response.data);
        if (!payload) throw new Error("cart");
        if (!cartIsComplete(payload)) payload = await readCart(1, true);
        applyCart(payload);
      }
      return {
        removed,
        folio: body.quoteNumber || quoteNumber,
      };
    },
    [applyCart, readCart, requestPost, showLocalCart],
  );

  const startUnlink = useCallback(() => {
    setUnlinking(true);
    setError("");
    setNotice("");
    for (const [idProduct, timer] of qtyTimers.current) {
      window.clearTimeout(timer);
      qtyTimers.current.delete(idProduct);
      qtyEpoch.current.set(idProduct, (qtyEpoch.current.get(idProduct) ?? 0) + 1);
    }
    pendingQty.current.clear();
  }, []);

  const confirmUnlinkQuote = useCallback(
    (rawNumber: string) => {
      const quoteNumber = String(rawNumber || "")
        .trim()
        .replace(/^#/, "");
      if (!quoteNumber || importing || unlinking) return;
      const closeModal = () =>
        setDataModal((previous) => ({ ...previous, isOpen: false }));
      setDataModal({
        isOpen: true,
        type: "warning",
        title: "Desvincular cotización",
        content: `Se quitarán del carrito los productos de la cotización ${quoteNumber}. Los que agregaste aparte se quedan.`,
        showActions: true,
        confirmLabel: "Sí, desvincular",
        cancelLabel: "Cancelar",
        onClose: closeModal,
        onConfirm: () => {
          closeModal();
          startUnlink();
          void performUnlink(quoteNumber)
            .then(({ removed, folio }) => {
              setNotice(
                removed > 0
                  ? removed === 1
                    ? `Se quitó 1 producto de la cotización ${folio}.`
                    : `Se quitaron ${removed} productos de la cotización ${folio}.`
                  : `La cotización ${folio} quedó desvinculada. No había productos suyos en el carrito.`,
              );
            })
            .catch((requestError) => {
              setError(
                errorText(requestError, "No se pudo desvincular la cotización."),
              );
            })
            .finally(() => setUnlinking(false));
        },
      });
    },
    [importing, performUnlink, setDataModal, startUnlink, unlinking],
  );

  const confirmUnlinkAll = useCallback(() => {
    const numbers = importedQuotes
      .map((quote) => quote.trim().replace(/^#/, ""))
      .filter(Boolean);
    if (numbers.length === 0 || importing || unlinking) return;
    const closeModal = () =>
      setDataModal((previous) => ({ ...previous, isOpen: false }));
    setDataModal({
      isOpen: true,
      type: "warning",
      title: "Desvincular todas",
      content:
        "Se quitarán del carrito los productos de todas las cotizaciones importadas. Los que agregaste aparte se quedan.",
      showActions: true,
      confirmLabel: "Sí, desvincular todas",
      cancelLabel: "Cancelar",
      onClose: closeModal,
      onConfirm: () => {
        closeModal();
        startUnlink();
        void (async () => {
          let removed = 0;
          for (const quoteNumber of numbers) {
            const result = await performUnlink(quoteNumber);
            removed += result.removed;
          }
          setNotice(
            removed === 0
              ? `Se desvincularon ${numbers.length} cotizaciones. No había productos suyos en el carrito.`
              : removed === 1
                ? `Se desvincularon ${numbers.length} cotizaciones y se quitó 1 producto del carrito.`
                : `Se desvincularon ${numbers.length} cotizaciones y se quitaron ${removed} productos del carrito.`,
          );
        })()
          .catch((requestError) => {
            setError(
              errorText(
                requestError,
                "No se pudieron desvincular todas las cotizaciones.",
              ),
            );
          })
          .finally(() => setUnlinking(false));
      },
    });
  }, [
    importedQuotes,
    importing,
    performUnlink,
    setDataModal,
    startUnlink,
    unlinking,
  ]);

  const confirmClearCart = useCallback(() => {
    if (cartTotalCount === 0) return;
    const closeModal = () =>
      setDataModal((previous) => ({ ...previous, isOpen: false }));
    setDataModal({
      isOpen: true,
      type: "warning",
      title: "Advertencia: vaciar carrito",
      content:
        "¿Seguro que quieres quitar todos los productos de esta cotización? El nombre y el teléfono se conservan. Esta acción no se puede deshacer.",
      showActions: true,
      confirmLabel: "Sí, vaciar carrito",
      cancelLabel: "Cancelar",
      onClose: closeModal,
      onConfirm: () => {
        closeModal();
        addedOrder.current = [];
        orderedLines.current = [];
        pendingPins.current = [];
        clearStoredAddedOrder();
        if (!usesServerCart.current) {
          showLocalCart([], 1);
          return;
        }
        void requestDelete("/cotizaciones/admin/cart", { silent: true })
          .then((response) => {
            const payload = asCartPayload(response.data);
            if (payload) applyCart(payload);
          })
          .catch((requestError) => {
            setError(errorText(requestError, "No se pudo vaciar el carrito."));
          });
      },
    });
  }, [applyCart, cartTotalCount, requestDelete, setDataModal, showLocalCart]);

  const submitQuote = useCallback(
    async (
      detailLevel: QuoteDetailLevel,
      readyLines: Array<QuoteDraftLine & { quantity: number }>,
      name: string,
      phone: string,
    ) => {
      if (runLock.current) return;
      runLock.current = true;
      setGenerating(detailLevel);
      setError("");

      try {
        const quoteNumber = String(Date.now());
        const pdfLines: QuotePdfLine[] = readyLines.map((line) => ({
          idProduct: line.idProduct,
          name: line.name,
          description: line.description,
          caracteristicas: line.caracteristicas,
          price: Number(line.price) || 0,
          quantity: line.quantity,
          imageUrl: line.image_url,
          upc: line.upc,
        }));
        const itemCount = pdfLines.reduce(
          (sum, line) => sum + line.quantity,
          0,
        );
        const totalAmount = money(
          pdfLines.reduce(
            (sum, line) => sum + line.price * line.quantity,
            0,
          ),
        );

        const blob = await pdf(
          <CotizacionPdf
            noCotizacion={`#${quoteNumber}`}
            products={pdfLines}
            userName={name}
            userPhone={phone}
            includeAssemblyService={includeAssembly}
            detailLevel={detailLevel}
          />,
        ).toBlob();

        const formData = new FormData();
        formData.append(
          "file",
          blob,
          `cotización-${quoteNumber}.pdf`,
        );
        formData.append("quoteNumber", quoteNumber);
        formData.append("totalAmount", String(totalAmount));
        formData.append("itemCount", String(itemCount));
        formData.append("includeAssemblyService", String(includeAssembly));
        formData.append(
          "checkoutContext",
          JSON.stringify({
            mode: "cart",
            lines: pdfLines.map((line) => ({
              productId: String(line.idProduct),
              quantity: line.quantity,
              storeId: null,
              unitPrice: money(line.price),
            })),
          }),
        );
        if (name) formData.append("capturedName", name);
        if (phone) formData.append("capturedPhone", phone);

        const response = await requestPost(formData, "/cotizaciones/admin", {
          silent: true,
        });
        const remaining = (
          response.data as { quota?: { remaining?: number } }
        )?.quota?.remaining;

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `cotización-${quoteNumber}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);

        const quotaMessage =
          typeof remaining === "number"
            ? `Descarga completada. Puedes generar ${remaining} cotización${
                remaining === 1 ? "" : "es"
              } más con esta misma configuración durante las próximas 24 horas.`
            : "Descarga completada";
        const closeModal = () =>
          setDataModal((previous) => ({ ...previous, isOpen: false }));
        setDataModal({
          isOpen: true,
          type: "success",
          title: "Cotización",
          content: quotaMessage,
          showActions: true,
          confirmLabel: "Aceptar",
          cancelLabel: "",
          onClose: closeModal,
          onConfirm: closeModal,
        });
        skipPersist.current = true;
        if (usesServerCart.current) {
          try {
            await requestDelete("/cotizaciones/admin/cart", { silent: true });
          } catch {
            // La cotización ya quedó guardada.
          }
        } else {
          allLines.current = [];
          localImports.current = [];
        }
        addedOrder.current = [];
        orderedLines.current = [];
        pendingPins.current = [];
        clearStoredAddedOrder();
        setLines([]);
        setImportedQuotes([]);
        setCartTotalCount(0);
        setCartTotalPages(0);
        setCartAmount(0);
        setQueryParams({ cartPage: null });
        rememberCartPage(1);
        clearAdminQuoteDraft();
        onCreated();
      } catch (requestError) {
        const axiosError = requestError as AxiosError<{
          quota?: { resetAt?: string };
        }>;
        if (axiosError.response?.status === 429) {
          setError(limitMessage(axiosError.response.data?.quota?.resetAt));
          return;
        }
        setError(
          errorText(
            requestError,
            "No se pudo generar la cotización. Intenta de nuevo.",
          ),
        );
      } finally {
        runLock.current = false;
        setGenerating(null);
      }
    },
    [includeAssembly, onCreated, requestDelete, requestPost, setDataModal, setQueryParams],
  );

  const generate = useCallback(
    async (detailLevel: QuoteDetailLevel) => {
      if (runLock.current || generating || cartTotalCount === 0) return;

      const phoneDigits = customerPhone.replace(/\D/g, "");
      const lada = QUOTE_LADA_OPTIONS.includes(
        customerLada as (typeof QUOTE_LADA_OPTIONS)[number],
      )
        ? customerLada
        : "+52";
      if (phoneDigits && phoneDigits.length !== 10) {
        const message =
          "El teléfono debe tener exactamente 10 dígitos. Corrige el número o déjalo vacío.";
        const closeModal = () =>
          setDataModal((previous) => ({ ...previous, isOpen: false }));
        setPhoneError(message);
        setError("");
        setDataModal({
          isOpen: true,
          type: "warning",
          title: "Teléfono incompleto",
          content: message,
          showActions: true,
          confirmLabel: "Entendido",
          cancelLabel: "Cerrar",
          onClose: closeModal,
          onConfirm: closeModal,
        });
        return;
      }
      setPhoneError("");

      const name = customerName.trim().slice(0, 120);
      const phone = phoneDigits ? `${lada} ${phoneDigits}` : "";
      qtyTimers.current.forEach((timer) => window.clearTimeout(timer));
      qtyTimers.current.clear();
      const pending = [...pendingQty.current.entries()];
      pendingQty.current.clear();
      runLock.current = true;
      setGenerating(detailLevel);
      setError("");

      let readyLines: Array<QuoteDraftLine & { quantity: number }> = [];
      let proceed = false;
      try {
        if (usesServerCart.current) {
          for (const [idProduct, quantity] of pending) {
            await requestPost(
              {
                idProduct,
                quantity: quantity === "" ? null : quantity,
                page: cartPageRef.current,
              },
              "/cotizaciones/admin/cart/lines/quantity",
              { silent: true },
            );
          }
          const payload = await readCart(1, true);
          const source = payload.data.map((line) => mapCartLine(line));
          if (cartIsComplete(payload)) {
            const nextOrder = reconcileAddedOrder(
              addedOrder.current,
              source.map((line) => line.idProduct),
            );
            addedOrder.current = nextOrder;
            persistAddedOrder(nextOrder);
          }
          const orderedSource = sortByAddedOrder(source, addedOrder.current);
          readyLines = orderedSource.map((line) => ({
            ...line,
            quantity: quantityOrOne(line.quantity),
          }));
          if (source.some((line) => line.quantity === "")) {
            const replaced = asCartPayload(
              (
                await requestPost(
                  { lines: readyLines, page: cartPageRef.current },
                  "/cotizaciones/admin/cart/replace",
                  { silent: true },
                )
              ).data,
            );
            if (replaced) {
              const full = cartIsComplete(replaced)
                ? replaced
                : await readCart(1, true);
              applyCart(full);
            }
          }
        } else {
          readyLines = allLines.current.map((line) => ({
            ...line,
            quantity: quantityOrOne(line.quantity),
          }));
          showLocalCart(readyLines, cartPageRef.current);
        }
        if (readyLines.length === 0) {
          setGenerating(null);
          return;
        }
        const response = await requestGet(
          `/cotizaciones/admin/products/availability?ids=${readyLines
            .map((line) => line.idProduct)
            .join(",")}`,
          { silent: true },
        );
        const payload = response.data as { data?: QuoteAvailability[] };
        if (!Array.isArray(payload.data)) {
          throw new Error("availability");
        }
        const availability = payload.data;
        const incidents = buildQuoteStockIncidents(readyLines, availability);
        if (incidents.length > 0) {
          const closeModal = () =>
            setDataModal((previous) => ({ ...previous, isOpen: false }));
          setGenerating(null);
          setDataModal({
            isOpen: true,
            type: "warning",
            title: "Advertencia: incidencias en el carrito",
            content: <QuoteStockWarning incidents={incidents} />,
            showActions: true,
            confirmLabel: "Generar de todos modos",
            cancelLabel: "Volver",
            maxWidth: "min(92vw, 560px)",
            onClose: closeModal,
            onConfirm: () => {
              closeModal();
              void submitQuote(detailLevel, readyLines, name, phone);
            },
          });
          return;
        }
        proceed = true;
      } catch (requestError) {
        setGenerating(null);
        setError(
          errorText(
            requestError,
            "No se pudo verificar el stock de los productos. Intenta de nuevo.",
          ),
        );
      } finally {
        runLock.current = false;
      }

      if (proceed) {
        await submitQuote(detailLevel, readyLines, name, phone);
      }
    },
    [
      cartTotalCount,
      customerLada,
      customerName,
      customerPhone,
      generating,
      readCart,
      requestGet,
      requestPost,
      setDataModal,
      showLocalCart,
      submitQuote,
      applyCart,
    ],
  );

  return {
    customerName,
    setCustomerName,
    customerLada,
    setCustomerLada,
    customerPhone,
    setCustomerPhone: (value: string) => {
      setCustomerPhone(value);
      const digits = value.replace(/\D/g, "");
      if (!digits || digits.length === 10) setPhoneError("");
    },
    phoneError,
    includeAssembly,
    setIncludeAssembly,
    query,
    setQuery,
    results,
    searching,
    lines,
    cartPage,
    cartTotalCount,
    cartTotalPages,
    cartReady,
    goToCartPage,
    generating,
    error,
    notice,
    importedQuotes,
    dismissError: () => setError(""),
    dismissNotice: () => setNotice(""),
    importNumber,
    setImportNumber,
    importing,
    importQuote,
    unlinking,
    confirmUnlinkQuote,
    confirmUnlinkAll,
    total: money(cartAmount),
    addProduct,
    loadPreviewLines,
    setQuantity,
    reorderLine,
    moveLineToNeighborPage,
    removeLine,
    confirmClearCart,
    generate,
  };
}
