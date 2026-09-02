"use client";

import { useState, useEffect, useMemo } from "react";
import EmptyState from "../../common/emptyState/EmptyState";
import { Alert, Chip } from "@mui/material";
import { Clock3, Mail, Package, UserRound } from "lucide-react";
import SendDeliveryStatusEmailPanel from "./SendDeliveryStatusEmailPanel";
import ShipmentGroupSection from "./ShipmentGroupSection";
import {
  getPaymentStatusLabel,
  isOrderPaid,
} from "@/app/utils/paymentStatus.util";
import {
  groupOrderProductsByShipment,
  filterPhysicalProducts,
  isDigitalDeliveryProduct,
} from "@/app/utils/orderShipmentGroups";
import { orderModalSpacing as sp } from "./orderModalSpacing";

const EMAIL_DEBOUNCE_HINT_SEC = Math.max(
  1,
  Math.round(
    Number(process.env.NEXT_PUBLIC_DELIVERY_EMAIL_DEBOUNCE_MS || 45000) / 1000,
  ),
);

const DataProducts = ({
  params,
  handleChangeStatusShip,
  handleChangeStatusShipByShipment,
  onSaleLicenseDelivered,
}: any) => {
  const [products, setProducts] = useState(params.value || []);
  const [updatingSaleId, setUpdatingSaleId] = useState<number | null>(null);
  const [updatingShipmentId, setUpdatingShipmentId] = useState<number | null>(
    null,
  );

  useEffect(() => {
    setProducts(params.value || []);
  }, [params.value]);

  const { physical, digital } = useMemo(
    () => groupOrderProductsByShipment(products),
    [products],
  );

  const physicalProducts = useMemo(
    () => filterPhysicalProducts(products),
    [products],
  );

  const handleProductStatusChange = async (
    event: { target: { value: string } },
    idSale: number,
  ) => {
    const prevStatus = products.find(
      (p: any) => Number(p.idSale) === Number(idSale),
    )?.statusShip;
    const nextStatus = event.target.value;

    setProducts((prev: any[]) =>
      prev.map((p: any) =>
        Number(p.idSale) === Number(idSale)
          ? { ...p, statusShip: nextStatus }
          : p,
      ),
    );
    setUpdatingSaleId(Number(idSale));

    try {
      const ok = await handleChangeStatusShip(
        event,
        idSale,
        params.row.idUser,
      );
      if (ok === false) {
        setProducts((prev: any[]) =>
          prev.map((p: any) =>
            Number(p.idSale) === Number(idSale)
              ? { ...p, statusShip: prevStatus }
              : p,
          ),
        );
      }
      return ok;
    } catch {
      setProducts((prev: any[]) =>
        prev.map((p: any) =>
          Number(p.idSale) === Number(idSale)
            ? { ...p, statusShip: prevStatus }
            : p,
        ),
      );
      return false;
    } finally {
      setUpdatingSaleId(null);
    }
  };

  const handleShipmentStatusChange = async (
    event: { target: { value: string } },
    idShipment: number,
  ) => {
    const nextStatus = event.target.value;
    const previous = products.map((p: any) => ({ ...p }));
    const affectedSaleIds = products
      .filter((p: any) => Number(p.idShipment) === Number(idShipment))
      .map((p: any) => Number(p.idSale))
      .filter((id: number) => Number.isFinite(id) && id > 0);

    setProducts((prev: any[]) =>
      prev.map((p: any) =>
        Number(p.idShipment) === Number(idShipment) ||
        affectedSaleIds.includes(Number(p.idSale))
          ? { ...p, statusShip: nextStatus }
          : p,
      ),
    );
    setUpdatingShipmentId(Number(idShipment));

    try {
      if (!handleChangeStatusShipByShipment) return false;
      const ok = await handleChangeStatusShipByShipment(
        event,
        idShipment,
        params.row.idUser,
      );
      if (ok === false) {
        setProducts(previous);
      }
      return ok;
    } catch {
      setProducts(previous);
      return false;
    } finally {
      setUpdatingShipmentId(null);
    }
  };

  const markSaleDelivered = (
    idSale: number,
    _idOrder: number,
    nextStatus: "entregado",
  ) => {
    setProducts((prev: any[]) =>
      prev.map((p) =>
        Number(p.idSale) === Number(idSale)
          ? {
              ...p,
              statusShip: nextStatus,
              licenseDeliveredAt: new Date().toISOString(),
            }
          : p,
      ),
    );
    onSaleLicenseDelivered?.(idSale, params.row?.idOrder, nextStatus);
  };

  const isTerminalShipStatus = (status?: string | null) =>
    ["entregado", "cancelado"].includes(String(status ?? "").toLowerCase());

  const handleBulkPhysicalStatusChange = async (nextStatus: string) => {
    const shipmentIds = [
      ...new Set(
        physical
          .filter(
            (group) =>
              group.idShipment != null &&
              Number(group.idShipment) > 0 &&
              !isTerminalShipStatus(group.statusShip) &&
              String(group.statusShip || "").toLowerCase() !== nextStatus,
          )
          .map((group) => Number(group.idShipment)),
      ),
    ];

    for (const idShipment of shipmentIds) {
      await handleShipmentStatusChange(
        { target: { value: nextStatus } },
        idShipment,
      );
    }

    const orphanSales = physicalProducts.filter(
      (item: any) =>
        (!item.idShipment || Number(item.idShipment) <= 0) &&
        item.idSale &&
        !isTerminalShipStatus(item.statusShip) &&
        String(item.statusShip || "").toLowerCase() !== nextStatus,
    );

    for (const item of orphanSales) {
      await handleProductStatusChange(
        { target: { value: nextStatus } },
        Number(item.idSale),
      );
    }
  };

  if (!products?.length) {
    return (
      <EmptyState
        title="Sin productos"
        description="No hay productos en esta orden."
        icon="products"
        compact
      />
    );
  }

  const customerEmail =
    params?.row?.dataUser?.email || params?.row?.email || null;
  const customerName = [
    params?.row?.dataUser?.name,
    params?.row?.dataUser?.lastName || params?.row?.dataUser?.lastname,
  ]
    .filter(Boolean)
    .join(" ");
  const idOrder = Number(params?.row?.idOrder || 0);
  const statusPay = params?.row?.statusPay;
  const orderPaid = isOrderPaid(statusPay);
  const digitalProductCount = products.filter((item: any) =>
    isDigitalDeliveryProduct(item),
  ).length;

  const hasPendingDigital = products.some(
    (item: any) =>
      isDigitalDeliveryProduct(item) &&
      !["entregado", "cancelado"].includes(
        String(item.statusShip || "").toLowerCase(),
      ),
  );

  return (
    <div className="admin-modal-products" style={sp.productsRoot}>
      <header className="admin-order-hero" style={sp.orderHero}>
        <div className="admin-order-hero__main">
          <p className="admin-order-hero__eyebrow">Detalle de la orden</p>
          <h2 className="admin-order-hero__title">Orden #{idOrder || "—"}</h2>
          <p className="admin-order-hero__subtitle">
            {physical.length > 0
              ? `${physical.length} envío${physical.length === 1 ? "" : "s"} físico${physical.length === 1 ? "" : "s"}`
              : "Sin envíos físicos"}
            {digitalProductCount > 0
              ? ` · ${digitalProductCount} licencia${digitalProductCount === 1 ? "" : "s"} digital${digitalProductCount === 1 ? "" : "es"}`
              : ""}
            {` · ${products.length} producto${products.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="admin-order-hero__meta">
          <Chip
            size="small"
            label={`Pago: ${getPaymentStatusLabel(statusPay)}`}
            color={orderPaid ? "success" : "default"}
            sx={{ fontWeight: 700 }}
          />
          {customerName || customerEmail ? (
            <span className="admin-order-hero__customer">
              <UserRound size={14} />
              {customerName || customerEmail}
            </span>
          ) : null}
        </div>
      </header>

      {physicalProducts.length > 0 ? (
        <Alert
          severity="info"
          icon={<Clock3 size={18} />}
          sx={{ borderRadius: "12px", margin: 0 }}
        >
          Al cambiar el <strong>estatus del envío</strong>, el correo al cliente
          se programa unos <strong>{EMAIL_DEBOUNCE_HINT_SEC} s</strong> después
          del último cambio (un correo, sin spam). Si cierras el navegador o
          recargas, el temporizador sigue en el servidor. También puedes
          enviarlo ya desde el panel de abajo.
        </Alert>
      ) : null}

      {physicalProducts.length > 0 ? (
        <SendDeliveryStatusEmailPanel
          idOrder={idOrder}
          statusPay={statusPay}
          customerEmail={customerEmail}
          products={physicalProducts}
          allProducts={products}
          onBulkStatusChange={handleBulkPhysicalStatusChange}
          emailDebounceSeconds={EMAIL_DEBOUNCE_HINT_SEC}
        />
      ) : (
        <Alert
          severity="info"
          icon={<Mail size={18} />}
          sx={{ borderRadius: "12px", margin: 0 }}
        >
          Esta orden solo incluye <strong>licencias digitales</strong>. Usa el correo
          de claves en cada producto; no aplica el correo de estatus de paquetería.
        </Alert>
      )}

      {hasPendingDigital ? (
        <Alert
          severity={orderPaid ? "warning" : "info"}
          icon={<Mail size={20} />}
          sx={{ borderRadius: "12px", margin: 0 }}
        >
          {orderPaid ? (
            <>
              <strong>Licencia digital pendiente.</strong> Envía la clave desde el
              bloque de licencias
              {customerEmail ? (
                <>
                  {" "}
                  a{" "}
                  <a href={`mailto:${customerEmail}`} style={{ fontWeight: 700 }}>
                    {customerEmail}
                  </a>
                </>
              ) : null}
              .
            </>
          ) : (
            <>
              Licencias en espera de pago (
              <strong>{getPaymentStatusLabel(statusPay)}</strong>).
            </>
          )}
        </Alert>
      ) : null}

      {physical.length > 0 ? (
        <section className="admin-order-products-modal__list" style={sp.sectionList}>
          <h3 className="admin-order-products-modal__section-title" style={sp.sectionTitle}>
            <Package size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Envíos físicos ({physical.length})
          </h3>
          {physical.map((group, index) => (
            <ShipmentGroupSection
              key={group.key}
              group={group}
              stackGap={index > 0}
              idOrder={idOrder}
              statusPay={statusPay}
              customerEmail={customerEmail}
              customerName={customerName}
              onShipmentStatusChange={handleShipmentStatusChange}
              onProductStatusChange={handleProductStatusChange}
              updatingShipmentId={updatingShipmentId}
              updatingSaleId={updatingSaleId}
              emailDebounceSeconds={EMAIL_DEBOUNCE_HINT_SEC}
            />
          ))}
        </section>
      ) : null}

      {digital.length > 0 ? (
        <section className="admin-order-products-modal__list" style={sp.sectionList}>
          <h3 className="admin-order-products-modal__section-title" style={sp.sectionTitle}>
            <Mail size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Entrega digital ({digital.reduce((n, g) => n + g.products.length, 0)})
          </h3>
          {digital.map((group, index) => (
            <ShipmentGroupSection
              key={group.key}
              group={group}
              stackGap={index > 0}
              idOrder={idOrder}
              statusPay={statusPay}
              customerEmail={customerEmail}
              customerName={customerName}
              onShipmentStatusChange={handleShipmentStatusChange}
              onSaleLicenseDelivered={markSaleDelivered}
              updatingShipmentId={updatingShipmentId}
              updatingSaleId={updatingSaleId}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
};

export default DataProducts;
