import {
  PROVIDER_DICOTECH,
  PROVIDER_PCINBOX,
  PROVIDER_TECHSMART,
} from "@/app/constants/providers.constants";

/** months | none | service_center — años se envían como unit=years */
export type CatalogWarrantyMode = "months" | "none" | "service_center";

export type CatalogWarrantyState = {
  /** UI: months | years | none | service_center | "" */
  choice: "" | "months" | "years" | "none" | "service_center";
  amount: number | "";
};

export function catalogWarrantyNeedsSelect(params: {
  providerId?: number | null;
  isPC?: boolean | number | null;
}): boolean {
  const pid = Number(params.providerId);
  const isPC = Number(params.isPC) === 1;
  if (pid === PROVIDER_TECHSMART) return false;
  if (pid === PROVIDER_PCINBOX && isPC) return false;
  if (pid === PROVIDER_DICOTECH) return true;
  if (pid === PROVIDER_PCINBOX && !isPC) return true;
  return false;
}

export function catalogWarrantyForcedTwelve(params: {
  providerId?: number | null;
  isPC?: boolean | number | null;
}): boolean {
  const pid = Number(params.providerId);
  const isPC = Number(params.isPC) === 1;
  return pid === PROVIDER_TECHSMART || (pid === PROVIDER_PCINBOX && isPC);
}

/** Estado UI desde producto guardado. */
export function warrantyStateFromProduct(params: {
  warrantyMode?: string | null;
  warrantyMonths?: number | null;
}): CatalogWarrantyState {
  const mode = String(params.warrantyMode || "")
    .trim()
    .toLowerCase();
  if (mode === "none") return { choice: "none", amount: "" };
  if (mode === "service_center") return { choice: "service_center", amount: "" };
  const months =
    params.warrantyMonths != null && Number(params.warrantyMonths) > 0
      ? Number(params.warrantyMonths)
      : null;
  if (months == null) return { choice: "", amount: "" };
  if (months >= 12 && months % 12 === 0) {
    return { choice: "years", amount: months / 12 };
  }
  return { choice: "months", amount: months };
}

/** Payload para FormData / API. null = no enviar (TechSmart lo fija el server). */
export function catalogWarrantyToPayload(
  state: CatalogWarrantyState,
  opts: { providerId?: number | null; isPC?: boolean | number | null },
): {
  warrantyMode: string | null;
  warrantyMonths: number | null;
  warrantyUnit: string | null;
} | null {
  if (catalogWarrantyForcedTwelve(opts)) {
    return {
      warrantyMode: "months",
      warrantyMonths: 12,
      warrantyUnit: "months",
    };
  }
  if (!catalogWarrantyNeedsSelect(opts)) {
    return null;
  }
  const choice = state.choice;
  if (!choice) {
    return {
      warrantyMode: null,
      warrantyMonths: null,
      warrantyUnit: null,
    };
  }
  if (choice === "none" || choice === "service_center") {
    return {
      warrantyMode: choice,
      warrantyMonths: null,
      warrantyUnit: null,
    };
  }
  const amount = Number(state.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      warrantyMode: null,
      warrantyMonths: null,
      warrantyUnit: null,
    };
  }
  return {
    warrantyMode: "months",
    warrantyMonths: Math.round(amount),
    warrantyUnit: choice === "years" ? "years" : "months",
  };
}

export function appendCatalogWarrantyToFormData(
  formData: FormData,
  state: CatalogWarrantyState,
  opts: { providerId?: number | null; isPC?: boolean | number | null },
) {
  const payload = catalogWarrantyToPayload(state, opts);
  if (!payload) return;
  if (payload.warrantyMode) {
    formData.append("warrantyMode", payload.warrantyMode);
  }
  if (payload.warrantyMonths != null) {
    formData.append("warrantyMonths", String(payload.warrantyMonths));
  }
  if (payload.warrantyUnit) {
    formData.append("warrantyUnit", payload.warrantyUnit);
  }
}

export function validateCatalogWarranty(
  state: CatalogWarrantyState,
  opts: { providerId?: number | null; isPC?: boolean | number | null },
): string | null {
  if (!catalogWarrantyNeedsSelect(opts)) return null;
  if (!state.choice) {
    return "Elige la garantía del producto (meses, años, no aplica o centro de servicio).";
  }
  if (
    (state.choice === "months" || state.choice === "years") &&
    (!(Number(state.amount) > 0))
  ) {
    return "Indica la duración de la garantía.";
  }
  return null;
}
