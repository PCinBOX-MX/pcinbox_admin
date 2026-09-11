"use client";

import { useEffect, useState } from "react";
import {
  CircularProgress,
  MenuItem,
  TextField,
  type SxProps,
  type Theme,
} from "@mui/material";
import {
  Banknote,
  History,
  PenLine,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
  Wallet,
  Eye,
  Shield,
  X,
} from "lucide-react";
import AdminPageShell from "../shared/components/layout/AdminPageShell";
import EmptyState from "../shared/components/common/emptyState/EmptyState";
import ModernPagination from "../shared/components/common/paginator/ModernPagination";
import usePermissions from "../hooks/usePermissions";
import {
  POS_CASH_MOVEMENT_LABELS,
  POS_PAYMENT_LABELS,
  POS_PAYMENT_OPTIONS,
  POS_PHONE_LADAS,
  PosCashMovementType,
  PosPaymentMethod,
  PosProductHit,
  PosSaleStatus,
} from "../interfaces/pos/pos.interface";
import { formatPosBranchUiLabel } from "../interfaces/pos/posBranchDisplay";
import usePos from "./usePos";
import styles from "./punto-de-venta.module.css";

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    backgroundColor: "#fff",
    transition: "box-shadow 160ms ease",
    "&:hover fieldset": { borderColor: "#bb3d4b" },
    "&.Mui-focused": {
      boxShadow: "0 0 0 3px rgba(187, 61, 75, 0.16)",
    },
    "&.Mui-focused fieldset": { borderColor: "#bb3d4b" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#bb3d4b" },
};

const money = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

const FALLBACK_IMG =
  "https://ik.imagekit.io/pcinboxkit/logos/logo.png?updatedAt=1759534318587";

function resolveProductImage(imageUrl: unknown): string {
  if (!imageUrl) return FALLBACK_IMG;
  if (typeof imageUrl === "string") {
    const t = imageUrl.trim();
    if (!t) return FALLBACK_IMG;
    if (t.startsWith("[") || t.startsWith("{")) {
      try {
        return resolveProductImage(JSON.parse(t));
      } catch {
        return t;
      }
    }
    return t;
  }
  if (Array.isArray(imageUrl)) {
    const first = imageUrl.find((x) => typeof x === "string" && x.trim());
    return first ? String(first) : FALLBACK_IMG;
  }
  if (typeof imageUrl === "object") {
    const values = Object.values(imageUrl as Record<string, unknown>);
    const first = values.find((x) => typeof x === "string" && String(x).trim());
    return first ? String(first) : FALLBACK_IMG;
  }
  return FALLBACK_IMG;
}

const statusBadge = (status: PosSaleStatus) => {
  if (status === "cancelled") return styles.badgeCancelled;
  if (status === "pending_payment") return styles.badgePending;
  return styles.badgeCompleted;
};

const statusLabel = (status: PosSaleStatus) => {
  if (status === "cancelled") return "Cancelada";
  if (status === "pending_payment") return "Pendiente pago";
  return "Completada";
};

function productThumb(url?: string | null, className?: string) {
  const cls = className || styles.hitImg;
  const frame =
    cls === styles.hitImgLg
      ? styles.hitImgLgFrame
      : cls === styles.hitImg
        ? styles.hitImgFrame
        : null;
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={cls}
      src={url || FALLBACK_IMG}
      alt=""
      loading="lazy"
    />
  );
  return frame ? <span className={frame}>{img}</span> : img;
}

/** Campo numérico que permite vaciar al editar (sin atascarse en 0). */
function PosNumberField({
  label,
  value,
  onCommit,
  integer = false,
  sx,
  fullWidth,
  className,
  emptyAs = "",
}: {
  label: string;
  value: string | number;
  onCommit: (raw: string) => void;
  integer?: boolean;
  sx?: SxProps<Theme>;
  fullWidth?: boolean;
  className?: string;
  /** Valor a confirmar si el campo queda vacío al salir. */
  emptyAs?: string;
}) {
  const committed =
    value === null || value === undefined ? "" : String(value);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(committed);

  useEffect(() => {
    if (!focused) setDraft(committed);
  }, [committed, focused]);

  return (
    <TextField
      size="small"
      label={label}
      fullWidth={fullWidth}
      className={className}
      value={focused ? draft : committed}
      onFocus={() => {
        setFocused(true);
        setDraft(committed);
      }}
      onChange={(e) => {
        let v = e.target.value;
        if (integer) {
          if (v !== "" && !/^\d*$/.test(v)) return;
        } else {
          v = v.replace(",", ".");
          if (v !== "" && !/^\d*\.?\d*$/.test(v)) return;
        }
        setDraft(v);
        // Actualiza el estado padre en vivo para que Restante/Cobrar usen el valor actual.
        if (v.trim() !== "") onCommit(v);
      }}
      onBlur={() => {
        setFocused(false);
        const trimmed = draft.trim();
        const raw = trimmed === "" ? emptyAs : trimmed;
        onCommit(raw);
      }}
      sx={sx ?? fieldSx}
      inputProps={{ inputMode: integer ? "numeric" : "decimal" }}
    />
  );
}

export default function PuntoDeVentaPage() {
  const { can, hydrated } = usePermissions();
  const pos = usePos();
  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualQty, setManualQty] = useState("1");
  const [manualUpc, setManualUpc] = useState("");
  // Evita hydration mismatch de MUI TextField (useId distinto SSR vs cliente).
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    setClientReady(true);
  }, []);

  const submitManual = () => {
    const price = Number(manualPrice);
    const qty = parseInt(manualQty, 10);
    const ok = pos.addManualLine({
      name: manualName,
      unitPrice: price,
      quantity: Number.isFinite(qty) ? qty : 1,
      upc: manualUpc,
    });
    if (ok) {
      setManualName("");
      setManualPrice("");
      setManualQty("1");
      setManualUpc("");
      setManualOpen(false);
    }
  };

  if (!clientReady) {
    return (
      <AdminPageShell
        title="Punto de Venta"
        subtitle="Cobro en bodega con el mismo catálogo e inventario de la tienda"
      >
        <div className={styles.posPage}>
          <div className={styles.posLoadingShell}>
            <CircularProgress size={20} sx={{ color: "#bb3d4b" }} />
            Cargando punto de venta…
          </div>
        </div>
      </AdminPageShell>
    );
  }

  if (hydrated && !can("pos.manage")) {
    return (
      <AdminPageShell title="Punto de Venta" subtitle="Acceso restringido">
        <EmptyState
          title="Sin permiso"
          description="Tu rol no puede operar el Punto de Venta."
        />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Punto de Venta"
      subtitle="Cobro en bodega con el mismo catálogo e inventario de la tienda"
    >
      <div className={styles.posPage}>
        <div className={styles.posTop}>
          <div className={styles.posTabs}>
            <button
              type="button"
              className={`${styles.posTab} ${pos.tab === "cobrar" ? styles.posTabActive : ""}`}
              onClick={() => pos.setTab("cobrar")}
            >
              <span className={styles.posTabIcon}>
                <ShoppingCart size={15} strokeWidth={2.25} />
              </span>
              Cobrar
            </button>
            <button
              type="button"
              className={`${styles.posTab} ${pos.tab === "historial" ? styles.posTabActive : ""}`}
              onClick={() => pos.setTab("historial")}
            >
              <span className={styles.posTabIcon}>
                <History size={15} strokeWidth={2.25} />
              </span>
              Historial
            </button>
            <button
              type="button"
              className={`${styles.posTab} ${pos.tab === "garantias" ? styles.posTabActive : ""}`}
              onClick={() => pos.setTab("garantias")}
            >
              <span className={styles.posTabIcon}>
                <Shield size={15} strokeWidth={2.25} />
              </span>
              Garantías
            </button>
            <button
              type="button"
              className={`${styles.posTab} ${pos.tab === "caja" ? styles.posTabActive : ""}`}
              onClick={() => pos.setTab("caja")}
            >
              <span className={styles.posTabIcon}>
                <Wallet size={15} strokeWidth={2.25} />
              </span>
              Caja
            </button>
          </div>

          <div className={styles.branchPicker}>
            <div className={styles.headerActions}>
              <span
                className={`${styles.cashStatusPill} ${
                  pos.cashOpen
                    ? styles.cashStatusPillOpen
                    : styles.cashStatusPillClosed
                }`}
                title={
                  pos.cashOpen && pos.cashSession
                    ? `Sesión #${pos.cashSession.idCashSession}`
                    : "Sin caja abierta"
                }
              >
                <span className={styles.cashStatusDot} />
                {pos.cashOpen ? "Caja abierta" : "Caja cerrada"}
              </span>
              {!pos.cashOpen ? (
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => pos.setTab("caja")}
                >
                  <Wallet size={14} />
                  Abrir caja
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => pos.setTab("caja")}
                >
                  <Wallet size={14} />
                  Ver caja
                </button>
              )}
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={pos.qzBusy || !pos.qzSettings.printerName}
                title={
                  pos.qzSettings.printerName
                    ? "Abre el cajón físico (sin cobrar)"
                    : "Primero elige impresora en la pestaña Caja"
                }
                onClick={() => void pos.testQzDrawer()}
              >
                <Banknote size={14} />
                Abrir cajón
              </button>
            </div>
            <span className={styles.shortcutHint}>F2 buscar · F4 cobrar</span>
          </div>
        </div>

        {pos.tab === "cobrar" ? (
          <div className={styles.posGrid}>
            {!pos.cashOpen && pos.branchId ? (
              <div className={`${styles.cashBanner} ${styles.spanFull}`}>
                <Wallet size={16} />
                <span>
                  Caja cerrada. Ábrela aquí si vas a cobrar en efectivo (tarjeta
                  y transferencia no la requieren).
                </span>
                <div className={styles.cashBannerActions}>
                  <PosNumberField
                    label="Fondo inicial"
                    value={pos.openingFloat}
                    emptyAs="0"
                    onCommit={(raw) => pos.setOpeningFloat(raw || "0")}
                    sx={{ ...fieldSx, minWidth: 140, maxWidth: 160 }}
                  />
                  <button
                    type="button"
                    className={styles.chargeBtn}
                    style={{ marginTop: 0, width: "auto", padding: "10px 16px" }}
                    disabled={pos.cashBusy}
                    onClick={() => void pos.openCash()}
                  >
                    {pos.cashBusy ? "Abriendo…" : "Abrir caja"}
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => pos.setTab("caja")}
                  >
                    Ir a Caja
                  </button>
                </div>
              </div>
            ) : null}
            {pos.cashOpen && pos.cashExpected != null ? (
              <div
                className={`${styles.cashBanner} ${styles.cashBannerOk} ${styles.spanFull}`}
              >
                <Wallet size={16} />
                <span>
                  Caja abierta · esperado {money(pos.cashExpected)}
                  {pos.hasCashPayment ? " · esta venta incluye efectivo" : ""}
                </span>
              </div>
            ) : null}
            <section className={styles.posPanel}>
              <div className={styles.posPanelHead}>
                <div className={styles.posPanelHeadRow}>
                  <div>
                    <p className={styles.panelEyebrow}>Productos</p>
                    <h2>Buscar y agregar</h2>
                    <p>Escanea UPC/SKU o escribe el nombre. Cotización y captura manual opcionales.</p>
                  </div>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => setManualOpen((v) => !v)}
                  >
                    <PenLine
                      size={14}
                      style={{ display: "inline", marginRight: 4 }}
                    />
                    {manualOpen ? "Cerrar manual" : "Producto manual"}
                  </button>
                </div>
              </div>
              <div className={styles.posPanelBody}>
                <div className={styles.quoteBox}>
                  <div className={styles.manualHead}>
                    <strong>Cotización</strong>
                    <span>
                      Ingresa el No. de cotización de la tienda para cargar sus
                      productos al carrito. Vigencia: 5 días desde su creación
                      (después el PDF se elimina y ya no se puede cargar).
                    </span>
                  </div>
                  {pos.quotePageAlert ? (
                    <div
                      className={`${styles.quotePageAlert} ${
                        pos.quotePageAlert.type === "error"
                          ? styles.quotePageAlertError
                          : pos.quotePageAlert.type === "warning"
                            ? styles.quotePageAlertWarning
                            : styles.quotePageAlertSuccess
                      }`}
                      role="alert"
                    >
                      <div>
                        <strong>{pos.quotePageAlert.title}</strong>
                        <p>{pos.quotePageAlert.message}</p>
                      </div>
                      <button
                        type="button"
                        className={styles.quoteAlertClose}
                        aria-label="Cerrar aviso"
                        onClick={pos.dismissQuotePageAlert}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : null}
                  <div className={styles.quoteRow}>
                    <TextField
                      fullWidth
                      size="small"
                      label="No. Cotización"
                      value={pos.quoteInput}
                      onChange={(e) => pos.setQuoteInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void pos.loadQuote();
                        }
                      }}
                      sx={fieldSx}
                      placeholder="Ej. 1726060800000"
                    />
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      style={{ width: "auto", whiteSpace: "nowrap" }}
                      disabled={pos.quoteLoading}
                      onClick={() => void pos.loadQuote()}
                    >
                      {pos.quoteLoading ? "Cargando…" : "Cargar"}
                    </button>
                  </div>
                  {pos.linkedQuoteNumber ? (
                    <div className={styles.quoteLinked}>
                      <span>
                        Vinculada: <strong>{pos.linkedQuoteNumber}</strong>
                      </span>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={pos.clearLinkedQuote}
                      >
                        Quitar vínculo
                      </button>
                    </div>
                  ) : null}
                </div>
                {manualOpen ? (
                  <div className={styles.manualBox}>
                    <div className={styles.manualHead}>
                      <strong>Captura manual</strong>
                      <span>
                        Para artículos que no están en el catálogo (sin descontar
                        stock).
                      </span>
                    </div>
                    <div className={styles.manualGrid}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Nombre"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        sx={fieldSx}
                      />
                      <TextField
                        fullWidth
                        size="small"
                        label="Precio"
                        value={manualPrice}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^\d.]/g, "");
                          const parts = raw.split(".");
                          const next =
                            parts.length <= 1
                              ? raw
                              : `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}`;
                          setManualPrice(next);
                        }}
                        sx={fieldSx}
                        inputProps={{ inputMode: "decimal", pattern: "[0-9.]*" }}
                      />
                      <TextField
                        fullWidth
                        size="small"
                        label="Cantidad"
                        value={manualQty}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                          setManualQty(digits);
                        }}
                        sx={fieldSx}
                        inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                      />
                      <TextField
                        fullWidth
                        size="small"
                        label="UPC / código (opcional)"
                        value={manualUpc}
                        onChange={(e) => setManualUpc(e.target.value)}
                        sx={fieldSx}
                      />
                    </div>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      onClick={submitManual}
                      disabled={manualName.trim().length < 2}
                    >
                      <Plus
                        size={14}
                        style={{ display: "inline", marginRight: 4 }}
                      />
                      Agregar al carrito
                    </button>
                  </div>
                ) : null}
                <div className={styles.searchRow}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Buscar o escanear"
                    placeholder="Nombre, SKU, UPC…"
                    value={pos.search}
                    onChange={(e) => pos.setSearch(e.target.value)}
                    inputRef={pos.searchRef}
                    sx={fieldSx}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && pos.hits[0]) {
                        e.preventDefault();
                        const hit = pos.hits[0];
                        const stocks = hit.stocksByBranch || [];
                        if (stocks.length === 1) {
                          pos.addProduct(hit, stocks[0].branchId);
                        } else if (stocks.length > 1) {
                          const one = stocks.filter((st) => st.stock > 0);
                          if (one.length === 1) {
                            pos.addProduct(hit, one[0].branchId);
                          } else {
                            pos.addProduct(hit, hit.suggestedBranchId);
                          }
                        } else {
                          pos.addProduct(hit, null);
                        }
                      }
                    }}
                    InputProps={{
                      startAdornment: (
                        <Search
                          size={18}
                          style={{ marginRight: 8, color: "#9ca3af" }}
                        />
                      ),
                      endAdornment: pos.searching ? (
                        <CircularProgress size={18} />
                      ) : null,
                    }}
                  />
                </div>

                {pos.searching && pos.hits.length === 0 ? (
                  <div className={styles.hits} aria-busy="true">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={`sk-${i}`} className={styles.hitSkeleton}>
                        <div className={styles.hitSkeletonImg} />
                        <div className={styles.hitSkeletonBody}>
                          <div className={styles.hitSkeletonLine} />
                          <div className={styles.hitSkeletonLineShort} />
                          <div className={styles.hitSkeletonLineTiny} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : pos.hits.length === 0 ? (
                  <EmptyState
                    icon="search"
                    title={pos.search ? "Sin resultados" : "Listo para cobrar"}
                    description={
                      pos.search
                        ? "Prueba con SKU, UPC, marca o parte del nombre. Si no está en catálogo, usa Producto manual."
                        : "Escanea un código o captura un producto manual si no está registrado."
                    }
                  />
                ) : (
                  <div className={styles.hits}>
                    {pos.hits.map((hit: PosProductHit) => {
                      const img = resolveProductImage(hit.image_url);
                      const stocks = hit.stocksByBranch || [];
                      return (
                        <article key={hit.idProduct} className={styles.hitCard}>
                          <button
                            type="button"
                            className={styles.hitMain}
                            onClick={() => {
                              if (stocks.length === 1) {
                                pos.addProduct(hit, stocks[0].branchId);
                              } else if (stocks.length > 1) {
                                const one = stocks.filter((st) => st.stock > 0);
                                if (one.length === 1) {
                                  pos.addProduct(hit, one[0].branchId);
                                } else {
                                  pos.addProduct(hit, hit.suggestedBranchId);
                                }
                              } else {
                                pos.addProduct(hit, null);
                              }
                            }}
                          >
                            {productThumb(img, styles.hitImgLg)}
                            <div className={styles.hitBody}>
                              <div className={styles.hitTitle}>
                                {hit.name || `Producto #${hit.idProduct}`}
                              </div>
                              <div className={styles.hitMetaRow}>
                                {hit.providerName ? (
                                  <span className={styles.chip}>
                                    {hit.providerName}
                                  </span>
                                ) : null}
                                {hit.marca ? (
                                  <span className={styles.chipMuted}>
                                    {hit.marca}
                                  </span>
                                ) : null}
                              </div>
                              <div className={styles.hitMeta}>
                                {[
                                  hit.sku && `SKU ${hit.sku}`,
                                  hit.upc && `UPC ${hit.upc}`,
                                  hit.category,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </div>
                              {stocks.length > 0 ? (
                                <div className={styles.stockChips}>
                                  {stocks.map((st) => (
                                    <span
                                      key={st.branchId}
                                      className={
                                        st.stock > 0
                                          ? styles.stockChipOk
                                          : styles.stockChipEmpty
                                      }
                                    >
                                      {formatPosBranchUiLabel({
                                        name: st.name,
                                        label: st.label,
                                        city: st.city,
                                        fallback: String(st.branchId),
                                      })}
                                      : {st.stock}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className={styles.hitMeta}>
                                  Stock global: {hit.stockGlobal}
                                </div>
                              )}
                            </div>
                            <div className={styles.hitSide}>
                              <div className={styles.hitPrice}>
                                {money(hit.price)}
                              </div>
                              <span className={styles.addHint}>Agregar</span>
                            </div>
                          </button>
                          {stocks.length > 1 ? (
                            <div className={styles.hitBranches}>
                              {stocks.map((st) => (
                                <button
                                  key={st.branchId}
                                  type="button"
                                  className={styles.branchPickBtn}
                                  disabled={st.stock <= 0}
                                  onClick={() =>
                                    pos.addProduct(hit, st.branchId)
                                  }
                                >
                                  {formatPosBranchUiLabel({
                                    name: st.name,
                                    label: st.label,
                                    city: st.city,
                                  })}{" "}
                                  · {st.stock}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <aside className={`${styles.posPanel} ${styles.cartPanel}`}>
              <div className={styles.posPanelHead}>
                <div className={styles.posPanelHeadRow}>
                  <div>
                    <p className={styles.panelEyebrow}>Venta</p>
                    <h2>
                      <ShoppingCart size={18} strokeWidth={2.25} />
                      Carrito
                    </h2>
                  </div>
                </div>
              </div>
              <div className={styles.cartPanelBody}>
                <div className={styles.cartPanelScroll}>
                <div className={styles.customerBlock}>
                  <p className={styles.customerBlockTitle}>Cliente</p>
                  <TextField
                    fullWidth
                    size="small"
                    label="Nombre"
                    value={pos.customerName}
                    onChange={(e) => pos.setCustomerName(e.target.value)}
                    sx={{ ...fieldSx, mb: 1.5 }}
                    required
                  />

                  <TextField
                    fullWidth
                    size="small"
                    type="email"
                    label="Email (opcional)"
                    value={pos.guestEmail}
                    onChange={(e) => pos.setGuestEmail(e.target.value)}
                    sx={{ ...fieldSx, mb: 1.5 }}
                    error={Boolean(pos.guestEmail.trim()) && !pos.emailValid}
                    helperText={
                      pos.guestEmail.trim() && !pos.emailValid
                        ? "Formato de email inválido"
                        : undefined
                    }
                  />

                  <div className={styles.phoneRow}>
                    <TextField
                      select
                      size="small"
                      label="Lada"
                      value={pos.phoneLada}
                      onChange={(e) => pos.setPhoneLada(e.target.value)}
                      className={styles.ladaSelect}
                      sx={fieldSx}
                    >
                      {POS_PHONE_LADAS.map((lada) => (
                        <MenuItem key={lada} value={lada}>
                          {lada}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      fullWidth
                      size="small"
                      label="Teléfono"
                      value={pos.guestPhone}
                      onChange={(e) => {
                        const digits = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 10);
                        pos.setGuestPhone(digits);
                      }}
                      sx={fieldSx}
                      error={Boolean(pos.guestPhone.trim()) && !pos.phoneValid}
                      helperText={
                        pos.guestPhone.trim() && !pos.phoneValid
                          ? "Debe tener 10 dígitos"
                          : undefined
                      }
                      inputProps={{ inputMode: "numeric", maxLength: 10 }}
                      required
                    />
                  </div>
                </div>

                {pos.cart.length === 0 ? (
                  <EmptyState
                    title="Carrito vacío"
                    description="Agrega desde el buscador o con captura manual."
                  />
                ) : (
                  <div className={styles.cartList}>
                    {pos.cart.map((line) => (
                      <div key={line.key} className={styles.cartCard}>
                        <div className={styles.cartCardHead}>
                          {productThumb(
                            resolveProductImage(line.imageUrl),
                            styles.cartImg,
                          )}
                          <div className={styles.cartCardInfo}>
                            <div className={styles.cartLineName}>
                              {line.name}
                              {line.isManual ? (
                                <span className={styles.manualBadge}>
                                  Manual
                                </span>
                              ) : null}
                            </div>
                            <div className={styles.hitMeta}>
                              {[
                                line.sku && `SKU ${line.sku}`,
                                line.upc && `UPC ${line.upc}`,
                                line.branchLabel &&
                                  formatPosBranchUiLabel({
                                    label: line.branchLabel,
                                    name: line.stocksByBranch?.find(
                                      (s) => s.branchId === line.branchId,
                                    )?.name,
                                  }),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                            {line.isManual ? (
                              <div className={styles.cartUnitPriceEdit}>
                                <PosNumberField
                                  label="Precio c/u"
                                  value={line.unitPrice}
                                  emptyAs="0"
                                  onCommit={(raw) => {
                                    const n = Number(raw);
                                    pos.updateLine(line.key, {
                                      unitPrice:
                                        Number.isFinite(n) && n >= 0 ? n : 0,
                                    });
                                  }}
                                />
                              </div>
                            ) : (
                              <div className={styles.cartUnitPrice}>
                                <span className={styles.cartUnitPriceLabel}>
                                  Precio
                                </span>
                                <span className={styles.cartUnitPriceValue}>
                                  {money(line.unitPrice)}
                                </span>
                                <span className={styles.cartUnitPriceHint}>
                                  c/u
                                </span>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            className={styles.dangerBtn}
                            onClick={() => pos.removeLine(line.key)}
                            aria-label="Quitar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {line.isManual ? (
                          <p
                            className={styles.hitMeta}
                            style={{ marginBottom: 8 }}
                          >
                            Captura manual · no descuenta inventario
                          </p>
                        ) : line.stocksByBranch?.length ? (
                          <TextField
                            select
                            fullWidth
                            size="small"
                            label="Bodega"
                            value={line.branchId ?? ""}
                            onChange={(e) => {
                              const branchId = Number(e.target.value);
                              const st = line.stocksByBranch.find(
                                (s) => s.branchId === branchId,
                              );
                              pos.updateLine(line.key, {
                                branchId,
                                branchLabel: formatPosBranchUiLabel({
                                  name: st?.name,
                                  label: st?.label,
                                  city: st?.city,
                                }),
                                stockBranch: st?.stock ?? 0,
                              });
                            }}
                            sx={{ ...fieldSx, mb: 1 }}
                          >
                            {line.stocksByBranch.map((st) => (
                              <MenuItem
                                key={st.branchId}
                                value={st.branchId}
                                disabled={st.stock <= 0}
                              >
                                {formatPosBranchUiLabel({
                                  name: st.name,
                                  label: st.label,
                                  city: st.city,
                                })}{" "}
                                ({st.stock})
                              </MenuItem>
                            ))}
                          </TextField>
                        ) : (
                          <p
                            className={styles.hitMeta}
                            style={{ marginBottom: 8 }}
                          >
                            Stock global (sin bodega de proveedor)
                          </p>
                        )}
                        <div className={styles.cartControls}>
                          <PosNumberField
                            label="Cant."
                            integer
                            value={line.quantity}
                            emptyAs="1"
                            onCommit={(raw) => {
                              let n = parseInt(raw, 10);
                              if (!Number.isFinite(n) || n < 1) n = 1;
                              pos.updateLine(line.key, {
                                quantity: n,
                              });
                            }}
                          />
                        </div>
                        <div className={styles.cartLineTotal}>
                          <span>Línea</span>
                          <strong>
                            {money(
                              pos.lineTotal(
                                line.unitPrice,
                                line.quantity,
                                0,
                              ),
                            )}
                          </strong>
                        </div>
                        <div className={styles.serialBlock}>
                          <div className={styles.serialHead}>
                            <span>
                              {line.requiresSerial
                                ? "Números de serie (obligatorio)"
                                : "Números de serie (opcional)"}
                            </span>
                            {pos.isAdmin || line.isManual ? (
                              <button
                                type="button"
                                className={styles.secondaryBtn}
                                onClick={() =>
                                  void pos.toggleRequiresSerial(
                                    line.key,
                                    line.productId,
                                    !line.requiresSerial,
                                  )
                                }
                              >
                                {line.requiresSerial
                                  ? "Ya no exigir"
                                  : "Exigir serie"}
                              </button>
                            ) : null}
                          </div>
                          {Array.from({ length: line.quantity }).map((_, i) => (
                            <TextField
                              key={`${line.key}-sn-${i}`}
                              size="small"
                              fullWidth
                              label={`Serie ${i + 1}`}
                              value={line.serials[i] || ""}
                              onChange={(e) =>
                                pos.setLineSerial(
                                  line.key,
                                  i,
                                  e.target.value,
                                )
                              }
                              sx={{ ...fieldSx, mt: 0.75 }}
                              required={line.requiresSerial}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </div>

                <div className={styles.cartPanelFooter}>
                <div className={styles.totalsBox}>
                  <div className={styles.totalsRow}>
                    <span>Subtotal</span>
                    <span>{money(pos.totals.subtotal)}</span>
                  </div>
                  <div className={styles.totalsRow}>
                    <span>Cubierto</span>
                    <span>{money(pos.settlement.paidApplied)}</span>
                  </div>
                  <div className={styles.totalsRow}>
                    <span>Restante</span>
                    <strong
                      className={
                        pos.remaining > 0.009 ? styles.totalsWarn : styles.totalsOk
                      }
                    >
                      {money(pos.remaining)}
                    </strong>
                  </div>
                  {pos.changeDue > 0.009 ? (
                    <div className={styles.totalsRow}>
                      <span>Cambio</span>
                      <strong className={styles.totalsOk}>
                        {money(pos.changeDue)}
                      </strong>
                    </div>
                  ) : null}
                  <div className={styles.totalsGrand}>
                    <span>Total</span>
                    <span>{money(pos.totals.total)}</span>
                  </div>
                </div>

                <div className={styles.checkoutZone}>
                  <div className={styles.toolbarRow} style={{ marginBottom: 10 }}>
                    <strong style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Banknote size={14} /> Pagos
                    </strong>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => pos.addPayment("efectivo_sucursal")}
                    >
                      <Plus size={14} />
                      Agregar
                    </button>
                  </div>
                  <div className={styles.payList}>
                    {pos.payments.map((p) => (
                      <div key={p.id} className={styles.payLine}>
                        <TextField
                          select
                          size="small"
                          label="Método"
                          value={p.method}
                          onChange={(e) =>
                            pos.updatePayment(p.id, {
                              method: e.target.value as PosPaymentMethod,
                            })
                          }
                          sx={fieldSx}
                        >
                          {POS_PAYMENT_OPTIONS.map((m) => (
                            <MenuItem key={m} value={m}>
                              {POS_PAYMENT_LABELS[m]}
                            </MenuItem>
                          ))}
                        </TextField>
                        <PosNumberField
                          label={
                            p.method === "efectivo_sucursal"
                              ? "Recibido"
                              : "Monto"
                          }
                          value={p.amount}
                          emptyAs="0"
                          onCommit={(raw) => {
                            const n = Number(raw);
                            pos.updatePayment(p.id, {
                              amount: Number.isFinite(n) && n >= 0 ? n : 0,
                            });
                          }}
                        />
                        <TextField
                          size="small"
                          label="Ref."
                          value={p.reference}
                          onChange={(e) =>
                            pos.updatePayment(p.id, {
                              reference: e.target.value,
                            })
                          }
                          sx={fieldSx}
                        />
                        <button
                          type="button"
                          className={styles.dangerBtn}
                          onClick={() => pos.removePayment(p.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <TextField
                    fullWidth
                    size="small"
                    label="Notas"
                    value={pos.notes}
                    onChange={(e) => pos.setNotes(e.target.value)}
                    sx={{ ...fieldSx, mt: 1 }}
                    multiline
                    minRows={2}
                  />

                  <div className={styles.toolbarRow} style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={pos.clearCart}
                      disabled={pos.cart.length === 0}
                    >
                      Vaciar
                    </button>
                  </div>

                  <button
                    type="button"
                    className={styles.chargeBtn}
                    disabled={
                      pos.charging ||
                      pos.cart.length === 0 ||
                      !pos.customerName.trim() ||
                      (Boolean(pos.guestEmail.trim()) && !pos.emailValid) ||
                      !pos.guestPhone.trim() ||
                      !pos.phoneValid ||
                      pos.payments.length === 0 ||
                      !pos.settlement.balanced
                    }
                    onClick={() => {
                      (document.activeElement as HTMLElement | null)?.blur?.();
                      void pos.charge();
                    }}
                  >
                    {pos.charging
                      ? "Procesando…"
                      : pos.remaining > 0.009
                        ? `Falta ${money(pos.remaining)}`
                        : pos.changeDue > 0.009
                          ? `Cobrar · cambio ${money(pos.changeDue)}`
                          : `Cobrar ${money(pos.totals.total)}`}
                  </button>
                </div>

                {pos.lastSale ? (
                  <div className={styles.postSaleBar}>
                    <div className={styles.postSaleInfo}>
                      <strong>Última venta {pos.lastSale.folio}</strong>
                      <span>
                        {money(pos.lastSale.total)} ·{" "}
                        {statusLabel(pos.lastSale.status)}
                        {pos.lastSale.quoteNumber
                          ? ` · Cot. ${pos.lastSale.quoteNumber}`
                          : ""}
                      </span>
                    </div>
                    <div className={styles.postSaleActions}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() =>
                          pos.openTicket(pos.lastSale!.idPosSale)
                        }
                      >
                        <Printer size={14} />
                        Imprimir ticket
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => pos.setTicketOpen(true)}
                      >
                        Ver resumen
                      </button>
                    </div>
                  </div>
                ) : null}
                </div>
              </div>
            </aside>
          </div>
        ) : pos.tab === "caja" ? (
          <div className={styles.cashLayout}>
            <section className={styles.posPanel}>
              <div className={styles.posPanelHead}>
                <p className={styles.panelEyebrow}>Efectivo</p>
                <h2>
                  <Wallet size={18} strokeWidth={2.25} />
                  Control de caja
                </h2>
                <p>
                  Abre con fondo, registra entradas/salidas y cierra con corte.
                  Obligatorio para cobros en efectivo. Bodega de caja fija: PCinBOX.
                </p>
              </div>
              <div className={styles.posPanelBody}>
                {!pos.branchId ? (
                  <EmptyState
                    title="Caja no disponible"
                    description="No se pudo resolver la bodega de cobro. Recarga la página o revisa que exista la bodega leon2."
                  />
                ) : pos.cashLoading ? (
                  <div
                    style={{ display: "grid", placeItems: "center", padding: 40 }}
                  >
                    <CircularProgress sx={{ color: "#bb3d4b" }} />
                  </div>
                ) : !pos.cashOpen ? (
                  <div className={styles.cashForm}>
                    <EmptyState
                      title="Caja cerrada"
                      description="Abre una sesión con el fondo inicial en efectivo."
                    />
                    <PosNumberField
                      label="Fondo inicial"
                      value={pos.openingFloat}
                      emptyAs=""
                      onCommit={(raw) => pos.setOpeningFloat(raw)}
                      sx={{ ...fieldSx, maxWidth: 220 }}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Notas (opcional)"
                      value={pos.cashNotes}
                      onChange={(e) => pos.setCashNotes(e.target.value)}
                      sx={fieldSx}
                    />
                    <button
                      type="button"
                      className={styles.chargeBtn}
                      disabled={pos.cashBusy}
                      onClick={() => void pos.openCash()}
                    >
                      {pos.cashBusy ? "Abriendo…" : "Abrir caja"}
                    </button>
                  </div>
                ) : (
                  <div className={styles.cashForm}>
                    <div className={styles.totalsBox}>
                      <div className={styles.totalsRow}>
                        <span>Sesión</span>
                        <strong>#{pos.cashSession?.idCashSession}</strong>
                      </div>
                      <div className={styles.totalsRow}>
                        <span>Abierta por</span>
                        <span>{pos.cashSession?.openedByName || "—"}</span>
                      </div>
                      <div className={styles.totalsRow}>
                        <span>Desde</span>
                        <span>
                          {pos.cashSession?.openedAt
                            ? new Date(
                                pos.cashSession.openedAt,
                              ).toLocaleString("es-MX")
                            : "—"}
                        </span>
                      </div>
                      <div className={styles.totalsRow}>
                        <span>Fondo inicial</span>
                        <span>
                          {money(pos.cashSession?.openingFloat || 0)}
                        </span>
                      </div>
                      <div className={styles.totalsGrand}>
                        <span>Efectivo esperado</span>
                        <span>{money(pos.cashExpected ?? 0)}</span>
                      </div>
                    </div>

                    {pos.cashPaymentSummary ? (
                      <>
                        <h3 className={styles.cashSubhead}>
                          Ventas del turno
                        </h3>
                        <div className={styles.totalsBox}>
                          <div className={styles.totalsRow}>
                            <span>Ventas</span>
                            <strong>{pos.cashPaymentSummary.salesCount}</strong>
                          </div>
                          <div className={styles.totalsRow}>
                            <span>Total cobrado</span>
                            <strong>
                              {money(pos.cashPaymentSummary.salesTotal)}
                            </strong>
                          </div>
                          {(pos.cashPaymentSummary.cancelledCount || 0) > 0 ? (
                            <div className={styles.totalsRow}>
                              <span>Canceladas (ajuste caja)</span>
                              <span>
                                {pos.cashPaymentSummary.cancelledCount}
                              </span>
                            </div>
                          ) : null}
                          {(
                            Object.entries(
                              pos.cashPaymentSummary.byMethod || {},
                            ) as [string, number][]
                          )
                            .filter(([, amount]) => Number(amount) > 0)
                            .map(([method, amount]) => (
                              <div className={styles.totalsRow} key={method}>
                                <span>
                                  {POS_PAYMENT_LABELS[
                                    method as keyof typeof POS_PAYMENT_LABELS
                                  ] || method}
                                </span>
                                <span>{money(amount)}</span>
                              </div>
                            ))}
                        </div>
                        <p
                          style={{
                            margin: "0 0 8px",
                            fontSize: 12,
                            opacity: 0.75,
                          }}
                        >
                          Solo ventas ligadas a esta sesión. El efectivo esperado
                          del cajón usa fondo + entradas + ventas cash − salidas
                          − voids.
                        </p>
                      </>
                    ) : null}

                    <h3 className={styles.cashSubhead}>Entrada / salida</h3>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                      }}
                    >
                      <PosNumberField
                        label="Monto"
                        value={pos.cashMoveAmount}
                        emptyAs=""
                        onCommit={(raw) => pos.setCashMoveAmount(raw)}
                      />
                      <TextField
                        size="small"
                        label="Motivo"
                        value={pos.cashMoveReason}
                        onChange={(e) => pos.setCashMoveReason(e.target.value)}
                        helperText="Mín. 5 caracteres"
                        sx={fieldSx}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        disabled={pos.cashBusy}
                        onClick={() => void pos.addCashMovement("cash_in")}
                      >
                        Entrada de efectivo
                      </button>
                      <button
                        type="button"
                        className={styles.dangerBtn}
                        disabled={pos.cashBusy}
                        onClick={() => void pos.addCashMovement("cash_out")}
                      >
                        Salida de efectivo
                      </button>
                    </div>

                    <h3 className={styles.cashSubhead}>Corte / cierre</h3>
                    <PosNumberField
                      label="Efectivo contado"
                      value={pos.closingCounted}
                      emptyAs=""
                      onCommit={(raw) => pos.setClosingCounted(raw)}
                      sx={{ ...fieldSx, maxWidth: 220 }}
                    />
                    {(() => {
                      const counted = Number(pos.closingCounted);
                      const expected = Number(pos.cashExpected ?? 0);
                      if (!Number.isFinite(counted) || pos.closingCounted === "")
                        return null;
                      const diff =
                        Math.round((counted - expected + Number.EPSILON) * 100) /
                        100;
                      const hasDiff = Math.abs(diff) > 0.009;
                      return (
                        <div
                          className={styles.totalsBox}
                          style={{ marginTop: 4 }}
                        >
                          <div className={styles.totalsRow}>
                            <span>Esperado</span>
                            <span>{money(expected)}</span>
                          </div>
                          <div className={styles.totalsRow}>
                            <span>Contado</span>
                            <span>{money(counted)}</span>
                          </div>
                          <div className={styles.totalsGrand}>
                            <span>Diferencia</span>
                            <span
                              style={{
                                color: hasDiff ? "#b45309" : undefined,
                              }}
                            >
                              {money(diff)}
                              {hasDiff
                                ? diff > 0
                                  ? " (sobra)"
                                  : " (falta)"
                                : " (cuadrado)"}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                    {(() => {
                      const counted = Number(pos.closingCounted);
                      const expected = Number(pos.cashExpected ?? 0);
                      const hasDiff =
                        pos.closingCounted !== "" &&
                        Number.isFinite(counted) &&
                        Math.abs(counted - expected) > 0.009;
                      if (!hasDiff) return null;
                      return (
                        <TextField
                          fullWidth
                          size="small"
                          required
                          label="Motivo del descuadre"
                          value={pos.differenceReason}
                          onChange={(e) =>
                            pos.setDifferenceReason(e.target.value)
                          }
                          helperText="Obligatorio si contado ≠ esperado (mín. 5 caracteres)."
                          sx={fieldSx}
                        />
                      );
                    })()}
                    <TextField
                      fullWidth
                      size="small"
                      label="Notas de cierre (opcional)"
                      value={pos.cashNotes}
                      onChange={(e) => pos.setCashNotes(e.target.value)}
                      sx={fieldSx}
                    />
                    <button
                      type="button"
                      className={styles.chargeBtn}
                      disabled={pos.cashBusy}
                      onClick={() => void pos.closeCash()}
                    >
                      {pos.cashBusy ? "Cerrando…" : "Cerrar caja (corte)"}
                    </button>

                    {(pos.cashSession?.movements?.length || 0) > 0 ? (
                      <>
                        <h3 className={styles.cashSubhead}>
                          Movimientos de la sesión
                        </h3>
                        <div className={styles.scrollPanelSm}>
                          <table className={styles.historyTable}>
                            <thead>
                              <tr>
                                <th>Hora</th>
                                <th>Tipo</th>
                                <th>Monto</th>
                                <th>Motivo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pos.cashSession!.movements!.map((m) => (
                                <tr key={m.idCashMovement}>
                                  <td>
                                    {new Date(m.createdAt).toLocaleTimeString(
                                      "es-MX",
                                    )}
                                  </td>
                                  <td>
                                    {POS_CASH_MOVEMENT_LABELS[
                                      m.type as PosCashMovementType
                                    ] || m.type}
                                  </td>
                                  <td>{money(m.amount)}</td>
                                  <td>{m.reason || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            </section>

            <section className={styles.posPanel}>
              <div className={styles.posPanelHead}>
                <p className={styles.panelEyebrow}>Turnos</p>
                <h2>Sesiones recientes</h2>
                <p>Historial de aperturas y cortes de Bodega PCinBOX. Clic en una fila para ver movimientos.</p>
              </div>
              <div className={styles.posPanelBody}>
                {!pos.branchId ? (
                  <EmptyState
                    title="Caja no disponible"
                    description="No se pudo resolver la bodega de cobro."
                  />
                ) : pos.cashSessionsLoading && pos.cashSessions.length === 0 ? (
                  <EmptyState
                    title="Cargando…"
                    description="Consultando sesiones de caja."
                  />
                ) : pos.cashSessions.length === 0 ? (
                  <EmptyState
                    title="Sin sesiones"
                    description="Aún no hay aperturas ni cortes. Abre caja a la izquierda para empezar el turno."
                  />
                ) : (
                  <>
                    <div className={styles.scrollPanel}>
                      <table className={styles.historyTable}>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Apertura</th>
                            <th>Estado</th>
                            <th>Esperado</th>
                            <th>Dif.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pos.cashSessions.map((s) => (
                            <tr
                              key={s.idCashSession}
                              style={{ cursor: "pointer" }}
                              onClick={() =>
                                void pos.openCashSessionDetail(s.idCashSession)
                              }
                              title="Ver detalle de movimientos"
                            >
                              <td>#{s.idCashSession}</td>
                              <td>
                                {new Date(s.openedAt).toLocaleString("es-MX")}
                              </td>
                              <td>
                                <span
                                  className={`${styles.badge} ${
                                    s.status === "open"
                                      ? styles.badgeCompleted
                                      : styles.badgePending
                                  }`}
                                >
                                  {s.status === "open" ? "Abierta" : "Cerrada"}
                                </span>
                              </td>
                              <td>
                                {s.expectedCash != null
                                  ? money(s.expectedCash)
                                  : "—"}
                              </td>
                              <td>
                                {s.difference != null
                                  ? money(s.difference)
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {pos.cashSessionsTotalPages > 1 ? (
                      <div style={{ marginTop: 12 }}>
                        <ModernPagination
                          page={pos.cashSessionsPage}
                          pageCount={pos.cashSessionsTotalPages}
                          totalItems={pos.cashSessionsTotal}
                          pageSize={10}
                          onPageChange={(p) => void pos.loadCashSessions(p)}
                        />
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </section>

            <section className={`${styles.posPanel} ${styles.spanFull}`}>
              <div className={styles.posPanelHead}>
                <p className={styles.panelEyebrow}>Hardware</p>
                <h2>
                  <Printer size={18} strokeWidth={2.25} />
                  Impresora térmica / QZ Tray
                </h2>
                <p>
                  Instala QZ Tray en esta PC, permite este sitio y elige la
                  impresora. El cajón se abre por el kick de la impresora en
                  cobros con efectivo.
                </p>
              </div>
              <div className={styles.posPanelBody}>
                <div className={styles.cashForm}>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      disabled={pos.qzBusy}
                      onClick={() => void pos.refreshQzPrinters()}
                    >
                      {pos.qzBusy ? "Buscando…" : "Detectar impresoras"}
                    </button>
                    <TextField
                      select
                      size="small"
                      label="Impresora"
                      value={pos.qzSettings.printerName}
                      onChange={(e) =>
                        pos.updateQzSettings({ printerName: e.target.value })
                      }
                      sx={{ ...fieldSx, minWidth: 260 }}
                    >
                      <MenuItem value="">
                        <em>Sin seleccionar</em>
                      </MenuItem>
                      {(pos.qzPrinters.length
                        ? pos.qzPrinters
                        : pos.qzSettings.printerName
                          ? [pos.qzSettings.printerName]
                          : []
                      ).map((name) => (
                        <MenuItem key={name} value={name}>
                          {name}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      size="small"
                      label="Cajón (comando)"
                      value={pos.qzSettings.drawerDialect}
                      onChange={(e) =>
                        pos.updateQzSettings({
                          drawerDialect: e.target.value as "epson" | "star",
                        })
                      }
                      sx={{ ...fieldSx, minWidth: 180 }}
                    >
                      <MenuItem value="epson">Epson / ESC-POS</MenuItem>
                      <MenuItem value="star">Star</MenuItem>
                    </TextField>
                  </div>
                  <p className={styles.hitMeta} style={{ marginTop: 8 }}>
                    Elige la impresora térmica (Epson/Star). No uses «Microsoft
                    Print to PDF» ni similares: el ticket raw no es un PDF y
                    genera archivos rotos. Para PDF usa la vista previa HTML del
                    ticket y «Imprimir → Guardar como PDF».
                  </p>

                  <label
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      fontSize: 13,
                      marginTop: 8,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={pos.qzSettings.autoPrintOnCharge}
                      onChange={(e) =>
                        pos.updateQzSettings({
                          autoPrintOnCharge: e.target.checked,
                        })
                      }
                    />
                    Imprimir ticket al cobrar
                  </label>
                  <label
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      fontSize: 13,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={pos.qzSettings.openDrawerOnCash}
                      onChange={(e) =>
                        pos.updateQzSettings({
                          openDrawerOnCash: e.target.checked,
                        })
                      }
                    />
                    Abrir cajón en cobros con efectivo
                  </label>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      disabled={pos.qzBusy || !pos.qzSettings.printerName}
                      onClick={() => void pos.testQzPrint()}
                    >
                      Probar ticket
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      disabled={pos.qzBusy || !pos.qzSettings.printerName}
                      onClick={() => void pos.testQzDrawer()}
                    >
                      Abrir cajón
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : pos.tab === "garantias" ? (
          <section className={styles.posPanel}>
            <div className={styles.posPanelHead}>
              <div className={styles.historyHeadRow}>
                <div>
                  <p className={styles.panelEyebrow}>Series</p>
                  <h2>
                    <Shield size={18} strokeWidth={2.25} />
                    Garantías
                  </h2>
                  <p>
                    Ventas con número de serie: consulta e imprime la hoja de
                    garantía.
                  </p>
                </div>
                {!pos.warrantiesLoading && pos.warrantiesTotal > 0 ? (
                  <div className={styles.historyStat}>
                    <span className={styles.historyStatLabel}>Resultados</span>
                    <strong>{pos.warrantiesTotal}</strong>
                  </div>
                ) : null}
              </div>
            </div>
            <div className={styles.posPanelBody}>
              <div className={styles.historyFilters}>
                <TextField
                  size="small"
                  label="Folio"
                  placeholder="PV-0000001"
                  value={pos.warrantyFolio}
                  onChange={(e) => pos.setWarrantyFolio(e.target.value)}
                  sx={{ ...fieldSx, maxWidth: 220 }}
                />
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => void pos.loadWarranties(1)}
                >
                  Buscar
                </button>
              </div>

              {pos.warrantiesLoading ? (
                <div
                  style={{ display: "grid", placeItems: "center", padding: 40 }}
                >
                  <CircularProgress sx={{ color: "#bb3d4b" }} />
                </div>
              ) : pos.warranties.length === 0 ? (
                <EmptyState
                  title="Sin garantías"
                  description="Aún no hay ventas completadas con números de serie. Al cobrar productos con serie aparecerán aquí."
                />
              ) : (
                <div className={styles.scrollPanel}>
                  <table className={styles.historyTable}>
                  <thead>
                    <tr>
                      <th>Clave</th>
                      <th>Venta</th>
                      <th>Bodega</th>
                      <th>Fecha</th>
                      <th>Cliente</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pos.warranties.map((sale) => (
                      <tr key={sale.idPosSale}>
                        <td>#{sale.idPosSale}</td>
                        <td>{sale.folio}</td>
                        <td>
                          {formatPosBranchUiLabel({
                            name: sale.branchName,
                            city: sale.branchCity,
                            fallback: "—",
                          })}
                        </td>
                        <td>
                          {new Date(sale.createdAt).toLocaleDateString("es-MX")}
                        </td>
                        <td>{sale.customerName || "—"}</td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              type="button"
                              className={styles.secondaryBtn}
                              title="Imprimir hoja"
                              onClick={() =>
                                pos.openWarrantySheet(sale.idPosSale)
                              }
                            >
                              <Printer size={14} />
                            </button>
                            <button
                              type="button"
                              className={styles.secondaryBtn}
                              title="Ver detalle"
                              onClick={() =>
                                void pos.openWarrantyDetail(sale.idPosSale)
                              }
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              )}

              {pos.warrantiesTotalPages > 1 ? (
                <div style={{ marginTop: 16 }}>
                  <ModernPagination
                    page={pos.warrantiesPage}
                    pageCount={pos.warrantiesTotalPages}
                    totalItems={pos.warrantiesTotal}
                    pageSize={15}
                    onPageChange={(p) => void pos.loadWarranties(p)}
                  />
                </div>
              ) : null}
            </div>

            {pos.warrantyDetail ? (
              <div
                className={styles.drawer}
                role="dialog"
                aria-modal="true"
                onClick={() => pos.setWarrantyDetail(null)}
              >
                <div
                  className={`${styles.drawerPanel} ${styles.detailDrawer}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={styles.detailHero}>
                    <div className={styles.detailHeroTop}>
                      <div>
                        <p className={styles.detailEyebrow}>Garantía</p>
                        <h3 className={styles.detailFolio}>
                          Compra #{pos.warrantyDetail.idPosSale}
                        </h3>
                        <p className={styles.detailWhen}>
                          Folio {pos.warrantyDetail.folio} ·{" "}
                          {new Date(
                            pos.warrantyDetail.createdAt,
                          ).toLocaleString("es-MX")}
                        </p>
                      </div>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => pos.setWarrantyDetail(null)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: "16px 22px 22px" }}>
                    <div className={styles.detailItems}>
                      {pos.warrantyDetail.items.map((it) => (
                        <div
                          key={it.idPosSaleItem}
                          className={styles.detailItem}
                        >
                          <div className={styles.detailItemMain}>
                            <strong>{it.productName}</strong>
                            {it.productUpc ? (
                              <span>UPC: {it.productUpc}</span>
                            ) : null}
                            {it.serials && it.serials.length > 0 ? (
                              <span>
                                Número de Serie:{" "}
                                {it.serials
                                  .map((s) => s.serialNumber)
                                  .join(", ")}
                              </span>
                            ) : (
                              <span>Sin serie registrada</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <button
                        type="button"
                        className={styles.chargeBtn}
                        onClick={() =>
                          pos.openWarrantySheet(pos.warrantyDetail!.idPosSale)
                        }
                      >
                        <Printer
                          size={14}
                          style={{ display: "inline", marginRight: 6 }}
                        />
                        Imprimir hoja de garantía
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : (
          <section className={styles.posPanel}>
            <div className={styles.posPanelHead}>
              <div className={styles.historyHeadRow}>
                <div>
                  <p className={styles.panelEyebrow}>Consultas</p>
                  <h2>
                    <History size={18} strokeWidth={2.25} />
                    Historial de ventas POS
                  </h2>
                  <p>
                    Consulta, reimpresión de ticket y cancelaciones con
                    restauración de inventario.
                  </p>
                </div>
                {!pos.historyLoading && pos.historyTotal > 0 ? (
                  <div className={styles.historyStat}>
                    <span className={styles.historyStatLabel}>Resultados</span>
                    <strong>{pos.historyTotal}</strong>
                  </div>
                ) : null}
              </div>
            </div>
            <div className={styles.posPanelBody}>
              <div className={styles.historyFilters}>
                <TextField
                  size="small"
                  label="Folio"
                  placeholder="PV-0000001"
                  value={pos.historyFolio}
                  onChange={(e) => pos.setHistoryFolio(e.target.value)}
                  sx={{ ...fieldSx, minWidth: 180, flex: "1 1 160px" }}
                />
                <TextField
                  select
                  size="small"
                  label="Estado"
                  value={pos.historyStatus}
                  onChange={(e) => pos.setHistoryStatus(e.target.value)}
                  sx={{ ...fieldSx, minWidth: 180, flex: "1 1 160px" }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="completed">Completada</MenuItem>
                  <MenuItem value="cancelled">Cancelada</MenuItem>
                  <MenuItem value="pending_payment">Pendiente pago</MenuItem>
                </TextField>
                <button
                  type="button"
                  className={styles.chargeBtn}
                  style={{ marginTop: 0, width: "auto", padding: "10px 18px" }}
                  onClick={() => void pos.loadHistory(1)}
                >
                  Filtrar
                </button>
              </div>

              {pos.historyLoading ? (
                <div
                  style={{ display: "grid", placeItems: "center", padding: 48 }}
                >
                  <CircularProgress sx={{ color: "#bb3d4b" }} />
                </div>
              ) : pos.history.length === 0 ? (
                <EmptyState
                  title="Sin ventas"
                  description="Aún no hay ventas POS con estos filtros."
                />
              ) : (
                <>
                  <div className={styles.historyList}>
                    {pos.history.map((sale) => {
                      const paySummary =
                        sale.payments?.length > 0
                          ? sale.payments
                              .map(
                                (p) =>
                                  POS_PAYMENT_LABELS[p.method] || p.method,
                              )
                              .join(" · ")
                          : "Sin pagos";
                      const itemCount = sale.items?.length || 0;
                      return (
                        <article
                          key={sale.idPosSale}
                          className={styles.historyCard}
                        >
                          <div className={styles.historyCardMain}>
                            <div className={styles.historyCardTop}>
                              <div className={styles.historyFolioBlock}>
                                <span className={styles.historyFolio}>
                                  {sale.folio}
                                </span>
                                <span
                                  className={`${styles.badge} ${statusBadge(sale.status)}`}
                                >
                                  {statusLabel(sale.status)}
                                </span>
                              </div>
                              <div className={styles.historyTotal}>
                                {money(sale.total)}
                              </div>
                            </div>
                            <div className={styles.historyMetaGrid}>
                              <div>
                                <span className={styles.historyMetaLabel}>
                                  Fecha
                                </span>
                                <span className={styles.historyMetaValue}>
                                  {new Date(sale.createdAt).toLocaleString(
                                    "es-MX",
                                  )}
                                </span>
                              </div>
                              <div>
                                <span className={styles.historyMetaLabel}>
                                  Cliente
                                </span>
                                <span className={styles.historyMetaValue}>
                                  {sale.customerName || "Público general"}
                                </span>
                              </div>
                              <div>
                                <span className={styles.historyMetaLabel}>
                                  Vendedor
                                </span>
                                <span className={styles.historyMetaValue}>
                                  {sale.cashierName || "—"}
                                </span>
                              </div>
                              <div>
                                <span className={styles.historyMetaLabel}>
                                  Pago
                                </span>
                                <span className={styles.historyMetaValue}>
                                  {paySummary}
                                </span>
                              </div>
                            </div>
                            <div className={styles.historyChips}>
                              <span className={styles.historyChip}>
                                {itemCount}{" "}
                                {itemCount === 1 ? "producto" : "productos"}
                              </span>
                              {sale.branchName || sale.branchCity ? (
                                <span className={styles.historyChip}>
                                  {formatPosBranchUiLabel({
                                    name: sale.branchName,
                                    city: sale.branchCity,
                                  })}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className={styles.historyCardActions}>
                            <button
                              type="button"
                              className={styles.secondaryBtn}
                              onClick={() =>
                                void pos.openDetail(sale.idPosSale)
                              }
                            >
                              Ver
                            </button>
                            <button
                              type="button"
                              className={styles.primaryOutlineBtn}
                              onClick={() => pos.openTicket(sale.idPosSale)}
                            >
                              <Printer
                                size={14}
                                style={{ display: "inline", marginRight: 4 }}
                              />
                              Imprimir ticket
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  {pos.historyTotalPages > 1 ? (
                    <div style={{ marginTop: 16 }}>
                      <ModernPagination
                        page={pos.historyPage}
                        pageCount={pos.historyTotalPages}
                        totalItems={pos.historyTotal}
                        pageSize={15}
                        onPageChange={(p) => void pos.loadHistory(p)}
                      />
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </section>
        )}

        {pos.detailSale ? (
          <div
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            onClick={() => pos.setDetailSale(null)}
          >
            <div
              className={`${styles.drawerPanel} ${styles.detailDrawer}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.detailHero}>
                <div className={styles.detailHeroTop}>
                  <div>
                    <p className={styles.detailEyebrow}>Detalle de venta</p>
                    <h3 className={styles.detailFolio}>
                      {pos.detailSale.folio}
                    </h3>
                    <p className={styles.detailWhen}>
                      {new Date(pos.detailSale.createdAt).toLocaleString(
                        "es-MX",
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => pos.setDetailSale(null)}
                    aria-label="Cerrar"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className={styles.detailHeroBottom}>
                  <span
                    className={`${styles.badge} ${statusBadge(pos.detailSale.status)}`}
                  >
                    {statusLabel(pos.detailSale.status)}
                  </span>
                  <div className={styles.detailHeroTotal}>
                    <span>Total</span>
                    <strong>{money(pos.detailSale.total)}</strong>
                  </div>
                </div>
              </div>

              <div className={styles.detailGrid}>
                <div className={styles.detailTile}>
                  <span className={styles.historyMetaLabel}>Cliente</span>
                  <strong>{pos.detailSale.customerName || "—"}</strong>
                  {pos.detailSale.customerPhone ? (
                    <span className={styles.detailTileSub}>
                      {pos.detailSale.customerPhone}
                    </span>
                  ) : null}
                  {pos.detailSale.customerEmail ? (
                    <span className={styles.detailTileSub}>
                      {pos.detailSale.customerEmail}
                    </span>
                  ) : null}
                </div>
                <div className={styles.detailTile}>
                  <span className={styles.historyMetaLabel}>Vendedor</span>
                  <strong>{pos.detailSale.cashierName || "—"}</strong>
                </div>
                <div className={styles.detailTile}>
                  <span className={styles.historyMetaLabel}>Caja PCinBOX</span>
                  <strong>
                    {formatPosBranchUiLabel({
                      name: pos.detailSale.branchName,
                      city: pos.detailSale.branchCity,
                      fallback: "Bodega PCinBOX",
                    })}
                  </strong>
                </div>
                <div className={styles.detailTile}>
                  <span className={styles.historyMetaLabel}>Resumen</span>
                  <strong>
                    {pos.detailSale.items.length} producto
                    {pos.detailSale.items.length === 1 ? "" : "s"}
                  </strong>
                  <span className={styles.detailTileSub}>
                    Subtotal {money(pos.detailSale.subtotal)}
                  </span>
                </div>
              </div>

              <section className={styles.detailSection}>
                <h4>Productos</h4>
                <div className={styles.detailItems}>
                  {pos.detailSale.items.map((it) => (
                    <div key={it.idPosSaleItem} className={styles.detailItem}>
                      <div className={styles.detailItemMain}>
                        <strong>
                          {it.quantity} × {it.productName}
                        </strong>
                        {it.branchLabel || it.branchName ? (
                          <span>
                            Bodega:{" "}
                            {formatPosBranchUiLabel({
                              name: it.branchName,
                              label: it.branchLabel,
                              city: it.branchCity,
                            })}
                          </span>
                        ) : null}
                        {it.serials && it.serials.length > 0 ? (
                          <span>
                            S/N:{" "}
                            {it.serials.map((s) => s.serialNumber).join(", ")}
                          </span>
                        ) : null}
                      </div>
                      <div className={styles.detailItemPrice}>
                        {money(it.lineTotal)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className={styles.detailSection}>
                <h4>Pagos</h4>
                <div className={styles.detailPayments}>
                  {pos.detailSale.payments.map((p) => (
                    <div key={p.idPosPayment} className={styles.detailPayment}>
                      <span>
                        {POS_PAYMENT_LABELS[p.method] || p.method}
                        {p.reference ? (
                          <em className={styles.detailTileSub}>
                            {" "}
                            · {p.reference}
                          </em>
                        ) : null}
                      </span>
                      <strong>{money(p.amount)}</strong>
                    </div>
                  ))}
                </div>
              </section>

              {pos.detailSale.notes ? (
                <section className={styles.detailSection}>
                  <h4>Notas</h4>
                  <p className={styles.detailNotes}>{pos.detailSale.notes}</p>
                </section>
              ) : null}

              <div className={styles.drawerActions}>
                <button
                  type="button"
                  className={styles.chargeBtn}
                  style={{ marginTop: 0, width: "auto" }}
                  onClick={() => pos.openTicket(pos.detailSale!.idPosSale)}
                >
                  <Printer
                    size={14}
                    style={{ display: "inline", marginRight: 6 }}
                  />
                  Imprimir ticket
                </button>
                {pos.detailSale.status === "pending_payment" ? (
                  <>
                    {(pos.detailSale.checkoutLinkUrl ||
                      pos.detailSale.paymentLinkUrl) && (
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() =>
                          window.open(
                            pos.detailSale!.checkoutLinkUrl ||
                              pos.detailSale!.paymentLinkUrl!,
                            "_blank",
                          )
                        }
                      >
                        Abrir link guardado
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => void pos.retryPaymentLink()}
                    >
                      Regenerar link OpenPay
                    </button>
                    {pos.isAdmin ? (
                      <button
                        type="button"
                        className={styles.chargeBtn}
                        style={{ marginTop: 0, width: "auto" }}
                        onClick={() => void pos.confirmPayment()}
                      >
                        Confirmar pago (admin)
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>

              {pos.detailSale.status !== "cancelled" ? (
                <div className={styles.detailCancelBox}>
                  {pos.cancelGate.allowed ? (
                    <>
                      <h4>Cancelación</h4>
                      <p className={styles.detailTileSub}>
                        Restaura inventario y registra el evento de auditoría.
                      </p>
                      <TextField
                        fullWidth
                        size="small"
                        label="Motivo de cancelación"
                        value={pos.cancelReason}
                        onChange={(e) => pos.setCancelReason(e.target.value)}
                        sx={{ ...fieldSx, mt: 1 }}
                        multiline
                        minRows={2}
                      />
                      <button
                        type="button"
                        className={styles.dangerBtn}
                        disabled={pos.cancelling}
                        onClick={() => void pos.cancelSale()}
                        style={{ marginTop: 10 }}
                      >
                        {pos.cancelling ? "Cancelando…" : "Cancelar venta"}
                      </button>
                    </>
                  ) : (
                    <p className={styles.detailWarn}>
                      {pos.cancelGate.reason ||
                        "No tienes permiso para cancelar esta venta."}
                    </p>
                  )}
                </div>
              ) : (
                <div className={styles.detailCancelBox}>
                  <h4>Venta cancelada</h4>
                  <p className={styles.detailWarn}>
                    Motivo: {pos.detailSale.cancelReason || "—"}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {pos.ticketOpen && pos.lastSale ? (
          <div
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            onClick={() => pos.setTicketOpen(false)}
          >
            <div
              className={styles.drawerPanel}
              style={{
                height: "auto",
                maxHeight: "90vh",
                placeSelf: "center",
                borderRadius: 16,
                width: "min(420px, 94vw)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ marginTop: 0 }}>Venta {pos.lastSale.folio}</h3>
              <p style={{ fontSize: 14 }}>
                Total {money(pos.lastSale.total)} ·{" "}
                {statusLabel(pos.lastSale.status)}
                {pos.lastSale.quoteNumber
                  ? ` · No. Cotización: ${pos.lastSale.quoteNumber}`
                  : ""}
              </p>
              {pos.lastPaymentLink ? (
                <p style={{ fontSize: 13, wordBreak: "break-all" }}>
                  Link de pago:{" "}
                  <a
                    href={pos.lastPaymentLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {pos.lastPaymentLink}
                  </a>
                </p>
              ) : null}
              <div className={styles.drawerActions}>
                <button
                  type="button"
                  className={styles.chargeBtn}
                  style={{ marginTop: 0 }}
                  onClick={() => pos.openTicket(pos.lastSale!.idPosSale)}
                >
                  <Printer
                    size={14}
                    style={{ display: "inline", marginRight: 6 }}
                  />
                  Imprimir ticket
                </button>
                {pos.lastPaymentLink ? (
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => window.open(pos.lastPaymentLink!, "_blank")}
                  >
                    Abrir link de pago
                  </button>
                ) : null}
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => pos.setTicketOpen(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {pos.cashSessionDetail || pos.cashSessionDetailLoading ? (
          <div
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            onClick={() => pos.setCashSessionDetail(null)}
          >
            <div
              className={styles.drawerPanel}
              style={{
                height: "auto",
                maxHeight: "90vh",
                placeSelf: "center",
                borderRadius: 16,
                width: "min(560px, 96vw)",
                overflow: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {pos.cashSessionDetailLoading || !pos.cashSessionDetail ? (
                <div style={{ display: "grid", placeItems: "center", padding: 32 }}>
                  <CircularProgress sx={{ color: "#bb3d4b" }} />
                </div>
              ) : (
                <>
                  <h3 style={{ marginTop: 0 }}>
                    Sesión #{pos.cashSessionDetail.idCashSession}
                  </h3>
                  <div className={styles.totalsBox}>
                    <div className={styles.totalsRow}>
                      <span>Estado</span>
                      <strong>
                        {pos.cashSessionDetail.status === "open"
                          ? "Abierta"
                          : "Cerrada"}
                      </strong>
                    </div>
                    <div className={styles.totalsRow}>
                      <span>Abierta por</span>
                      <span>{pos.cashSessionDetail.openedByName || "—"}</span>
                    </div>
                    <div className={styles.totalsRow}>
                      <span>Desde</span>
                      <span>
                        {new Date(
                          pos.cashSessionDetail.openedAt,
                        ).toLocaleString("es-MX")}
                      </span>
                    </div>
                    {pos.cashSessionDetail.closedAt ? (
                      <div className={styles.totalsRow}>
                        <span>Cierre</span>
                        <span>
                          {new Date(
                            pos.cashSessionDetail.closedAt,
                          ).toLocaleString("es-MX")}
                          {pos.cashSessionDetail.closedByName
                            ? ` · ${pos.cashSessionDetail.closedByName}`
                            : ""}
                        </span>
                      </div>
                    ) : null}
                    <div className={styles.totalsRow}>
                      <span>Fondo</span>
                      <span>{money(pos.cashSessionDetail.openingFloat)}</span>
                    </div>
                    <div className={styles.totalsRow}>
                      <span>Esperado</span>
                      <span>
                        {pos.cashSessionDetail.expectedCash != null
                          ? money(pos.cashSessionDetail.expectedCash)
                          : "—"}
                      </span>
                    </div>
                    <div className={styles.totalsRow}>
                      <span>Contado</span>
                      <span>
                        {pos.cashSessionDetail.closingCounted != null
                          ? money(pos.cashSessionDetail.closingCounted)
                          : "—"}
                      </span>
                    </div>
                    <div className={styles.totalsGrand}>
                      <span>Diferencia</span>
                      <span>
                        {pos.cashSessionDetail.difference != null
                          ? money(pos.cashSessionDetail.difference)
                          : "—"}
                      </span>
                    </div>
                    {pos.cashSessionDetail.differenceReason ? (
                      <div className={styles.totalsRow}>
                        <span>Motivo descuadre</span>
                        <span>{pos.cashSessionDetail.differenceReason}</span>
                      </div>
                    ) : null}
                    {pos.cashSessionDetail.notes ? (
                      <div className={styles.totalsRow}>
                        <span>Notas</span>
                        <span style={{ whiteSpace: "pre-wrap" }}>
                          {pos.cashSessionDetail.notes}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <h4 style={{ marginBottom: 8 }}>Movimientos</h4>
                  {(pos.cashSessionDetail.movements?.length || 0) === 0 ? (
                    <p style={{ fontSize: 13, opacity: 0.75 }}>
                      Sin movimientos registrados.
                    </p>
                  ) : (
                    <div className={styles.scrollPanelSm}>
                      <table className={styles.historyTable}>
                        <thead>
                          <tr>
                            <th>Hora</th>
                            <th>Tipo</th>
                            <th>Monto</th>
                            <th>Motivo</th>
                            <th>Usuario</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pos.cashSessionDetail.movements!.map((m) => (
                            <tr key={m.idCashMovement}>
                              <td>
                                {new Date(m.createdAt).toLocaleString("es-MX")}
                              </td>
                              <td>
                                {POS_CASH_MOVEMENT_LABELS[
                                  m.type as PosCashMovementType
                                ] || m.type}
                              </td>
                              <td>{money(m.amount)}</td>
                              <td>{m.reason || "—"}</td>
                              <td>{m.userName || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className={styles.drawerActions}>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => pos.setCashSessionDetail(null)}
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </AdminPageShell>
  );
}
