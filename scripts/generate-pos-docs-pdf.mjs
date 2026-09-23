/**
 * Genera PDF de documentación del módulo POS PCinBOX.
 * Uso: node scripts/generate-pos-docs-pdf.mjs
 */
import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.resolve(
  __dirname,
  "../../pcinbox-client/docs/POS-Modulo-Documentacion.pdf",
);

const doc = new jsPDF({ unit: "pt", format: "letter" });
const pageW = doc.internal.pageSize.getWidth();
const pageH = doc.internal.pageSize.getHeight();
const marginX = 48;
const marginBottom = 52;
const contentW = pageW - marginX * 2;
let y = 56;
let page = 1;

function footer() {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    `PCinBOX · Módulo POS · ${new Date().toLocaleDateString("es-MX")} · p. ${page}`,
    pageW / 2,
    pageH - 28,
    { align: "center" },
  );
  doc.setTextColor(0);
}

function newPage() {
  footer();
  doc.addPage();
  page += 1;
  y = 56;
}

function ensure(space = 40) {
  if (y + space > pageH - marginBottom) newPage();
}

function title(text) {
  ensure(36);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(187, 61, 75);
  doc.text(text, marginX, y);
  y += 10;
  doc.setDrawColor(187, 61, 75);
  doc.setLineWidth(1.2);
  doc.line(marginX, y, marginX + 120, y);
  y += 22;
  doc.setTextColor(0);
}

function h2(text) {
  ensure(32);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(28, 25, 23);
  doc.text(text, marginX, y);
  y += 18;
}

function h3(text) {
  ensure(28);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(68, 64, 60);
  doc.text(text, marginX, y);
  y += 15;
}

function para(text) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(41, 37, 36);
  const lines = doc.splitTextToSize(text, contentW);
  for (const line of lines) {
    ensure(14);
    doc.text(line, marginX, y);
    y += 13;
  }
  y += 6;
}

function bullet(text, indent = 0) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(41, 37, 36);
  const prefix = "• ";
  const x = marginX + indent;
  const lines = doc.splitTextToSize(prefix + text, contentW - indent);
  for (let i = 0; i < lines.length; i++) {
    ensure(14);
    doc.text(lines[i], x, y);
    y += 13;
  }
  y += 2;
}

function kv(label, value) {
  ensure(16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(label + ":", marginX, y);
  const lw = doc.getTextWidth(label + ": ");
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(value, contentW - lw);
  doc.text(lines[0], marginX + lw, y);
  y += 13;
  for (let i = 1; i < lines.length; i++) {
    ensure(14);
    doc.text(lines[i], marginX + lw, y);
    y += 13;
  }
  y += 2;
}

function table(headers, rows, colWeights) {
  ensure(28);
  const total = colWeights.reduce((a, b) => a + b, 0);
  const widths = colWeights.map((w) => (contentW * w) / total);
  const rowH = 16;
  const drawRow = (cells, header) => {
    ensure(rowH + 4);
    let x = marginX;
    if (header) {
      doc.setFillColor(245, 245, 244);
      doc.rect(marginX, y - 11, contentW, rowH, "F");
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFont("helvetica", "normal");
    }
    doc.setFontSize(8.5);
    for (let i = 0; i < cells.length; i++) {
      const t = doc.splitTextToSize(String(cells[i] ?? ""), widths[i] - 6);
      doc.text(t[0] || "", x + 3, y);
      x += widths[i];
    }
    y += rowH;
  };
  drawRow(headers, true);
  for (const r of rows) drawRow(r, false);
  y += 10;
}

// ── Portada ──────────────────────────────────────────────
doc.setFillColor(187, 61, 75);
doc.rect(0, 0, pageW, 160, "F");
doc.setTextColor(255);
doc.setFont("helvetica", "bold");
doc.setFontSize(26);
doc.text("Módulo POS — PCinBOX", marginX, 70);
doc.setFontSize(13);
doc.setFont("helvetica", "normal");
doc.text("Documentación funcional · Pestañas, flujos y drivers", marginX, 96);
doc.setFontSize(10);
doc.text(
  `Generado: ${new Date().toLocaleString("es-MX")}  ·  Admin: /punto-de-venta  ·  API: /api/v1/pos`,
  marginX,
  120,
);
doc.setTextColor(0);
y = 190;

para(
  "Este documento describe el punto de venta en pcinbox_admin: las cuatro pestañas (Cobrar, Historial, Garantías y Caja), cómo opera cada flujo, reglas de negocio por proveedor, requisitos de hardware/drivers (QZ Tray, impresora térmica, cajón) y el esquema de datos asociado.",
);

h2("1. Resumen del módulo");
bullet("Ruta UI: /punto-de-venta (permiso pos.manage).");
bullet("Backend: pcinbox-server · MySQL (pos_module_full.sql / Prisma).");
bullet("Roles: admin y support (MiddlePosRoute). Folio: PV-#######.");
bullet(
  "Barra sticky común: estado de caja, Abrir/Ver caja, Abrir cajón de dinero.",
);

// ── Pestañas ─────────────────────────────────────────────
title("2. Pestañas y funciones");

h2("2.1 Cobrar");
para(
  "Pestaña principal de venta. Incluye cliente, cotización, catálogo, producto/servicio sin catálogo, carrito, pagos y cobro.",
);
h3("Cliente");
bullet("Nombre obligatorio (≥ 2 caracteres).");
bullet("Teléfono: lada + 10 dígitos (cliente guest en mostrador).");
h3("Cotización → carrito");
bullet("Campo número de cotización + Cargar / Desvincular.");
bullet(
  "GET /pos/quotes/:quoteNumber lee cotizaciones.linesJson (vigencia ~5 días).",
);
bullet(
  "Importa solo productos activos con stock; avisa Inactivos / Sin stock / Cantidad ajustada (lista con scroll).",
);
bullet(
  "Valida stock de los 3 proveedores (PCinBOX, TechSmart, DicoTech) desde DB al importar.",
);
h3("Agregar del catálogo");
bullet("Búsqueda por nombre, SKU, UPC/código de barras.");
bullet(
  "Resultados: badge Agotado / Sin stock si no hay existencia; inactivos no aparecen (active=1).",
);
bullet("Selector de bodega de origen cuando hay product_stock por sucursal.");
h3("Agregar sin catálogo");
bullet("Producto o servicio: Mantenimiento, Revisión, Armado, Instalación, Diagnóstico, Otro.");
bullet("Placeholders internos __POS_MANUAL__ / __POS_SERVICE__ (sin inventario).");
h3("Carrito");
bullet("Cantidad, bodega, series si requiresSerial, garantía seleccionable (componentes PCinBOX).");
bullet("Paginación del carrito; vaciar; notas; checkbox Requiere factura.");
h3("Pagos y cobro");
bullet("Métodos UI: efectivo, tarjeta crédito/débito, transferencia, otro.");
bullet("Efectivo exige caja abierta. settlePosPayments: cambio solo en efectivo/otro.");
bullet("POST /pos/sales → status completed, folio PV-, stock (solo provider 1), series.");
bullet("Post-venta: Imprimir ticket (QZ) / Ver resumen. Auto-print y kick de cajón según Caja.");
para(
  "Nota: OpenPay link no está en el cobro actual (queda legado en schema/historial pending_payment).",
);

h2("2.2 Historial");
bullet("Filtros: folio, cliente, fechas, estado (todos / completed / cancelled / pending_payment).");
bullet("Tarjetas: Detalle, Ticket (reimpresión).");
bullet("Cancelar venta (motivo ≥ 3): restaura stock PCinBOX, series y movimientos de caja.");
bullet(
  "Permisos: admin siempre; support — pending_payment siempre; completed solo mismo día (CDMX).",
);

h2("2.3 Garantías");
bullet("Consulta ventas con series: filtros cliente, folio, #venta, fechas.");
bullet("Imprimir hoja de garantía PDF (WarrantySheetPdf / @react-pdf) o ver detalle.");
bullet("Snapshot de warrantyMode / warrantyMonths / warrantyExpiresAt en product_serials.");

h2("2.4 Caja");
h3("Control de turno");
bullet("Abrir caja: fondo inicial + notas (una sesión abierta por sucursal).");
bullet("Con sesión abierta: esperado, ventas del turno, meter/sacar efectivo, corte.");
bullet(
  "Esperado = fondo + cash_in + sale_cash − cash_out − sale_cash_void.",
);
bullet("Cierre: contado; si hay descuadre, motivo obligatorio (≥ 5 caracteres).");
bullet("Sesiones recientes → detalle /punto-de-venta/caja/sesion/[id].");
h3("Hardware (impresora / cajón)");
bullet("Detectar impresoras (QZ Tray), selector, dialecto cajón Epson o Star.");
bullet("Probar ticket / Abrir cajón; checks de auto-imprimir y abrir cajón en efectivo.");

// ── Flujos ───────────────────────────────────────────────
title("3. Cómo funcionan los flujos clave");

h2("3.1 Flujo de cobro");
bullet("1. Resolver bodega de cobro en servidor (PCinBOX / leon2 tipicamente).");
bullet("2. Armar carrito (búsqueda, cotización o manual) + pagos balanceados.");
bullet("3. Si hay efectivo → requireOpenCashSession.");
bullet("4. POST /pos/sales con idempotencyKey.");
bullet("5. Descontar stock solo providerId=1; registrar series sold + garantía.");
bullet("6. QZ: ticket ESC/POS; si efectivo y setting activo → kick cajón.");

h2("3.2 Stock y proveedores");
table(
  ["ID", "Proveedor", "Bodegas típicas", "Stock en venta POS"],
  [
    ["1", "PCinBOX", "leon / leon2", "Sí — products + product_stock + inventory_movements"],
    ["2", "TechSmart", "CDMX, GDL", "No descuenta DB al cobrar"],
    ["3", "DicoTech", "leon2, santafe", "No descuenta DB al cobrar"],
  ],
  [0.8, 1.4, 1.6, 3.2],
);
para(
  "En Cobrar (buscador) e importación de cotización se indica/valida existencia desde DB para los 3 proveedores. El movimiento de inventario al cobrar sigue siendo solo PCinBOX.",
);

h2("3.3 Series y garantías");
table(
  ["Caso", "Regla"],
  [
    ["TechSmart (2)", "12 meses fijo"],
    ["PCinBOX + isPC", "12 meses fijo"],
    ["PCinBOX componente", "Cajero elige: months / none / service_center"],
    ["DicoTech / resto", "Catálogo warrantyMode + warrantyMonths"],
  ],
  [2, 5],
);
bullet("requiresSerial=true → capturar N series al cobrar.");
bullet("warrantyMode: months | none | service_center (años se guardan como meses en DB).");

h2("3.4 Cotización");
bullet("Vigencia 5 días; PDF/líneas pueden purgarse → ya no rehidratable (410).");
bullet("Vincula quoteNumber a la venta cuando se cobra desde cotización.");

// ── Drivers ──────────────────────────────────────────────
title("4. Drivers y software requerido");

h2("4.1 En la PC de mostrador");
table(
  ["Componente", "Para qué"],
  [
    ["QZ Tray", "Impresión raw ESC/POS + apertura de cajón vía WebSocket"],
    ["Impresora térmica", "Ticket 80mm/58mm compatible ESC/POS (Epson) o Star"],
    ["Cajón de dinero", "Conectado al kick de la impresora térmica"],
    ["Chrome / Edge", "Abrir el admin POS; QZ Tray debe estar corriendo"],
  ],
  [2, 5],
);

h2("4.2 En el servidor (admin Next.js)");
bullet("Carpeta pcinbox_admin/qz-certs/ (no va a git):");
bullet("digital-certificate.txt", 12);
bullet("private-key.pem", 12);
bullet("API locales: /api/qz/certificate, /api/qz/sign, /api/qz/logo.");
bullet("Opcional: QZ_CERT_PATH y QZ_PRIVATE_KEY_PATH en env.");

h2("4.3 Instalación / configuración QZ (mínimo)");
bullet("1. Instalar QZ Tray en cada PC de caja y dejarlo abierto.");
bullet("2. Copiar el par de certificados al VPS en qz-certs/ y reiniciar el admin.");
bullet(
  "3. Site Manager → Create New / Browse: confiar el certificado (evitar Allow/Deny a cada rato; Demo Cert suele seguir preguntando).",
);
bullet("4. En POS → Caja → Detectar impresoras → elegir térmica (no Print to PDF).");
bullet("5. Elegir dialecto de cajón (Epson/Star); Probar ticket y Abrir cajón.");
bullet("6. Activar auto-print y abrir cajón en efectivo si aplica.");

h2("4.4 Otros");
bullet("Backend pcinbox-server + MySQL con pos_module_full.sql aplicado.");
bullet("Sincronización de catálogo/proveedores es aparte (no es driver de caja).");
bullet("OpenPay no es requisito del cobro actual en mostrador.");

// ── APIs ─────────────────────────────────────────────────
title("5. APIs principales");
para("Base: /api/v1/pos (MiddleAuthRoute + MiddlePosRoute).");
table(
  ["Método", "Path", "Uso"],
  [
    ["GET", "/branches", "Bodegas"],
    ["GET", "/products/search", "Buscador Cobrar"],
    ["GET", "/quotes/:n", "Cargar cotización"],
    ["POST", "/sales", "Cobrar"],
    ["GET", "/sales/:id/ticket", "Ticket HTML fallback"],
    ["GET", "/sales/:id/warranty", "Datos hoja garantía"],
    ["POST", "/sales/:id/cancel", "Cancelar"],
    ["GET/POST", "/cash/*", "Abrir, movimientos, cierre, sesiones"],
    ["GET/POST", "/serials/*", "Series / RMA"],
  ],
  [1.2, 2.4, 3.4],
);

// ── DB ───────────────────────────────────────────────────
title("6. Tablas de base de datos");
table(
  ["Tabla / columna", "Rol"],
  [
    ["pos_sales", "Venta, folio, status, caja, quote, factura"],
    ["pos_sale_items", "Líneas + branchId bodega"],
    ["pos_payments", "Pagos por método"],
    ["pos_sale_events", "Auditoría"],
    ["pos_cash_sessions / movements", "Turno y ledger efectivo"],
    ["pos_folio_seq", "Secuencia PV-#######"],
    ["product_serials", "Series + snapshot garantía"],
    ["inventory_movements", "pos_sale / pos_cancel"],
    ["products.*", "requiresSerial, warrantyMonths/Mode, isPC, providerId"],
    ["cotizaciones.linesJson", "Rehidratación POS"],
    ["product_stock / branches", "Stock por bodega"],
  ],
  [2.4, 4.6],
);

// ── Checklist ────────────────────────────────────────────
title("7. Checklist de puesta en marcha");
bullet("Ejecutar pos_module_full.sql (o migraciones Prisma equivalentes).");
bullet("Desplegar pcinbox-server y pcinbox_admin (rama POS).");
bullet("Copiar qz-certs en el servidor del admin; reiniciar Next.");
bullet("Instalar QZ Tray + impresora + cajón en cada caja.");
bullet("Usuario con permiso pos.manage; abrir caja antes del primer efectivo.");
bullet("Probar: búsqueda/stock, cotización, cobro efectivo+ticket, hoja garantía, corte de caja.");

ensure(40);
doc.setFont("helvetica", "italic");
doc.setFontSize(9);
doc.setTextColor(100);
para(
  "Documento generado automáticamente desde el estado del código POS (pcinbox_admin + pcinbox-server). Para detalle de arquitectura ver también pcinbox-server/docs/POS-ARQUITECTURA.md (puede estar parcialmente desactualizado respecto a OpenPay).",
);

footer();

fs.mkdirSync(path.dirname(outPath), { recursive: true });
const buf = Buffer.from(doc.output("arraybuffer"));
fs.writeFileSync(outPath, buf);
console.log("PDF escrito:", outPath);
