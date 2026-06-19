export const PROVIDER_PCINBOX = 1;
export const PROVIDER_TECHSMART = 2;
export const PROVIDER_DICOTECH = 3;

export const PROVIDERS_WITH_PROFIT_MARGIN = [
  PROVIDER_TECHSMART,
  PROVIDER_DICOTECH,
] as const;

export function providerUsesProfitMargin(providerId?: number | null) {
  return PROVIDERS_WITH_PROFIT_MARGIN.includes(
    Number(providerId) as (typeof PROVIDERS_WITH_PROFIT_MARGIN)[number],
  );
}
