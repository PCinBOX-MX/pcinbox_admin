/** Garantía POS: modes months | none | service_center */

export type PosWarrantyMode = "months" | "none" | "service_center";

export function posWarrantySelectable(params: {
  providerId?: number | null;
  isPC?: boolean | number | null;
  isManual?: boolean;
}): boolean {
  if (params.isManual) return false;
  return (
    Number(params.providerId) === 1 && !(Number(params.isPC) === 1)
  );
}

export function warrantyCoverageLabel(
  mode: string | null | undefined,
  months: number | null | undefined,
): string {
  const m = String(mode || "")
    .trim()
    .toLowerCase();
  if (m === "none") return "No aplica";
  if (m === "service_center") return "Centro de servicio";
  const n =
    months != null && Number.isFinite(Number(months)) && Number(months) > 0
      ? Number(months)
      : null;
  if (n != null) {
    if (n >= 12 && n % 12 === 0) {
      const y = n / 12;
      return `${y} año${y === 1 ? "" : "s"}`;
    }
    return `${n} mes${n === 1 ? "" : "es"}`;
  }
  return "Según marca / servicio";
}

/** Convierte UI (mode + valor + unit) → payload de venta. */
export function cartWarrantyToPayload(line: {
  warrantyMode?: string | null;
  warrantyMonths?: number | null;
  warrantyUnit?: "months" | "years" | null;
}): {
  warrantyMode?: string;
  warrantyMonths?: number;
  warrantyUnit?: string;
} {
  const mode = String(line.warrantyMode || "").trim();
  if (!mode) return {};
  if (mode === "none" || mode === "service_center") {
    return { warrantyMode: mode };
  }
  return {
    warrantyMode: "months",
    warrantyMonths: line.warrantyMonths ?? undefined,
    warrantyUnit: line.warrantyUnit || "months",
  };
}
