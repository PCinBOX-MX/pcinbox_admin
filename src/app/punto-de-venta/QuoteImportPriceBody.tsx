"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "./posFormat";
import styles from "./quoteImportPrice.module.css";

export type QuotePriceChoice = "quote" | "current";

export type QuoteImportPriceItem = {
  idProduct: number;
  name: string;
  quantity: number;
  /** Precio actual de catálogo. */
  price: number;
  /** Precio unitario guardado en la cotización; null en legacy. */
  quoteUnitPrice: number | null;
};

type ChoicesMap = Record<number, QuotePriceChoice>;

function buildDefaultChoices(items: QuoteImportPriceItem[]): ChoicesMap {
  const next: ChoicesMap = {};
  for (const item of items) {
    next[item.idProduct] =
      item.quoteUnitPrice != null && Number.isFinite(item.quoteUnitPrice)
        ? "quote"
        : "current";
  }
  return next;
}

export function QuoteImportPriceBody({
  items,
  onChoicesChange,
}: {
  items: QuoteImportPriceItem[];
  onChoicesChange: (choices: ChoicesMap) => void;
}) {
  const [choices, setChoices] = useState<ChoicesMap>(() =>
    buildDefaultChoices(items),
  );

  const hasAnyQuotePrice = useMemo(
    () =>
      items.some(
        (it) => it.quoteUnitPrice != null && Number.isFinite(it.quoteUnitPrice),
      ),
    [items],
  );

  const differCount = useMemo(
    () =>
      items.filter((it) => {
        if (it.quoteUnitPrice == null || !Number.isFinite(it.quoteUnitPrice)) {
          return false;
        }
        return Math.abs(Number(it.quoteUnitPrice) - Number(it.price)) > 0.009;
      }).length,
    [items],
  );

  const bulkSelection = useMemo((): QuotePriceChoice | "mixed" | null => {
    if (!items.length) return null;
    let sawQuote = false;
    let sawCurrent = false;
    for (const item of items) {
      const choice = choices[item.idProduct] || "current";
      if (choice === "quote") sawQuote = true;
      else sawCurrent = true;
    }
    if (sawQuote && sawCurrent) return "mixed";
    if (sawQuote) return "quote";
    if (sawCurrent) return "current";
    return null;
  }, [choices, items]);

  useEffect(() => {
    onChoicesChange(choices);
  }, [choices, onChoicesChange]);

  const setAll = (value: QuotePriceChoice) => {
    setChoices((prev) => {
      const next: ChoicesMap = { ...prev };
      for (const item of items) {
        if (value === "quote") {
          if (
            item.quoteUnitPrice != null &&
            Number.isFinite(item.quoteUnitPrice)
          ) {
            next[item.idProduct] = "quote";
          } else {
            next[item.idProduct] = "current";
          }
        } else {
          next[item.idProduct] = "current";
        }
      }
      return next;
    });
  };

  const setOne = (productId: number, value: QuotePriceChoice) => {
    setChoices((prev) => ({ ...prev, [productId]: value }));
  };

  return (
    <div className={styles.root}>
      <p className={styles.lead}>
        Elige el precio con el que cada producto entra al carrito. Puedes
        aplicar uno a todos o decidir producto por producto.
      </p>

      <div className={styles.summaryRow}>
        <span className={styles.summaryChip}>
          {items.length} producto{items.length === 1 ? "" : "s"}
        </span>
        {differCount > 0 ? (
          <span className={`${styles.summaryChip} ${styles.summaryChipWarn}`}>
            {differCount} con precio distinto
          </span>
        ) : hasAnyQuotePrice ? (
          <span className={`${styles.summaryChip} ${styles.summaryChipOk}`}>
            Precios iguales al inventario
          </span>
        ) : null}
      </div>

      {!hasAnyQuotePrice ? (
        <div className={styles.banner} role="status">
          Esta cotización no tiene precios unitarios guardados. Solo se pueden
          aplicar los precios actuales del inventario.
        </div>
      ) : null}

      <div className={styles.bulkBar} role="group" aria-label="Aplicar a todos">
        <button
          type="button"
          disabled={!hasAnyQuotePrice}
          aria-pressed={bulkSelection === "quote"}
          onClick={() => setAll("quote")}
          className={`${styles.bulkBtn} ${styles.bulkBtnQuote} ${
            bulkSelection === "quote" ? styles.bulkBtnSelected : ""
          }`}
        >
          Todos cotización
        </button>
        <button
          type="button"
          aria-pressed={bulkSelection === "current"}
          onClick={() => setAll("current")}
          className={`${styles.bulkBtn} ${styles.bulkBtnCurrent} ${
            bulkSelection === "current" ? styles.bulkBtnSelected : ""
          }`}
        >
          Todos actuales
        </button>
      </div>

      <div className={styles.list}>
        {items.map((item) => {
          const hasQuote =
            item.quoteUnitPrice != null &&
            Number.isFinite(item.quoteUnitPrice);
          const choice = choices[item.idProduct] || "current";
          const differs =
            hasQuote &&
            Math.abs(Number(item.quoteUnitPrice) - Number(item.price)) > 0.009;
          const quoteLabel = hasQuote
            ? formatMoney(Number(item.quoteUnitPrice))
            : "Sin precio";
          const currentLabel = formatMoney(Number(item.price) || 0);

          return (
            <article key={item.idProduct} className={styles.card}>
              <header className={styles.cardHead}>
                <h3 className={styles.cardTitle}>{item.name}</h3>
                <div className={styles.cardMeta}>
                  <span className={styles.qtyBadge}>Cant. {item.quantity}</span>
                  {differs ? (
                    <span className={styles.diffBadge}>Precios distintos</span>
                  ) : null}
                </div>
              </header>

              <div className={styles.optionGrid}>
                <button
                  type="button"
                  disabled={!hasQuote}
                  aria-pressed={choice === "quote"}
                  onClick={() => hasQuote && setOne(item.idProduct, "quote")}
                  className={`${styles.option} ${
                    choice === "quote" ? styles.optionSelected : ""
                  } ${!hasQuote ? styles.optionDisabled : ""}`}
                >
                  <span className={styles.optionLabel}>Cotización</span>
                  <span className={styles.optionPrice}>{quoteLabel}</span>
                  <span className={styles.optionHint}>
                    {hasQuote ? "Precio guardado" : "No disponible"}
                  </span>
                </button>

                <button
                  type="button"
                  aria-pressed={choice === "current"}
                  onClick={() => setOne(item.idProduct, "current")}
                  className={`${styles.option} ${
                    choice === "current" ? styles.optionSelected : ""
                  }`}
                >
                  <span className={styles.optionLabel}>Actual</span>
                  <span className={styles.optionPrice}>{currentLabel}</span>
                  <span className={styles.optionHint}>Inventario hoy</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function defaultQuotePriceChoices(
  items: QuoteImportPriceItem[],
): ChoicesMap {
  return buildDefaultChoices(items);
}
