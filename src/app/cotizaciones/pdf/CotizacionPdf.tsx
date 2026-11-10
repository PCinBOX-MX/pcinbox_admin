"use client";

import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import { styles } from "./styles";

export type QuoteDetailLevel = "full" | "hidden";

export type QuotePdfLine = {
  idProduct: string | number;
  name: string;
  description?: string | null;
  caracteristicas?: unknown;
  price: number;
  quantity: number;
  imageUrl?: unknown;
  upc?: string | null;
};

const FALLBACK_PRODUCT_IMAGE = "/imagen-no-encontrada.png";

const TRANSFER = {
  bank: "BBVA",
  holder: "Lizbeth Ordaz Camacho",
  account: "0477163533",
  clabe: "012225004771635337",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);

const appendImageKitTransform = (url: string, transform: string) => {
  if (!url.includes("ik.imagekit.io") || /[?&]tr=/.test(url)) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}tr=${transform}`;
};

const firstImageUrl = (raw: unknown): string => {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const url = typeof value === "string" ? value.trim() : "";
  if (!url) return FALLBACK_PRODUCT_IMAGE;
  if (!url.includes("ik.imagekit.io")) return url;

  let withoutTr = url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("tr");
    withoutTr = parsed.toString();
  } catch {
    withoutTr = url
      .replace(/([?&])tr=[^&]*/g, "")
      .replace(/\?&/, "?")
      .replace(/[?&]$/, "");
  }
  return appendImageKitTransform(withoutTr, "w-220,h-220,c-at_max,q-85,f-auto");
};

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const formatDate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, "0");
  return `${day} de ${MONTHS[date.getMonth()]} del ${date.getFullYear()}`;
};

const buildClientBlock = (
  userName?: string | null,
  userPhone?: string | null,
) => {
  const lines = [userName, userPhone]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
  return lines.join("\n");
};

/** Precios machine-readable en Keywords del PDF (el POS los lee de aquí). */
const buildQuoteLinesKeywords = (products: QuotePdfLine[]): string => {
  const parts: string[] = [];
  for (const product of products) {
    const id = String(product.idProduct ?? "").trim();
    if (!id || id.length > 64) continue;
    const qty = Math.max(1, Math.round(Number(product.quantity ?? 1) || 1));
    const priceRaw = Number(product.price);
    if (!Number.isFinite(priceRaw) || priceRaw < 0) continue;
    const price = Math.round((priceRaw + Number.EPSILON) * 100) / 100;
    parts.push(`${id}:${qty}:${price.toFixed(2)}`);
  }
  if (!parts.length) return "";
  return `pcinbox-lines-v1|${parts.join(";")}`;
};

const readCaracteristicas = (raw: unknown) => {
  try {
    const parsed = Array.isArray(raw)
      ? raw
      : typeof raw === "string"
        ? JSON.parse(raw || "[]")
        : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is { prop: string; value: string } =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as { prop?: unknown }).prop === "string",
    );
  } catch {
    return [];
  }
};

type CotizacionPdfProps = {
  noCotizacion: string | number;
  products: QuotePdfLine[];
  userName?: string | null;
  userPhone?: string | null;
  includeAssemblyService?: boolean;
  /** Muestra el recuadro de transferencia en el pie. */
  includeTransferInfo?: boolean;
  comments?: string | null;
  detailLevel?: QuoteDetailLevel;
};

const CotizacionPdf = ({
  noCotizacion,
  products,
  userName,
  userPhone,
  includeAssemblyService,
  includeTransferInfo = true,
  comments,
  detailLevel = "full",
}: CotizacionPdfProps) => {
  const now = new Date();
  const expiry = new Date(now);
  expiry.setHours(expiry.getHours() + 24);
  const hidden = detailLevel === "hidden";

  const total = products.reduce((acc, product) => {
    const price = Number(product.price ?? 0);
    const qty = Number(product.quantity ?? 1);
    return Number.isFinite(price) && Number.isFinite(qty) ? acc + price * qty : acc;
  }, 0);

  const totalQty = products.reduce((acc, product) => {
    const qty = Number(product.quantity ?? 1);
    return Number.isFinite(qty) ? acc + qty : acc;
  }, 0);

  const linesKeywords = buildQuoteLinesKeywords(products);
  const commentText = String(comments || "").trim().slice(0, 500);

  const renderFullRow = (product: QuotePdfLine) => {
    let foundUpc = String(product.upc || "");
    const filtered = readCaracteristicas(product.caracteristicas).filter(
      (car) => {
        if (car.prop.toUpperCase() === "UPC") {
          if (!foundUpc) foundUpc = String(car.value || "");
          return false;
        }
        return true;
      },
    );
    if (foundUpc) filtered.unshift({ prop: "UPC", value: foundUpc });

    const qty = Number(product.quantity ?? 1);
    const price = Number(product.price ?? 0);

    return (
      <View
        key={String(product.idProduct)}
        style={styles.tableRow}
        wrap={false}
        minPresenceAhead={72}
      >
        <View style={styles.colImg} wrap={false}>
          <View style={styles.productImageFrame} wrap={false}>
            <Image
              src={firstImageUrl(product.imageUrl)}
              style={styles.productImage}
            />
          </View>
        </View>
        <View style={styles.colQty} wrap={false}>
          <View style={styles.tdQtyBadge}>
            <Text style={styles.tdQtyText}>{qty}</Text>
          </View>
        </View>
        <View style={styles.colDesc} wrap={false}>
          <Text style={styles.productName}>{product.name}</Text>
          {product.description ? (
            <Text style={styles.productDesc}>{product.description}</Text>
          ) : null}
          {filtered.slice(0, 4).map((car, index) => (
            <Text key={`${car.prop}-${index}`} style={styles.productProp}>
              <Text style={styles.productPropBold}>{car.prop}: </Text>
              {car.value}
            </Text>
          ))}
        </View>
        <View style={styles.colUnit} wrap={false}>
          <Text style={styles.tdUnitText}>{formatCurrency(price)}</Text>
        </View>
        <View style={styles.colTotal} wrap={false}>
          <Text style={styles.tdTotalText}>{formatCurrency(qty * price)}</Text>
        </View>
      </View>
    );
  };

  return (
    <Document
      title={`Cotización ${noCotizacion}`}
      author="PC Inbox"
      subject="pcinbox-quote-client"
      keywords={[
        "pcinbox-client-v1",
        userName
          ? `name=${String(userName).replace(/[|()\n\r]/g, " ").trim()}`
          : "",
        userPhone
          ? `phone=${String(userPhone).replace(/[|()\n\r]/g, " ").trim()}`
          : "",
        !userName && !userPhone ? "public=1" : "",
        linesKeywords,
      ]
        .filter(Boolean)
        .join("|")}
    >
      <Page
        size="LETTER"
        style={
          includeTransferInfo ? [styles.page, styles.pageWithTransfer] : styles.page
        }
      >
        <View style={styles.header} fixed>
          <View style={styles.logoWrap}>
            <Image src="/logo.png" style={styles.logo} />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.titleLabel}>Cotización</Text>
            <Text style={styles.headerDate}>Fecha: {formatDate(now)}</Text>
          </View>
        </View>

        <View style={styles.metaRow} wrap={false}>
          <View style={styles.metaBlockClient}>
            <Text style={styles.metaLabel}>Cliente</Text>
            <Text style={styles.metaValueNormal}>
              {buildClientBlock(userName, userPhone)}
            </Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>No. Cotización</Text>
            <Text style={styles.metaValue}>{noCotizacion}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Vigencia</Text>
            <Text style={styles.metaValueNormal}>{formatDate(expiry)}</Text>
          </View>
        </View>

        <View style={styles.divider} wrap={false} />

        {hidden ? (
          <>
            <View style={styles.tableHeader} wrap={false} minPresenceAhead={48}>
              <View style={styles.thColDesc}>
                <Text style={styles.thText}>Producto</Text>
              </View>
            </View>
            {products.map((product) => {
              const qty = Math.max(
                1,
                Math.round(Number(product.quantity ?? 1) || 1),
              );
              return (
                <View
                  key={String(product.idProduct)}
                  style={styles.hiddenRow}
                  wrap={false}
                >
                  <View style={styles.hiddenLine}>
                    <Text style={styles.hiddenName}>{product.name}</Text>
                    {qty > 1 ? (
                      <View style={styles.hiddenQtyBadge}>
                        <Text style={styles.hiddenQty}>x {qty}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </>
        ) : (
          <>
            <View style={styles.tableHeader} wrap={false} minPresenceAhead={90}>
              <View style={styles.thColImg}>
                <Text style={styles.thText}>Imagen</Text>
              </View>
              <View style={styles.thColQty}>
                <Text style={[styles.thText, styles.thTextCenter]}>Cant.</Text>
              </View>
              <View style={styles.thColDesc}>
                <Text style={styles.thText}>Descripción</Text>
              </View>
              <View style={styles.thColUnit}>
                <Text style={[styles.thText, styles.thTextRight]}>
                  P. Unitario
                </Text>
              </View>
              <View style={styles.thColTotal}>
                <Text style={[styles.thText, styles.thTextRight]}>Subtotal</Text>
              </View>
            </View>
            {products.map(renderFullRow)}
          </>
        )}

        <View style={styles.totalsSection} wrap={false} minPresenceAhead={64}>
          <View style={styles.totalsHeaderRow}>
            {hidden ? (
              <Text style={styles.totalsProductCount}> </Text>
            ) : (
              <Text style={styles.totalsProductCount}>
                TOTAL PRODUCTOS: {totalQty} Productos
              </Text>
            )}
            <View style={styles.totalsAmounts}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
              </View>
              <Text style={styles.ivaNote}>Precios incluyen I.V.A.</Text>
            </View>
          </View>
        </View>

        {commentText ? (
          <View style={styles.commentsBox}>
            <Text style={styles.commentsTitle}>Comentarios</Text>
            <Text style={styles.commentsText}>{commentText}</Text>
          </View>
        ) : null}

        <View style={styles.noteBox} wrap={false} minPresenceAhead={48}>
          <Text style={styles.noteText}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>
              Recomendación:{" "}
            </Text>
            Para el uso correcto y garantía de su equipo se recomienda
            ampliamente contar con regulador y supresor de picos integrado.
          </Text>
        </View>

        {includeAssemblyService ? (
          <View
            style={[
              styles.noteBox,
              {
                marginTop: 8,
                backgroundColor: "#e6f4ea",
                borderLeftColor: "#1e8e3e",
              },
            ]}
            wrap={false}
            minPresenceAhead={40}
          >
            <Text style={[styles.noteText, { color: "#1e8e3e" }]}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>
                Servicio Adicional:{" "}
              </Text>
              Servicio de ensamble incluido
            </Text>
          </View>
        ) : null}

        <View style={styles.validityBox} wrap={false} minPresenceAhead={40}>
          <Text style={styles.validityText}>
            ⚠ Cotización vigente hasta el {formatDate(expiry)} o hasta agotar
            existencias.
          </Text>
        </View>

        <View style={styles.bottomFooter} fixed>
          {includeTransferInfo ? (
          <View style={styles.transferCard}>
            <View style={styles.transferHead}>
              <Text style={styles.transferTitle}>DATOS PARA TRANSFERENCIA</Text>
              <Text style={styles.transferBadge}>PCINBOX · PAGO POR TRANSFERENCIA</Text>
            </View>
            <View style={styles.transferBody}>
              <View style={styles.transferGrid}>
                <View style={[styles.transferCell, styles.transferCellBank]}>
                  <Text style={styles.transferLabel}>Banco</Text>
                  <Text style={styles.transferValue}>{TRANSFER.bank}</Text>
                </View>
                <View style={[styles.transferCell, styles.transferCellHolder]}>
                  <Text style={styles.transferLabel}>Titular</Text>
                  <Text style={styles.transferValue}>{TRANSFER.holder}</Text>
                </View>
                <View style={[styles.transferCell, styles.transferCellAccount]}>
                  <Text style={styles.transferLabel}>Número de cuenta</Text>
                  <Text style={styles.transferNumber}>{TRANSFER.account}</Text>
                </View>
                <View style={[styles.transferCell, styles.transferCellClabe]}>
                  <Text style={styles.transferLabel}>CLABE interbancaria</Text>
                  <Text style={styles.transferNumber}>{TRANSFER.clabe}</Text>
                </View>
              </View>
              <Text style={styles.transferNote}>
                Pago anticipado requerido. Favor de enviar su comprobante de
                transferencia para confirmar su pedido.
              </Text>
            </View>
          </View>
          ) : null}
          <View style={styles.footer}>
            <View style={styles.footerRow}>
              <View style={styles.footerCol}>
                <Text style={styles.companyName}>pcinbox</Text>
                <Text style={styles.footerValue}>
                  Blvd. Juan Alonso de Torres Pte. 1917-Local 01{"\n"}
                  Unión Comunitaria de León, 37239 León, Gto.
                </Text>
              </View>
              <View style={styles.footerCol}>
                <Text style={styles.footerLabel}>CONTACTO</Text>
                <Text style={styles.footerEmail}>admon@pcinbox.com.mx</Text>
                <Text style={styles.footerValue}>
                  Tel. Oficina: 477 330 04 37{"\n"}
                  Móvil: 477 533 41 27
                </Text>
              </View>
              <View style={styles.footerColLast}>
                <Text style={styles.footerLabel}>CONDICIONES DE PAGO</Text>
                <Text
                  style={styles.footerValue}
                  hyphenationCallback={(word) => [word]}
                >
                  Pago anticipado requerido.
                  {includeTransferInfo
                    ? "\nFavor de enviar su comprobante de transferencia para confirmar su pedido."
                    : ""}
                </Text>
                <Text style={[styles.footerValue, { marginTop: 4 }]}>
                  Garantía por defecto de fábrica
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default CotizacionPdf;
