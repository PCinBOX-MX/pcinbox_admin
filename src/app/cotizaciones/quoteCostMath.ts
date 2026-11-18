import type { PosCostSummary } from "../interfaces/pos/pos.interface";

/** Misma comisión que el punto de venta. */
const ONLINE_FEE = 0.03;

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type QuoteCostLine = {
  idProduct: string | number;
  quantity: number;
  price: number;
  manual?: boolean;
};

/**
 * Inversión de las líneas TechSmart / DicoTech.
 * `costs` trae el costo unitario (proveedor + IVA). `missingIds` son esos
 * proveedores sin costo registrado. El resto del carrito no entra.
 * Si hay varios equipos iguales, las cantidades se multiplican.
 */
export function buildQuoteCostSummary(
  lines: QuoteCostLine[],
  costs: Map<number, number>,
  missingIds: Set<number>,
  equipmentCount: number,
): { summary: PosCostSummary | null; missingCount: number } {
  const equipos = Math.min(
    999,
    Math.max(1, Math.round(Number(equipmentCount)) || 1),
  );
  let count = 0;
  let units = 0;
  let investment = 0;
  let totalCost = 0;
  let missingCount = 0;

  for (const line of lines) {
    if (line.manual) continue;
    const id = Number(line.idProduct);
    if (!Number.isSafeInteger(id) || id <= 0) continue;
    const qtyOne = Math.round(Number(line.quantity) || 0);
    if (!Number.isInteger(qtyOne) || qtyOne < 1) continue;
    if (missingIds.has(id)) {
      missingCount += 1;
      continue;
    }
    const costUnit = costs.get(id);
    if (costUnit == null) continue;
    const quantity = qtyOne * equipos;
    count += 1;
    units += quantity;
    investment += costUnit * quantity;
    totalCost += (Number(line.price) || 0) * quantity;
  }

  if (count === 0) return { summary: null, missingCount };
  const roundedInvestment = roundMoney(investment);
  const roundedTotal = roundMoney(totalCost);
  const commission = roundMoney(roundedTotal * ONLINE_FEE);
  return {
    summary: {
      lines: count,
      units,
      investment: roundedInvestment,
      profitMargin: roundMoney(roundedTotal - commission - roundedInvestment),
      totalCost: roundedTotal,
    },
    missingCount,
  };
}
