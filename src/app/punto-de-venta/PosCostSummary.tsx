"use client";

import { Coins, PiggyBank, Receipt } from "lucide-react";
import type { PosCostSummary as PosCostSummaryData } from "../interfaces/pos/pos.interface";
import { formatMoney } from "./posFormat";
import styles from "./posCostSummary.module.css";

/**
 * Resumen interno (TechSmart / DicoTech): inversión, margen y costo total.
 * Solo UI de caja/historial; nunca en ticket ni en la hoja de garantía.
 */
export default function PosCostSummary({
  summary,
  missingCount = 0,
  compact = false,
}: {
  summary: PosCostSummaryData | null | undefined;
  /** Líneas de proveedores 2/3 sin costo registrado. */
  missingCount?: number;
  compact?: boolean;
}) {
  if (!summary && missingCount === 0) return null;

  const marginPct =
    summary && summary.investment > 0
      ? (summary.profitMargin / summary.investment) * 100
      : null;

  return (
    <section
      className={`${styles.root} ${compact ? styles.compact : ""}`}
      aria-label="Inversión y margen (uso interno)"
    >
      <header className={styles.head}>
        <span className={styles.title}>Inversión TechSmart / DicoTech</span>
        <span className={styles.internal}>Uso interno</span>
      </header>

      {summary ? (
        <div className={styles.grid}>
          <div className={`${styles.chip} ${styles.chipInvest}`}>
            <span className={styles.chipLabel}>
              <Coins size={13} aria-hidden /> Costo de inversión
            </span>
            <strong
              className={styles.chipValue}
              title="Aproximado: precio de proveedor + 16% IVA"
            >
              ≈ {formatMoney(summary.investment)}
            </strong>
            <span className={styles.chipHint}>
              Aproximado · precio proveedor + IVA
            </span>
          </div>
          <div
            className={`${styles.chip} ${
              summary.profitMargin < 0 ? styles.chipLoss : styles.chipMargin
            }`}
          >
            <span className={styles.chipLabel}>
              <PiggyBank size={13} aria-hidden />{" "}
              {summary.profitMargin < 0 ? "Pérdida" : "Margen de ganancia"}
            </span>
            <strong
              className={styles.chipValue}
              title="Aproximado: lo cobrado − 3% de comisión − costo de inversión"
            >
              ≈ {formatMoney(summary.profitMargin)}
            </strong>
            <span className={styles.chipHint}>
              Cobrado − 3% comisión − inversión
              {marginPct != null
                ? ` · ${marginPct.toFixed(1)}% sobre inversión`
                : ""}
            </span>
          </div>
          <div className={`${styles.chip} ${styles.chipTotal}`}>
            <span className={styles.chipLabel}>
              <Receipt size={13} aria-hidden /> Costo total
            </span>
            <strong className={styles.chipValue}>
              {formatMoney(summary.totalCost)}
            </strong>
            <span className={styles.chipHint}>Precio cobrado</span>
          </div>
        </div>
      ) : null}

      <p className={styles.foot}>
        {summary
          ? `${summary.lines} línea(s) · ${summary.units} ud(s.) de proveedor`
          : null}
        {summary && missingCount > 0 ? " · " : null}
        {missingCount > 0
          ? `${missingCount} sin costo registrado`
          : null}
      </p>
    </section>
  );
}
