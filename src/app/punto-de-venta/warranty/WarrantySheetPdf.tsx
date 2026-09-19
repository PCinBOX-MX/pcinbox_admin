"use client";

import { formatPosFolio } from "../posFormat";
import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import type { PosSale } from "../../interfaces/pos/pos.interface";
import {
  formatPcinboxBranchDisplayName,
  formatPosBranchUiLabel,
} from "../../interfaces/pos/posBranchDisplay";
import { warrantyPdfStyles as s } from "./warrantyPdfStyles";

const LOGO =
  "https://ik.imagekit.io/pcinboxkit/logos/logo.png?updatedAt=1759534318587";
const ADDRESS =
  "Blvd. Juan Alonso de Torres Pte. No. 1917 Local 1 Col. Unión Comunitaria de León C.P. 37239 León, Gto., México";

/**
 * @react-pdf no parte bien tokens sin espacios. Inserta ZWSP en corridas largas
 * (sin truncar) para que el wrap natural muestre el texto completo.
 */
function softBreakFull(value: string, every = 14): string {
  const raw = String(value ?? "").trim() || "—";
  return raw.replace(/[^\s\u200B]{15,}/g, (token) => {
    // Preferir cortes en - _ / .
    const withHints = token.replace(/([-/_.])/g, "$1\u200B");
    if (withHints.includes("\u200B")) return withHints;
    return withHints.replace(
      new RegExp(`(.{1,${every}})`, "g"),
      "$1\u200B",
    ).replace(/\u200B$/, "");
  });
}

function money(n: number) {
  return Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "MXN",
  });
}

function meaningfulCode(value?: string | null) {
  const v = String(value || "").trim();
  if (!v) return null;
  if (v === "__POS_MANUAL__") return null;
  if (v === "__POS_SERVICE__") return null;
  if (/^manual$/i.test(v)) return null;
  return v;
}

function coverageLabel(months: number | null | undefined) {
  if (months == null || Number(months) <= 0) {
    return "Según marca / servicio";
  }
  const m = Number(months);
  if (m >= 12 && m % 12 === 0) {
    const y = m / 12;
    return `${y} año${y === 1 ? "" : "s"}`;
  }
  return `${m} mes${m === 1 ? "" : "es"}`;
}

export type WarrantyPdfRow = {
  key: string;
  upc: string;
  clave: string;
  description: string;
  cost: string;
  coverage: string;
  serial: string;
};

export function buildWarrantyPdfRows(sale: PosSale): WarrantyPdfRow[] {
  const rows: WarrantyPdfRow[] = [];
  for (const it of sale.items || []) {
    const serials = (it.serials || []).filter((x) =>
      String(x.serialNumber || "").trim(),
    );
    if (!serials.length) continue;
    for (const ser of serials) {
      rows.push({
        key: `${it.idPosSaleItem}-${ser.idProductSerial}`,
        upc: meaningfulCode(it.productUpc) || "—",
        clave: meaningfulCode(it.productSku) || "—",
        description: it.productName || "—",
        cost: money(it.unitPrice),
        coverage: coverageLabel(ser.warrantyMonths),
        serial: String(ser.serialNumber || "—"),
      });
    }
  }
  return rows;
}

const TERMS = [
  "Para marcas con centro de servicio autorizado (Acer, Samsung, HP, Lenovo, Dell, etc.), la garantía se tramita directamente con el fabricante.",
  "Si el producto se presenta a garantía y funciona correctamente, podrá aplicarse un cargo de revisión.",
  "La compatibilidad del producto es responsabilidad del cliente; no procede devolución por incompatibilidad.",
  "En dispositivos de almacenamiento la garantía cubre el equipo, no recuperación de datos ni instalación de software.",
  "No procede garantía con daño físico (rayones, golpes, quemaduras, pines doblados, etc.).",
  "Conserve este documento y su comprobante de compra para cualquier trámite.",
];

function Cell({
  children,
  colStyle,
  textStyle,
  last = false,
}: {
  children: string;
  colStyle: object | object[];
  textStyle?: object | object[];
  last?: boolean;
}) {
  return (
    <View style={[s.cell, colStyle, last ? undefined : s.cellBorder]}>
      <Text style={textStyle || s.td} wrap>
        {children}
      </Text>
    </View>
  );
}

export default function WarrantySheetPdf({ sale }: { sale: PosSale }) {
  const branchLabel =
    formatPcinboxBranchDisplayName(sale.branchName) ||
    formatPcinboxBranchDisplayName(
      sale.items.find((it) => it.branchName)?.branchName,
    ) ||
    formatPosBranchUiLabel({
      name: sale.branchName,
      city: sale.branchCity,
      fallback: "PCinBOX-León",
    });

  const purchaseDate = new Date(sale.createdAt).toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const rows = buildWarrantyPdfRows(sale);
  const customerName = softBreakFull(
    sale.customerName || "Público general",
    28,
  );

  return (
    <Document
      title={`Hoja de Garantía ${formatPosFolio(sale.folio)}`}
      author="PCinBOX"
      subject={`Garantía #${sale.idPosSale}`}
    >
      <Page size="LETTER" style={s.page} wrap>
        <View style={s.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={LOGO} style={s.logo} />
          <Text style={s.title}>Hoja de Garantía</Text>
          <View style={s.headerSpacer} />
        </View>

        <Text style={s.addr}>
          {ADDRESS} · {branchLabel}
        </Text>

        <View style={s.meta}>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Número de garantía:</Text>
            <Text style={s.metaValue}>#{sale.idPosSale}</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Folio venta:</Text>
            <Text style={s.metaValue}>{formatPosFolio(sale.folio)}</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Fecha de compra:</Text>
            <Text style={s.metaValue}>{purchaseDate}</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Vendedor:</Text>
            <Text style={s.metaValue}>PCinBOX</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Cliente:</Text>
            <Text style={s.metaValue}>{customerName}</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>Detalle de garantía</Text>

        <View style={s.table}>
          <View style={s.tableHeader} wrap={false} minPresenceAhead={24}>
            <Cell colStyle={s.colUpc} textStyle={s.th}>
              UPC
            </Cell>
            <Cell colStyle={s.colClave} textStyle={s.th}>
              Clave
            </Cell>
            <Cell colStyle={s.colDesc} textStyle={s.th}>
              Descripción
            </Cell>
            <Cell colStyle={s.colCosto} textStyle={[s.th, s.tdRight]}>
              Costo
            </Cell>
            <Cell colStyle={s.colTiempo} textStyle={[s.th, s.tdCenter]}>
              Cobertura
            </Cell>
            <Cell colStyle={s.colSerie} textStyle={s.th} last>
              Serie
            </Cell>
          </View>

          {rows.map((row) => (
            <View key={row.key} style={s.tableRow} minPresenceAhead={28}>
              <Cell colStyle={s.colUpc} textStyle={s.td}>
                {softBreakFull(row.upc, 10)}
              </Cell>
              <Cell colStyle={s.colClave} textStyle={s.td}>
                {softBreakFull(row.clave, 12)}
              </Cell>
              <Cell colStyle={s.colDesc} textStyle={s.td}>
                {softBreakFull(row.description, 18)}
              </Cell>
              <Cell colStyle={s.colCosto} textStyle={[s.td, s.tdRight]}>
                {row.cost}
              </Cell>
              <Cell colStyle={s.colTiempo} textStyle={[s.td, s.tdCenter]}>
                {softBreakFull(row.coverage, 14)}
              </Cell>
              <Cell colStyle={s.colSerie} textStyle={s.td} last>
                {softBreakFull(row.serial, 12)}
              </Cell>
            </View>
          ))}
        </View>

        <Text style={s.note}>
          Si la columna «Cobertura» indica «Según marca / servicio», el trámite
          se realiza con el fabricante o su red autorizada conforme a sus
          políticas. No se captura un plazo fijo en mostrador salvo que el
          producto lo tenga definido en catálogo.
        </Text>

        <Text style={s.termsTitle}>Condiciones</Text>
        {TERMS.map((term, idx) => (
          <Text key={term} style={s.term} wrap>
            {idx + 1}. {term}
          </Text>
        ))}

        <Text style={s.brandHint}>www.pcinbox.com.mx</Text>
      </Page>
    </Document>
  );
}
