import { PROVIDER_PCINBOX } from "../constants/providers.constants";
import {
  type CatalogWarrantyState,
  catalogWarrantyToPayload,
  validateCatalogWarranty,
} from "../shared/utils/catalogWarranty";

/** Mismas reglas que «Agregar sin catálogo» (select siempre visible). */
export const UNAVAILABLE_WARRANTY_OPTS = { providerId: PROVIDER_PCINBOX, isPC: 0 };

export type QuoteUnavailableReason = "inactive" | "noStock";

/** Producto de la cotización que no entra al carrito por inactivo o sin stock. */
export type QuoteUnavailableItem = {
  key: string;
  idProduct: number;
  name: string;
  sku: string | null;
  upc: string | null;
  quantity: number;
  /** Precio unitario guardado en la cotización; null en legacy. */
  quoteUnitPrice: number | null;
  /** Precio actual de catálogo. */
  catalogPrice: number;
  reason: QuoteUnavailableReason;
  /** Bodega sin stock, «existencia global» o «ya en carrito»; null si inactivo. */
  reasonDetail: string | null;
  providerId: number | null;
  /** Foto del catálogo; null usa el logo PCinBOX en el carrito. */
  imageUrl: string | null;
  warrantyMonths: number | null;
  warrantyMode: string | null;
};

export type QuoteUnavailablePriceChoice = "quote" | "current";

export type QuoteUnavailableRowState = {
  selected: boolean;
  choice: QuoteUnavailablePriceChoice;
  /** Solo se usa cuando el producto no tiene garantía declarada. */
  warranty: CatalogWarrantyState;
};

export type QuoteUnavailableState = Record<string, QuoteUnavailableRowState>;

export type QuoteUnavailableResolved = {
  item: QuoteUnavailableItem;
  unitPrice: number;
  warrantyMode: string;
  warrantyMonths: number | null;
  warrantyUnit: "months" | "years";
};

export function unavailableHasQuotePrice(item: QuoteUnavailableItem): boolean {
  return (
    item.quoteUnitPrice != null &&
    Number.isFinite(item.quoteUnitPrice) &&
    item.quoteUnitPrice > 0
  );
}

export function unavailableHasCurrentPrice(item: QuoteUnavailableItem): boolean {
  return Number.isFinite(item.catalogPrice) && item.catalogPrice > 0;
}

export function unavailableNeedsWarranty(item: QuoteUnavailableItem): boolean {
  const mode = String(item.warrantyMode || "").trim().toLowerCase();
  if (mode === "none" || mode === "service_center") return false;
  return !(item.warrantyMonths != null && Number(item.warrantyMonths) > 0);
}

/** Precio de la opción elegida o, si esa no existe, el de la otra. */
export function unavailableUnitPrice(
  item: QuoteUnavailableItem,
  choice: QuoteUnavailablePriceChoice,
): number | null {
  const quote = unavailableHasQuotePrice(item) ? Number(item.quoteUnitPrice) : null;
  const current = unavailableHasCurrentPrice(item) ? item.catalogPrice : null;
  return choice === "quote" ? quote ?? current : current ?? quote;
}

export function defaultUnavailableState(
  items: QuoteUnavailableItem[],
): QuoteUnavailableState {
  const next: QuoteUnavailableState = {};
  for (const item of items) {
    next[item.key] = {
      selected: false,
      choice: unavailableHasQuotePrice(item) ? "quote" : "current",
      warranty: { choice: "", amount: "" },
    };
  }
  return next;
}

function resolveWarranty(
  item: QuoteUnavailableItem,
  row: QuoteUnavailableRowState,
): Pick<
  QuoteUnavailableResolved,
  "warrantyMode" | "warrantyMonths" | "warrantyUnit"
> | null {
  if (!unavailableNeedsWarranty(item)) {
    const mode = String(item.warrantyMode || "").trim().toLowerCase();
    if (mode === "none" || mode === "service_center") {
      return { warrantyMode: mode, warrantyMonths: null, warrantyUnit: "months" };
    }
    return {
      warrantyMode: "months",
      warrantyMonths: Number(item.warrantyMonths),
      warrantyUnit: "months",
    };
  }
  if (validateCatalogWarranty(row.warranty, UNAVAILABLE_WARRANTY_OPTS)) return null;
  const payload = catalogWarrantyToPayload(row.warranty, UNAVAILABLE_WARRANTY_OPTS);
  if (!payload?.warrantyMode) return null;
  return {
    warrantyMode: payload.warrantyMode,
    warrantyMonths: payload.warrantyMonths,
    warrantyUnit: payload.warrantyUnit === "years" ? "years" : "months",
  };
}

/** Productos activados con su precio y garantía; `errors` vacío ⇒ se puede importar. */
export function resolveQuoteUnavailable(
  items: QuoteUnavailableItem[],
  state: QuoteUnavailableState,
): { lines: QuoteUnavailableResolved[]; errors: string[] } {
  const lines: QuoteUnavailableResolved[] = [];
  const errors: string[] = [];
  for (const item of items) {
    const row = state[item.key];
    if (!row?.selected) continue;
    const unitPrice = unavailableUnitPrice(item, row.choice);
    if (unitPrice == null) {
      errors.push(
        `«${item.name}» no tiene precio de cotización ni de catálogo; no se puede agregar.`,
      );
    }
    const warranty = resolveWarranty(item, row);
    if (!warranty) {
      errors.push(
        validateCatalogWarranty(row.warranty, UNAVAILABLE_WARRANTY_OPTS)
          ? `Elige la garantía de «${item.name}».`
          : `Garantía inválida para «${item.name}».`,
      );
    }
    if (unitPrice == null || !warranty) continue;
    lines.push({ item, unitPrice, ...warranty });
  }
  return { lines, errors };
}
