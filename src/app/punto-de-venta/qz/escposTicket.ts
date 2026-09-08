import type { PosSale } from "../../interfaces/pos/pos.interface";
import { POS_PAYMENT_LABELS } from "../../interfaces/pos/pos.interface";
import type { QzDrawerDialect } from "./qzSettings";

const ESC = "\x1B";
const GS = "\x1D";
const LF = "\x0A";

function money(n: number): string {
  return Number(n || 0).toLocaleString("es-MX", {
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
    out.push(rest.slice(0, width));
    rest = rest.slice(width);
  }
  if (rest) out.push(rest);
  return out;
}

/** Pulse cajón: Epson/compatible DLE DC4; Star Line Mode ESC p. */
export function drawerKickBytes(dialect: QzDrawerDialect): string {
  if (dialect === "star") {
    // Star drawer 1 pulse (common for TSP100 in Star mode)
    return "\x1B\x70\x00\xC8\xC8";
  }
  // ESC/POS generate pulse (drawer pin 2)
  return "\x10\x14\x01\x00\x05";
}

export function buildEscPosTicket(
  sale: PosSale,
  opts?: { openDrawer?: boolean; drawerDialect?: QzDrawerDialect },
): string {
  const width = 42;
  const parts: string[] = [];
  parts.push(ESC + "@"); // init
  parts.push(ESC + "a" + "\x01"); // center
  parts.push(ESC + "E" + "\x01"); // bold
  parts.push("PCinBOX" + LF);
  parts.push(ESC + "E" + "\x00");
  parts.push("Ticket de venta" + LF);
  parts.push(ESC + "a" + "\x00"); // left
  parts.push("-".repeat(width) + LF);
  parts.push(`Folio: ${sale.folio}` + LF);
  parts.push(
    `Fecha: ${new Date(sale.createdAt).toLocaleString("es-MX")}` + LF,
  );
  const branch = [sale.branchName, sale.branchCity].filter(Boolean).join(" — ");
  if (branch) parts.push(`Sucursal: ${branch}` + LF);
  parts.push(`Cliente: ${sale.customerName || "Público general"}` + LF);
  if (sale.cashierName) parts.push(`Vendedor: ${sale.cashierName}` + LF);
  parts.push("-".repeat(width) + LF);

  for (const it of sale.items || []) {
    for (const w of wrap(`${it.quantity} x ${it.productName}`, width)) {
      parts.push(w + LF);
    }
    parts.push(line(width, `  ${money(it.unitPrice)}`, money(it.lineTotal)) + LF);
    if (it.serials?.length) {
      parts.push(
        `  S/N: ${it.serials.map((s) => s.serialNumber).join(", ")}` + LF,
      );
    }
  }

  parts.push("-".repeat(width) + LF);
  parts.push(line(width, "Subtotal", money(sale.subtotal)) + LF);
  if (Number(sale.discountTotal) > 0) {
    parts.push(line(width, "Descuentos", `-${money(sale.discountTotal)}`) + LF);
  }
  parts.push(ESC + "E" + "\x01");
  parts.push(line(width, "TOTAL", money(sale.total)) + LF);
  parts.push(ESC + "E" + "\x00");
  parts.push(LF);
  parts.push("Pagos:" + LF);
  for (const p of sale.payments || []) {
    const label = POS_PAYMENT_LABELS[p.method] || p.method;
    parts.push(line(width, label, money(p.amount)) + LF);
    if (p.reference) {
      for (const w of wrap(`  ${p.reference}`, width)) parts.push(w + LF);
    }
  }
  if (sale.notes) {
    parts.push(LF);
    parts.push("Notas:" + LF);
    for (const w of wrap(sale.notes, width)) parts.push(w + LF);
  }
  parts.push(LF);
  parts.push(ESC + "a" + "\x01");
  parts.push("Gracias por su compra" + LF);
  parts.push(ESC + "a" + "\x00");
  parts.push(LF + LF + LF);
  parts.push(ESC + "i"); // cut (legacy)
  // partial cut alternative: GS V 1
  parts.push(GS + "V" + "\x01");

  if (opts?.openDrawer) {
    parts.push(drawerKickBytes(opts.drawerDialect || "epson"));
  }

  return parts.join("");
}
