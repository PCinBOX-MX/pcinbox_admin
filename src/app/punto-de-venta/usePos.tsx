"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import UtilsService from "../services/utils";
import { useTheContext } from "../hooks/global.hook";
import usePermissions from "../hooks/usePermissions";
import {
  PosBranch,
  PosCartLine,
  PosCashSession,
  PosCustomerHit,
  PosPaymentLine,
  PosPaymentMethod,
  PosProductHit,
  PosProductSerial,
  PosSale,
  SELLER_MAX_DISCOUNT_PCT,
} from "../interfaces/pos/pos.interface";

const BRANCH_STORAGE_KEY = "pcinbox-pos-branchId";
const GUIDE_STORAGE_KEY = "pcinbox-pos-guide-dismissed";

function shouldSearchProducts(q: string): boolean {
  const term = q.trim();
  if (!term) return false;
  if (term.length >= 2) return true;
  return /^\d{8,}$/.test(term);
}

function roundMoney(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function lineTotal(unitPrice: number, quantity: number, discountPct: number) {
  return roundMoney(unitPrice * quantity * (1 - discountPct / 100));
}

function firstImage(imageUrl: unknown): string | null {
  if (!imageUrl) return null;
  if (typeof imageUrl === "string") return imageUrl;
  if (Array.isArray(imageUrl) && imageUrl[0]) return String(imageUrl[0]);
  if (typeof imageUrl === "object" && imageUrl !== null) {
    const values = Object.values(imageUrl as Record<string, unknown>);
    if (values[0]) return String(values[0]);
  }
  return null;
}

export default function usePos() {
  const { requestGet, requestPost } = UtilsService();
  const { setDataModal } = useTheContext();
  const { isAdmin, hydrated } = usePermissions();

  const [tab, setTab] = useState<
    "cobrar" | "historial" | "caja" | "series" | "inventario"
  >("cobrar");
  const [branches, setBranches] = useState<PosBranch[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [cashOpen, setCashOpen] = useState(false);
  const [cashSession, setCashSession] = useState<PosCashSession | null>(null);
  const [cashExpected, setCashExpected] = useState<number | null>(null);
  const [cashLoading, setCashLoading] = useState(false);
  const [cashSessions, setCashSessions] = useState<PosCashSession[]>([]);
  const [openingFloat, setOpeningFloat] = useState("0");
  const [closingCounted, setClosingCounted] = useState("");
  const [cashMoveAmount, setCashMoveAmount] = useState("");
  const [cashMoveReason, setCashMoveReason] = useState("");
  const [cashNotes, setCashNotes] = useState("");
  const [cashBusy, setCashBusy] = useState(false);
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
  const [customer, setCustomer] = useState<PosCustomerHit | null>(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerHits, setCustomerHits] = useState<PosCustomerHit[]>([]);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [payments, setPayments] = useState<PosPaymentLine[]>([]);
  const [notes, setNotes] = useState("");
  const [charging, setCharging] = useState(false);
  const [lastSale, setLastSale] = useState<PosSale | null>(null);
  const [lastPaymentLink, setLastPaymentLink] = useState<string | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);

  const [history, setHistory] = useState<PosSale[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyFolio, setHistoryFolio] = useState("");
  const [historyStatus, setHistoryStatus] = useState("");
  const [detailSale, setDetailSale] = useState<PosSale | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const searchRef = useRef<HTMLInputElement | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maxDiscount = isAdmin ? 100 : SELLER_MAX_DISCOUNT_PCT;

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

  const remaining = roundMoney(totals.total - paidSum);

  const loadBranches = useCallback(async () => {
    const res = await requestGet("/pos/branches", { silent: true });
    const list: PosBranch[] = res?.data?.data || [];
    setBranches(list);
    const stored = Number(localStorage.getItem(BRANCH_STORAGE_KEY) || 0);
    if (stored && list.some((b) => b.idBranche === stored)) {
      setBranchId(stored);
    } else if (list[0]) {
      setBranchId(list[0].idBranche);
    }
  }, [requestGet]);

  useEffect(() => {
    void loadBranches().catch(() => undefined);
  }, [loadBranches]);

  useEffect(() => {
    if (branchId) localStorage.setItem(BRANCH_STORAGE_KEY, String(branchId));
  }, [branchId]);

  const selectedBranch = useMemo(
    () => branches.find((b) => b.idBranche === branchId) ?? null,
    [branches, branchId],
  );

  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    setShowGuide(localStorage.getItem(GUIDE_STORAGE_KEY) !== "1");
  }, []);

  const dismissGuide = useCallback(() => {
    localStorage.setItem(GUIDE_STORAGE_KEY, "1");
    setShowGuide(false);
  }, []);

  const openGuide = useCallback(() => {
    localStorage.removeItem(GUIDE_STORAGE_KEY);
    setShowGuide(true);
  }, []);

  const loadCashStatus = useCallback(async () => {
    if (!branchId) {
      setCashOpen(false);
      setCashSession(null);
      setCashExpected(null);
      return;
    }
    setCashLoading(true);
    try {
      const res = await requestGet(`/pos/cash/status?branchId=${branchId}`, {
        silent: true,
      });
      const data = res?.data?.data;
      setCashOpen(Boolean(data?.open));
      setCashSession(data?.session || null);
      setCashExpected(
        data?.expectedCash != null ? Number(data.expectedCash) : null,
      );
    } catch {
      setCashOpen(false);
      setCashSession(null);
      setCashExpected(null);
    } finally {
      setCashLoading(false);
    }
  }, [branchId, requestGet]);

  const loadCashSessions = useCallback(async () => {
    if (!branchId) {
      setCashSessions([]);
      return;
    }
    try {
      const params = new URLSearchParams({
        branchId: String(branchId),
        limit: "10",
      });
      const res = await requestGet(`/pos/cash/sessions?${params}`, {
        silent: true,
      });
      setCashSessions(res?.data?.data || []);
    } catch {
      setCashSessions([]);
    }
  }, [branchId, requestGet]);

  useEffect(() => {
    if (!branchId || (tab !== "cobrar" && tab !== "caja")) return;
    void loadCashStatus().catch(() => undefined);
  }, [branchId, tab, loadCashStatus]);

  useEffect(() => {
    if (tab === "caja" && branchId) {
      void loadCashSessions();
    }
  }, [tab, branchId, loadCashSessions]);

  const openCash = useCallback(async () => {
    if (!branchId) return;
    setCashBusy(true);
    try {
      await requestPost(
        {
          branchId,
          openingFloat: Number(openingFloat) || 0,
          notes: cashNotes || null,
        },
        "/pos/cash/open",
      );
      setCashNotes("");
      await loadCashStatus();
      await loadCashSessions();
      setDataModal({
        isOpen: true,
        title: "Caja abierta",
        content: "Ya puedes cobrar en efectivo en esta sucursal.",
        type: "success",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
    } catch {
      // handled
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
          content: "Indica un monto mayor a cero.",
          type: "warning",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
        });
        return;
      }
      if (cashMoveReason.trim().length < 3) {
        setDataModal({
          isOpen: true,
          title: "Motivo requerido",
          content: "Escribe un motivo (mín. 3 caracteres).",
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
    setCashBusy(true);
    try {
      const res = await requestPost(
        {
          branchId,
          closingCounted: counted,
          notes: cashNotes || null,
        },
        "/pos/cash/close",
      );
      const diff = res?.data?.data?.difference;
      setClosingCounted("");
      setCashNotes("");
      await loadCashStatus();
      await loadCashSessions();
      setDataModal({
        isOpen: true,
        title: "Corte cerrado",
        content:
          diff != null
            ? `Diferencia: ${Number(diff).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}`
            : "Sesión de caja cerrada.",
        type: "success",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
    } catch {
      // handled
    } finally {
      setCashBusy(false);
    }
  }, [
    branchId,
    closingCounted,
    cashNotes,
    requestPost,
    loadCashStatus,
    loadCashSessions,
    setDataModal,
  ]);

  const hasCashPayment = useMemo(
    () => payments.some((p) => p.method === "efectivo_sucursal"),
    [payments],
  );
  const productSearchGen = useRef(0);

  const runProductSearch = useCallback(
    async (q: string, branch: number) => {
      if (!shouldSearchProducts(q) || !branch) {
        productSearchGen.current += 1;
        setHits([]);
        setSearching(false);
        return;
      }
      const gen = ++productSearchGen.current;
      setSearching(true);
      try {
        const res = await requestGet(
          `/pos/products/search?q=${encodeURIComponent(q.trim())}&branchId=${branch}`,
          { silent: true },
        );
        if (gen !== productSearchGen.current) return;
        setHits(res?.data?.data || []);
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
    if (!branchId) return;
    searchTimer.current = setTimeout(() => {
      void runProductSearch(search, branchId);
    }, 280);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search, branchId, runProductSearch]);

  const customerSearchGen = useRef(0);

  useEffect(() => {
    if (customerQuery.trim().length < 2) {
      customerSearchGen.current += 1;
      setCustomerHits([]);
      return;
    }
    const gen = ++customerSearchGen.current;
    const t = setTimeout(async () => {
      try {
        const res = await requestGet(
          `/pos/customers/search?q=${encodeURIComponent(customerQuery.trim())}`,
          { silent: true },
        );
        if (gen !== customerSearchGen.current) return;
        setCustomerHits(res?.data?.data || []);
      } catch {
        if (gen !== customerSearchGen.current) return;
        setCustomerHits([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [customerQuery, requestGet]);

  const addProduct = useCallback(
    (product: PosProductHit) => {
      if (!branchId) {
        setDataModal({
          isOpen: true,
          title: "Sucursal requerida",
          content: "Selecciona una sucursal antes de agregar productos.",
          type: "warning",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
        });
        return;
      }
      if (product.stockBranch <= 0) {
        setDataModal({
          isOpen: true,
          title: "Sin stock",
          content: `«${product.name}» no tiene existencia en esta sucursal.`,
          type: "warning",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
        });
        return;
      }

      setCart((prev) => {
        const existing = prev.find((l) => l.productId === product.idProduct);
        if (existing) {
          const nextQty = existing.quantity + 1;
          if (nextQty > product.stockBranch) {
            setDataModal({
              isOpen: true,
              title: "Stock insuficiente",
              content: `Solo hay ${product.stockBranch} unidad(es) en sucursal.`,
              type: "warning",
              showActions: true,
              onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
              onConfirm: async () =>
                setDataModal((p) => ({ ...p, isOpen: false })),
            });
            return prev;
          }
          return prev.map((l) =>
            l.productId === product.idProduct
              ? {
                  ...l,
                  quantity: nextQty,
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
            key: `p-${product.idProduct}`,
            productId: product.idProduct,
            name: product.name,
            sku: product.sku,
            upc: product.upc,
            unitPrice: product.price,
            quantity: 1,
            discountPct: 0,
            stockBranch: product.stockBranch,
            imageUrl: firstImage(product.image_url),
            requiresSerial: Boolean(product.requiresSerial),
            warrantyMonths: product.warrantyMonths ?? 12,
            serials: [""],
          },
        ];
      });
      setSearch("");
      setHits([]);
      searchRef.current?.focus();
    },
    [branchId, setDataModal],
  );

  const updateLine = useCallback(
    (productId: number, patch: Partial<PosCartLine>) => {
      setCart((prev) =>
        prev.map((l) => {
          if (l.productId !== productId) return l;
          const next = { ...l, ...patch };
          if (next.quantity < 1) next.quantity = 1;
          if (next.quantity > next.stockBranch) next.quantity = next.stockBranch;
          if (next.discountPct < 0) next.discountPct = 0;
          if (next.discountPct > maxDiscount) next.discountPct = maxDiscount;
          if (next.unitPrice < 0) next.unitPrice = 0;
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
    [maxDiscount],
  );

  const setLineSerial = useCallback(
    (productId: number, index: number, value: string) => {
      setCart((prev) =>
        prev.map((l) => {
          if (l.productId !== productId) return l;
          const serials = [...l.serials];
          serials[index] = value;
          return { ...l, serials };
        }),
      );
    },
    [],
  );

  const removeLine = useCallback((productId: number) => {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setPayments([]);
    setCustomer(null);
    setCustomerQuery("");
    setGuestEmail("");
    setGuestPhone("");
    setNotes("");
  }, []);

  const addPayment = useCallback(
    (method: PosPaymentMethod = "efectivo_sucursal") => {
      const amount = remaining > 0 ? remaining : 0;
      setPayments((prev) => [
        ...prev,
        {
          id: `pay-${Date.now()}-${prev.length}`,
          method,
          amount,
          reference: "",
        },
      ]);
    },
    [remaining],
  );

  const updatePayment = useCallback(
    (id: string, patch: Partial<PosPaymentLine>) => {
      setPayments((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      );
    },
    [],
  );

  const removePayment = useCallback((id: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const charge = useCallback(async () => {
    if (!branchId) return;
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
    if (payments.length === 0 || Math.abs(remaining) > 0.009) {
      setDataModal({
        isOpen: true,
        title: "Pagos incompletos",
        content: `La suma de pagos debe igualar el total (${totals.total.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}). Restante: ${remaining.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}.`,
        type: "warning",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
      return;
    }

    const usesCash = payments.some((p) => p.method === "efectivo_sucursal");
    if (usesCash && !cashOpen) {
      setDataModal({
        isOpen: true,
        title: "Caja cerrada",
        content:
          "Abre caja en la pestaña Caja antes de cobrar en efectivo. Tarjeta, transferencia u OpenPay no lo requieren.",
        type: "warning",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
      return;
    }

    for (const line of cart) {
      if (!line.requiresSerial) continue;
      const filled = line.serials.map((s) => s.trim()).filter(Boolean);
      if (filled.length !== line.quantity) {
        setDataModal({
          isOpen: true,
          title: "Series requeridas",
          content: `«${line.name}» requiere ${line.quantity} número(s) de serie.`,
          type: "warning",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
        });
        return;
      }
    }

    setCharging(true);
    try {
      const res = await requestPost(
        {
          branchId,
          customerUserId: customer?.idUser ?? null,
          customerName: customer
            ? `${customer.name} ${customer.lastname || ""}`.trim()
            : "Público general",
          customerEmail: guestEmail || customer?.email || null,
          customerPhone: guestPhone || customer?.phone || null,
          notes: notes || null,
          items: cart.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountPct: l.discountPct,
            serials: l.serials.map((s) => s.trim()).filter(Boolean),
          })),
          payments: payments.map((p) => ({
            method: p.method,
            amount: p.amount,
            reference: p.reference || null,
          })),
        },
        "/pos/sales",
      );
      const sale: PosSale = res?.data?.data;
      const payUrl =
        res?.data?.data?.checkoutLink ||
        res?.data?.data?.paymentLink ||
        null;
      setLastSale(sale);
      setLastPaymentLink(payUrl);
      setTicketOpen(true);
      if (payUrl) window.open(payUrl, "_blank");
      clearCart();
      if (usesCash) void loadCashStatus();
      setDataModal({
        isOpen: true,
        title: "Venta registrada",
        content: res?.data?.message || `Folio ${sale?.folio}`,
        type: "success",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
    } catch {
      // error modal handled by UtilsService
    } finally {
      setCharging(false);
    }
  }, [
    branchId,
    cart,
    payments,
    remaining,
    totals.total,
    customer,
    guestEmail,
    guestPhone,
    notes,
    cashOpen,
    requestPost,
    clearCart,
    loadCashStatus,
    setDataModal,
  ]);

  const loadHistory = useCallback(
    async (page = 1) => {
      setHistoryLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "15",
        });
        if (branchId) params.set("branchId", String(branchId));
        if (historyFolio.trim()) params.set("folio", historyFolio.trim());
        if (historyStatus) params.set("status", historyStatus);
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
    [branchId, historyFolio, historyStatus, requestGet],
  );

  useEffect(() => {
    if (tab === "historial") void loadHistory(1);
  }, [tab, loadHistory]);

  const openDetail = useCallback(
    async (id: number) => {
      const res = await requestGet(`/pos/sales/${id}`, { silent: true });
      setDetailSale(res?.data?.data || null);
      setCancelReason("");
    },
    [requestGet],
  );

  const cancelSale = useCallback(async () => {
    if (!detailSale) return;
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
    setCancelling(true);
    try {
      const res = await requestPost(
        { reason: cancelReason.trim() },
        `/pos/sales/${detailSale.idPosSale}/cancel`,
      );
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
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
    } catch {
      // handled
    } finally {
      setCancelling(false);
    }
  }, [
    detailSale,
    cancelReason,
    requestPost,
    loadHistory,
    historyPage,
    loadCashStatus,
    setDataModal,
  ]);

  const confirmPayment = useCallback(async () => {
    if (!detailSale) return;
    try {
      const res = await requestPost(
        { note: "Confirmación manual de pago OpenPay" },
        `/pos/sales/${detailSale.idPosSale}/confirmPayment`,
      );
      setDetailSale(res?.data?.data || null);
      await loadHistory(historyPage);
      setDataModal({
        isOpen: true,
        title: "Pago confirmado",
        content: res?.data?.message || "Inventario descontado.",
        type: "success",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
    } catch {
      // handled
    }
  }, [detailSale, requestPost, loadHistory, historyPage, setDataModal]);

  const retryPaymentLink = useCallback(async () => {
    if (!detailSale) return;
    try {
      const res = await requestPost(
        {
          email: guestEmail || detailSale.customerEmail || undefined,
          phone: guestPhone || detailSale.customerPhone || undefined,
        },
        `/pos/sales/${detailSale.idPosSale}/retryPaymentLink`,
      );
      const data = res?.data?.data;
      setDetailSale(data || null);
      const url = data?.checkoutLinkUrl || data?.checkoutLink || data?.paymentLinkUrl || data?.paymentLink;
      if (url) {
        setLastPaymentLink(url);
        window.open(url, "_blank");
      }
      setDataModal({
        isOpen: true,
        title: "Link regenerado",
        content: res?.data?.message || "Se generó un nuevo link OpenPay.",
        type: "success",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
    } catch {
      // handled
    }
  }, [
    detailSale,
    guestEmail,
    guestPhone,
    requestPost,
    setDataModal,
  ]);

  const openTicket = useCallback(
    (id: number) => {
      const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";
      const token = localStorage.getItem("token") || "";
      // Ticket is HTML from API; open via fetch blob with auth
      void (async () => {
        try {
          const res = await fetch(`${base}/pos/sales/${id}/ticket`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const html = await res.text();
          const w = window.open("", "_blank");
          if (w) {
            w.document.write(html);
            w.document.close();
          }
        } catch {
          setDataModal({
            isOpen: true,
            title: "Error",
            content: "No se pudo abrir el ticket.",
            type: "error",
            showActions: true,
            onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
            onConfirm: async () =>
              setDataModal((p) => ({ ...p, isOpen: false })),
          });
        }
      })();
    },
    [setDataModal],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "F4") {
        e.preventDefault();
        if (tab === "cobrar" && !charging) void charge();
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
    async (productId: number, requiresSerial: boolean) => {
      try {
        await requestPost(
          { requiresSerial },
          `/pos/products/${productId}/serial-config`,
        );
        setCart((prev) =>
          prev.map((l) =>
            l.productId === productId ? { ...l, requiresSerial } : l,
          ),
        );
      } catch {
        // handled
      }
    },
    [requestPost],
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
  const [inventoryReason, setInventoryReason] = useState("");

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

  useEffect(() => {
    if (tab === "inventario") void loadInventory();
  }, [tab, loadInventory]);

  return {
    hydrated,
    isAdmin,
    maxDiscount,
    tab,
    setTab,
    branches,
    branchId,
    setBranchId,
    selectedBranch,
    showGuide,
    dismissGuide,
    openGuide,
    search,
    setSearch,
    hits,
    searching,
    searchRef,
    cart,
    addProduct,
    updateLine,
    removeLine,
    clearCart,
    customer,
    setCustomer,
    customerQuery,
    setCustomerQuery,
    customerHits,
    guestEmail,
    setGuestEmail,
    guestPhone,
    setGuestPhone,
    payments,
    addPayment,
    updatePayment,
    removePayment,
    notes,
    setNotes,
    totals,
    paidSum,
    remaining,
    charging,
    charge,
    lastSale,
    lastPaymentLink,
    ticketOpen,
    setTicketOpen,
    openTicket,
    history,
    historyLoading,
    historyPage,
    historyTotalPages,
    historyTotal,
    historyFolio,
    setHistoryFolio,
    historyStatus,
    setHistoryStatus,
    loadHistory,
    detailSale,
    setDetailSale,
    openDetail,
    cancelReason,
    setCancelReason,
    cancelSale,
    confirmPayment,
    retryPaymentLink,
    cancelling,
    lineTotal,
    cashOpen,
    cashSession,
    cashExpected,
    cashLoading,
    cashSessions,
    openingFloat,
    setOpeningFloat,
    closingCounted,
    setClosingCounted,
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
    hasCashPayment,
    loadCashStatus,
    setLineSerial,
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
