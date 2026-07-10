type PaymentStatusChipColor =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info";

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "Pagado",
  failed: "Fallido",
  payment_pending: "Pendiente",
  pending: "Pendiente",
  cancelled: "Cancelado",
  rejected: "Rechazado",
  refunded: "Reembolsado",
  charged_back: "Contracargo",
};

const PAYMENT_STATUS_COLORS: Record<string, PaymentStatusChipColor> = {
  paid: "success",
  failed: "error",
  payment_pending: "warning",
  pending: "warning",
  cancelled: "default",
  rejected: "error",
  refunded: "info",
  charged_back: "warning",
};

export const normalizePaymentStatus = (status?: string | null) =>
  String(status || "pending").toLowerCase().trim();

export const getPaymentStatusLabel = (status?: string | null) => {
  const normalized = normalizePaymentStatus(status);
  return PAYMENT_STATUS_LABELS[normalized] ?? normalized;
};

export const getPaymentStatusChipColor = (
  status?: string | null,
): PaymentStatusChipColor => {
  const normalized = normalizePaymentStatus(status);
  return PAYMENT_STATUS_COLORS[normalized] ?? "default";
};
