"use client";

import { useEffect, useState } from "react";
import type { PosCostSummary as PosCostSummaryData } from "../interfaces/pos/pos.interface";
import PosCostSummary from "../punto-de-venta/PosCostSummary";
import UtilsService from "../services/utils";
import styles from "./quoteCost.module.css";
import { buildQuoteCostSummary, type QuoteCostLine } from "./quoteCostMath";

export default function QuoteCostPanel({
  summary,
  missingCount = 0,
  equipmentCount = 1,
  message,
  compact = false,
}: {
  summary: PosCostSummaryData | null;
  missingCount?: number;
  equipmentCount?: number;
  message?: string;
  compact?: boolean;
}) {
  const equipos = Math.min(999, Math.max(1, Math.round(equipmentCount) || 1));
  const hasFigures = Boolean(summary) || missingCount > 0;

  return (
    <div className={styles.panel}>
      {hasFigures ? (
        <PosCostSummary
          summary={summary}
          missingCount={missingCount}
          compact={compact}
        />
      ) : (
        <p className={styles.note}>
          {message || "No hay costo de proveedor para mostrar."}
        </p>
      )}
      {summary ? (
        <p className={styles.note}>
          {equipos > 1
            ? `Incluye los ${equipos} equipos. No se imprime en el PDF.`
            : "No se imprime en el PDF."}
        </p>
      ) : null}
    </div>
  );
}

export function QuoteLiveCost({
  loadLines,
  revision,
  equipmentCount,
}: {
  loadLines: () => Promise<QuoteCostLine[]>;
  revision: string;
  equipmentCount: number;
}) {
  const { requestGet } = UtilsService();
  const [summary, setSummary] = useState<PosCostSummaryData | null>(null);
  const [missingCount, setMissingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Evita mostrar cifras de un carrito anterior mientras corre el debounce/fetch.
    setSummary(null);
    setMissingCount(0);

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const lines = await loadLines();
          if (cancelled) return;
          const catalog = lines.filter((line) => line.manual !== true);
          if (catalog.length === 0) {
            setSummary(null);
            setMissingCount(0);
            return;
          }
          const ids = [
            ...new Set(
              catalog
                .map((line) => Number(line.idProduct))
                .filter((id) => Number.isSafeInteger(id) && id > 0),
            ),
          ].slice(0, 200);
          if (ids.length === 0) {
            setSummary(null);
            setMissingCount(0);
            return;
          }
          const response = await requestGet(
            `/pos/products/costs?ids=${ids.join(",")}`,
            { silent: true },
          );
          if (cancelled) return;
          const body = response?.data as {
            data?: Array<{ productId: number; costUnit: number }>;
            missingProductIds?: number[];
          };
          const costs = new Map<number, number>();
          for (const row of body?.data || []) {
            costs.set(Number(row.productId), Number(row.costUnit) || 0);
          }
          const missingIds = new Set(
            (body?.missingProductIds || []).map((id) => Number(id)),
          );
          const built = buildQuoteCostSummary(
            catalog,
            costs,
            missingIds,
            equipmentCount,
          );
          if (cancelled) return;
          setSummary(built.summary);
          setMissingCount(built.missingCount);
        } catch {
          if (cancelled) return;
          setSummary(null);
          setMissingCount(0);
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [equipmentCount, loadLines, requestGet, revision]);

  if (!summary && missingCount === 0) return null;

  return (
    <QuoteCostPanel
      summary={summary}
      missingCount={missingCount}
      equipmentCount={equipmentCount}
    />
  );
}
