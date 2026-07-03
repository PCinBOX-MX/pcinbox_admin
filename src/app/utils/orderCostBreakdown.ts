function toMoney(value: unknown): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100) / 100;
}

export type OrderCostBreakdown = {
  productsSubtotal: number;
  shippingTotal: number;
  insuranceTotal: number;
  grandTotal: number;
};

export function getAdminOrderCostBreakdown(order: {
  totalAmount?: unknown;
  shippingTotal?: unknown;
  insuranceTotal?: unknown;
  products?: Array<{
    address?: {
      shippingCost?: unknown;
      insuranceCost?: unknown;
    } | null;
  }>;
}): OrderCostBreakdown {
  const shippingTotal =
    order.shippingTotal != null
      ? toMoney(order.shippingTotal)
      : (order.products ?? []).reduce(
          (sum, product) => sum + toMoney(product.address?.shippingCost),
          0,
        );

  const insuranceTotal =
    order.insuranceTotal != null
      ? toMoney(order.insuranceTotal)
      : (order.products ?? []).reduce(
          (sum, product) => sum + toMoney(product.address?.insuranceCost),
          0,
        );

  const grandTotal = toMoney(order.totalAmount);
  const productsSubtotal = Math.max(
    0,
    toMoney(grandTotal - shippingTotal - insuranceTotal),
  );

  return {
    productsSubtotal,
    shippingTotal,
    insuranceTotal,
    grandTotal,
  };
}

export function formatOrderMoney(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(value);
}
