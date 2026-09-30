"use client";

import { useState } from "react";
import {
  Alert,
  Chip,
  Collapse,
  FormControl,
  MenuItem,
  Select,
  Tooltip,
} from "@mui/material";
import {
  ChevronDown,
  KeyRound,
  Mail,
  MapPin,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { formatOrderMoney } from "@/app/utils/orderCostBreakdown";
import {
  getShippingLabel,
  type ShipmentGroup,
} from "@/app/utils/orderShipmentGroups";
import SendLicenseKeyPanel from "./SendLicenseKeyPanel";
import { getProviderLabel, PROVIDER_DICOTECH } from "@/app/constants/providers.constants";
import { formatPcinboxBranchDisplayName } from "@/app/interfaces/pos/posBranchDisplay";
import { orderModalSpacing as sp } from "./orderModalSpacing";

const PICKUP_SHIPPING_METHODS = new Set(["sucursal", "sucursalext"]);
const HOME_DELIVERY_SHIPPING_METHODS = new Set([
  "envioleon",
  "estafeta",
  "paqueteexpress",
]);
const TERMINAL_SHIP_STATUSES = new Set(["entregado", "cancelado"]);
const LOCKED_SHIP_STATUS_TOOLTIP =
  "Al tener estatus Entregado o Cancelado ya no se puede cambiar el estatus";

function resolveGroupWarehouseLabel(group: ShipmentGroup): string | null {
  const raw =
    group.originBranche ||
    group.address?.originBranche ||
    group.products.find((p) => p.address?.originBranche)?.address
      ?.originBranche ||
    group.products.find((p) => p.address?.branche)?.address?.branche ||
    null;
  if (!raw) return null;
  return formatPcinboxBranchDisplayName(raw) || String(raw);
}

function shippingMethodKey(method?: string | null): string {
  return String(method ?? "").trim().toLowerCase();
}

function isPickupShippingMethod(method?: string | null): boolean {
  return PICKUP_SHIPPING_METHODS.has(shippingMethodKey(method));
}

function isHomeDeliveryShippingMethod(method?: string | null): boolean {
  return HOME_DELIVERY_SHIPPING_METHODS.has(shippingMethodKey(method));
}

function isTerminalShipStatus(status?: string | null): boolean {
  return TERMINAL_SHIP_STATUSES.has(String(status ?? "").toLowerCase());
}

function resolveProductLineTotal(item: any): number | null {
  const candidates = [item?.lineTotal, item?.total, item?.saleTotal];
  for (const value of candidates) {
    if (value == null || value === "") continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function formatProductLineTotal(item: any): string {
  const amount = resolveProductLineTotal(item);
  return amount != null ? formatOrderMoney(amount) : "Sin precio";
}

function formatProductUnitPrice(item: any): string | null {
  const lineTotal = resolveProductLineTotal(item);
  const qty = Number(item?.quantity);
  if (lineTotal == null || !Number.isFinite(qty) || qty <= 1) return null;
  return formatOrderMoney(lineTotal / qty);
}

/** Precio pagado sin IVA (quita 16%): monto / 1.16 */
function resolvePaidPriceWithoutIva(item: any): number | null {
  const paid = resolveProductLineTotal(item);
  if (paid == null || paid <= 0) return null;
  return Math.round((paid / 1.16) * 100) / 100;
}

function hasAddressLines(address: any): boolean {
  return Boolean(
    address?.street ||
      address?.noExt ||
      address?.cologne ||
      address?.cp ||
      address?.city,
  );
}

type ShipmentGroupSectionProps = {
  group: ShipmentGroup;
  idOrder: number;
  statusPay?: string | null;
  customerEmail?: string | null;
  customerName?: string;
  onShipmentStatusChange: (
    event: { target: { value: string } },
    idShipment: number,
  ) => Promise<boolean | void>;
  onProductStatusChange?: (
    event: { target: { value: string } },
    idSale: number,
  ) => Promise<boolean | void>;
  onSaleLicenseDelivered?: (
    idSale: number,
    idOrder: number,
    nextStatus: "entregado",
  ) => void;
  updatingShipmentId?: number | null;
  updatingSaleId?: number | null;
  cooldownShipmentIds?: Set<number>;
  cooldownSaleIds?: Set<number>;
  stackGap?: boolean;
};

export default function ShipmentGroupSection({
  group,
  idOrder,
  statusPay,
  customerEmail,
  customerName,
  onShipmentStatusChange,
  onProductStatusChange,
  onSaleLicenseDelivered,
  updatingShipmentId,
  updatingSaleId,
  cooldownShipmentIds,
  cooldownSaleIds,
  stackGap = false,
}: ShipmentGroupSectionProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const shipStatusLocked = isTerminalShipStatus(group.statusShip);
  const shipmentOnCooldown =
    group.idShipment != null &&
    Boolean(cooldownShipmentIds?.has(Number(group.idShipment)));
  const shipmentSelectDisabled =
    shipStatusLocked ||
    shipmentOnCooldown ||
    updatingShipmentId === Number(group.idShipment);
  const shippingMethod = group.shippingMethod;
  const isPickup = isPickupShippingMethod(shippingMethod);
  const isHomeDelivery = isHomeDeliveryShippingMethod(shippingMethod);
  const shippingLabel = getShippingLabel(shippingMethod);
  const showAddress = !group.isDigital && isHomeDelivery;
  const warehouseLabel = resolveGroupWarehouseLabel(group);

  const statusBadgeClass = `admin-shipment-block__status-badge admin-shipment-block__status-badge--${group.statusShip}`;

  return (
    <section
      className={`admin-shipment-block ${group.isDigital ? "admin-shipment-block--digital" : "admin-shipment-block--physical"}`}
      style={{
        ...sp.shipmentBlock,
        ...(stackGap ? sp.shipmentBlockGap : {}),
      }}
    >
      <header className="admin-shipment-block__header" style={sp.shipmentHeader}>
        <div className="admin-shipment-block__heading" style={sp.shipmentHeading}>
          <span className="admin-shipment-block__icon">
            {group.isDigital ? <KeyRound size={18} /> : <Truck size={18} />}
          </span>
          <div>
            <h3 className="admin-shipment-block__title" style={sp.shipmentTitle}>
              {group.title}
            </h3>
            <p className="admin-shipment-block__subtitle" style={sp.shipmentSubtitle}>
              {group.subtitle}
            </p>
          </div>
        </div>
        <span className={statusBadgeClass} style={{ padding: "5px 11px", margin: 0 }}>
          {group.statusShip.charAt(0).toUpperCase() + group.statusShip.slice(1)}
        </span>
      </header>

      {!group.isDigital && group.idShipment ? (
        <div className="admin-shipment-block__controls" style={sp.shipmentControls}>
          <label
            htmlFor={`ship-group-${group.key}`}
            style={sp.shipmentControlsLabel}
          >
            Estatus del envío
          </label>
          <FormControl fullWidth size="small">
            <Tooltip
              title={
                shipStatusLocked
                  ? LOCKED_SHIP_STATUS_TOOLTIP
                  : shipmentOnCooldown
                    ? "Espera unos segundos antes de volver a cambiar el estatus"
                    : ""
              }
              placement="top"
              arrow
            >
              <span style={{ display: "block" }}>
                <Select
                  id={`ship-group-${group.key}`}
                  value={group.statusShip ?? "procesando"}
                  onChange={(event) =>
                    void onShipmentStatusChange(
                      event,
                      Number(group.idShipment),
                    )
                  }
                  disabled={shipmentSelectDisabled}
                  sx={{
                    borderRadius: "12px",
                    bgcolor: "#fff",
                    fontWeight: 600,
                  }}
                >
                  <MenuItem value="procesando">Procesando</MenuItem>
                  <MenuItem value="disponible">Disponible</MenuItem>
                  <MenuItem value="enviado">Enviado</MenuItem>
                  <MenuItem value="entregado">Entregado</MenuItem>
                  <MenuItem value="cancelado">Cancelado</MenuItem>
                </Select>
              </span>
            </Tooltip>
          </FormControl>
          <p className="admin-shipment-block__controls-hint" style={sp.shipmentControlsHint}>
            Cambia el estatus aquí o en el panel de correo. El correo al cliente
            solo se envía con el botón <strong>Enviar correo al cliente</strong>.
          </p>
        </div>
      ) : null}

      {group.isDigital ? (
        <Alert
          severity="info"
          icon={<Mail size={18} />}
          sx={{ borderRadius: "12px", mb: "18px", margin: 0 }}
        >
          Las licencias digitales <strong>no usan</strong> el correo de estatus de
          paquetería. Envía la clave con el panel de cada producto; al enviarla, el
          estatus pasa a <strong>Entregado</strong>.
        </Alert>
      ) : null}

      {showAddress && group.address ? (
        <div className="admin-product-card__address" style={sp.addressBox}>
          <MapPin
            size={15}
            className="admin-product-card__address-icon"
            style={{ marginTop: 2, flexShrink: 0 }}
          />
          <div className="admin-product-card__address-lines" style={sp.addressLines}>
            {hasAddressLines(group.address) ? (
              <>
                <span>
                  {group.address.street} #{group.address.noExt}
                  {group.address.noInt ? ` Int. ${group.address.noInt}` : ""}
                </span>
                <span>
                  CP {group.address.cp} · {group.address.cologne}
                </span>
                <span>
                  {group.address.city}, {group.address.state},{" "}
                  {group.address.country}
                </span>
              </>
            ) : (
              <span>Sin dirección registrada</span>
            )}
          </div>
        </div>
      ) : null}

      {!group.isDigital ? (
        <div className="admin-shipment-block__meta" style={{ ...sp.shipmentMeta, display: "flex" }}>
          {warehouseLabel ? (
            <span
              className="admin-product-card__tag"
              style={{ padding: "6px 10px", margin: 0 }}
              title={isPickup ? "Bodega de origen (retiro en sucursal)" : "Bodega de origen"}
            >
              <Store size={14} />
              {warehouseLabel}
            </span>
          ) : null}
          {shippingLabel ? (
            <span className="admin-product-card__tag" style={{ padding: "6px 10px", margin: 0 }}>
              <Truck size={14} />
              {shippingLabel}
            </span>
          ) : null}
          {group.trackingNumber ? (
            <span
              className="admin-product-card__tag admin-product-card__tag--guide"
              style={{ padding: "6px 10px", margin: 0 }}
            >
              Guía {group.trackingNumber}
            </span>
          ) : null}
          {group.address?.requireInsurance === 1 ? (
            <span
              className="admin-product-card__tag admin-product-card__tag--success"
              style={{ padding: "6px 10px", margin: 0 }}
            >
              <ShieldCheck size={14} />
              Seguro requerido
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="admin-shipment-block__products" style={sp.shipmentProducts}>
        {group.products.map((item: any, index: number) => {
          const providerLabel = getProviderLabel(item.providerId);
          const isDicotech = Number(item.providerId) === PROVIDER_DICOTECH;
          const imageUrl =
            (Array.isArray(item.image_url) ? item.image_url[0] : item.image_url) ||
            "/imagen-no-encontrada.png";
          const unitPriceLabel = formatProductUnitPrice(item);
          const purchaseId = String(item.purchaseId ?? "").trim();
          const invoiceNumber = String(item.invoiceNumber ?? "").trim();
          const clave = String(item.idProductExt ?? "").trim();
          const upc = String(item.upc ?? "").trim();
          const qty = Math.max(0, Number(item.quantity) || 0);
          const priceWithoutIva = isDicotech
            ? resolvePaidPriceWithoutIva(item)
            : null;

          return (
            <article
              key={item.idSale ?? `${group.key}-${index}`}
              className="admin-shipment-product"
              style={sp.shipmentProduct}
            >
              <img
                src={imageUrl}
                alt={item.productName}
                className="admin-shipment-product__image"
                onError={(event) => {
                  const target = event.currentTarget;
                  if (target.src.includes("imagen-no-encontrada.png")) return;
                  target.src = "/imagen-no-encontrada.png";
                }}
              />
              <div className="admin-shipment-product__body">
                <div className="admin-shipment-product__top" style={{ margin: 0, padding: 0 }}>
                  <h4
                    className="admin-shipment-product__name"
                    style={{ margin: 0, padding: 0 }}
                  >
                    {item.productName}
                  </h4>
                  <div className="admin-shipment-product__price-wrap">
                    <span
                      className="admin-product-card__price"
                      style={{ padding: "4px 11px", margin: 0 }}
                      title="Precio pagado por el cliente (sales.total)"
                    >
                      {formatProductLineTotal(item)}
                    </span>
                    {unitPriceLabel ? (
                      <span className="admin-shipment-product__unit-price">
                        {unitPriceLabel} c/u
                      </span>
                    ) : null}
                    {priceWithoutIva != null ? (
                      <span
                        className="admin-shipment-product__provider-price"
                        title="Precio pagado por el cliente sin IVA (monto ÷ 1.16)"
                      >
                        Sin IVA {formatOrderMoney(priceWithoutIva)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="admin-shipment-product__meta" style={sp.shipmentProductMeta}>
                  <Chip
                    size="small"
                    label={providerLabel}
                    color={isDicotech ? "warning" : "default"}
                    variant="outlined"
                  />
                  <span className="admin-shipment-product__highlight admin-shipment-product__highlight--qty">
                    × {qty}
                  </span>
                  <span
                    className="admin-shipment-product__highlight admin-shipment-product__highlight--upc"
                    title="UPC"
                  >
                    UPC {upc || "N/A"}
                  </span>
                  <span
                    className="admin-shipment-product__highlight admin-shipment-product__highlight--clave"
                    title="idProductExt"
                  >
                    clave {clave || "N/A"}
                  </span>
                </div>

                {isDicotech ? (
                  <div className="admin-shipment-product__ids">
                    <span className="admin-shipment-product__id-pill">
                      <strong>purchaseId</strong>
                      {purchaseId || "Pendiente"}
                    </span>
                    <span className="admin-shipment-product__id-pill">
                      <strong>invoiceNumber</strong>
                      {invoiceNumber || "Pendiente"}
                    </span>
                  </div>
                ) : null}

                {group.isDigital &&
                idOrder > 0 &&
                item.idSale &&
                item.idShipment &&
                !["cancelado"].includes(String(item.statusShip || "").toLowerCase()) ? (
                  <SendLicenseKeyPanel
                    idOrder={idOrder}
                    idSale={Number(item.idSale)}
                    idShipment={Number(item.idShipment)}
                    productName={item.productName || "Licencia"}
                    defaultEmail={customerEmail || ""}
                    customerName={customerName}
                    statusPay={statusPay}
                    shipmentStatus={item.statusShip}
                    quantity={qty}
                    onSent={(nextStatus) => {
                      onSaleLicenseDelivered?.(
                        Number(item.idSale),
                        idOrder,
                        nextStatus,
                      );
                    }}
                  />
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {!group.isDigital && onProductStatusChange ? (
        <>
          <button
            type="button"
            className="admin-shipment-block__advanced-toggle"
            style={sp.advancedToggle}
            onClick={() => setAdvancedOpen((prev) => !prev)}
          >
            <ChevronDown
              size={16}
              style={{
                transform: advancedOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            />
            Ajuste avanzado por producto
          </button>
          <Collapse in={advancedOpen}>
            <div className="admin-shipment-block__advanced" style={sp.advancedPanel}>
              {group.products.map((item: any) => {
                const saleLocked = isTerminalShipStatus(item.statusShip);
                const saleOnCooldown =
                  item.idSale != null &&
                  Boolean(cooldownSaleIds?.has(Number(item.idSale)));
                return (
                <div
                  key={`adv-${item.idSale}`}
                  className="admin-shipment-block__advanced-row"
                  style={sp.advancedRow}
                >
                  <span>{item.productName}</span>
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <Tooltip
                      title={
                        saleLocked
                          ? LOCKED_SHIP_STATUS_TOOLTIP
                          : saleOnCooldown
                            ? "Espera unos segundos antes de volver a cambiar el estatus"
                            : ""
                      }
                      placement="top"
                      arrow
                    >
                      <span>
                        <Select
                          value={item.statusShip ?? "procesando"}
                          onChange={(event) =>
                            void onProductStatusChange(
                              event,
                              Number(item.idSale),
                            )
                          }
                          disabled={
                            saleLocked ||
                            saleOnCooldown ||
                            !item.idSale ||
                            updatingSaleId === Number(item.idSale)
                          }
                          sx={{ borderRadius: "10px", bgcolor: "#fff", fontWeight: 600 }}
                        >
                          <MenuItem value="procesando">Procesando</MenuItem>
                          <MenuItem value="disponible">Disponible</MenuItem>
                          <MenuItem value="enviado">Enviado</MenuItem>
                          <MenuItem value="entregado">Entregado</MenuItem>
                          <MenuItem value="cancelado">Cancelado</MenuItem>
                        </Select>
                      </span>
                    </Tooltip>
                  </FormControl>
                </div>
              );
              })}
            </div>
          </Collapse>
        </>
      ) : null}
    </section>
  );
}
