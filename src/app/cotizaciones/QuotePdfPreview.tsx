"use client";

import { pdf } from "@react-pdf/renderer";
import { useCallback, useEffect, useRef, useState } from "react";
import CotizacionPdf, {
  QuoteDetailLevel,
  QuotePdfDelivery,
  QuotePdfLine,
} from "./pdf/CotizacionPdf";
import { MANUAL_PRODUCT_IMAGE } from "./pdf/manualProductImage";
import styles from "./generar.module.css";

function withManualPlaceholder(products: QuotePdfLine[]): QuotePdfLine[] {
  return products.map((product) => {
    if (product.manual !== true) return product;
    const value = Array.isArray(product.imageUrl)
      ? product.imageUrl[0]
      : product.imageUrl;
    const url = typeof value === "string" ? value.trim() : "";
    const missing =
      !url ||
      url.includes("producto-sin-foto") ||
      url.includes("imagen-no-encontrada");
    if (!missing) return product;
    return { ...product, imageUrl: MANUAL_PRODUCT_IMAGE };
  });
}

type Props = {
  hasLines: boolean;
  detailLevel: QuoteDetailLevel;
  onDetailLevel: (level: QuoteDetailLevel) => void;
  loadLines: () => Promise<QuotePdfLine[]>;
  userName: string;
  userPhone: string;
  includeAssembly: boolean;
  assemblyPrice: number;
  includeTransfer: boolean;
  comments: string;
  equipmentCount: number;
  deliveries: QuotePdfDelivery[];
};

export default function QuotePdfPreview({
  hasLines,
  detailLevel,
  onDetailLevel,
  loadLines,
  userName,
  userPhone,
  includeAssembly,
  assemblyPrice,
  includeTransfer,
  comments,
  equipmentCount,
  deliveries,
}: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<"empty" | "loading" | "ready" | "error">(
    "empty",
  );
  const urlRef = useRef<string | null>(null);
  const runningRef = useRef(false);

  const replaceUrl = useCallback((nextUrl: string | null) => {
    if (urlRef.current && urlRef.current !== nextUrl) {
      URL.revokeObjectURL(urlRef.current);
    }
    urlRef.current = nextUrl;
    setUrl(nextUrl);
  }, []);

  useEffect(() => {
    if (hasLines) return;
    setPhase("empty");
    replaceUrl(null);
  }, [hasLines, replaceUrl]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const renderBlob = (products: QuotePdfLine[]) =>
    pdf(
      <CotizacionPdf
        noCotizacion="Vista previa"
        products={products}
        userName={userName}
        userPhone={userPhone}
        includeAssemblyService={includeAssembly}
        assemblyPrice={assemblyPrice}
        includeTransferInfo={includeTransfer}
        comments={comments}
        equipmentCount={equipmentCount}
        deliveries={deliveries}
        detailLevel={detailLevel}
      />,
    ).toBlob();

  const generatePreview = async () => {
    if (!hasLines || runningRef.current) return;
    runningRef.current = true;
    setPhase("loading");
    try {
      const products = withManualPlaceholder(await loadLines());
      if (products.length === 0) {
        setPhase("empty");
        replaceUrl(null);
        return;
      }
      const blob = await renderBlob(products);
      replaceUrl(URL.createObjectURL(blob));
      setPhase("ready");
    } catch {
      setPhase("error");
    } finally {
      runningRef.current = false;
    }
  };

  return (
    <aside className={styles.preview} data-testid="quote-pdf-preview">
      <div className={styles.previewHead}>
        <div>
          <strong>Vista previa</strong>
          <p>Pulsa el botón para ver el PDF con lo que llevas ahora. El folio se asigna al generarla.</p>
        </div>
        <div className={styles.previewActions}>
          <div className={styles.previewSwitch} role="group" aria-label="Tipo de vista previa">
            <button
              type="button"
              className={
                detailLevel === "full" ? styles.previewSwitchOn : styles.previewSwitchOff
              }
              aria-pressed={detailLevel === "full"}
              onClick={() => onDetailLevel("full")}
              data-testid="quote-preview-full"
            >
              Datos completos
            </button>
            <button
              type="button"
              className={
                detailLevel === "hidden"
                  ? styles.previewSwitchOn
                  : styles.previewSwitchOff
              }
              aria-pressed={detailLevel === "hidden"}
              onClick={() => onDetailLevel("hidden")}
              data-testid="quote-preview-hidden"
            >
              Ocultar datos
            </button>
          </div>
          <button
            type="button"
            className={styles.previewButton}
            disabled={!hasLines || phase === "loading"}
            onClick={() => void generatePreview()}
            data-testid="quote-preview-generate"
          >
            {phase === "loading" ? "Generando vista previa…" : "Generar vista previa"}
          </button>
        </div>
      </div>
      <div className={styles.previewStage}>
        {phase === "error" && url ? (
          <span className={styles.previewStatus}>
            No se pudo actualizar la vista previa.
          </span>
        ) : null}
        {url ? (
          <iframe
            title="Vista previa de la cotización"
            src={url}
            className={styles.previewFrame}
          />
        ) : (
          <div className={styles.previewEmpty}>
            {phase === "error"
              ? "No se pudo mostrar la vista previa."
              : hasLines
                ? "Pulsa Generar vista previa para ver el PDF."
                : "Agrega un producto para poder ver el PDF."}
          </div>
        )}
      </div>
    </aside>
  );
}
