export const PROVIDER_PCINBOX = 1;
export const PROVIDER_TECHSMART = 2;
export const PROVIDER_DICOTECH = 3;

export const PROVIDER_LABELS: Record<number, string> = {
  [PROVIDER_PCINBOX]: "PCInBOX",
  [PROVIDER_TECHSMART]: "TechSmart",
  [PROVIDER_DICOTECH]: "Dicotech",
};

export function getProviderLabel(providerId?: number | null): string {
  if (providerId == null) return "Proveedor";
  return PROVIDER_LABELS[Number(providerId)] ?? `Proveedor ${providerId}`;
}

export const PROVIDERS_WITH_PROFIT_MARGIN = [
  PROVIDER_TECHSMART,
  PROVIDER_DICOTECH,
] as const;

export function providerUsesProfitMargin(providerId?: number | null) {
  return PROVIDERS_WITH_PROFIT_MARGIN.includes(
    Number(providerId) as (typeof PROVIDERS_WITH_PROFIT_MARGIN)[number],
  );
}
