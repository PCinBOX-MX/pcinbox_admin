import { formatPosFolio, formatPosTicketDate } from "../posFormat";
import type { PosSale } from "../../interfaces/pos/pos.interface";
import { formatPosPaymentLabel } from "../../interfaces/pos/pos.interface";
import {
  formatPcinboxBranchDisplayName,
  formatPosBranchUiLabel,
} from "../../interfaces/pos/posBranchDisplay";
import type { QzDrawerDialect } from "./qzSettings";

const ESC = "\x1B";
const GS = "\x1D";
const LF = "\x0A";

/** Branding fijo del ticket POS. */
export const POS_TICKET_BRAND = "pcinbox";
/** Fallback tipográfico si no se imprimió el logo. */
export const POS_TICKET_BRAND_FALLBACK = "pcinbox";
export const POS_TICKET_SELLER = "pcinbox";
export const POS_TICKET_LOGO_URL =
  "https://ik.imagekit.io/pcinboxkit/logos/logo.png?updatedAt=1759534318587";
export const POS_TICKET_WEB = "www.pcinbox.com.mx";
export const POS_TICKET_ADDRESS =
  "Blvd. Juan Alonso de Torres Pte. No. 1917 Local 1 Col. Union Comunitaria de Leon C.P. 37239 Leon, Gto.";
/** Leyenda fija al pie del ticket (térmica y HTML). */
export const POS_TICKET_DISCLAIMER_LINES = [
  "pcinbox no se hace responsable si usted eligio mal el producto o por incompatibilidad con su equipo.",
  "Es responsabilidad del cliente revisar lo que se entrega y hacer reclamo u observacion en su momento.",
  "No hay devolucion ni cambios de productos. Cualquier devolucion justificada genera el 20% de comision.",
] as const;
/** Aceptación de términos, impresa justo antes de www.pcinbox.com.mx */
export const POS_TICKET_TERMS_LINE =
  "Al dejar su equipo, el cliente acepta nuestros Términos y Condiciones de Servicio Técnico. Consúltelos en pcinbox.com.mx/servicio-tecnico";

/** @deprecated Usar resolveTicketBranchLabel; se mantiene por compat. */
export const POS_TICKET_BRANCH = "pcinbox-Leon";

/**
 * La térmica Nextep/ESC-POS no imprime bien UTF-8 (é → basura tipo "<n").
 * Quita diacríticos para texto legible en el ticket.
 */
export function thermalText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/gi, (m) => (m === "Ñ" ? "N" : "n"))
    .replace(/[^\x20-\x7E\n\r\t]/g, "");
}

function isMeaningfulCode(value?: string | null): boolean {
  const v = String(value || "").trim();
  if (!v) return false;
  if (v === "__POS_MANUAL__") return false;
  if (v === "__POS_SERVICE__") return false;
  if (/^manual$/i.test(v)) return false;
  return true;
}

/** Bodega por línea (PCinBOX-Leon / SFD / GDL / CDMX…). Provider 1 / servicio → Leon. */
function itemBodegaLabel(
  it: PosSale["items"][number],
  sale: PosSale,
): string | null {
  const isService = Boolean(
    it.serviceIntake &&
      ((it.serviceIntake.equipment?.length || 0) > 0 ||
        String(it.serviceIntake.serviceType || "").trim() ||
        String(it.serviceIntake.failureOrRequestedService || "").trim()),
  );
  if (isService) {
    return thermalText("PCinBOX-Leon");
  }
  const raw = (() => {
    if (Number(it.providerId) === 1) {
      return (
        formatPcinboxBranchDisplayName(it.branchName) ||
        (it.branchLabel &&
        !/^(leon2|santafe|gdl|cdmx|pcinbox)$/i.test(String(it.branchLabel))
          ? formatPosBranchUiLabel({
              name: it.branchName,
              label: it.branchLabel,
              city: it.branchCity,
            })
          : null) ||
        "PCinBOX-Leon"
      );
    }
    const fromItem =
      formatPcinboxBranchDisplayName(it.branchName) ||
      (it.branchLabel
        ? formatPosBranchUiLabel({
            name: it.branchName,
            label: it.branchLabel,
            city: it.branchCity,
          })
        : null);
    if (
      fromItem &&
      !/^(leon2|santafe|gdl|cdmx|dicoags2|arboledas|pcinbox)$/i.test(fromItem)
    ) {
      return fromItem;
    }
    return (
      formatPcinboxBranchDisplayName(sale.branchName) || "PCinBOX-Leon"
    );
  })();
  const normalized =
    !raw || /^pcinbox$/i.test(String(raw).trim()) ? "PCinBOX-Leon" : raw;
  return thermalText(normalized);
}

function money(n: number): string {
  return Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "MXN",
  });
}

function line(width: number, left: string, right: string): string {
  const l = String(left ?? "");
  const r = String(right ?? "");
  const space = Math.max(1, width - l.length - r.length);
  return l + " ".repeat(space) + r;
}

function wrap(text: string, width: number): string[] {
  const s = String(text || "").trim();
  if (!s) return [];
  const out: string[] = [];
  let rest = s;
  while (rest.length > width) {
    let cut = width;
    const slice = rest.slice(0, width);
    const spaceIdx = slice.lastIndexOf(" ");
    if (spaceIdx > width * 0.45) cut = spaceIdx;
    out.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) out.push(rest);
  return out;
}

/** Wrap con tope de líneas (descripciones largas en térmica). */
function wrapLimited(
  text: string,
  width: number,
  maxLines = 4,
): string[] {
  const lines = wrap(text, width);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  const last = kept[maxLines - 1] || "";
  const ellipsis = "...";
  kept[maxLines - 1] =
    last.length + ellipsis.length > width
      ? last.slice(0, Math.max(1, width - ellipsis.length)) + ellipsis
      : last + ellipsis;
  return kept;
}

function centerDashed(label: string, width: number): string {
  const text = ` ${label} `;
  if (text.length >= width) return text.slice(0, width);
  const left = Math.floor((width - text.length) / 2);
  const right = width - text.length - left;
  return `${"-".repeat(left)}${text}${"-".repeat(right)}`;
}

function parseCashMeta(sale: PosSale): { pago: number; cambio: number } {
  let nonCash = 0;
  let cashReceived = 0;
  let hasCashReceived = false;
  let cambio = 0;
  for (const p of sale.payments || []) {
    if (p.method === "efectivo_sucursal" || p.method === "otro") {
      const ref = String(p.reference || "");
      const rec = ref.match(/Recibido\s+([\d.]+)/i);
      const cam = ref.match(/Cambio\s+([\d.]+)/i);
      if (cam) cambio = Math.max(cambio, Number(cam[1]) || 0);
      if (rec) {
        cashReceived += Number(rec[1]) || 0;
        hasCashReceived = true;
      } else {
        cashReceived += Number(p.amount) || 0;
      }
    } else {
      nonCash += Number(p.amount) || 0;
    }
  }
  const pago = hasCashReceived
    ? nonCash + cashReceived
    : nonCash + cashReceived > 0
      ? nonCash + cashReceived
      : Number(sale.total) || 0;
  return {
    pago: Math.round((pago + Number.EPSILON) * 100) / 100,
    cambio: Math.round((cambio + Number.EPSILON) * 100) / 100,
  };
}

const TICKET_METHOD_SHORT: Record<string, string> = {
  efectivo_sucursal: "Efectivo",
  tarjeta_sucursal: "Tarjeta",
  tarjeta_credito_sucursal: "Tarjeta credito",
  tarjeta_debito_sucursal: "Tarjeta debito",
  transferencia_bancaria: "Transferencia",
  openpay_link: "OpenPay",
  otro: "Otro",
};

/** Monto a mostrar en detalle de pago: lo recibido, no solo lo aplicado a la venta. */
function paymentDisplayAmount(p: {
  method: string;
  amount: number;
  reference?: string | null;
}): { label: string; amount: number; note: string | null } {
  const ref = String(p.reference || "").trim();
  const rec = ref.match(/Recibido\s+([\d.]+)/i);
  const cam = ref.match(/Cambio\s+([\d.]+)/i);
  let label =
    TICKET_METHOD_SHORT[p.method] ||
    formatPosPaymentLabel(p.method, p.reference);
  if (p.method === "otro") {
    label = formatPosPaymentLabel(p.method, p.reference);
  }
  if (rec) {
    const received = Number(rec[1]) || 0;
    const note = cam
      ? `Cambio ${money(Number(cam[1]) || 0)}`
      : null;
    return { label, amount: received, note };
  }
  // Sin meta de recibido: no reimprimir basura Recibido/Cambio en la etiqueta.
  if (p.method !== "otro" && ref && !/Recibido|Cambio/i.test(ref)) {
    return { label: `${label} (${ref})`, amount: Number(p.amount) || 0, note: null };
  }
  return { label, amount: Number(p.amount) || 0, note: null };
}

/** Pulse cajón: Epson/compatible DLE DC4; Star Line Mode ESC p. */
export function drawerKickBytes(dialect: QzDrawerDialect): string {
  if (dialect === "star") {
    return "\x1B\x70\x00\xC8\xC8";
  }
  return "\x10\x14\x01\x00\x05";
}

function formatTicketFolio(folio: string | null | undefined): string {
  return formatPosFolio(folio);
}

export function buildEscPosTicket(
  sale: PosSale,
  opts?: {
    openDrawer?: boolean;
    drawerDialect?: QzDrawerDialect;
    /** Si el logo ya se imprimió como imagen QZ, tipografía de marca más chica. */
    logoPrinted?: boolean;
    /** Raster ESC/POS del logo (se inserta tras el init). */
    logoRaster?: string | null;
  },
): string {
  const width = 42;
  const parts: string[] = [];
  const { pago, cambio } = parseCashMeta(sale);
  const productCount = (sale.items || []).reduce(
    (s, it) => s + Number(it.quantity || 0),
    0,
  );

  parts.push(ESC + "@"); // init
  parts.push(LF + LF + LF);
  parts.push(ESC + "a" + "\x01"); // center

  if (opts?.logoRaster) {
    parts.push(opts.logoRaster);
  }

  // Marca siempre en minúsculas (además del logo si hubo).
  parts.push(ESC + "E" + "\x01");
  if (!opts?.logoRaster && !opts?.logoPrinted) {
    parts.push(GS + "!" + "\x11");
  }
  parts.push(POS_TICKET_BRAND_FALLBACK + LF);
  parts.push(GS + "!" + "\x00");
  parts.push(ESC + "E" + "\x00");

  parts.push("TICKET DE VENTA" + LF);
  for (const w of wrap(POS_TICKET_ADDRESS, width)) {
    parts.push(w + LF);
  }
  parts.push(POS_TICKET_WEB + LF);
  parts.push(ESC + "a" + "\x00"); // left
  parts.push("-".repeat(width) + LF);
  parts.push(`Folio: ${formatTicketFolio(sale.folio)}` + LF);
  if (sale.status && sale.status !== "completed") {
    parts.push(
      `ESTADO: ${
        sale.status === "cancelled"
          ? "CANCELADA"
          : sale.status === "pending_payment"
            ? "PENDIENTE DE PAGO"
            : thermalText(String(sale.status).toUpperCase())
      }` + LF,
    );
  }
  if (sale.quoteNumber) {
    parts.push(`No. Cotizacion: ${thermalText(sale.quoteNumber)}` + LF);
  }
  parts.push(
    `Fecha: ${thermalText(formatPosTicketDate(sale.createdAt))}` + LF,
  );
  parts.push(`Vendedor: ${POS_TICKET_SELLER}` + LF);
  parts.push(
    `Cliente: ${thermalText(String(sale.customerName || "").trim())}` + LF,
  );
  parts.push(
    `Telefono: ${thermalText(String(sale.customerPhone || "").trim())}` + LF,
  );
  parts.push(centerDashed("PRODUCTOS", width) + LF);

  for (const it of sale.items || []) {
    const isService = Boolean(
      it.serviceIntake &&
        ((it.serviceIntake.equipment?.length || 0) > 0 ||
          String(it.serviceIntake.serviceType || "").trim() ||
          String(it.serviceIntake.failureOrRequestedService || "").trim()),
    );
    const serviceLabel = String(
      it.serviceIntake?.serviceType || it.productName || "",
    ).trim();
    const title = isService
      ? `Servicio: ${serviceLabel || it.productName}`
      : it.productName;
    for (const w of wrapLimited(thermalText(title), width, 4)) {
      parts.push(w + LF);
    }
    if (isMeaningfulCode(it.productSku)) {
      parts.push(`Clave: ${thermalText(it.productSku)}` + LF);
    }
    if (isMeaningfulCode(it.productUpc)) {
      parts.push(`UPC: ${thermalText(it.productUpc)}` + LF);
    }
    const bodega = itemBodegaLabel(it, sale);
    if (bodega) {
      parts.push(`Bodega: ${bodega}` + LF);
    }
    const qty = Number(it.quantity) || 0;
    const unit = Number(it.unitPrice) || 0;
    const lineTotal = Number(it.lineTotal) || 0;
    if (qty > 1) {
      parts.push(`Cant: ${qty} x ${money(unit)}` + LF);
    } else {
      parts.push(`Cantidad: ${qty || 1}` + LF);
    }
    // Un solo importe por línea (evita repetir el mismo precio 2–3 veces).
    parts.push(line(width, "Importe:", money(lineTotal)) + LF);
    if (it.serials?.length) {
      parts.push(
        `S/N: ${thermalText(
          it.serials.map((s) => s.serialNumber).join(", "),
        )}` + LF,
      );
    }
    const intake = it.serviceIntake;
    if (intake?.equipment?.length) {
      parts.push(centerDashed("EQUIPO / COMPONENTE", width) + LF);
      for (const eq of intake.equipment) {
        const qty = Number(eq.quantity) || 1;
        const desc = thermalText(eq.description || "");
        for (const w of wrapLimited(
          `${qty}x ${desc}`,
          width,
          3,
        )) {
          parts.push(w + LF);
        }
        if (eq.serialNumber) {
          parts.push(`S/N eq: ${thermalText(eq.serialNumber)}` + LF);
        }
      }
      const failure = String(intake.failureOrRequestedService || "").trim();
      if (failure) {
        parts.push("Falla/Servicio:" + LF);
        for (const w of wrapLimited(thermalText(failure), width, 6)) {
          parts.push(w + LF);
        }
      }
      const obs = String(
        intake.technicalObservationsOnReceipt || "",
      ).trim();
      if (obs) {
        parts.push("Obs. tecnicas:" + LF);
        for (const w of wrapLimited(thermalText(obs), width, 6)) {
          parts.push(w + LF);
        }
      }
    }
    parts.push(LF);
  }

  parts.push("-".repeat(width) + LF);
  parts.push(line(width, "Total:", money(sale.total)) + LF);
  parts.push(line(width, "Pago:", money(pago || sale.total)) + LF);
  parts.push(line(width, "Cambio:", money(cambio)) + LF);
  parts.push(LF);
  parts.push(ESC + "a" + "\x01");
  parts.push(ESC + "E" + "\x01");
  parts.push(`Productos: ${Number(productCount || 0).toLocaleString("en-US")}` + LF);
  parts.push(ESC + "E" + "\x00");
  if ((sale.payments || []).length > 0) {
    parts.push(LF);
    parts.push(ESC + "a" + "\x00");
    parts.push("Detalle de pago:" + LF);
    for (const p of sale.payments || []) {
      const disp = paymentDisplayAmount(p);
      parts.push(
        line(width, thermalText(disp.label), money(disp.amount)) + LF,
      );
      if (disp.note) {
        parts.push(`  ${thermalText(disp.note)}` + LF);
      }
    }
  }
  const notes = String(sale.notes || "").trim();
  if (notes) {
    parts.push(LF);
    parts.push(ESC + "a" + "\x00");
    parts.push(centerDashed("NOTA", width) + LF);
    for (const w of wrapLimited(thermalText(notes), width, 8)) {
      parts.push(w + LF);
    }
  }
  parts.push(LF);
  parts.push(ESC + "a" + "\x01");
  parts.push(centerDashed("AVISO", width) + LF);
  parts.push(ESC + "a" + "\x00");
  for (let i = 0; i < POS_TICKET_DISCLAIMER_LINES.length; i++) {
    for (const w of wrap(POS_TICKET_DISCLAIMER_LINES[i], width)) {
      parts.push(w + LF);
    }
    if (i < POS_TICKET_DISCLAIMER_LINES.length - 1) {
      parts.push(LF);
    }
  }
  parts.push(LF);
  for (const w of wrap(thermalText(POS_TICKET_TERMS_LINE), width)) {
    parts.push(w + LF);
  }
  parts.push(LF);
  parts.push(ESC + "a" + "\x01");
  parts.push(POS_TICKET_WEB + LF);
  // Margen inferior antes del corte automático.
  parts.push(LF + LF + LF + LF + LF + LF);
  parts.push(ESC + "d" + "\x06"); // feed extra lines
  // Kick antes del corte: varias impresoras descartan bytes posteriores al cut.
  if (opts?.openDrawer) {
    parts.push(drawerKickBytes(opts.drawerDialect || "epson"));
  }
  parts.push(GS + "V" + "\x41" + "\x10"); // feed + cut (Epson/compat)

  return parts.join("");
}
