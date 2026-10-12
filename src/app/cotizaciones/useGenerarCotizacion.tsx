"use client";

import { pdf } from "@react-pdf/renderer";
import { AxiosError } from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryParams } from "../hooks/useQueryParams";
import { saveQuerySession } from "../utils/querySession";
import { parsePageParam, readWindowSearchParam } from "../utils/adminPagination";
import { useTheContext } from "../hooks/global.hook";
import UtilsService from "../services/utils";
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

export type AdminQuoteDraft = {
  open: boolean;
  customerName: string;
  customerLada: string;
  customerPhone: string;
  includeAssembly: boolean;
  lines: QuoteDraftLine[];
};

const emptyDraft = (): AdminQuoteDraft => ({
  open: false,
  customerName: "",
  customerLada: "+52",
  customerPhone: "",
  includeAssembly: false,
  lines: [],
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

function asCartPayload(raw: unknown): CartPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Partial<CartPayload>;
  if (!Array.isArray(body.data) || !body.pagination) return null;
  return {
    data: body.data,
    pagination: body.pagination,
    totalAmount: Number(body.totalAmount) || 0,
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
  const { setDataModal } = useTheContext();
  const [hydratedDraft, setHydratedDraft] = useState(false);
  const [cartReady, setCartReady] = useState(false);
  const skipPersist = useRef(false);
  const usesServerCart = useRef(true);
  const legacyLines = useRef<QuoteDraftLine[]>([]);
  const allLines = useRef<QuoteDraftLine[]>([]);
  const cartPageRef = useRef(cartPageFromLocation());
  const loadSequence = useRef(0);
  const qtyTimers = useRef(new Map<number, number>());
  const qtyEpoch = useRef(new Map<number, number>());
  const pendingQty = useRef(new Map<number, number | "">());
  const linesRef = useRef<QuoteDraftLine[]>([]);
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
  const [importNumber, setImportNumber] = useState("");
  const [importing, setImporting] = useState(false);
  const searchSequence = useRef(0);
  const runLock = useRef(false);
  linesRef.current = lines;

  const applyCart = useCallback(
    (payload: CartPayload) => {
      const pageLines = payload.data.map((line) => mapCartLine(line));
      setLines((current) =>
        pageLines.map((line) => {
          if (!pendingQty.current.has(line.idProduct)) return line;
          const local = current.find((item) => item.idProduct === line.idProduct);
          return local ? { ...line, quantity: local.quantity } : line;
        }),
      );
      cartPageRef.current = payload.pagination.page;
      setCartPage(payload.pagination.page);
      setCartTotalCount(payload.pagination.total);
      setCartTotalPages(payload.pagination.totalPages);
      if (pendingQty.current.size === 0) setCartAmount(payload.totalAmount);
      setQueryParams({
        cartPage: payload.pagination.page <= 1 ? null : payload.pagination.page,
      });
      rememberCartPage(payload.pagination.page);
    },
    [setQueryParams],
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

  const showLocalCart = useCallback(
    (source: QuoteDraftLine[], page: number) => {
      usesServerCart.current = false;
      allLines.current = source;
      patchAdminQuoteDraft({ lines: source });
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
    const draft = readAdminQuoteDraft();
    legacyLines.current = draft?.lines ?? [];
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
        let payload = await readCart(page);
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
          payload = replaced;
          legacyLines.current = [];
          patchAdminQuoteDraft({ lines: [] });
        }
        if (cancelled || sequence !== loadSequence.current) return;
        usesServerCart.current = true;
        legacyLines.current = [];
        patchAdminQuoteDraft({ lines: [] });
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

    const sequence = ++searchSequence.current;
    const timer = window.setTimeout(async () => {
      setSearching(true);
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
        const response = await requestPost(
          product,
          "/cotizaciones/admin/cart/lines",
          { silent: true },
        );
        const payload = asCartPayload(response.data);
        if (!payload) throw new Error("cart");
        applyCart(payload);
      } catch (requestError) {
        setError(errorText(requestError, "No se pudo agregar el producto."));
      }
    },
    [applyCart, requestPost, showLocalCart],
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
        .then((response) => {
          const payload = asCartPayload(response.data);
          if (payload) applyCart(payload);
        })
        .catch((requestError) => {
          setError(errorText(requestError, "No se pudo quitar el producto."));
        });
    },
    [applyCart, requestDelete, showLocalCart],
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
    [applyCart, readCart, setQueryParams, showLocalCart],
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
      if (!usesServerCart.current) {
        showLocalCart(ready, 1);
      } else {
        const replaced = await requestPost(
          { lines: ready, page: 1 },
          "/cotizaciones/admin/cart/replace",
          { silent: true },
        );
        const payload = asCartPayload(replaced.data);
        if (!payload) throw new Error("cart");
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
      const folio = imported.quoteNumber || quoteNumber;
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
          ? `Cotización ${folio} importada. ${missing} producto(s) ya no están en el catálogo; puedes quitarlos o seguir editando el resto.`
          : `Cotización ${folio} importada. Ya puedes editar cantidades, quitar o agregar productos.`,
      );
    } catch (requestError) {
      setError(
        errorText(requestError, "No se pudo importar la cotización."),
      );
    } finally {
      setImporting(false);
    }
  }, [applyCart, importNumber, requestGet, requestPost, showLocalCart]);

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
        }
        setLines([]);
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
          readyLines = source.map((line) => ({
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
            if (replaced) applyCart(replaced);
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
    dismissError: () => setError(""),
    dismissNotice: () => setNotice(""),
    importNumber,
    setImportNumber,
    importing,
    importQuote,
    total: money(cartAmount),
    addProduct,
    setQuantity,
    removeLine,
    confirmClearCart,
    generate,
  };
}
