/** Captura en el formulario de envío a domicilio. */
export type PosDeliveryForm = {
  id: string;
  street: string;
  noExt: string;
  noInt: string;
  postalCode: string;
  cologne: string;
  city: string;
  state: string;
  country: string;
  shippingCost: string;
};

/** Dirección lista para guardar. */
export type PosDeliveryAddress = {
  street: string;
  noExt: string;
  noInt: string | null;
  postalCode: string;
  cologne: string;
  city: string;
  state: string;
  country: string;
  shippingCost: number;
};

export type PosDeliveryField = keyof PosDeliveryForm;

export type PosDeliveryErrors = Partial<Record<PosDeliveryField, string>>;

export const POSTAL_CODE_NOT_FOUND =
  "Código postal no válido o no contemplado. Verifica e intenta de nuevo.";
export const POSTAL_CODE_LOOKUP_FAILED =
  "No pudimos consultar el código postal. Intenta de nuevo.";

export const MAX_POS_DELIVERIES = 10;

function newDeliveryId(): string {
  return `dom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyPosDeliveryForm(): PosDeliveryForm {
  return {
    id: newDeliveryId(),
    street: "",
    noExt: "",
    noInt: "",
    postalCode: "",
    cologne: "",
    city: "",
    state: "",
    country: "México",
    shippingCost: "",
  };
}

/** Deja solo un monto con hasta 2 decimales, conservando el punto al escribir. */
export function sanitizeShippingCostInput(raw: string): string {
  const cleaned = String(raw || "").replace(/[^\d.,]/g, "").replace(/,/g, ".");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned.slice(0, 7);
  const whole = cleaned.slice(0, dot).slice(0, 7);
  const frac = cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  return `${whole}.${frac}`;
}

/** `null` si está vacío o no es un monto válido. `0` es un envío sin costo. */
export function parsePosShippingCost(raw: unknown): number | null {
  const text = sanitizeShippingCostInput(String(raw ?? "")).replace(/\.$/, "");
  if (!text) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const amount = Math.round(Number(text) * 100) / 100;
  if (!Number.isFinite(amount) || amount > 999999.99) return null;
  return amount;
}

/** Lo que puede verse en una cotización: sin calle ni número. */
export function quoteDeliveryHint(form: {
  postalCode: string;
  cologne: string;
  city: string;
  state: string;
}): string {
  const city = [form.city, form.state]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
  return [
    form.postalCode.trim() ? `CP ${form.postalCode.trim()}` : "",
    form.cologne.trim() ? `Col. ${form.cologne.trim()}` : "",
    city,
  ]
    .filter(Boolean)
    .join(", ")
    .slice(0, 80);
}

/** Acepta el borrador del formulario o la dirección ya guardada. */
export function normalizePosDeliveryForm(raw: unknown): PosDeliveryForm {
  const base = emptyPosDeliveryForm();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const row = raw as Record<string, unknown>;
  const id = String(row.id ?? "").trim().slice(0, 40);
  return {
    id: id || newDeliveryId(),
    street: String(row.street ?? "").slice(0, 255),
    noExt: String(row.noExt ?? "").slice(0, 10),
    noInt: String(row.noInt ?? "").slice(0, 10),
    postalCode: String(row.postalCode ?? "").replace(/\D/g, "").slice(0, 5),
    cologne: String(row.cologne ?? "").slice(0, 100),
    city: String(row.city ?? "").slice(0, 100),
    state: String(row.state ?? "").slice(0, 100),
    country: String(row.country ?? "").trim().slice(0, 100) || "México",
    shippingCost: sanitizeShippingCostInput(String(row.shippingCost ?? "")),
  };
}

export function validatePosDeliveryForm(form: PosDeliveryForm): PosDeliveryErrors {
  const errors: PosDeliveryErrors = {};
  const street = form.street.trim();
  const noExt = form.noExt.trim();
  const noInt = form.noInt.trim();
  const cologne = form.cologne.trim();
  const city = form.city.trim();
  const state = form.state.trim();
  const postalCode = form.postalCode.trim();

  if (!street) errors.street = "Escribe la calle.";
  else if (street.length > 255) errors.street = "Máximo 255 caracteres.";

  if (!noExt) errors.noExt = "Escribe el número exterior.";
  else if (noExt.length > 10) errors.noExt = "Máximo 10 caracteres.";

  if (noInt.length > 10) errors.noInt = "Máximo 10 caracteres.";

  if (!/^\d{5}$/.test(postalCode)) {
    errors.postalCode = "Escribe un código postal de 5 dígitos.";
  }

  if (!cologne) errors.cologne = "Selecciona una colonia.";
  else if (cologne.length > 100) errors.cologne = "Máximo 100 caracteres.";

  if (!state) errors.state = "Selecciona un estado.";
  else if (state.length > 100) errors.state = "Máximo 100 caracteres.";

  if (!city) errors.city = "Selecciona una ciudad.";
  else if (city.length > 100) errors.city = "Máximo 100 caracteres.";

  if (parsePosShippingCost(form.shippingCost) == null) {
    errors.shippingCost = "Escribe el costo de envío.";
  }

  return errors;
}

export function isCompletePosDelivery(form: PosDeliveryForm): boolean {
  return Object.keys(validatePosDeliveryForm(form)).length === 0;
}

/** Domicilios que ya se pueden cobrar. Un formulario a medias no entra. */
export function registeredPosDeliveries(raw: unknown): PosDeliveryForm[] {
  const rows = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? [raw] : [];
  return rows
    .slice(0, MAX_POS_DELIVERIES)
    .map((row) => normalizePosDeliveryForm(row))
    .filter(isCompletePosDelivery);
}

export function toPosDeliveryAddress(form: PosDeliveryForm): PosDeliveryAddress {
  return {
    street: form.street.trim(),
    noExt: form.noExt.trim(),
    noInt: form.noInt.trim() || null,
    postalCode: form.postalCode.trim(),
    cologne: form.cologne.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    country: form.country.trim() || "México",
    shippingCost: parsePosShippingCost(form.shippingCost) ?? 0,
  };
}

/** Dirección guardada en la venta. `null` si el payload no trae una válida. */
export function readPosDeliveryAddress(raw: unknown): PosDeliveryAddress | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const form = normalizePosDeliveryForm(raw);
  if (parsePosShippingCost(form.shippingCost) == null) form.shippingCost = "0";
  if (Object.keys(validatePosDeliveryForm(form)).length > 0) return null;
  return toPosDeliveryAddress(form);
}

/** Varios domicilios. Un objeto suelto (venta o borrador viejo) cuenta como uno. */
export function normalizePosDeliveryList(raw: unknown): PosDeliveryForm[] {
  const rows = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const forms = rows
    .slice(0, MAX_POS_DELIVERIES)
    .map((row) => normalizePosDeliveryForm(row));
  return forms.length > 0 ? forms : [emptyPosDeliveryForm()];
}

/** Domicilios válidos guardados en una venta. */
export function readPosDeliveryAddresses(raw: unknown): PosDeliveryAddress[] {
  const rows = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return rows
    .slice(0, MAX_POS_DELIVERIES)
    .map((row) => readPosDeliveryAddress(row))
    .filter((row): row is PosDeliveryAddress => row != null);
}

export function listSaleDeliveries(sale: {
  deliveryAddresses?: PosDeliveryAddress[] | null;
  deliveryAddress?: PosDeliveryAddress | null;
}): PosDeliveryAddress[] {
  if (Array.isArray(sale.deliveryAddresses) && sale.deliveryAddresses.length > 0) {
    return sale.deliveryAddresses;
  }
  return sale.deliveryAddress ? [sale.deliveryAddress] : [];
}
