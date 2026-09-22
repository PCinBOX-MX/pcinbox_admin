export type PosPaymentMethod =
  | "efectivo_sucursal"
  | "tarjeta_sucursal"
  | "tarjeta_credito_sucursal"
  | "tarjeta_debito_sucursal"
  | "transferencia_bancaria"
  | "openpay_link"
  | "otro";

export type PosSaleStatus = "completed" | "cancelled" | "pending_payment";

export type PosCashSessionStatus = "open" | "closed";

export type PosCashMovementType =
  | "cash_in"
  | "cash_out"
  | "sale_cash"
  | "sale_cash_void";

export type PosCashMovement = {
  idCashMovement: number;
  type: PosCashMovementType;
  amount: number;
  reason: string | null;
  posSaleId: number | null;
  userId: number;
  userName: string | null;
  createdAt: string;
};

export type PosCashSession = {
  idCashSession: number;
  branchId: number;
  branchName: string | null;
  branchCity: string | null;
  openedByUserId: number;
  openedByName: string | null;
  closedByUserId: number | null;
  closedByName: string | null;
  status: PosCashSessionStatus;
  openingFloat: number;
  closingCounted: number | null;
  expectedCash: number | null;
  difference: number | null;
  differenceReason?: string | null;
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
  movementsTotal?: number;
  movements?: PosCashMovement[];
};

export type PosCashPaymentSummary = {
  salesCount: number;
  salesTotal: number;
  cancelledCount?: number;
  byMethod: Partial<Record<PosPaymentMethod, number>>;
};

export type PosBranch = {
  idBranche: number;
  name: string | null;
  city: string | null;
  providerId: number;
  providerName?: string | null;
  label: string;
};

export type PosBranchStock = {
  branchId: number;
  name: string | null;
  city: string | null;
  providerId: number;
  providerName: string | null;
  stock: number;
  label: string;
};

export type PosProductHit = {
  idProduct: number;
  idProductExt: string | null;
  name: string;
  price: number;
  stockGlobal: number;
  stockBranch: number;
  sku: string | null;
  upc: string | null;
  marca: string | null;
  category?: string | null;
  image_url: unknown;
  requiresSerial?: boolean;
  warrantyMonths?: number | null;
  warrantyMode?: string | null;
  /** PC gamer / estaciones (provider 1 → 1 año fijo). */
  isPC?: boolean;
  providerId?: number;
  providerName?: string | null;
  stocksByBranch?: PosBranchStock[];
  suggestedBranchId?: number | null;
  /** false cuando no hay existencia vendible en ninguna bodega POS. */
  inStock?: boolean;
  score: number;
};

/** Sin stock vendible (product_stock / products.stock) — los 3 proveedores. */
export function isPosProductOutOfStock(
  hit: Pick<
    PosProductHit,
    "stockGlobal" | "stocksByBranch" | "inStock" | "providerId"
  >,
): boolean {
  if (typeof hit.inStock === "boolean") return !hit.inStock;
  const stocks = hit.stocksByBranch || [];
  if (stocks.length > 0) {
    return stocks.every((s) => Number(s.stock) <= 0);
  }
  return Number(hit.stockGlobal) <= 0;
}

export type PosCustomerHit = {
  idUser: number;
  name: string;
  lastname: string | null;
  email: string;
  phone: string | null;
  label: string;
};

export type PosCartLine = {
  key: string;
  productId: number;
  name: string;
  sku: string | null;
  upc: string | null;
  unitPrice: number;
  quantity: number;
  discountPct: number;
  /** Bodega de origen del stock (por proveedor). */
  branchId: number | null;
  branchLabel: string | null;
  stockBranch: number;
  stocksByBranch: PosBranchStock[];
  imageUrl?: string | null;
  requiresSerial: boolean;
  warrantyMonths: number | null;
  /** months | none | service_center — solo editable en componentes PCinBOX */
  warrantyMode?: string | null;
  /** months | years cuando warrantyMode=months */
  warrantyUnit?: "months" | "years" | null;
  /** PC gamer / estación */
  isPC?: boolean;
  serials: string[];
  /** Captura libre (no está en catálogo / no descuenta stock). */
  isManual?: boolean;
  /** product = artículo; service = mantenimiento/revisión/etc. */
  manualKind?: "product" | "service";
  /** Proveedor del catálogo; solo providerId=1 descuenta stock. */
  providerId?: number | null;
};

export type PosProductSerial = {
  idProductSerial: number;
  productId: number;
  productName: string | null;
  productSku: string | null;
  serialNumber: string;
  branchId: number | null;
  branchName: string | null;
  status: "available" | "sold" | "rma" | "returned";
  posSaleId: number | null;
  folio: string | null;
  customerUserId: number | null;
  customerName: string | null;
  soldAt: string | null;
  warrantyMonths: number | null;
  warrantyMode?: string | null;
  warrantyExpiresAt: string | null;
  notes: string | null;
};

export type PosPaymentLine = {
  id: string;
  method: PosPaymentMethod;
  /** `null` = input vacío (aún no capturado). */
  amount: number | null;
  reference: string;
};

/** Efectivo y «Otro» pueden exceder el total (cambio); tarjeta/transferencia no. */
export function paymentAllowsChange(method: PosPaymentMethod | string): boolean {
  return method === "efectivo_sucursal" || method === "otro";
}

/** Asienta pagos: efectivo/Otro pueden exceder (cambio); tarjeta/transferencia no. */
export function settlePosPayments(
  total: number,
  payments: Array<{ method: PosPaymentMethod; amount: number | null }>,
) {
  const round = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  let nonCashSum = 0;
  let cashReceived = 0;
  for (const p of payments) {
    const amt = Number(p.amount) || 0;
    if (!Number.isFinite(amt) || amt < 0) continue;
    if (paymentAllowsChange(p.method)) {
      cashReceived = round(cashReceived + amt);
    } else {
      nonCashSum = round(nonCashSum + amt);
    }
  }
  const safeTotal = round(Math.max(0, Number(total) || 0));
  const nonCashOverpay = round(Math.max(0, nonCashSum - safeTotal));
  const cashDue = round(Math.max(0, safeTotal - Math.min(nonCashSum, safeTotal)));
  const appliedCash = round(Math.min(cashReceived, cashDue));
  const changeDue = round(Math.max(0, cashReceived - cashDue));
  const paidApplied = round(Math.min(nonCashSum, safeTotal) + appliedCash);
  const remaining = round(Math.max(0, safeTotal - paidApplied));
  return {
    nonCashSum,
    cashReceived,
    cashDue,
    changeDue,
    paidApplied,
    remaining,
    nonCashOverpay,
    balanced: remaining <= 0.009 && nonCashOverpay <= 0.009,
  };
}

export type PosSale = {
  idPosSale: number;
  folio: string;
  branchId: number;
  branchName: string | null;
  branchCity: string | null;
  cashierUserId: number;
  cashierName: string | null;
  customerUserId: number | null;
  customerName: string | null;
  status: PosSaleStatus;
  subtotal: number;
  discountTotal: number;
  total: number;
  notes: string | null;
  /** 1 = requiere factura; 0 = no */
  requiredFactura?: number;
  cancelReason: string | null;
  cancelledAt: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  paymentLinkUrl?: string | null;
  checkoutLinkUrl?: string | null;
  linkReferencia?: string | null;
  idLinkPago?: number | null;
  cashSessionId?: number | null;
  quoteNumber?: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    idPosSaleItem: number;
    productId: number;
    branchId?: number | null;
    branchName?: string | null;
    branchCity?: string | null;
    branchLabel?: string | null;
    providerId?: number | null;
    productName: string;
    productSku: string | null;
    productUpc: string | null;
    productImage?: string | null;
    quantity: number;
    unitPrice: number;
    discountPct: number;
    lineTotal: number;
    serials?: Array<{
      idProductSerial: number;
      serialNumber: string;
      status: string;
      warrantyMonths: number | null;
      warrantyMode?: string | null;
      warrantyExpiresAt: string | null;
    }>;
  }>;
  payments: Array<{
    idPosPayment: number;
    method: PosPaymentMethod;
    amount: number;
    reference: string | null;
    createdAt: string;
  }>;
  events?: Array<{
    idPosSaleEvent: number;
    eventType: string;
    reason: string | null;
    payload: unknown;
    userId: number | null;
    createdAt: string;
  }>;
};

export const POS_PAYMENT_LABELS: Record<PosPaymentMethod, string> = {
  efectivo_sucursal: "Efectivo en caja",
  tarjeta_sucursal: "Tarjeta",
  tarjeta_credito_sucursal: "Tarjeta de crédito",
  tarjeta_debito_sucursal: "Tarjeta de débito",
  transferencia_bancaria: "Transferencia bancaria",
  openpay_link: "Link de pago OpenPay",
  otro: "Otro",
};

/** Etiqueta para UI / ticket / historial (Otro incluye el texto capturado). */
export function formatPosPaymentLabel(
  method: PosPaymentMethod | string,
  reference?: string | null,
): string {
  if (method === "otro") {
    const raw = String(reference || "").trim();
    // Quitar metadatos Recibido/Cambio del label legible.
    const detail = raw
      .replace(/\s*·\s*Recibido\s+[\d.]+/gi, "")
      .replace(/\s*·\s*Cambio\s+[\d.]+/gi, "")
      .replace(/\s*Recibido\s+[\d.]+/gi, "")
      .replace(/\s*Cambio\s+[\d.]+/gi, "")
      .replace(/^\s*·\s*|\s*·\s*$/g, "")
      .trim();
    return detail ? `Otro: ${detail}` : "Otro";
  }
  return (
    POS_PAYMENT_LABELS[method as PosPaymentMethod] || String(method || "")
  );
}

/** Métodos disponibles al cobrar (sin OpenPay link ni legado). */
export const POS_PAYMENT_OPTIONS: PosPaymentMethod[] = [
  "efectivo_sucursal",
  "tarjeta_credito_sucursal",
  "tarjeta_debito_sucursal",
  "transferencia_bancaria",
  "otro",
];

export const POS_PHONE_LADAS = [
  "+52",
  "+1",
  "+34",
  "+54",
  "+57",
  "+56",
  "+51",
  "+58",
] as const;

export const POS_CASH_MOVEMENT_LABELS: Record<PosCashMovementType, string> = {
  cash_in: "Meter efectivo",
  cash_out: "Sacar efectivo",
  sale_cash: "Venta en efectivo",
  sale_cash_void: "Cancelación (efectivo)",
};

export const SELLER_MAX_DISCOUNT_PCT = 3;

/** Fecha calendario YYYY-MM-DD en America/Mexico_City. */
export function calendarDateInMexicoCity(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Reglas de cancelación alineadas con el API:
 * - admin (override): cualquier venta no cancelada
 * - support: pending_payment siempre; completed solo mismo día CDMX
 */
export function canCancelPosSale(params: {
  status: PosSaleStatus;
  createdAt: string;
  canCancel: boolean;
  canOverride: boolean;
}): { allowed: boolean; reason: string | null } {
  if (params.status === "cancelled") {
    return { allowed: false, reason: "La venta ya está cancelada" };
  }
  if (!params.canCancel) {
    return { allowed: false, reason: "No tienes permiso para cancelar ventas" };
  }
  if (params.canOverride) {
    return { allowed: true, reason: null };
  }
  if (params.status === "pending_payment") {
    return { allowed: true, reason: null };
  }
  if (params.status === "completed") {
    const saleDay = calendarDateInMexicoCity(params.createdAt);
    const today = calendarDateInMexicoCity(new Date());
    if (saleDay === today) return { allowed: true, reason: null };
    return {
      allowed: false,
      reason:
        "Como soporte solo puedes cancelar ventas completadas del mismo día. Solicita override a un administrador.",
    };
  }
  return { allowed: false, reason: "No se puede cancelar esta venta" };
}
