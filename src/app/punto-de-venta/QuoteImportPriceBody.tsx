"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CatalogWarrantyFields from "../shared/components/especific/CatalogWarrantyFields";
import { validateCatalogWarranty } from "../shared/utils/catalogWarranty";
import { formatMoney } from "./posFormat";
import {
  UNAVAILABLE_WARRANTY_OPTS,
  defaultUnavailableState,
  unavailableHasCurrentPrice,
  unavailableHasQuotePrice,
  unavailableNeedsWarranty,
  type QuoteUnavailableItem,
  type QuoteUnavailableRowState,
  type QuoteUnavailableState,
} from "./quoteUnavailable";
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

export type QuoteImportPriceState = {
  choices: ChoicesMap;
  unavailable: QuoteUnavailableState;
};

const FALLBACK_IMG =
  "https://ik.imagekit.io/pcinboxkit/logos/logo.png?updatedAt=1759534318587";

type PriceDelta = {
  /** actual − cotización, por unidad. */
  unit: number;
  /** unit × cantidad. */
  total: number;
  /** % respecto al precio cotizado; null si la cotización es 0. */
  pct: number | null;
};

function priceDelta(item: QuoteImportPriceItem): PriceDelta | null {
  if (item.quoteUnitPrice == null || !Number.isFinite(item.quoteUnitPrice)) {
    return null;
  }
  const quote = Number(item.quoteUnitPrice);
  const unit = Math.round((Number(item.price) - quote) * 100) / 100;
  if (Math.abs(unit) <= 0.009) return null;
  return {
    unit,
    total: Math.round(unit * item.quantity * 100) / 100,
    pct: quote > 0 ? (unit / quote) * 100 : null,
  };
}

/** Solo compara cuando existen ambos precios (un inactivo puede no tener precio actual). */
function unavailableAsPriceItem(
  item: QuoteUnavailableItem,
): QuoteImportPriceItem | null {
  if (!unavailableHasQuotePrice(item) || !unavailableHasCurrentPrice(item)) {
    return null;
  }
  return {
    idProduct: item.idProduct,
    name: item.name,
    quantity: item.quantity,
    price: item.catalogPrice,
    quoteUnitPrice: item.quoteUnitPrice,
  };
}

function formatPct(pct: number | null): string {
  if (pct == null) return "";
  const abs = Math.abs(pct);
  return ` (${abs < 10 ? abs.toFixed(1) : Math.round(abs)}%)`;
}

function DeltaWidget({ delta, quantity }: { delta: PriceDelta; quantity: number }) {
  const up = delta.unit > 0;
  return (
    <div
      className={`${styles.delta} ${up ? styles.deltaUp : styles.deltaDown}`}
      role="status"
    >
      <span className={styles.deltaArrow} aria-hidden>
        {up ? "▲" : "▼"}
      </span>
      <span className={styles.deltaText}>
        <strong>
          {up ? "Subió" : "Bajó"} {formatMoney(Math.abs(delta.unit))}
          {formatPct(delta.pct)}
        </strong>
        <span>
          {quantity > 1
            ? `por unidad · ${formatMoney(Math.abs(delta.total))} en total (${quantity} uds.)`
            : "vs. precio cotizado"}
        </span>
      </span>
    </div>
  );
}

function PriceOptions({
  quotePrice,
  currentPrice,
  choice,
  onChoose,
}: {
  quotePrice: number | null;
  currentPrice: number | null;
  choice: QuotePriceChoice;
  onChoose: (value: QuotePriceChoice) => void;
}) {
  const hasQuote = quotePrice != null;
  const hasCurrent = currentPrice != null;
  return (
    <div className={styles.optionGrid}>
      <button
        type="button"
        disabled={!hasQuote}
        aria-pressed={choice === "quote"}
        onClick={() => hasQuote && onChoose("quote")}
        className={`${styles.option} ${
          choice === "quote" ? styles.optionSelected : ""
        } ${!hasQuote ? styles.optionDisabled : ""}`}
      >
        <span className={styles.optionLabel}>Cotización</span>
        <span className={styles.optionPrice}>
          {hasQuote ? formatMoney(quotePrice) : "Sin precio"}
        </span>
        <span className={styles.optionHint}>
          {hasQuote ? "Precio guardado" : "No disponible"}
        </span>
      </button>

      <button
        type="button"
        disabled={!hasCurrent}
        aria-pressed={choice === "current"}
        onClick={() => hasCurrent && onChoose("current")}
        className={`${styles.option} ${
          choice === "current" ? styles.optionSelected : ""
        } ${!hasCurrent ? styles.optionDisabled : ""}`}
      >
        <span className={styles.optionLabel}>Actual</span>
        <span className={styles.optionPrice}>
          {hasCurrent ? formatMoney(currentPrice) : "Sin precio"}
        </span>
        <span className={styles.optionHint}>
          {hasCurrent ? "Inventario hoy" : "No disponible"}
        </span>
      </button>
    </div>
  );
}

function reasonLabel(item: QuoteUnavailableItem): string {
  if (item.reason === "inactive") return "Inactivo";
  return item.reasonDetail || "Sin stock";
}

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
  unavailable = [],
  errors = [],
  onChange,
}: {
  items: QuoteImportPriceItem[];
  /** Inactivos o sin stock: solo entran si el admin los activa. */
  unavailable?: QuoteUnavailableItem[];
  /** Errores al confirmar (p. ej. falta garantía); resalta las tarjetas afectadas. */
  errors?: string[];
  onChange: (state: QuoteImportPriceState) => void;
}) {
  const [choices, setChoices] = useState<ChoicesMap>(() =>
    buildDefaultChoices(items),
  );
  const [rows, setRows] = useState<QuoteUnavailableState>(() =>
    defaultUnavailableState(unavailable),
  );

  const selectedUnavailable = useMemo(
    () => unavailable.filter((it) => rows[it.key]?.selected),
    [rows, unavailable],
  );

  const hasAnyQuotePrice = useMemo(
    () =>
      items.some(
        (it) => it.quoteUnitPrice != null && Number.isFinite(it.quoteUnitPrice),
      ) || unavailable.some(unavailableHasQuotePrice),
    [items, unavailable],
  );

  const deltaSummary = useMemo(() => {
    let upCount = 0;
    let downCount = 0;
    let upTotal = 0;
    let downTotal = 0;
    let quoteTotal = 0;
    let currentTotal = 0;
    const compared: QuoteImportPriceItem[] = [
      ...items,
      ...selectedUnavailable
        .map(unavailableAsPriceItem)
        .filter((it): it is QuoteImportPriceItem => it != null),
    ];
    for (const it of compared) {
      const delta = priceDelta(it);
      if (it.quoteUnitPrice != null && Number.isFinite(it.quoteUnitPrice)) {
        quoteTotal += Number(it.quoteUnitPrice) * it.quantity;
        currentTotal += Number(it.price) * it.quantity;
      }
      if (!delta) continue;
      if (delta.unit > 0) {
        upCount += 1;
        upTotal += delta.total;
      } else {
        downCount += 1;
        downTotal += Math.abs(delta.total);
      }
    }
    const round = (n: number) => Math.round(n * 100) / 100;
    return {
      upCount,
      downCount,
      upTotal: round(upTotal),
      downTotal: round(downTotal),
      net: round(upTotal - downTotal),
      quoteTotal: round(quoteTotal),
      currentTotal: round(currentTotal),
    };
  }, [items, selectedUnavailable]);
  const differCount = deltaSummary.upCount + deltaSummary.downCount;

  const bulkSelection = useMemo((): QuotePriceChoice | "mixed" | null => {
    let sawQuote = false;
    let sawCurrent = false;
    for (const item of items) {
      if ((choices[item.idProduct] || "current") === "quote") sawQuote = true;
      else sawCurrent = true;
    }
    for (const item of selectedUnavailable) {
      if (rows[item.key]?.choice === "quote") sawQuote = true;
      else sawCurrent = true;
    }
    if (sawQuote && sawCurrent) return "mixed";
    if (sawQuote) return "quote";
    if (sawCurrent) return "current";
    return null;
  }, [choices, items, rows, selectedUnavailable]);

  useEffect(() => {
    onChange({ choices, unavailable: rows });
  }, [choices, rows, onChange]);

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!errors.length) return;
    const root = rootRef.current;
    const target =
      root?.querySelector('[data-invalid="true"]') ??
      root?.querySelector('[role="alert"]');
    if (!root || !target) return;
    // Solo el contenedor del modal: scrollIntoView también movería la página de fondo.
    let scroller: HTMLElement | null = root.parentElement;
    while (scroller) {
      const { overflowY } = getComputedStyle(scroller);
      if (
        /(auto|scroll)/.test(overflowY) &&
        scroller.scrollHeight > scroller.clientHeight
      ) {
        break;
      }
      scroller = scroller.parentElement;
    }
    if (!scroller) return;
    const delta =
      target.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top -
      scroller.clientHeight / 3;
    scroller.scrollBy({ top: delta, behavior: "smooth" });
  }, [errors]);

  const setAll = (value: QuotePriceChoice) => {
    setChoices((prev) => {
      const next: ChoicesMap = { ...prev };
      for (const item of items) {
        next[item.idProduct] =
          value === "quote" &&
          item.quoteUnitPrice != null &&
          Number.isFinite(item.quoteUnitPrice)
            ? "quote"
            : "current";
      }
      return next;
    });
    setRows((prev) => {
      const next: QuoteUnavailableState = { ...prev };
      for (const item of unavailable) {
        const row = next[item.key];
        if (!row) continue;
        const canQuote = unavailableHasQuotePrice(item);
        const canCurrent = unavailableHasCurrentPrice(item);
        const choice =
          value === "quote"
            ? canQuote
              ? "quote"
              : "current"
            : canCurrent
              ? "current"
              : "quote";
        next[item.key] = { ...row, choice };
      }
      return next;
    });
  };

  const setOne = (productId: number, value: QuotePriceChoice) => {
    setChoices((prev) => ({ ...prev, [productId]: value }));
  };

  const patchRow = (key: string, patch: Partial<QuoteUnavailableRowState>) => {
    setRows((prev) =>
      prev[key] ? { ...prev, [key]: { ...prev[key], ...patch } } : prev,
    );
  };

  const showErrors = errors.length > 0;

  return (
    <div ref={rootRef} className={styles.root}>
      <p className={styles.lead}>
        Elige el precio con el que cada producto entra al carrito. Puedes
        aplicar uno a todos o decidir producto por producto.
        {unavailable.length > 0
          ? " Los inactivos o sin stock no entran, salvo que actives «Agregar de todos modos»."
          : ""}
      </p>

      <div className={styles.summaryRow}>
        {items.length > 0 ? (
          <span className={styles.summaryChip}>
            {items.length} disponible{items.length === 1 ? "" : "s"}
          </span>
        ) : null}
        {unavailable.length > 0 ? (
          <span className={`${styles.summaryChip} ${styles.summaryChipMuted}`}>
            {unavailable.length} no disponible
            {unavailable.length === 1 ? "" : "s"}
            {selectedUnavailable.length > 0
              ? ` · ${selectedUnavailable.length} se agrega${
                  selectedUnavailable.length === 1 ? "" : "n"
                }`
              : ""}
          </span>
        ) : null}
        {differCount > 0 ? (
          <span className={`${styles.summaryChip} ${styles.summaryChipWarn}`}>
            {differCount} con precio distinto
          </span>
        ) : hasAnyQuotePrice && items.length > 0 ? (
          <span className={`${styles.summaryChip} ${styles.summaryChipOk}`}>
            Precios iguales al inventario
          </span>
        ) : null}
      </div>

      {differCount > 0 ? (
        <section
          className={styles.deltaSummary}
          aria-label="Diferencia de precios contra la cotización"
        >
          <div className={`${styles.deltaStat} ${styles.deltaStatUp}`}>
            <span className={styles.deltaStatLabel}>
              ▲ Subieron ({deltaSummary.upCount})
            </span>
            <span className={styles.deltaStatValue}>
              +{formatMoney(deltaSummary.upTotal)}
            </span>
          </div>
          <div className={`${styles.deltaStat} ${styles.deltaStatDown}`}>
            <span className={styles.deltaStatLabel}>
              ▼ Bajaron ({deltaSummary.downCount})
            </span>
            <span className={styles.deltaStatValue}>
              −{formatMoney(deltaSummary.downTotal)}
            </span>
          </div>
          <div
            className={`${styles.deltaStat} ${
              deltaSummary.net > 0
                ? styles.deltaStatUp
                : deltaSummary.net < 0
                  ? styles.deltaStatDown
                  : ""
            }`}
          >
            <span className={styles.deltaStatLabel}>Diferencia neta</span>
            <span className={styles.deltaStatValue}>
              {deltaSummary.net > 0 ? "+" : deltaSummary.net < 0 ? "−" : ""}
              {formatMoney(Math.abs(deltaSummary.net))}
            </span>
          </div>
          <p className={styles.deltaSummaryFoot}>
            Total cotización {formatMoney(deltaSummary.quoteTotal)} → total
            actual {formatMoney(deltaSummary.currentTotal)} (incluye cantidades
            {selectedUnavailable.length > 0 ? " y los no disponibles activados" : ""})
          </p>
        </section>
      ) : null}

      {!hasAnyQuotePrice ? (
        <div className={styles.banner} role="status">
          Esta cotización no tiene precios unitarios guardados. Solo se pueden
          aplicar los precios actuales del inventario.
        </div>
      ) : null}

      {showErrors ? (
        <div className={`${styles.banner} ${styles.bannerError}`} role="alert">
          {errors.map((err) => (
            <div key={err}>{err}</div>
          ))}
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
        {items.length > 0 && unavailable.length > 0 ? (
          <h3 className={styles.sectionTitle}>
            Disponibles <span className={styles.sectionCount}>{items.length}</span>
          </h3>
        ) : null}
        {items.map((item) => {
          const hasQuote =
            item.quoteUnitPrice != null &&
            Number.isFinite(item.quoteUnitPrice);
          const choice = choices[item.idProduct] || "current";
          const delta = priceDelta(item);

          return (
            <article key={item.idProduct} className={styles.card}>
              <header className={styles.cardHead}>
                <h3 className={styles.cardTitle}>{item.name}</h3>
                <div className={styles.cardMeta}>
                  <span className={styles.qtyBadge}>Cant. {item.quantity}</span>
                </div>
                {delta ? (
                  <DeltaWidget delta={delta} quantity={item.quantity} />
                ) : null}
              </header>

              <PriceOptions
                quotePrice={hasQuote ? Number(item.quoteUnitPrice) : null}
                currentPrice={Number(item.price) || 0}
                choice={choice}
                onChoose={(value) => setOne(item.idProduct, value)}
              />
            </article>
          );
        })}

        {unavailable.length > 0 ? (
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>
              No disponibles{" "}
              <span className={`${styles.sectionCount} ${styles.sectionCountWarn}`}>
                {unavailable.length}
              </span>
            </h3>
            <p className={styles.sectionHint}>
              Inactivos o sin stock en la bodega. Si activas «Agregar de todos
              modos», entran como captura manual con el precio que elijas y no
              descuentan inventario.
            </p>
          </div>
        ) : null}
        {unavailable.map((item) => {
          const row = rows[item.key];
          if (!row) return null;
          const selected = row.selected;
          const quotePrice = unavailableHasQuotePrice(item)
            ? Number(item.quoteUnitPrice)
            : null;
          const currentPrice = unavailableHasCurrentPrice(item)
            ? item.catalogPrice
            : null;
          const comparable = unavailableAsPriceItem(item);
          const delta = comparable ? priceDelta(comparable) : null;
          const needsWarranty = unavailableNeedsWarranty(item);
          const warrantyInvalid =
            showErrors &&
            selected &&
            needsWarranty &&
            validateCatalogWarranty(row.warranty, UNAVAILABLE_WARRANTY_OPTS) != null;
          const noPrice = quotePrice == null && currentPrice == null;

          return (
            <article
              key={item.key}
              className={`${styles.card} ${styles.cardUnavailable} ${
                selected ? styles.cardUnavailableOn : ""
              }`}
            >
              <header className={styles.unavHead}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.thumb}
                  src={item.imageUrl || FALLBACK_IMG}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    if (e.currentTarget.src !== FALLBACK_IMG) {
                      e.currentTarget.src = FALLBACK_IMG;
                    }
                  }}
                />
                <div className={styles.unavInfo}>
                  <h3 className={styles.cardTitle}>{item.name}</h3>
                  <div className={styles.cardMeta}>
                    <span
                      className={`${styles.reasonBadge} ${
                        item.reason === "inactive"
                          ? styles.reasonInactive
                          : styles.reasonNoStock
                      }`}
                    >
                      {reasonLabel(item)}
                    </span>
                    <span className={styles.qtyBadge}>Cant. {item.quantity}</span>
                    {item.sku ? (
                      <span className={styles.qtyBadge}>SKU {item.sku}</span>
                    ) : null}
                  </div>
                  {!selected ? (
                    <div className={styles.pricePeek}>
                      <span>
                        Cotización{" "}
                        <strong>
                          {quotePrice != null ? formatMoney(quotePrice) : "—"}
                        </strong>
                      </span>
                      <span>
                        Actual{" "}
                        <strong>
                          {currentPrice != null ? formatMoney(currentPrice) : "—"}
                        </strong>
                      </span>
                    </div>
                  ) : null}
                </div>
              </header>

              <label
                className={`${styles.switchRow} ${
                  selected ? styles.switchRowOn : ""
                } ${noPrice ? styles.switchRowDisabled : ""}`}
              >
                <span className={styles.switchText}>
                  Agregar de todos modos
                  <small>
                    {noPrice
                      ? "Sin precio de cotización ni de catálogo"
                      : selected
                        ? "Entra como captura manual"
                        : "No se agregará al carrito"}
                  </small>
                </span>
                <span className={styles.switch}>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={selected}
                    disabled={noPrice}
                    aria-label={`Agregar de todos modos ${item.name}`}
                    onChange={(e) =>
                      patchRow(item.key, { selected: e.target.checked })
                    }
                  />
                  <span className={styles.switchTrack} aria-hidden />
                </span>
              </label>

              {selected ? (
                <div className={styles.unavBody}>
                  {delta ? (
                    <DeltaWidget delta={delta} quantity={item.quantity} />
                  ) : null}
                  <PriceOptions
                    quotePrice={quotePrice}
                    currentPrice={currentPrice}
                    choice={row.choice}
                    onChoose={(value) => patchRow(item.key, { choice: value })}
                  />
                  {needsWarranty ? (
                    <div
                      data-invalid={warrantyInvalid ? "true" : undefined}
                      className={`${styles.warrantyBox} ${
                        warrantyInvalid ? styles.warrantyBoxError : ""
                      }`}
                    >
                      <span className={styles.warrantyHint}>
                        {warrantyInvalid
                          ? "Falta elegir la garantía para poder importarlo."
                          : "Este producto no tiene garantía registrada. Elige la que aparecerá en el ticket."}
                      </span>
                      <CatalogWarrantyFields
                        alwaysShow
                        value={row.warranty}
                        onChange={(next) => patchRow(item.key, { warranty: next })}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
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
