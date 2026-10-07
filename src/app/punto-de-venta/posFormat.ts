/** Formato de números solo UI (no cambia payloads al API). */

/**
 * Fecha de la venta como se muestra en el historial del POS.
 */
export function formatPosSaleDateTime(
  value: string | Date | null | undefined,
): string {
  const d = value instanceof Date ? value : new Date(String(value ?? ""));
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Fecha del ticket: DD/MM/YYYY HH:mm en America/Mexico_City. */
export function formatPosTicketDate(
  value: string | Date | null | undefined,
): string {
  const d = value instanceof Date ? value : new Date(String(value ?? ""));
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Mexico_City",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
  const hour = pick("hour") === "24" ? "00" : pick("hour");
  return `${pick("day")}/${pick("month")}/${pick("year")} ${hour}:${pick("minute")}`;
}

/** Sustituye la fecha del ticket HTML por DD/MM/YYYY de la venta. */
export function replaceTicketHtmlDate(html: string, createdAt: string): string {
  const label = formatPosTicketDate(createdAt);
  if (!label) return html;
  return html.replace(/(<div>\s*Fecha:\s*)[^<]*(<\/div>)/i, `$1${label}$2`);
}

/** Folio de venta para UI/ticket: sin prefijo PV- ni ceros a la izquierda. */
export function formatPosFolio(folio: string | null | undefined): string {
  const raw = String(folio || "")
    .trim()
    .replace(/^PV-/i, "");
  if (/^\d+$/.test(raw)) {
    return String(Number(raw));
  }
  return raw;
}

export function formatMoney(n: number | null | undefined): string {
  const v = Number(n);
  return (Number.isFinite(v) ? v : 0).toLocaleString("en-US", {
    style: "currency",
    currency: "MXN",
  });
}

/** Enteros con miles: 1200 → "1,200" */
export function formatQty(n: number | null | undefined): string {
  const v = Math.round(Number(n));
  return (Number.isFinite(v) ? v : 0).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
}

/** Decimales genéricos (p. ej. % o montos sin símbolo). */
export function formatNumber(
  n: number | null | undefined,
  fractionDigits = 0,
): string {
  const v = Number(n);
  return (Number.isFinite(v) ? v : 0).toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

const UNITS = [
  "",
  "un",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciséis",
  "diecisiete",
  "dieciocho",
  "diecinueve",
];
const TENS = [
  "",
  "",
  "veinte",
  "treinta",
  "cuarenta",
  "cincuenta",
  "sesenta",
  "setenta",
  "ochenta",
  "noventa",
];
const HUNDREDS = [
  "",
  "ciento",
  "doscientos",
  "trescientos",
  "cuatrocientos",
  "quinientos",
  "seiscientos",
  "setecientos",
  "ochocientos",
  "novecientos",
];

function underHundred(n: number): string {
  if (n < 20) return UNITS[n] || "";
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (t === 2) return u === 0 ? "veinte" : `veinti${UNITS[u]}`;
  return u === 0 ? TENS[t] : `${TENS[t]} y ${UNITS[u]}`;
}

function underThousand(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cien";
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const head = h > 0 ? HUNDREDS[h] : "";
  const tail = underHundred(rest);
  return [head, tail].filter(Boolean).join(" ");
}

/** Entero ≥ 0 en letras (español). */
export function integerToWordsEs(n: number): string {
  const v = Math.floor(Math.abs(Number(n) || 0));
  if (v === 0) return "cero";
  if (v >= 1_000_000_000) return formatQty(v);

  const millions = Math.floor(v / 1_000_000);
  const thousands = Math.floor((v % 1_000_000) / 1000);
  const rest = v % 1000;

  const parts: string[] = [];
  if (millions === 1) parts.push("un millón");
  else if (millions > 1) parts.push(`${underThousand(millions)} millones`);

  if (thousands === 1) parts.push("mil");
  else if (thousands > 1) parts.push(`${underThousand(thousands)} mil`);

  if (rest > 0) parts.push(underThousand(rest));

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Monto en letras estilo MX: "Mil doscientos pesos 50/100 M.N."
 * Solo presentación; no altera valores enviados al API.
 */
export function moneyToWordsEsMx(amount: number | null | undefined): string {
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0) return "";
  const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
  const pesos = Math.floor(rounded + Number.EPSILON);
  const cents = Math.round((rounded - pesos) * 100);
  const centsPad = String(Math.min(99, Math.max(0, cents))).padStart(2, "0");

  let core = integerToWordsEs(pesos).replace(/\bveintiun\b/g, "veintiún");
  let words: string;
  if (pesos === 1) {
    words = "un peso";
  } else {
    words = `${core} pesos`;
  }

  const phrase = `${words} ${centsPad}/100 M.N.`;
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}
