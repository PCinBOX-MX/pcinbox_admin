"use client";

import { useState, useEffect, useMemo } from "react";
import ProveedoresUtils from "@/app/services/utils/proveedores.utils";
import {
  Alert,
  FormControl,
  MenuItem,
  Select,
  Chip,
  Skeleton,
  Divider,
} from "@mui/material";
import {
  getProviderLabel,
  PROVIDER_DICOTECH,
} from "@/app/constants/providers.constants";
import {
  ModalDetailField,
  ModalDetailGrid,
  ModalDetailSection,
} from "../modal/ModalDetail";
import {
  formatOrderMoney,
} from "@/app/utils/orderCostBreakdown";
import {
  Mail,
  MapPin,
  Package,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import SendLicenseKeyPanel from "./SendLicenseKeyPanel";
import {
  getPaymentStatusLabel,
  isOrderPaid,
} from "@/app/utils/paymentStatus.util";

type BranchOption = {
  idBranche: number;
  name: string;
  externalStoreId?: number | null;
};

let dicotechBranchesCache: BranchOption[] | null = null;

const SHIPPING_LABELS: Record<string, string> = {
  estafeta: "Estafeta",
  paqueteexpress: "Paquete Express",
  envioLeon: "Envío personalizado PCinBOX",
  digital: "Entrega digital",
};

function isDigitalShippingMethod(method?: string | null): boolean {
  return String(method ?? "").toLowerCase() === "digital";
}

function isLicenseProduct(item: any): boolean {
  const licenseType = String(item?.licenseType ?? "").toLowerCase();
  return (
    licenseType === "windows" ||
    licenseType === "antivirus" ||
    licenseType === "office"
  );
}

/** Entrega digital: shipping digital o producto con licenseType. */
function isDigitalDeliveryProduct(item: any): boolean {
  return (
    isDigitalShippingMethod(item?.address?.shipping_method) ||
    isDigitalShippingMethod(item?.shipping_method) ||
    isLicenseProduct(item)
  );
}

const DataProducts = ({ params, handleChangeStatusShip }: any) => {
  const { requestGetProveedores } = ProveedoresUtils();

  const [products, setProducts] = useState(params.value || []);
  const [dicotechBranches, setDicotechBranches] = useState<BranchOption[]>(
    dicotechBranchesCache ?? [],
  );
  const [branchesLoading, setBranchesLoading] = useState(!dicotechBranchesCache);

  useEffect(() => {
    setProducts(params.value || []);
  }, [params.value]);

  useEffect(() => {
    if (dicotechBranchesCache) {
      setDicotechBranches(dicotechBranchesCache);
      setBranchesLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const resp = await requestGetProveedores(
          `/getBranchesByProvider/${PROVIDER_DICOTECH}`,
          { silent: true },
        );
        if (!cancelled && resp?.data?.data) {
          dicotechBranchesCache = resp.data.data;
          setDicotechBranches(resp.data.data);
        }
      } catch {
        // Fallback silencioso
      } finally {
        if (!cancelled) setBranchesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const branchNameByStoreId = useMemo(() => {
    const map = new Map<number, string>();
    for (const branch of dicotechBranches) {
      if (branch.externalStoreId != null) {
        map.set(Number(branch.externalStoreId), branch.name);
      }
      map.set(Number(branch.idBranche), branch.name);
    }
    return map;
  }, [dicotechBranches]);

  const handleChange = (event: any, idShipment: number) => {
    const newProducts = products.map((p: any) =>
      p.idShipment === idShipment
        ? { ...p, statusShip: event.target.value }
        : p,
    );
    setProducts(newProducts);
    handleChangeStatusShip(event, idShipment, params.row.idUser);
  };

  if (!products?.length) {
    return (
      <p className="admin-modal-empty">No hay productos en esta orden.</p>
    );
  }

  const customerEmail =
    params?.row?.dataUser?.email ||
    params?.row?.email ||
    null;
  const customerName = [
    params?.row?.dataUser?.name,
    params?.row?.dataUser?.lastName || params?.row?.dataUser?.lastname,
  ]
    .filter(Boolean)
    .join(" ");
  const idOrder = Number(params?.row?.idOrder || 0);
  const statusPay = params?.row?.statusPay;
  const orderPaid = isOrderPaid(statusPay);

  const hasPendingDigital = products.some(
    (item: any) =>
      isDigitalDeliveryProduct(item) &&
      !["entregado", "cancelado"].includes(
        String(item.statusShip || "").toLowerCase(),
      ),
  );

  return (
    <div className="admin-modal-products">
      {hasPendingDigital ? (
        <Alert
          severity={orderPaid ? "warning" : "info"}
          icon={<Mail size={20} />}
          sx={{ mb: 1, borderRadius: "12px" }}
        >
          {orderPaid ? (
            <>
              <strong>Licencia digital pendiente de envío.</strong> Usa el
              panel de cada producto para enviar la información de activación
              al correo del cliente
              {customerEmail ? (
                <>
                  :{" "}
                  <a
                    href={`mailto:${customerEmail}`}
                    style={{ fontWeight: 700 }}
                  >
                    {customerEmail}
                  </a>
                </>
              ) : (
                " (ver Datos del cliente)."
              )}
              . Al enviarla, el estado pasa a <strong>Entregado</strong>.
            </>
          ) : (
            <>
              <strong>Licencia digital en espera del pago.</strong> El envío
              desde Admin solo se habilita cuando la orden esté{" "}
              <strong>Pagada</strong> (estado actual:{" "}
              {getPaymentStatusLabel(statusPay)}).
            </>
          )}
        </Alert>
      ) : null}

      {products.map((item: any, index: number) => {
        const providerLabel = getProviderLabel(item.providerId);
        const providerChipColor =
          Number(item.providerId) === PROVIDER_DICOTECH
            ? "warning"
            : Number(item.providerId) === 2
              ? "info"
              : "default";

        const isDigital = isDigitalDeliveryProduct(item);
        const hasStreetAddress = !isDigital && item.address?.street != null;
        const branchName = isDigital
          ? null
          : item.address?.branche ||
            branchNameByStoreId.get(Number(item.address?.storeId)) ||
            (branchesLoading ? null : "PCinBOX-LEON");

        const shippingLabel =
          SHIPPING_LABELS[item.address?.shipping_method] ??
          (item.address?.shipping_method ? "Desconocido" : null);

        const showDescription =
          item.description &&
          item.description.trim() !== String(item.productName || "").trim();


        // Obtener la imagen
        const imageUrl =
          (Array.isArray(item.image_url) ? item.image_url[0] : item.image_url) ||
          item.image ||
          item.coverImage;

        return (
          <article key={item.idShipment ?? index} className="admin-product-card">
            <header className="admin-product-card__header">
              <div className="admin-product-card__content">
                {imageUrl ? (
                  <div className="admin-product-card__image-container">
                    <img
                      src={imageUrl}
                      alt={item.productName}
                      className="admin-product-card__image"
                    />
                  </div>
                ) : (
                  <div className="admin-product-card__image-placeholder">
                    <Package size={24} color="#9ca3af" />
                  </div>
                )}
                <div className="admin-product-card__title-wrap">
                  <span className="admin-product-card__index">
                    Producto {index + 1}
                  </span>
                  <h3 className="admin-product-card__name">
                    {item.productName}
                  </h3>
                  {showDescription ? (
                    <p className="admin-product-card__description">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="admin-product-card__badges">
                {isDigital ? (
                  <Chip
                    size="small"
                    icon={<Mail size={14} />}
                    label="Licencia digital"
                    color="secondary"
                    variant="filled"
                    sx={{ fontWeight: 700 }}
                  />
                ) : null}
                <Chip
                  size="small"
                  label={providerLabel}
                  color={providerChipColor}
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
                <span className="admin-product-card__qty">
                  × {item.quantity}
                </span>
              </div>
            </header>

            <ModalDetailGrid columns={3}>
              <ModalDetailField label="SKU" value={item.sku || "N/A"} />
              <ModalDetailField label="UPC" value={item.upc || "N/A"} />
              <ModalDetailField label="Clave" value={item.clave || "N/A"} />
            </ModalDetailGrid>

            <Divider sx={{ my: 1.5, borderColor: "#eef0f4" }} />

            <ModalDetailSection
              title={isDigital ? "Entrega digital" : "Entrega y envío"}
              icon={isDigital ? <Mail size={16} /> : <Package size={16} />}
              variant="accent"
            >
              <ModalDetailField
                label="Tipo de entrega"
                value={
                  isDigital
                    ? "Entrega digital (clave por correo)"
                    : hasStreetAddress
                      ? "Domicilio"
                      : branchName
                        ? `Sucursal — ${branchName}`
                        : "Sucursal"
                }
                fullWidth
              />

              {isDigital ? (
                <ModalDetailField
                  label="Correo para enviar la clave"
                  value={customerEmail || "Ver Datos del cliente"}
                  fullWidth
                />
              ) : null}

              {isDigital &&
              !["entregado", "cancelado"].includes(
                String(item.statusShip || "").toLowerCase(),
              ) ? (
                <Alert
                  severity={orderPaid ? "info" : "warning"}
                  sx={{ width: "100%", borderRadius: "10px" }}
                >
                  {orderPaid ? (
                    <>
                      Envía la información de la licencia a{" "}
                      <strong>
                        {customerEmail || "el correo del cliente"}
                      </strong>{" "}
                      desde el panel inferior. Solo aplica con pago confirmado.
                    </>
                  ) : (
                    <>
                      Esta licencia se enviará cuando la orden esté pagada.
                      Estado de pago:{" "}
                      <strong>{getPaymentStatusLabel(statusPay)}</strong>.
                    </>
                  )}
                </Alert>
              ) : null}

              {hasStreetAddress ? (
                <div className="admin-product-card__address">
                  <MapPin size={15} className="admin-product-card__address-icon" />
                  <div className="admin-product-card__address-lines">
                    <span>
                      {item.address.street} #{item.address.noExt}
                      {item.address.noInt ? ` Int. ${item.address.noInt}` : ""}
                    </span>
                    <span>
                      CP {item.address.cp} · {item.address.cologne}
                    </span>
                    <span>
                      {item.address.city}, {item.address.state},{" "}
                      {item.address.country}
                    </span>
                  </div>
                </div>
              ) : null}

              <ModalDetailGrid columns={2}>
                {Number(item.address?.shippingCost ?? 0) > 0 ? (
                  <ModalDetailField
                    label="Costo de envío"
                    value={formatOrderMoney(Number(item.address.shippingCost))}
                  />
                ) : null}
                {Number(item.address?.insuranceCost ?? 0) > 0 ? (
                  <ModalDetailField
                    label="Costo de seguro"
                    value={formatOrderMoney(Number(item.address.insuranceCost))}
                  />
                ) : null}
              </ModalDetailGrid>

              <div className="admin-product-card__tags">
                {item.address?.requireInsurance === 1 ? (
                  <span className="admin-product-card__tag admin-product-card__tag--success">
                    <ShieldCheck size={14} />
                    Seguro requerido
                  </span>
                ) : null}

                {!isDigital && branchName ? (
                  <span className="admin-product-card__tag">
                    <Store size={14} />
                    {branchesLoading && !item.address?.branche ? (
                      <Skeleton width={80} height={16} />
                    ) : (
                      `Sucursal ${branchName}`
                    )}
                  </span>
                ) : null}

                {shippingLabel ? (
                  <span className="admin-product-card__tag">
                    {isDigital ? <Mail size={14} /> : <Truck size={14} />}
                    {shippingLabel}
                  </span>
                ) : null}

                {item.address?.trackingNumber ? (
                  <span className="admin-product-card__tag admin-product-card__tag--guide">
                    Guía {item.address.trackingNumber}
                  </span>
                ) : null}
              </div>

              <div className="admin-product-card__status">
                <label htmlFor={`ship-status-${item.idShipment}`}>
                  {isDigital ? "Estado de entrega digital" : "Estado de envío"}
                </label>
                <FormControl fullWidth size="small">
                  <Select
                    id={`ship-status-${item.idShipment}`}
                    value={item.statusShip ?? "procesando"}
                    onChange={(e) => handleChange(e, item.idShipment)}
                    sx={{
                      borderRadius: "12px",
                      bgcolor: "#fff",
                      fontWeight: 600,
                    }}
                  >
                    <MenuItem value="procesando">Procesando</MenuItem>
                    {!isDigital ? (
                      <MenuItem value="disponible">Disponible</MenuItem>
                    ) : null}
                    {!isDigital ? (
                      <MenuItem value="enviado">Enviado</MenuItem>
                    ) : null}
                    <MenuItem value="entregado">Entregado</MenuItem>
                    <MenuItem value="cancelado">Cancelado</MenuItem>
                  </Select>
                </FormControl>
              </div>

              {isDigital &&
              idOrder > 0 &&
              item.idShipment &&
              !["cancelado"].includes(
                String(item.statusShip || "").toLowerCase(),
              ) ? (
                <SendLicenseKeyPanel
                  idOrder={idOrder}
                  idShipment={Number(item.idShipment)}
                  productName={item.productName || item.name || "Licencia"}
                  defaultEmail={customerEmail || ""}
                  customerName={customerName}
                  statusPay={statusPay}
                  shipmentStatus={item.statusShip}
                  quantity={item.quantity}
                  onSent={(nextStatus) => {
                    handleChange(
                      { target: { value: nextStatus } },
                      Number(item.idShipment),
                    );
                  }}
                />
              ) : null}
            </ModalDetailSection>
          </article>
        );
      })}
    </div>
  );
};

export default DataProducts;
