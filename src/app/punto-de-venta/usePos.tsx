"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  SELLER_MAX_DISCOUNT_PCT,
  canCancelPosSale,
  settlePosPayments,
} from "../interfaces/pos/pos.interface";
import {
  loadQzSettings,
  saveQzSettings,
  type QzPosSettings,
} from "./qz/qzSettings";
import {
  listQzPrinters,
  openCashDrawerQz,
  printPosTicketQz,
  qzErrorMessage,
} from "./qz/qzPos";

const BRANCH_STORAGE_KEY = "pcinbox-pos-branchId";

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
  const { setDataModal } = useTheContext();
  const { isAdmin, hydrated, can } = usePermissions();

  const [tab, setTab] = useState<"cobrar" | "historial" | "caja">("cobrar");
  const [branches, setBranches] = useState<PosBranch[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [cashOpen, setCashOpen] = useState(false);
  const [cashSession, setCashSession] = useState<PosCashSession | null>(null);
  const [cashExpected, setCashExpected] = useState<number | null>(null);
  const [cashPaymentSummary, setCashPaymentSummary] =
    useState<PosCashPaymentSummary | null>(null);
  const [cashLoading, setCashLoading] = useState(false);
  const [cashSessions, setCashSessions] = useState<PosCashSession[]>([]);
  const [openingFloat, setOpeningFloat] = useState("0");
  const [closingCounted, setClosingCounted] = useState("");
  const [cashMoveAmount, setCashMoveAmount] = useState("");
  const [cashMoveReason, setCashMoveReason] = useState("");
  const [cashNotes, setCashNotes] = useState("");
  const [cashBusy, setCashBusy] = useState(false);
  const [qzSettings, setQzSettings] = useState<QzPosSettings>(() =>
    typeof window === "undefined" ? loadQzSettings() : loadQzSettings(),
  );
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
  const [customerName, setCustomerName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [phoneLada, setPhoneLada] = useState("+52");
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
      setBranchId(cashId);
      localStorage.setItem(BRANCH_STORAGE_KEY, String(cashId));
    }
  }, [requestGet]);

  useEffect(() => {
    void loadBranches().catch(() => undefined);
  }, [loadBranches]);

  const loadCashStatus = useCallback(async () => {
    if (!branchId) {
      setCashOpen(false);
      setCashSession(null);
      setCashExpected(null);
      setCashPaymentSummary(null);
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
      setCashPaymentSummary(
        data?.paymentSummary
          ? {
              salesCount: Number(data.paymentSummary.salesCount) || 0,
              salesTotal: Number(data.paymentSummary.salesTotal) || 0,
              byMethod: data.paymentSummary.byMethod || {},
            }
          : null,
      );
    } catch {
      setCashOpen(false);
      setCashSession(null);
      setCashExpected(null);
      setCashPaymentSummary(null);
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

  const addProduct = useCallback(
    (product: PosProductHit, chosenBranchId?: number | null) => {
      const stocks = product.stocksByBranch || [];
      const needsBranch = stocks.length > 0;
      let branchIdLine: number | null =
        chosenBranchId ??
        product.suggestedBranchId ??
        stocks.find((st) => st.stock > 0)?.branchId ??
        null;

      if (needsBranch) {
        if (branchIdLine == null) {
          setDataModal({
            isOpen: true,
            title: "Elige bodega",
            content: `«${product.name}» requiere elegir almacén (${product.providerName || "proveedor"}).`,
            type: "warning",
            showActions: true,
            onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
            onConfirm: async () =>
              setDataModal((p) => ({ ...p, isOpen: false })),
          });
          return;
        }
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
      } else if (product.stockGlobal <= 0) {
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
      const stockCap = needsBranch
        ? branchMeta?.stock ?? 0
        : product.stockGlobal;
      const lineKey = `p-${product.idProduct}-b-${branchIdLine ?? "g"}`;

      setCart((prev) => {
        const existing = prev.find((l) => l.key === lineKey);
        if (existing) {
          const nextQty = existing.quantity + 1;
          if (nextQty > stockCap) {
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
            branchLabel: branchMeta?.label || null,
            stockBranch: stockCap,
            stocksByBranch: stocks,
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
    [setDataModal],
  );

  const updateLine = useCallback(
    (productId: number, patch: Partial<PosCartLine>) => {
      // Precio de catálogo: no editable desde el carrito.
      const { unitPrice: _ignoredPrice, ...safePatch } = patch;
      setCart((prev) =>
        prev.map((l) => {
          if (l.productId !== productId) return l;
          const next = { ...l, ...safePatch };
          if (!Number.isFinite(next.quantity) || next.quantity < 1) {
            next.quantity = 1;
          }
          if (next.stockBranch > 0 && next.quantity > next.stockBranch) {
            next.quantity = next.stockBranch;
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
    setCustomerName("");
    setGuestEmail("");
    setPhoneLada("+52");
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

    if (!customerName.trim()) {
      setDataModal({
        isOpen: true,
        title: "Cliente requerido",
        content: "Escribe el nombre del cliente antes de cobrar.",
        type: "warning",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
      return;
    }

    if (guestEmail.trim() && !isValidEmailFormat(guestEmail)) {
      setDataModal({
        isOpen: true,
        title: "Email inválido",
        content: "Revisa el formato del email (ej. nombre@correo.com) o déjalo vacío.",
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
        title: "Pago excedido",
        content:
          "Tarjeta o transferencia no pueden superar el total. Usa efectivo si el cliente paga de más (ahí se calcula el cambio).",
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
        title: "Pago incompleto",
        content: `Falta por cubrir ${remaining.toLocaleString("es-MX", {
          style: "currency",
          currency: "MXN",
        })}.`,
        type: "warning",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
      return;
    }

    if (payments.some((p) => !Number.isFinite(p.amount) || p.amount <= 0)) {
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

    const usesCash = payments.some((p) => p.method === "efectivo_sucursal");
    if (usesCash && !cashOpen) {
      setDataModal({
        isOpen: true,
        title: "Caja cerrada",
        content:
          "Abre caja en la pestaña Caja antes de cobrar en efectivo. Tarjeta o transferencia no lo requieren.",
        type: "warning",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
      return;
    }

    for (const line of cart) {
      if ((line.stocksByBranch?.length || 0) > 0 && line.branchId == null) {
        setDataModal({
          isOpen: true,
          title: "Bodega requerida",
          content: `«${line.name}» necesita almacén/bodega de origen.`,
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
      const phoneDigits = guestPhone.trim();
      const fullPhone = `${phoneLada} ${phoneDigits}`.trim();
      const res = await requestPost(
        {
          branchId,
          customerUserId: null,
          customerName: customerName.trim(),
          customerEmail: guestEmail.trim() || null,
          customerPhone: fullPhone,
          notes: notes || null,
          items: cart.map((l) => ({
            productId: l.productId,
            branchId: l.branchId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountPct: 0,
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
      setTicketOpen(false);
      if (payUrl) window.open(payUrl, "_blank");
      clearCart();
      if (usesCash) void loadCashStatus();

      const qz = loadQzSettings();
      if (sale && qz.autoPrintOnCharge) {
        void printPosTicketQz(sale, {
          openDrawer: usesCash && qz.openDrawerOnCash,
        }).catch(() => {
          // silencioso: el usuario aún puede imprimir manual / HTML
          if (usesCash && qz.openDrawerOnCash) {
            void openCashDrawerQz().catch(() => undefined);
          }
        });
      } else if (usesCash && qz.openDrawerOnCash) {
        void openCashDrawerQz().catch(() => undefined);
      }

      setDataModal({
        isOpen: true,
        title: "Venta registrada",
        content:
          (res?.data?.message || `Folio ${sale?.folio}`) +
          (changeDue > 0.009
            ? ` Cambio: ${changeDue.toLocaleString("es-MX", {
                style: "currency",
                currency: "MXN",
              })}.`
            : "") +
          (qz.autoPrintOnCharge
            ? " Ticket enviado a la impresora (si QZ Tray está activo)."
            : " Usa «Imprimir ticket» cuando quieras el comprobante."),
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
    changeDue,
    settlement,
    totals.total,
    customerName,
    guestEmail,
    guestPhone,
    phoneLada,
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
    cancelGate,
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
          await openTicketHtml(sale.idPosSale);
          setDataModal({
            isOpen: true,
            title: "Ticket en navegador",
            content:
              qzErrorMessage(qzErr) +
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
    (id: number) => {
      void printTicket(id);
    },
    [printTicket],
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
      return list;
    } catch (err) {
      setDataModal({
        isOpen: true,
        title: "QZ Tray",
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
        cashierName: "POS",
        customerUserId: null,
        customerName: "Cliente prueba",
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
        content: "Se envió un ticket de prueba a la impresora vía QZ Tray.",
        type: "success",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
    } catch (err) {
      setDataModal({
        isOpen: true,
        title: "QZ Tray",
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
      setDataModal({
        isOpen: true,
        title: "Cajón",
        content: "Se envió el pulso de apertura del cajón.",
        type: "success",
        showActions: true,
        onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
        onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
      });
    } catch (err) {
      setDataModal({
        isOpen: true,
        title: "QZ Tray",
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

  return {
    hydrated,
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
    addProduct,
    updateLine,
    removeLine,
    clearCart,
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
    totals,
    paidSum,
    remaining,
    changeDue,
    settlement,
    charging,
    charge,
    lastSale,
    lastPaymentLink,
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
    cashPaymentSummary,
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
