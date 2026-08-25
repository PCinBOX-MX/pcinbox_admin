export type PosPaymentMethod =
  | "efectivo_sucursal"
  | "tarjeta_sucursal"
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

export type PosBranch = {
  idBranche: number;
  name: string | null;
  city: string | null;
  providerId: number;
  providerName?: string | null;
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
  image_url: unknown;
  requiresSerial?: boolean;
  warrantyMonths?: number | null;
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
  stockBranch: number;
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
  transferencia_bancaria: "Transferencia",
  openpay_link: "OpenPay (link)",
};

export const POS_CASH_MOVEMENT_LABELS: Record<PosCashMovementType, string> = {
  cash_in: "Entrada",
  cash_out: "Salida",
  sale_cash: "Venta efectivo",
  sale_cash_void: "Cancel. efectivo",
};

export const SELLER_MAX_DISCOUNT_PCT = 3;
