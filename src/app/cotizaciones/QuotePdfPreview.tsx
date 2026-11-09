"use client";

import { pdf } from "@react-pdf/renderer";
import { useCallback, useEffect, useRef, useState } from "react";
import CotizacionPdf, {
  QuoteDetailLevel,
  QuotePdfLine,
} from "./pdf/CotizacionPdf";
import styles from "./generar.module.css";

type Props = {
  hasLines: boolean;
  detailLevel: QuoteDetailLevel;
  onDetailLevel: (level: QuoteDetailLevel) => void;
  loadLines: () => Promise<QuotePdfLine[]>;
  userName: string;
  userPhone: string;
  includeAssembly: boolean;
  includeTransfer: boolean;
};

export default function QuotePdfPreview({
  hasLines,
  detailLevel,
  onDetailLevel,
  loadLines,
  userName,
  userPhone,
  includeAssembly,
  includeTransfer,
}: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<"empty" | "loading" | "ready" | "error">(
    "empty",
  );
  const urlRef = useRef<string | null>(null);
  const workerRef = useRef<Worker | null | undefined>(undefined);
  const jobIdRef = useRef(0);
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
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    [],
  );

  const renderBlob = async (products: QuotePdfLine[]) => {
    const snapshot = {
      detailLevel,
      userName,
      userPhone,
      includeAssembly,
      includeTransfer,
      products,
    };
    if (workerRef.current === undefined) {
      try {
        workerRef.current = new Worker(
          new URL("./pdfPreview.worker.tsx", import.meta.url),
        );
      } catch {
        workerRef.current = null;
      }
    }
    const worker = workerRef.current;
    if (!worker) {
      return pdf(
        <CotizacionPdf
          noCotizacion="Vista previa"
          products={snapshot.products}
          userName={snapshot.userName}
          userPhone={snapshot.userPhone}
          includeAssemblyService={snapshot.includeAssembly}
          includeTransferInfo={snapshot.includeTransfer}
          detailLevel={snapshot.detailLevel}
        />,
      ).toBlob();
    }
    const id = ++jobIdRef.current;
    return new Promise<Blob>((resolve, reject) => {
      const onMessage = (
        event: MessageEvent<{ id: number; blob?: Blob; error?: string }>,
      ) => {
        if (event.data?.id !== id) return;
        worker.removeEventListener("message", onMessage);
        if (event.data.blob) resolve(event.data.blob);
        else reject(new Error(event.data.error || "preview"));
      };
      worker.addEventListener("message", onMessage);
      worker.onerror = () => {
        worker.removeEventListener("message", onMessage);
        workerRef.current = null;
        worker.terminate();
        reject(new Error("worker"));
      };
      worker.postMessage({ id, ...snapshot });
    });
  };

  const generatePreview = async () => {
    if (!hasLines || runningRef.current) return;
    runningRef.current = true;
    setPhase("loading");
    try {
      const products = await loadLines();
      if (products.length === 0) {
        setPhase("empty");
        replaceUrl(null);
        return;
      }
      let blob: Blob;
      try {
        blob = await renderBlob(products);
      } catch (error) {
        if (!(error instanceof Error) || error.message !== "worker") throw error;
        blob = await pdf(
          <CotizacionPdf
            noCotizacion="Vista previa"
            products={products}
            userName={userName}
            userPhone={userPhone}
            includeAssemblyService={includeAssembly}
            includeTransferInfo={includeTransfer}
            detailLevel={detailLevel}
          />,
        ).toBlob();
      }
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
