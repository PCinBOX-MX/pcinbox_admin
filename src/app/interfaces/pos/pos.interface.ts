export type PosPaymentMethod =
  | "efectivo_sucursal"
  | "tarjeta_sucursal"
  | "tarjeta_credito_sucursal"
  | "tarjeta_debito_sucursal"
  | "transferencia_bancaria"
  | "openpay_link";

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
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
  movements?: PosCashMovement[];
};

export type PosCashPaymentSummary = {
  salesCount: number;
  salesTotal: number;
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
  providerId?: number;
  providerName?: string | null;
  stocksByBranch?: PosBranchStock[];
  suggestedBranchId?: number | null;
  score: number;
};

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
  warrantyMonths: number;
  serials: string[];
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
  warrantyExpiresAt: string | null;
  notes: string | null;
};

export type PosPaymentLine = {
  id: string;
  method: PosPaymentMethod;
  amount: number;
  reference: string;
};

/** Asienta pagos: el efectivo puede exceder (cambio); tarjeta/transferencia no. */
export function settlePosPayments(
  total: number,
  payments: Array<{ method: PosPaymentMethod; amount: number }>,
) {
  const round = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  let nonCashSum = 0;
  let cashReceived = 0;
  for (const p of payments) {
    const amt = Number(p.amount) || 0;
    if (!Number.isFinite(amt) || amt < 0) continue;
    if (p.method === "efectivo_sucursal") {
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
  cancelReason: string | null;
  cancelledAt: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  paymentLinkUrl?: string | null;
  checkoutLinkUrl?: string | null;
  linkReferencia?: string | null;
  idLinkPago?: number | null;
  cashSessionId?: number | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    idPosSaleItem: number;
    productId: number;
    branchId?: number | null;
    branchName?: string | null;
    branchCity?: string | null;
    branchLabel?: string | null;
    productName: string;
    productSku: string | null;
    productUpc: string | null;
    quantity: number;
    unitPrice: number;
    discountPct: number;
    lineTotal: number;
    serials?: Array<{
      idProductSerial: number;
      serialNumber: string;
      status: string;
      warrantyMonths: number | null;
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
  efectivo_sucursal: "Efectivo",
  tarjeta_sucursal: "Tarjeta",
  tarjeta_credito_sucursal: "Tarjeta de Crédito",
  tarjeta_debito_sucursal: "Tarjeta de Débito",
  transferencia_bancaria: "Transferencia",
  openpay_link: "OpenPay (link)",
};

/** Métodos disponibles al cobrar (sin OpenPay link ni legado). */
export const POS_PAYMENT_OPTIONS: PosPaymentMethod[] = [
  "efectivo_sucursal",
  "tarjeta_credito_sucursal",
  "tarjeta_debito_sucursal",
  "transferencia_bancaria",
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
  cash_in: "Entrada",
  cash_out: "Salida",
  sale_cash: "Venta efectivo",
  sale_cash_void: "Cancel. efectivo",
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
    return { allowed: false, reason: "Sin permiso para cancelar ventas POS" };
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
