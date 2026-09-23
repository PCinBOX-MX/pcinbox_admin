import { StyleSheet } from "@react-pdf/renderer";

const C = {
  black: "#0d0d0d",
  ink: "#1a1a1a",
  muted: "#6b7280",
  line: "#d1d5db",
  soft: "#f3f4f6",
  brand: "#bb3d4b",
  white: "#ffffff",
};

/** Ancho útil LETTER con paddingHorizontal 36: 612 - 72 = 540 */
export const WARRANTY_TABLE_WIDTH = 540;

export const warrantyPdfStyles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.ink,
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 36,
    backgroundColor: C.white,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  logo: {
    width: 110,
    height: 44,
    objectFit: "contain",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: C.black,
  },
  headerSpacer: {
    width: 110,
  },
  addr: {
    fontSize: 8,
    color: C.muted,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 1.35,
  },
  meta: {
    marginBottom: 14,
    width: "100%",
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 3,
    width: "100%",
  },
  metaLabel: {
    width: 120,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: C.ink,
  },
  metaValue: {
    width: 420,
    fontSize: 9,
    color: C.ink,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 4,
    color: C.black,
  },
  table: {
    width: WARRANTY_TABLE_WIDTH,
  },
  tableHeader: {
    flexDirection: "row",
    width: WARRANTY_TABLE_WIDTH,
    backgroundColor: C.soft,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "stretch",
  },
  tableRow: {
    flexDirection: "row",
    width: WARRANTY_TABLE_WIDTH,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.line,
    alignItems: "stretch",
  },
  cell: {
    paddingVertical: 5,
    paddingHorizontal: 4,
    justifyContent: "flex-start",
  },
  cellBorder: {
    borderRightWidth: 1,
    borderRightColor: C.line,
  },
  th: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: C.muted,
    textTransform: "uppercase",
    lineHeight: 1.15,
  },
  td: {
    fontSize: 7,
    color: C.ink,
    lineHeight: 1.25,
    maxWidth: "100%",
  },
  tdRight: {
    textAlign: "right",
  },
  tdCenter: {
    textAlign: "center",
  },
  // 70+100+180+58+62+70 = 540 — más ancho a Clave y Descripción
  colUpc: { width: 70 },
  colClave: { width: 100 },
  colDesc: { width: 180 },
  colCosto: { width: 58 },
  colTiempo: { width: 62 },
  colSerie: { width: 70 },
  note: {
    marginTop: 10,
    fontSize: 8,
    color: C.muted,
    lineHeight: 1.4,
    width: WARRANTY_TABLE_WIDTH,
  },
  termsTitle: {
    marginTop: 14,
    marginBottom: 6,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  term: {
    fontSize: 8,
    color: C.ink,
    marginBottom: 4,
    lineHeight: 1.35,
    paddingLeft: 8,
    width: WARRANTY_TABLE_WIDTH,
  },
  brandHint: {
    marginTop: 12,
    fontSize: 8,
    color: C.brand,
    fontFamily: "Helvetica-Bold",
  },
});
