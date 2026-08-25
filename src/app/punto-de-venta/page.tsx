"use client";

import {
  Autocomplete,
  CircularProgress,
  MenuItem,
  TextField,
} from "@mui/material";
import {
  Banknote,
  ChevronDown,
  History,
  Plus,
  Search,
  ShoppingCart,
  Store,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import AdminPageShell from "../shared/components/layout/AdminPageShell";
import EmptyState from "../shared/components/common/emptyState/EmptyState";
import ModernPagination from "../shared/components/common/paginator/ModernPagination";
import usePermissions from "../hooks/usePermissions";
import {
  POS_CASH_MOVEMENT_LABELS,
  POS_PAYMENT_LABELS,
  PosCashMovementType,
  PosPaymentMethod,
  PosProductHit,
  PosSaleStatus,
} from "../interfaces/pos/pos.interface";
import usePos from "./usePos";
import styles from "./punto-de-venta.module.css";

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    "&:hover fieldset": { borderColor: "#bb3d4b" },
    "&.Mui-focused fieldset": { borderColor: "#bb3d4b" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#bb3d4b" },
};

const money = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

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

function productThumb(url?: string | null) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={styles.hitImg}
      src={
        url ||
        "https://ik.imagekit.io/pcinboxkit/logos/logo.png?updatedAt=1759534318587"
      }
      alt=""
    />
  );
}

export default function PuntoDeVentaPage() {
  const { can, hydrated } = usePermissions();
  const pos = usePos();

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
      subtitle="Cobro en sucursal con el mismo catálogo e inventario de la tienda"
    >
      <div className={styles.posPage}>
        {pos.showGuide ? (
          <section className={styles.posGuide}>
            <div className={styles.posGuideHead}>
              <div>
                <h3>¿Cómo funciona Punto de Venta?</h3>
                <p>
                  Es el mostrador físico: cobras aquí con el inventario de la
                  tienda/almacén que elijas abajo.
                </p>
              </div>
              <button
                type="button"
                className={styles.guideDismiss}
                onClick={() => pos.dismissGuide()}
              >
                Entendido
              </button>
            </div>
            <ol className={styles.posGuideSteps}>
              <li>
                <strong>Sucursal</strong> — Tienda o almacén donde estás
                cobrando. Define qué stock ves, la caja y el historial. No es
                Amazon.com: es un registro de tu base de datos (nombre + ciudad
                del almacén).
              </li>
              <li>
                <strong>Caja</strong> — Abre turno con fondo inicial. Solo es
                obligatorio si cobras en <em>efectivo</em>.
              </li>
              <li>
                <strong>Cobrar</strong> — Busca o escanea (F2), arma el carrito,
                cliente opcional, formas de pago y F4 o botón Cobrar.
              </li>
              <li>
                <strong>Historial</strong> — Tickets, cancelaciones y ventas
                OpenPay pendientes.
              </li>
              <li>
                <strong>Series / Inventario</strong> — Garantías por número de
                serie y movimientos de stock.
              </li>
            </ol>
          </section>
        ) : (
          <button
            type="button"
            className={styles.guideToggle}
            onClick={() => pos.openGuide()}
          >
            <ChevronDown size={16} />
            Ver guía rápida
          </button>
        )}

        <div className={styles.posTop}>
          <div className={styles.posTabs}>
            <button
              type="button"
              className={`${styles.posTab} ${pos.tab === "cobrar" ? styles.posTabActive : ""}`}
              onClick={() => pos.setTab("cobrar")}
            >
              Cobrar
            </button>
            <button
              type="button"
              className={`${styles.posTab} ${pos.tab === "historial" ? styles.posTabActive : ""}`}
              onClick={() => pos.setTab("historial")}
            >
              Historial
            </button>
            <button
              type="button"
              className={`${styles.posTab} ${pos.tab === "caja" ? styles.posTabActive : ""}`}
              onClick={() => pos.setTab("caja")}
            >
              Caja
            </button>
            <button
              type="button"
              className={`${styles.posTab} ${pos.tab === "series" ? styles.posTabActive : ""}`}
              onClick={() => pos.setTab("series")}
            >
              Series
            </button>
            <button
              type="button"
              className={`${styles.posTab} ${pos.tab === "inventario" ? styles.posTabActive : ""}`}
              onClick={() => pos.setTab("inventario")}
            >
              Inventario
            </button>
          </div>

          <div className={styles.branchPicker}>
            <Store size={18} color="#bb3d4b" />
            <TextField
              select
              size="small"
              label="Sucursal (tienda / almacén)"
              value={pos.branchId ?? ""}
              onChange={(e) => pos.setBranchId(Number(e.target.value))}
              helperText={
                pos.selectedBranch
                  ? `Stock, caja e historial de: ${pos.selectedBranch.label}`
                  : "Elige dónde estás cobrando hoy"
              }
              FormHelperTextProps={{ className: styles.branchHelper }}
              sx={{ ...fieldSx, minWidth: 280, flex: "1 1 280px" }}
            >
              {pos.branches.map((b) => (
                <MenuItem key={b.idBranche} value={b.idBranche}>
                  {b.label}
                </MenuItem>
              ))}
            </TextField>
            <span className={styles.shortcutHint}>F2 buscar · F4 cobrar</span>
          </div>
        </div>

        {pos.tab === "cobrar" ? (
          <div className={styles.posGrid}>
            {!pos.cashOpen && pos.branchId ? (
              <div className={styles.cashBanner} style={{ gridColumn: "1 / -1" }}>
                <Wallet size={16} />
                <span>
                  Caja cerrada: no podrás cobrar en efectivo hasta abrirla en la
                  pestaña Caja. Tarjeta, transferencia y OpenPay sí están.
                </span>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => pos.setTab("caja")}
                >
                  Ir a Caja
                </button>
              </div>
            ) : null}
            {pos.cashOpen && pos.cashExpected != null ? (
              <div
                className={`${styles.cashBanner} ${styles.cashBannerOk}`}
                style={{ gridColumn: "1 / -1" }}
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
                <h2>Buscar producto</h2>
                <p>Nombre, SKU, UPC o número de parte. Ideal para escáner.</p>
              </div>
              <div className={styles.posPanelBody}>
                <div className={styles.searchRow}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Buscar o escanear…"
                    value={pos.search}
                    onChange={(e) => pos.setSearch(e.target.value)}
                    inputRef={pos.searchRef}
                    sx={fieldSx}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && pos.hits[0]) {
                        e.preventDefault();
                        pos.addProduct(pos.hits[0]);
                      }
                    }}
                    InputProps={{
                      startAdornment: (
                        <Search size={18} style={{ marginRight: 8, color: "#9ca3af" }} />
                      ),
                      endAdornment: pos.searching ? (
                        <CircularProgress size={18} />
                      ) : null,
                    }}
                  />
                </div>

                {!pos.branchId ? (
                  <EmptyState
                    title="Elige sucursal"
                    description="Selecciona la sucursal para ver existencias reales."
                  />
                ) : pos.hits.length === 0 ? (
                  <EmptyState
                    title={pos.search ? "Sin resultados" : "Listo para cobrar"}
                    description={
                      pos.search
                        ? "Prueba con SKU, UPC o parte del nombre."
                        : "Escribe o escanea un código para agregar al carrito."
                    }
                  />
                ) : (
                  <div className={styles.hits}>
                    {pos.hits.map((hit: PosProductHit) => {
                      const img =
                        typeof hit.image_url === "string"
                          ? hit.image_url
                          : Array.isArray(hit.image_url)
                            ? String(hit.image_url[0] || "")
                            : null;
                      return (
                        <button
                          key={hit.idProduct}
                          type="button"
                          className={styles.hit}
                          onClick={() => pos.addProduct(hit)}
                        >
                          {productThumb(img)}
                          <div>
                            <div className={styles.hitTitle}>{hit.name}</div>
                            <div className={styles.hitMeta}>
                              {[hit.marca, hit.sku && `SKU ${hit.sku}`, hit.upc && `UPC ${hit.upc}`]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                          </div>
                          <div>
                            <div className={styles.hitPrice}>{money(hit.price)}</div>
                            <div className={styles.hitStock}>
                              Stock suc.: {hit.stockBranch}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <aside className={styles.posPanel}>
              <div className={styles.posPanelHead}>
                <h2>
                  <ShoppingCart size={16} style={{ display: "inline", marginRight: 6 }} />
                  Carrito
                </h2>
                <p>
                  Descuento máx. {pos.maxDiscount}%
                  {pos.isAdmin ? " (admin)" : " (vendedor)"}
                </p>
              </div>
              <div className={styles.posPanelBody}>
                <Autocomplete
                  options={pos.customerHits}
                  getOptionLabel={(o) => o.label}
                  value={pos.customer}
                  onChange={(_, v) => pos.setCustomer(v)}
                  onInputChange={(_, v) => pos.setCustomerQuery(v)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      label="Cliente (opcional)"
                      placeholder="Público general si vacío"
                      sx={{ ...fieldSx, mb: 1.5 }}
                    />
                  )}
                />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  <TextField
                    size="small"
                    label="Email (OpenPay)"
                    value={pos.guestEmail}
                    onChange={(e) => pos.setGuestEmail(e.target.value)}
                    sx={fieldSx}
                    placeholder={pos.customer?.email || ""}
                  />
                  <TextField
                    size="small"
                    label="Teléfono (OpenPay)"
                    value={pos.guestPhone}
                    onChange={(e) => pos.setGuestPhone(e.target.value)}
                    sx={fieldSx}
                    placeholder={pos.customer?.phone || ""}
                  />
                </div>

                {pos.cart.length === 0 ? (
                  <EmptyState
                    title="Carrito vacío"
                    description="Agrega productos desde el buscador."
                  />
                ) : (
                  <div className={styles.cartList}>
                    {pos.cart.map((line) => (
                      <div key={line.key} className={styles.cartLine}>
                        <div className={styles.cartLineTop}>
                          <div className={styles.cartLineName}>{line.name}</div>
                          <button
                            type="button"
                            className={styles.dangerBtn}
                            onClick={() => pos.removeLine(line.productId)}
                            aria-label="Quitar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className={styles.cartControls}>
                          <TextField
                            size="small"
                            type="number"
                            label="Cant."
                            value={line.quantity}
                            onChange={(e) =>
                              pos.updateLine(line.productId, {
                                quantity: Number(e.target.value),
                              })
                            }
                            sx={fieldSx}
                            inputProps={{ min: 1, max: line.stockBranch }}
                          />
                          <TextField
                            size="small"
                            type="number"
                            label="Precio"
                            value={line.unitPrice}
                            onChange={(e) =>
                              pos.updateLine(line.productId, {
                                unitPrice: Number(e.target.value),
                              })
                            }
                            sx={fieldSx}
                            disabled={!pos.isAdmin}
                          />
                          <TextField
                            size="small"
                            type="number"
                            label={`Desc. % (≤${pos.maxDiscount})`}
                            value={line.discountPct}
                            onChange={(e) =>
                              pos.updateLine(line.productId, {
                                discountPct: Number(e.target.value),
                              })
                            }
                            sx={fieldSx}
                            inputProps={{ min: 0, max: pos.maxDiscount, step: 0.5 }}
                          />
                        </div>
                        <div className={styles.totalsRow} style={{ marginTop: 8 }}>
                          <span>Línea</span>
                          <strong>
                            {money(
                              pos.lineTotal(
                                line.unitPrice,
                                line.quantity,
                                line.discountPct,
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
                            {pos.isAdmin ? (
                              <button
                                type="button"
                                className={styles.secondaryBtn}
                                onClick={() =>
                                  void pos.toggleRequiresSerial(
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
                                  line.productId,
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

                <div className={styles.totalsBox}>
                  <div className={styles.totalsRow}>
                    <span>Subtotal</span>
                    <span>{money(pos.totals.subtotal)}</span>
                  </div>
                  <div className={styles.totalsRow}>
                    <span>Descuentos</span>
                    <span>-{money(pos.totals.discountTotal)}</span>
                  </div>
                  <div className={styles.totalsGrand}>
                    <span>Total</span>
                    <span>{money(pos.totals.total)}</span>
                  </div>
                  <div className={styles.totalsRow}>
                    <span>Pagado</span>
                    <span>{money(pos.paidSum)}</span>
                  </div>
                  <div className={styles.totalsRow}>
                    <span>Restante</span>
                    <strong style={{ color: pos.remaining > 0.009 ? "#bb3d4b" : "#166534" }}>
                      {money(pos.remaining)}
                    </strong>
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: 13 }}>
                      <Banknote size={14} style={{ display: "inline", marginRight: 4 }} />
                      Formas de pago
                    </strong>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => pos.addPayment("efectivo_sucursal")}
                    >
                      <Plus size={14} style={{ display: "inline", marginRight: 4 }} />
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
                          {(Object.keys(POS_PAYMENT_LABELS) as PosPaymentMethod[]).map(
                            (m) => (
                              <MenuItem key={m} value={m}>
                                {POS_PAYMENT_LABELS[m]}
                              </MenuItem>
                            ),
                          )}
                        </TextField>
                        <TextField
                          size="small"
                          type="number"
                          label="Monto"
                          value={p.amount}
                          onChange={(e) =>
                            pos.updatePayment(p.id, {
                              amount: Number(e.target.value),
                            })
                          }
                          sx={fieldSx}
                        />
                        <TextField
                          size="small"
                          label="Ref."
                          value={p.reference}
                          onChange={(e) =>
                            pos.updatePayment(p.id, { reference: e.target.value })
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

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
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
                  disabled={pos.charging || pos.cart.length === 0}
                  onClick={() => void pos.charge()}
                >
                  {pos.charging ? "Procesando…" : `Cobrar ${money(pos.totals.total)}`}
                </button>
              </div>
            </aside>
          </div>
        ) : pos.tab === "caja" ? (
          <div className={styles.cashLayout}>
            <section className={styles.posPanel}>
              <div className={styles.posPanelHead}>
                <h2>
                  <Wallet size={16} style={{ display: "inline", marginRight: 6 }} />
                  Control de caja
                </h2>
                <p>
                  Abre con fondo, registra entradas/salidas y cierra con corte.
                  Obligatorio para cobros en efectivo.
                </p>
              </div>
              <div className={styles.posPanelBody}>
                {!pos.branchId ? (
                  <EmptyState
                    title="Elige sucursal"
                    description="Selecciona la sucursal para operar la caja."
                  />
                ) : pos.cashLoading ? (
                  <div style={{ display: "grid", placeItems: "center", padding: 40 }}>
                    <CircularProgress sx={{ color: "#bb3d4b" }} />
                  </div>
                ) : !pos.cashOpen ? (
                  <div className={styles.cashForm}>
                    <EmptyState
                      title="Caja cerrada"
                      description="Abre una sesión con el fondo inicial en efectivo."
                    />
                    <TextField
                      size="small"
                      type="number"
                      label="Fondo inicial"
                      value={pos.openingFloat}
                      onChange={(e) => pos.setOpeningFloat(e.target.value)}
                      sx={{ ...fieldSx, maxWidth: 220 }}
                      inputProps={{ min: 0, step: 0.01 }}
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
                            ? new Date(pos.cashSession.openedAt).toLocaleString("es-MX")
                            : "—"}
                        </span>
                      </div>
                      <div className={styles.totalsRow}>
                        <span>Fondo inicial</span>
                        <span>{money(pos.cashSession?.openingFloat || 0)}</span>
                      </div>
                      <div className={styles.totalsGrand}>
                        <span>Efectivo esperado</span>
                        <span>{money(pos.cashExpected ?? 0)}</span>
                      </div>
                    </div>

                    <h3 className={styles.cashSubhead}>Entrada / salida</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <TextField
                        size="small"
                        type="number"
                        label="Monto"
                        value={pos.cashMoveAmount}
                        onChange={(e) => pos.setCashMoveAmount(e.target.value)}
                        sx={fieldSx}
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                      <TextField
                        size="small"
                        label="Motivo"
                        value={pos.cashMoveReason}
                        onChange={(e) => pos.setCashMoveReason(e.target.value)}
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
                    <TextField
                      size="small"
                      type="number"
                      label="Efectivo contado"
                      value={pos.closingCounted}
                      onChange={(e) => pos.setClosingCounted(e.target.value)}
                      sx={{ ...fieldSx, maxWidth: 220 }}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Notas de cierre"
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
                        <h3 className={styles.cashSubhead}>Movimientos de la sesión</h3>
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
                                  {new Date(m.createdAt).toLocaleTimeString("es-MX")}
                                </td>
                                <td>
                                  {POS_CASH_MOVEMENT_LABELS[m.type as PosCashMovementType] ||
                                    m.type}
                                </td>
                                <td>{money(m.amount)}</td>
                                <td>{m.reason || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            </section>

            <section className={styles.posPanel}>
              <div className={styles.posPanelHead}>
                <h2>Sesiones recientes</h2>
                <p>Historial de aperturas y cortes de esta sucursal.</p>
              </div>
              <div className={styles.posPanelBody}>
                {pos.cashSessions.length === 0 ? (
                  <EmptyState
                    title="Sin sesiones"
                    description="Aún no hay cortes registrados en esta sucursal."
                  />
                ) : (
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
                        <tr key={s.idCashSession}>
                          <td>#{s.idCashSession}</td>
                          <td>{new Date(s.openedAt).toLocaleString("es-MX")}</td>
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
                            {s.expectedCash != null ? money(s.expectedCash) : "—"}
                          </td>
                          <td>
                            {s.difference != null ? money(s.difference) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>
        ) : pos.tab === "series" ? (
          <section className={styles.posPanel}>
            <div className={styles.posPanelHead}>
              <h2>Consulta de series y garantías</h2>
              <p>
                Busca por número de serie o nombre de cliente. Marca RMA cuando
                aplique.
              </p>
            </div>
            <div className={styles.posPanelBody}>
              <div className={styles.totalsBox} style={{ marginBottom: 16 }}>
                <h3 className={styles.cashSubhead} style={{ marginTop: 0 }}>
                  Alta de serie disponible
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1.4fr auto",
                    gap: 8,
                  }}
                >
                  <TextField
                    size="small"
                    label="Id producto"
                    value={pos.newSerialProductId}
                    onChange={(e) => pos.setNewSerialProductId(e.target.value)}
                    sx={fieldSx}
                  />
                  <TextField
                    size="small"
                    label="Número de serie"
                    value={pos.newSerialNumber}
                    onChange={(e) => pos.setNewSerialNumber(e.target.value)}
                    sx={fieldSx}
                  />
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={pos.newSerialBusy}
                    onClick={() => void pos.registerSerial()}
                  >
                    {pos.newSerialBusy ? "…" : "Registrar"}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                <TextField
                  size="small"
                  label="Serie o cliente"
                  value={pos.serialQuery}
                  onChange={(e) => pos.setSerialQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void pos.searchSerials();
                    }
                  }}
                  sx={{ ...fieldSx, minWidth: 260, flex: 1 }}
                />
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => void pos.searchSerials()}
                  disabled={pos.serialSearching}
                >
                  {pos.serialSearching ? "Buscando…" : "Buscar"}
                </button>
              </div>

              {pos.serialHits.length === 0 ? (
                <EmptyState
                  title="Sin resultados"
                  description="Escribe al menos 2 caracteres y busca una serie."
                />
              ) : (
                <table className={styles.historyTable}>
                  <thead>
                    <tr>
                      <th>Serie</th>
                      <th>Producto</th>
                      <th>Estado</th>
                      <th>Cliente</th>
                      <th>Garantía</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pos.serialHits.map((s) => (
                      <tr key={s.idProductSerial}>
                        <td>
                          <strong>{s.serialNumber}</strong>
                        </td>
                        <td>{s.productName || "—"}</td>
                        <td>{s.status}</td>
                        <td>{s.customerName || "—"}</td>
                        <td>
                          {s.warrantyExpiresAt
                            ? new Date(s.warrantyExpiresAt).toLocaleDateString(
                                "es-MX",
                              )
                            : "—"}
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.secondaryBtn}
                            onClick={() => void pos.openSerialDetail(s.serialNumber)}
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {pos.serialDetail ? (
                <div className={styles.totalsBox} style={{ marginTop: 16 }}>
                  <div className={styles.totalsRow}>
                    <span>Serie</span>
                    <strong>{pos.serialDetail.serialNumber}</strong>
                  </div>
                  <div className={styles.totalsRow}>
                    <span>Producto</span>
                    <span>{pos.serialDetail.productName}</span>
                  </div>
                  <div className={styles.totalsRow}>
                    <span>Folio</span>
                    <span>{pos.serialDetail.folio || "—"}</span>
                  </div>
                  <div className={styles.totalsRow}>
                    <span>Cliente</span>
                    <span>{pos.serialDetail.customerName || "—"}</span>
                  </div>
                  <div className={styles.totalsRow}>
                    <span>Estado</span>
                    <span>{pos.serialDetail.status}</span>
                  </div>
                  <div className={styles.totalsRow}>
                    <span>Garantía hasta</span>
                    <span>
                      {pos.serialDetail.warrantyExpiresAt
                        ? new Date(
                            pos.serialDetail.warrantyExpiresAt,
                          ).toLocaleDateString("es-MX")
                        : "—"}
                    </span>
                  </div>
                  {pos.serialDetail.status === "sold" ? (
                    <>
                      <TextField
                        fullWidth
                        size="small"
                        label="Notas RMA"
                        value={pos.rmaNotes}
                        onChange={(e) => pos.setRmaNotes(e.target.value)}
                        sx={{ ...fieldSx, mt: 1 }}
                      />
                      <button
                        type="button"
                        className={styles.dangerBtn}
                        disabled={pos.rmaBusy}
                        onClick={() => void pos.markRma()}
                        style={{ marginTop: 8 }}
                      >
                        {pos.rmaBusy ? "Guardando…" : "Marcar RMA"}
                      </button>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        ) : pos.tab === "inventario" ? (
          <section className={styles.posPanel}>
            <div className={styles.posPanelHead}>
              <h2>Movimientos de inventario</h2>
              <p>
                Ledger unificado: ventas POS, cancelaciones y ventas web
                (cuando el webhook aplica el stock).
              </p>
            </div>
            <div className={styles.posPanelBody}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                <TextField
                  select
                  size="small"
                  label="Motivo"
                  value={pos.inventoryReason}
                  onChange={(e) => pos.setInventoryReason(e.target.value)}
                  sx={{ ...fieldSx, minWidth: 180 }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="pos_sale">Venta POS</MenuItem>
                  <MenuItem value="pos_cancel">Cancel. POS</MenuItem>
                  <MenuItem value="web_sale">Venta web</MenuItem>
                  <MenuItem value="web_sale_branch">Venta web sucursal</MenuItem>
                </TextField>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => void pos.loadInventory()}
                >
                  Actualizar
                </button>
              </div>
              {pos.inventoryLoading ? (
                <div style={{ display: "grid", placeItems: "center", padding: 40 }}>
                  <CircularProgress sx={{ color: "#bb3d4b" }} />
                </div>
              ) : pos.inventoryRows.length === 0 ? (
                <EmptyState
                  title="Sin movimientos"
                  description="Aún no hay registros en el ledger, o falta aplicar migraciones."
                />
              ) : (
                <table className={styles.historyTable}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Producto</th>
                      <th>Δ</th>
                      <th>Motivo</th>
                      <th>Ref</th>
                      <th>Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pos.inventoryRows.map((m) => (
                      <tr key={m.idInventoryMovement}>
                        <td>{new Date(m.createdAt).toLocaleString("es-MX")}</td>
                        <td>
                          {m.productName || "—"}
                          {m.productSku ? (
                            <div style={{ fontSize: 11, color: "#6b7280" }}>
                              {m.productSku}
                            </div>
                          ) : null}
                        </td>
                        <td
                          style={{
                            fontWeight: 800,
                            color: m.delta < 0 ? "#991b1b" : "#166534",
                          }}
                        >
                          {m.delta > 0 ? `+${m.delta}` : m.delta}
                        </td>
                        <td>{m.reason}</td>
                        <td>
                          {[m.refType, m.refId].filter(Boolean).join(" ")}
                        </td>
                        <td>{m.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        ) : (
          <section className={styles.posPanel}>
            <div className={styles.posPanelHead}>
              <h2>
                <History size={16} style={{ display: "inline", marginRight: 6 }} />
                Historial de ventas POS
              </h2>
              <p>Consulta, ticket y cancelación con restauración de inventario.</p>
            </div>
            <div className={styles.posPanelBody}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                <TextField
                  size="small"
                  label="Folio"
                  value={pos.historyFolio}
                  onChange={(e) => pos.setHistoryFolio(e.target.value)}
                  sx={{ ...fieldSx, minWidth: 160 }}
                />
                <TextField
                  select
                  size="small"
                  label="Estado"
                  value={pos.historyStatus}
                  onChange={(e) => pos.setHistoryStatus(e.target.value)}
                  sx={{ ...fieldSx, minWidth: 160 }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="completed">Completada</MenuItem>
                  <MenuItem value="cancelled">Cancelada</MenuItem>
                  <MenuItem value="pending_payment">Pendiente pago</MenuItem>
                </TextField>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => void pos.loadHistory(1)}
                >
                  Filtrar
                </button>
              </div>

              {pos.historyLoading ? (
                <div style={{ display: "grid", placeItems: "center", padding: 40 }}>
                  <CircularProgress sx={{ color: "#bb3d4b" }} />
                </div>
              ) : pos.history.length === 0 ? (
                <EmptyState
                  title="Sin ventas"
                  description="Aún no hay ventas POS con estos filtros."
                />
              ) : (
                <>
                  <table className={styles.historyTable}>
                    <thead>
                      <tr>
                        <th>Folio</th>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th>Total</th>
                        <th>Estado</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pos.history.map((sale) => (
                        <tr key={sale.idPosSale}>
                          <td>
                            <strong>{sale.folio}</strong>
                          </td>
                          <td>
                            {new Date(sale.createdAt).toLocaleString("es-MX")}
                          </td>
                          <td>{sale.customerName || "Público general"}</td>
                          <td>{money(sale.total)}</td>
                          <td>
                            <span className={`${styles.badge} ${statusBadge(sale.status)}`}>
                              {statusLabel(sale.status)}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className={styles.secondaryBtn}
                              onClick={() => void pos.openDetail(sale.idPosSale)}
                            >
                              Ver
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
          <div className={styles.drawer} role="dialog" aria-modal="true">
            <div className={styles.drawerPanel}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>{pos.detailSale.folio}</h3>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => pos.setDetailSale(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <p style={{ color: "#6b7280", fontSize: 13 }}>
                {new Date(pos.detailSale.createdAt).toLocaleString("es-MX")} ·{" "}
                {statusLabel(pos.detailSale.status)}
              </p>
              <p style={{ fontSize: 14 }}>
                <strong>Cliente:</strong> {pos.detailSale.customerName}
                <br />
                <strong>Vendedor:</strong> {pos.detailSale.cashierName || "—"}
                <br />
                <strong>Sucursal:</strong>{" "}
                {[pos.detailSale.branchName, pos.detailSale.branchCity]
                  .filter(Boolean)
                  .join(" — ")}
                <br />
                <strong>Total:</strong> {money(pos.detailSale.total)}
              </p>

              <h4 style={{ marginTop: 16 }}>Productos</h4>
              <ul style={{ paddingLeft: 18, fontSize: 13 }}>
                {pos.detailSale.items.map((it) => (
                  <li key={it.idPosSaleItem}>
                    {it.quantity} × {it.productName} — {money(it.lineTotal)}
                    {it.serials && it.serials.length > 0 ? (
                      <div style={{ color: "#6b7280", fontSize: 12 }}>
                        S/N: {it.serials.map((s) => s.serialNumber).join(", ")}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>

              <h4 style={{ marginTop: 16 }}>Pagos</h4>
              <ul style={{ paddingLeft: 18, fontSize: 13 }}>
                {pos.detailSale.payments.map((p) => (
                  <li key={p.idPosPayment}>
                    {POS_PAYMENT_LABELS[p.method] || p.method}: {money(p.amount)}
                    {p.reference ? ` (${p.reference})` : ""}
                  </li>
                ))}
              </ul>

              <div className={styles.drawerActions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => pos.openTicket(pos.detailSale!.idPosSale)}
                >
                  Ver ticket
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
                    <button
                      type="button"
                      className={styles.chargeBtn}
                      style={{ marginTop: 0 }}
                      onClick={() => void pos.confirmPayment()}
                    >
                      Confirmar pago (descontar stock)
                    </button>
                  </>
                ) : null}
                {pos.detailSale.status !== "cancelled" ? (
                  <>
                    <TextField
                      fullWidth
                      size="small"
                      label="Motivo de cancelación"
                      value={pos.cancelReason}
                      onChange={(e) => pos.setCancelReason(e.target.value)}
                      sx={fieldSx}
                      multiline
                      minRows={2}
                    />
                    <button
                      type="button"
                      className={styles.dangerBtn}
                      disabled={pos.cancelling}
                      onClick={() => void pos.cancelSale()}
                    >
                      {pos.cancelling ? "Cancelando…" : "Cancelar venta"}
                    </button>
                  </>
                ) : (
                  <p style={{ color: "#991b1b", fontSize: 13 }}>
                    Motivo: {pos.detailSale.cancelReason || "—"}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {pos.ticketOpen && pos.lastSale ? (
          <div className={styles.drawer} role="dialog" aria-modal="true">
            <div className={styles.drawerPanel} style={{ height: "auto", maxHeight: "90vh", placeSelf: "center", borderRadius: 16, width: "min(420px, 94vw)" }}>
              <h3 style={{ marginTop: 0 }}>Venta {pos.lastSale.folio}</h3>
              <p style={{ fontSize: 14 }}>
                Total {money(pos.lastSale.total)} · {statusLabel(pos.lastSale.status)}
              </p>
              {pos.lastPaymentLink ? (
                <p style={{ fontSize: 13, wordBreak: "break-all" }}>
                  Link de pago:{" "}
                  <a href={pos.lastPaymentLink} target="_blank" rel="noreferrer">
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
                  Abrir / imprimir ticket
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
      </div>
    </AdminPageShell>
  );
}
