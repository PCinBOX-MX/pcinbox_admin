"use client";

import { useEffect, useMemo, useState } from "react";
import type { PosCartLine } from "../interfaces/pos/pos.interface";
import { formatMoney } from "./posFormat";
import {
  applyCartChanges,
  cartTotal,
  defaultUnavailableActions,
  type CartChanges,
  type CartUnavailableAction,
  type CartUnavailableActions,
} from "./cartRevalidation";
import styles from "./quoteImportPrice.module.css";
import own from "./cartRevalidation.module.css";

const FALLBACK_IMG =
  "https://ik.imagekit.io/pcinboxkit/logos/logo.png?updatedAt=1759534318587";

function Thumb({ src }: { src: string | null }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={styles.thumb}
      src={src || FALLBACK_IMG}
      alt=""
      loading="lazy"
      onError={(e) => {
        if (e.currentTarget.src !== FALLBACK_IMG) e.currentTarget.src = FALLBACK_IMG;
      }}
    />
  );
}

function signed(n: number) {
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${formatMoney(Math.abs(n))}`;
}

export function CartRevalidationBody({
  cart,
  changes,
  paymentsTotal,
  onChange,
}: {
  cart: PosCartLine[];
  changes: CartChanges;
  /** Suma de los pagos capturados (0 si no hay). */
  paymentsTotal: number;
  onChange: (actions: CartUnavailableActions) => void;
}) {
  const [actions, setActions] = useState<CartUnavailableActions>(() =>
    defaultUnavailableActions(changes.unavailable),
  );

  useEffect(() => {
    onChange(actions);
  }, [actions, onChange]);

  const totals = useMemo(() => {
    const before = cartTotal(cart);
    const after = cartTotal(applyCartChanges(cart, changes, actions, 0));
    return { before, after, diff: Math.round((after - before) * 100) / 100 };
  }, [actions, cart, changes]);

  const setAction = (key: string, action: CartUnavailableAction) =>
    setActions((prev) => ({ ...prev, [key]: action }));

  const paymentsMismatch =
    paymentsTotal > 0 && Math.abs(paymentsTotal - totals.after) > 0.009;

  return (
    <div className={styles.root}>
      <p className={styles.lead}>
        Mientras armabas la venta cambiaron datos del catálogo. Pulsa
        «Actualizar carrito» para dejarlo igual a lo que se va a cobrar; después
        revisa los pagos y vuelve a pulsar «Cobrar».
      </p>

      <section className={styles.deltaSummary} aria-label="Total del carrito">
        <div className={styles.deltaStat}>
          <span className={styles.deltaStatLabel}>Total en pantalla</span>
          <span className={styles.deltaStatValue}>{formatMoney(totals.before)}</span>
        </div>
        <div className={styles.deltaStat}>
          <span className={styles.deltaStatLabel}>Total actualizado</span>
          <span className={styles.deltaStatValue}>{formatMoney(totals.after)}</span>
        </div>
        <div
          className={`${styles.deltaStat} ${
            totals.diff > 0
              ? styles.deltaStatUp
              : totals.diff < 0
                ? styles.deltaStatDown
                : ""
          }`}
        >
          <span className={styles.deltaStatLabel}>Diferencia</span>
          <span className={styles.deltaStatValue}>{signed(totals.diff)}</span>
        </div>
      </section>

      {paymentsMismatch ? (
        <div className={styles.banner} role="status">
          Los pagos capturados suman {formatMoney(paymentsTotal)}. Con el total
          actualizado ({formatMoney(totals.after)}) ajusta los pagos antes de cobrar.
        </div>
      ) : null}

      <div className={styles.list}>
        {changes.prices.length > 0 ? (
          <h3 className={styles.sectionTitle}>
            Cambió el precio{" "}
            <span className={styles.sectionCount}>{changes.prices.length}</span>
          </h3>
        ) : null}
        {changes.prices.map((c) => {
          const unit = Math.round((c.after - c.before) * 100) / 100;
          return (
            <article key={`p-${c.key}`} className={styles.card}>
              <header className={styles.unavHead}>
                <Thumb src={c.imageUrl} />
                <div className={styles.unavInfo}>
                  <h3 className={styles.cardTitle}>{c.name}</h3>
                  <div className={styles.cardMeta}>
                    <span className={styles.qtyBadge}>Cant. {c.quantity}</span>
                  </div>
                  <div
                    className={`${styles.delta} ${unit > 0 ? styles.deltaUp : styles.deltaDown}`}
                  >
                    <span className={styles.deltaArrow} aria-hidden>
                      {unit > 0 ? "▲" : "▼"}
                    </span>
                    <span className={styles.deltaText}>
                      <strong>
                        {formatMoney(c.before)} → {formatMoney(c.after)} c/u
                      </strong>
                      <span>
                        {unit > 0 ? "Subió" : "Bajó"} {formatMoney(Math.abs(unit))} por
                        unidad · {signed(unit * c.quantity)} en total
                      </span>
                    </span>
                  </div>
                </div>
              </header>
            </article>
          );
        })}

        {changes.quantities.length > 0 ? (
          <h3 className={styles.sectionTitle}>
            Cantidad ajustada por stock{" "}
            <span className={styles.sectionCount}>{changes.quantities.length}</span>
          </h3>
        ) : null}
        {changes.quantities.map((c) => (
          <article key={`q-${c.key}`} className={styles.card}>
            <header className={styles.unavHead}>
              <Thumb src={c.imageUrl} />
              <div className={styles.unavInfo}>
                <h3 className={styles.cardTitle}>{c.name}</h3>
                <div className={styles.pricePeek}>
                  <span>
                    En carrito <strong>{c.before}</strong>
                  </span>
                  <span>
                    Disponibles en {c.branchLabel} <strong>{c.after}</strong>
                  </span>
                </div>
                <span className={own.note}>
                  Se dejará en {c.after} unidad{c.after === 1 ? "" : "es"}.
                </span>
              </div>
            </header>
          </article>
        ))}

        {changes.unavailable.length > 0 ? (
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>
              No se pueden cobrar así{" "}
              <span className={`${styles.sectionCount} ${styles.sectionCountWarn}`}>
                {changes.unavailable.length}
              </span>
            </h3>
            <p className={styles.sectionHint}>
              Elige qué hacer con cada uno. «Agregar de todos modos» lo deja como
              captura manual: no descuenta inventario.
            </p>
          </div>
        ) : null}
        {changes.unavailable.map((item) => {
          const action = actions[item.key] || "remove";
          const options: Array<{
            id: CartUnavailableAction;
            label: string;
            value: string;
            hint: string;
          }> = [
            {
              id: "remove",
              label: "Quitar",
              value: "Del carrito",
              hint: "No se cobra",
            },
            ...(item.altBranch
              ? [
                  {
                    id: "switchBranch" as const,
                    label: "Cambiar bodega",
                    value: item.altBranch.label,
                    hint: `${item.altBranch.stock} disponibles`,
                  },
                ]
              : []),
            {
              id: "keepManual",
              label: "Agregar de todos modos",
              value: `${formatMoney(item.keepPrice)} c/u`,
              hint: "Captura manual",
            },
          ];
          return (
            <article
              key={`u-${item.key}`}
              className={`${styles.card} ${styles.cardUnavailable} ${
                action !== "remove" ? styles.cardUnavailableOn : ""
              }`}
            >
              <header className={styles.unavHead}>
                <Thumb src={item.imageUrl} />
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
                      {item.detail}
                    </span>
                    <span className={styles.qtyBadge}>Cant. {item.quantity}</span>
                    {item.sku ? (
                      <span className={styles.qtyBadge}>SKU {item.sku}</span>
                    ) : null}
                  </div>
                </div>
              </header>
              <div
                className={own.actionGrid}
                role="radiogroup"
                aria-label={`Qué hacer con ${item.name}`}
              >
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={action === opt.id}
                    onClick={() => setAction(item.key, opt.id)}
                    className={`${styles.option} ${
                      action === opt.id ? styles.optionSelected : ""
                    }`}
                  >
                    <span className={styles.optionLabel}>{opt.label}</span>
                    <span className={styles.optionPrice}>{opt.value}</span>
                    <span className={styles.optionHint}>{opt.hint}</span>
                  </button>
                ))}
              </div>
              {action === "keepManual" ? (
                <span className={own.note}>
                  Si no tiene garantía definida, te la pediremos en el carrito.
                </span>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
