import type { PosBranchStock, PosCartLine } from "../interfaces/pos/pos.interface";
import { formatPosBranchUiLabel } from "../interfaces/pos/posBranchDisplay";

/** Respuesta de `GET /pos/products/state` (incluye inactivos). */
export type PosProductState = {
  productId: number;
  active: boolean;
  name: string;
  price: number;
  stockGlobal: number;
  stocksByBranch: PosBranchStock[];
  imageUrl: string | null;
  providerId: number;
};

export type CartPriceChange = {
  key: string;
  name: string;
  imageUrl: string | null;
  quantity: number;
  before: number;
  after: number;
};

export type CartQuantityChange = {
  key: string;
  name: string;
  imageUrl: string | null;
  branchLabel: string;
  before: number;
  after: number;
};

export type CartUnavailableAction = "remove" | "switchBranch" | "keepManual";

export type CartUnavailableLine = {
  key: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  quantity: number;
  reason: "inactive" | "noStock";
  detail: string;
  /** Precio con el que quedaría como captura manual. */
  keepPrice: number;
  /** Otra bodega con stock suficiente para toda la cantidad. */
  altBranch: { branchId: number; label: string; stock: number } | null;
};

export type CartChanges = {
  prices: CartPriceChange[];
  quantities: CartQuantityChange[];
  unavailable: CartUnavailableLine[];
  /** Estado actual por producto, para refrescar stock y precio de catálogo al aplicar. */
  states: Map<number, PosProductState>;
};

export type CartUnavailableActions = Record<string, CartUnavailableAction>;

const COST_PROVIDER_IDS = new Set([2, 3]);
const STOCK_PROVIDER_ID = 1;

function roundMoney(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function cartTotal(lines: PosCartLine[]): number {
  return roundMoney(
    lines.reduce(
      (sum, l) =>
        sum + roundMoney(l.unitPrice * l.quantity * (1 - (l.discountPct || 0) / 100)),
      0,
    ),
  );
}

function branchLabelOf(st: PosBranchStock | undefined, fallback: string | null) {
  if (!st) return fallback || "la bodega";
  return formatPosBranchUiLabel({ name: st.name, label: st.label, city: st.city });
}

/** Líneas que el servidor valida contra el catálogo al cobrar. */
export function isRevalidatedLine(line: PosCartLine): boolean {
  return !line.isManual && line.productId > 0 && !line.folioPriceLocked;
}

export function cartRevalidationIds(cart: PosCartLine[]): number[] {
  return [
    ...new Set(cart.filter(isRevalidatedLine).map((l) => Number(l.productId))),
  ];
}

export function hasCartChanges(changes: CartChanges): boolean {
  return (
    changes.prices.length > 0 ||
    changes.quantities.length > 0 ||
    changes.unavailable.length > 0
  );
}

/** Compara el carrito con el estado actual del catálogo (mismas reglas que el servidor). */
export function findCartChanges(
  cart: PosCartLine[],
  states: PosProductState[],
): CartChanges {
  const byId = new Map(states.map((s) => [Number(s.productId), s]));
  const prices: CartPriceChange[] = [];
  const quantities: CartQuantityChange[] = [];
  const unavailable: CartUnavailableLine[] = [];

  for (const line of cart) {
    if (!isRevalidatedLine(line)) continue;
    const state = byId.get(Number(line.productId));
    const imageUrl = state?.imageUrl || line.imageUrl || null;
    const currentPrice =
      state && Number.isFinite(Number(state.price)) ? roundMoney(Number(state.price)) : null;
    const keepPrice = line.quotePriceLocked
      ? line.unitPrice
      : currentPrice != null && currentPrice > 0
        ? currentPrice
        : line.unitPrice;

    if (!state || !state.active) {
      unavailable.push({
        key: line.key,
        name: line.name,
        sku: line.sku,
        imageUrl,
        quantity: line.quantity,
        reason: "inactive",
        detail: state ? "Se desactivó en el catálogo" : "Ya no existe en el catálogo",
        keepPrice,
        altBranch: null,
      });
      continue;
    }

    const branches = state.stocksByBranch || [];
    let available: number | null = null;
    let branchLabel = "";
    if (branches.length > 0 && line.branchId != null) {
      const st = branches.find((b) => Number(b.branchId) === Number(line.branchId));
      available = st ? Math.max(0, Number(st.stock) || 0) : 0;
      branchLabel = branchLabelOf(st, line.branchLabel);
    } else if (branches.length === 0 && Number(state.providerId) === STOCK_PROVIDER_ID) {
      available = Math.max(0, Number(state.stockGlobal) || 0);
      branchLabel = "existencia global";
    }

    if (available != null && available <= 0) {
      const alt = branches
        .filter(
          (b) =>
            Number(b.branchId) !== Number(line.branchId) &&
            Number(b.stock) >= line.quantity &&
            // Otra línea ya usa esa bodega: juntas podrían pasarse del stock.
            !cart.some(
              (other) =>
                other.key !== line.key &&
                !other.isManual &&
                Number(other.productId) === Number(line.productId) &&
                Number(other.branchId) === Number(b.branchId),
            ),
        )
        .sort((a, b) => Number(b.stock) - Number(a.stock))[0];
      unavailable.push({
        key: line.key,
        name: line.name,
        sku: line.sku,
        imageUrl,
        quantity: line.quantity,
        reason: "noStock",
        detail:
          branchLabel === "existencia global"
            ? "Sin existencia"
            : `Sin stock en ${branchLabel}`,
        keepPrice,
        altBranch: alt
          ? {
              branchId: Number(alt.branchId),
              label: branchLabelOf(alt, null),
              stock: Number(alt.stock),
            }
          : null,
      });
      continue;
    }

    if (available != null && line.quantity > available) {
      quantities.push({
        key: line.key,
        name: line.name,
        imageUrl,
        branchLabel,
        before: line.quantity,
        after: available,
      });
    }

    if (
      !line.quotePriceLocked &&
      currentPrice != null &&
      currentPrice >= 0 &&
      Math.abs(currentPrice - line.unitPrice) > 0.009
    ) {
      prices.push({
        key: line.key,
        name: line.name,
        imageUrl,
        quantity: available != null ? Math.min(line.quantity, available) : line.quantity,
        before: line.unitPrice,
        after: currentPrice,
      });
    }
  }

  return { prices, quantities, unavailable, states: byId };
}

export function defaultUnavailableActions(
  unavailable: CartUnavailableLine[],
): CartUnavailableActions {
  const actions: CartUnavailableActions = {};
  for (const item of unavailable) {
    actions[item.key] = item.altBranch ? "switchBranch" : "remove";
  }
  return actions;
}

function resizeSerials(serials: string[], quantity: number): string[] {
  if (serials.length === quantity) return serials;
  if (serials.length > quantity) return serials.slice(0, quantity);
  return [...serials, ...Array(quantity - serials.length).fill("")];
}

function toManualLine(
  line: PosCartLine,
  item: CartUnavailableLine,
  key: string,
): PosCartLine {
  return {
    key,
    productId: 0,
    name: line.name,
    sku: line.sku,
    upc: line.upc,
    unitPrice: roundMoney(item.keepPrice),
    quantity: line.quantity,
    discountPct: 0,
    branchId: null,
    branchLabel:
      item.reason === "inactive"
        ? "Captura manual (inactivo)"
        : "Captura manual (sin stock)",
    stockBranch: 999999,
    stocksByBranch: [],
    imageUrl: item.imageUrl,
    requiresSerial: false,
    warrantyMode: line.warrantyMode ?? null,
    warrantyMonths: line.warrantyMonths,
    warrantyUnit: line.warrantyUnit ?? null,
    isPC: line.isPC,
    serials: Array(line.quantity).fill(""),
    isManual: true,
    manualKind: "product",
    serviceIntake: null,
    providerId: line.providerId ?? null,
    costSourceProductId: COST_PROVIDER_IDS.has(Number(line.providerId))
      ? line.productId
      : null,
  };
}

/** Carrito resultante tras aplicar precios, cantidades y la acción elegida por línea. */
export function applyCartChanges(
  cart: PosCartLine[],
  changes: CartChanges,
  actions: CartUnavailableActions,
  stamp: number,
): PosCartLine[] {
  const priceByKey = new Map(changes.prices.map((c) => [c.key, c.after]));
  const qtyByKey = new Map(changes.quantities.map((c) => [c.key, c.after]));
  const unavailableByKey = new Map(changes.unavailable.map((u) => [u.key, u]));
  const next: PosCartLine[] = [];

  cart.forEach((line, idx) => {
    if (!isRevalidatedLine(line)) {
      next.push(line);
      return;
    }
    const state = changes.states.get(Number(line.productId));
    const item = unavailableByKey.get(line.key);

    if (item) {
      const action = actions[item.key] || "remove";
      if (action === "keepManual") {
        next.push(toManualLine(line, item, `manual-revalida-${line.productId}-${stamp}-${idx}`));
      } else if (action === "switchBranch" && item.altBranch && state) {
        const st = state.stocksByBranch.find(
          (b) => Number(b.branchId) === item.altBranch!.branchId,
        );
        next.push({
          ...line,
          branchId: item.altBranch.branchId,
          branchLabel: item.altBranch.label,
          stocksByBranch: state.stocksByBranch,
          stockBranch: Math.max(0, Number(st?.stock) || 0),
          serials: resizeSerials(line.serials, line.quantity),
          unitPrice: line.quotePriceLocked ? line.unitPrice : roundMoney(state.price),
          catalogUnitPrice: roundMoney(state.price),
          catalogInactive: false,
        });
      }
      return;
    }

    if (!state) {
      next.push(line);
      return;
    }
    const quantity = qtyByKey.get(line.key) ?? line.quantity;
    const branchStock =
      line.branchId != null
        ? state.stocksByBranch.find((b) => Number(b.branchId) === Number(line.branchId))
        : undefined;
    next.push({
      ...line,
      unitPrice: priceByKey.get(line.key) ?? line.unitPrice,
      catalogUnitPrice: roundMoney(state.price),
      quantity,
      serials: resizeSerials(line.serials, quantity),
      stocksByBranch: state.stocksByBranch.length ? state.stocksByBranch : line.stocksByBranch,
      stockBranch: branchStock
        ? Math.max(0, Number(branchStock.stock) || 0)
        : state.stocksByBranch.length === 0
          ? Math.max(0, Number(state.stockGlobal) || 0)
          : line.stockBranch,
      catalogInactive: false,
    });
  });

  return next;
}
