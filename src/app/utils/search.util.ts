/**
 * Normaliza texto para búsqueda: minúsculas, sin acentos ni espacios.
 */
export function normalizeSearchText(value: unknown): string {
  if (value == null) return "";

  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "");
}

export function productMatchesSearch(
  product: {
    name?: string | null;
    upc?: string | number | null;
    sku?: string | null;
    idProductExt?: string | number | null;
  },
  rawQuery: string,
): boolean {
  const query = normalizeSearchText(rawQuery.trim());
  if (!query) return true;

  const fields = [
    product.name,
    product.upc,
    product.sku,
    product.idProductExt,
  ];

  return fields.some((field) => normalizeSearchText(field).includes(query));
}
