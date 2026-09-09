"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import EmptyState from "../../common/emptyState/EmptyState";
import { Alert, Chip } from "@mui/material";
import { Clock3, Mail, Package, UserRound } from "lucide-react";
import SendDeliveryStatusEmailPanel from "./SendDeliveryStatusEmailPanel";
import ShipmentGroupSection from "./ShipmentGroupSection";
import OrderCancelSection from "@/app/components/admin/OrderCancelSection";
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

const STATUS_CHANGE_COOLDOWN_MS = 3000;

const DataProducts = ({
  params,
  handleChangeStatusShip,
  handleChangeStatusShipByShipment,
  promptShipCancelReason,
  onSaleLicenseDelivered,
  openCancelOrderModal,
  canCancelOrder,
}: any) => {
  const [products, setProducts] = useState(params.value || []);
  const [updatingSaleId, setUpdatingSaleId] = useState<number | null>(null);
  const [updatingShipmentId, setUpdatingShipmentId] = useState<number | null>(
    null,
  );
  const [cooldownSaleIds, setCooldownSaleIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [cooldownShipmentIds, setCooldownShipmentIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [bulkCooldownUntil, setBulkCooldownUntil] = useState(0);
  const [, setCooldownTick] = useState(0);

  useEffect(() => {
    setProducts(params.value || []);
  }, [params.value]);

  const armSaleCooldown = useCallback((idSale: number) => {
    setCooldownSaleIds((prev) => new Set(prev).add(idSale));
    setTimeout(() => {
      setCooldownSaleIds((prev) => {
        const next = new Set(prev);
        next.delete(idSale);
        return next;
      });
      setCooldownTick((tick) => tick + 1);
    }, STATUS_CHANGE_COOLDOWN_MS);
  }, []);

  const armShipmentCooldown = useCallback((idShipment: number) => {
    setCooldownShipmentIds((prev) => new Set(prev).add(idShipment));
    setTimeout(() => {
      setCooldownShipmentIds((prev) => {
        const next = new Set(prev);
        next.delete(idShipment);
        return next;
      });
      setCooldownTick((tick) => tick + 1);
    }, STATUS_CHANGE_COOLDOWN_MS);
  }, []);

  const armBulkCooldown = useCallback(() => {
    const until = Date.now() + STATUS_CHANGE_COOLDOWN_MS;
    setBulkCooldownUntil(until);
    setTimeout(() => {
      setBulkCooldownUntil(0);
      setCooldownTick((tick) => tick + 1);
    }, STATUS_CHANGE_COOLDOWN_MS);
  }, []);

  const { physical, digital } = useMemo(
    () => groupOrderProductsByShipment(products),
    [products],
  );

  const physicalProducts = useMemo(
    () => filterPhysicalProducts(products),
    [products],
  );

  const idOrder = Number(params?.row?.idOrder || 0);
  const statusPay = params?.row?.statusPay;
  const bulkOnCooldown = bulkCooldownUntil > Date.now();

  const handleProductStatusChange = async (
    event: { target: { value: string } },
    idSale: number,
    options?: { cancelReason?: string },
  ) => {
    if (cooldownSaleIds.has(Number(idSale))) return false;

    const prevStatus = products.find(
      (p: any) => Number(p.idSale) === Number(idSale),
    )?.statusShip;
    const nextStatus = event.target.value;
    const isCancel = nextStatus === "cancelado";

    // No pintar Cancelado en el Select hasta confirmar motivo + API.
    if (!isCancel) {
      setProducts((prev: any[]) =>
        prev.map((p: any) =>
          Number(p.idSale) === Number(idSale)
            ? {
                ...p,
                statusShip: nextStatus,
                statusChangedAt: new Date().toISOString(),
              }
            : p,
        ),
      );
    }
    setUpdatingSaleId(Number(idSale));

    try {
      const ok = await handleChangeStatusShip(
        event,
        idSale,
        params.row.idUser,
        options,
      );
      if (ok === false) {
        if (!isCancel) {
          setProducts((prev: any[]) =>
            prev.map((p: any) =>
              Number(p.idSale) === Number(idSale)
                ? { ...p, statusShip: prevStatus }
                : p,
            ),
          );
        }
      } else if (isCancel) {
        setProducts((prev: any[]) =>
          prev.map((p: any) =>
            Number(p.idSale) === Number(idSale)
              ? {
                  ...p,
                  statusShip: nextStatus,
                  statusChangedAt: new Date().toISOString(),
                }
              : p,
          ),
        );
        armSaleCooldown(Number(idSale));
      } else {
        armSaleCooldown(Number(idSale));
      }
      return ok;
    } catch {
      if (!isCancel) {
        setProducts((prev: any[]) =>
          prev.map((p: any) =>
            Number(p.idSale) === Number(idSale)
              ? { ...p, statusShip: prevStatus }
              : p,
          ),
        );
      }
      return false;
    } finally {
      setUpdatingSaleId(null);
    }
  };

  const handleShipmentStatusChange = async (
    event: { target: { value: string } },
    idShipment: number,
    options?: { cancelReason?: string },
  ) => {
    if (cooldownShipmentIds.has(Number(idShipment))) return false;

    const nextStatus = event.target.value;
    const isCancel = nextStatus === "cancelado";
    const previous = products.map((p: any) => ({ ...p }));
    const affectedSaleIds = products
      .filter((p: any) => Number(p.idShipment) === Number(idShipment))
      .map((p: any) => Number(p.idSale))
      .filter((id: number) => Number.isFinite(id) && id > 0);

    if (!isCancel) {
      setProducts((prev: any[]) =>
        prev.map((p: any) =>
          Number(p.idShipment) === Number(idShipment) ||
          affectedSaleIds.includes(Number(p.idSale))
            ? {
                ...p,
                statusShip: nextStatus,
                statusChangedAt: new Date().toISOString(),
              }
            : p,
        ),
      );
    }
    setUpdatingShipmentId(Number(idShipment));

    try {
      if (!handleChangeStatusShipByShipment) return false;
      const ok = await handleChangeStatusShipByShipment(
        event,
        idShipment,
        params.row.idUser,
        options,
      );
      if (ok === false) {
        if (!isCancel) setProducts(previous);
      } else if (isCancel) {
        setProducts((prev: any[]) =>
          prev.map((p: any) =>
            Number(p.idShipment) === Number(idShipment) ||
            affectedSaleIds.includes(Number(p.idSale))
              ? {
                  ...p,
                  statusShip: nextStatus,
                  statusChangedAt: new Date().toISOString(),
                }
              : p,
          ),
        );
        armShipmentCooldown(Number(idShipment));
        affectedSaleIds.forEach((id) => armSaleCooldown(id));
      } else {
        armShipmentCooldown(Number(idShipment));
        affectedSaleIds.forEach((id) => armSaleCooldown(id));
      }
      return ok;
    } catch {
      if (!isCancel) setProducts(previous);
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
              statusChangedAt: new Date().toISOString(),
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
    if (bulkOnCooldown) return false;

    let cancelReason: string | undefined;

    if (nextStatus === "cancelado") {
      if (typeof promptShipCancelReason !== "function") return false;
      const prompted = await promptShipCancelReason(
        `Vas a marcar como Cancelado todos los envíos físicos pendientes de la orden #${idOrder}. Cuando todos los productos queden cancelados, se cancelará la orden y se intentará el reembolso (solo dentro de las 24 h). Indica el motivo; el cliente lo verá en su historial y en el correo.`,
      );
      if (!prompted) return false;
      cancelReason = prompted;
    }

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

    let anyOk = false;
    for (const idShipment of shipmentIds) {
      const ok = await handleShipmentStatusChange(
        { target: { value: nextStatus } },
        idShipment,
        cancelReason ? { cancelReason } : undefined,
      );
      if (ok) anyOk = true;
    }

    const orphanSales = physicalProducts.filter(
      (item: any) =>
        (!item.idShipment || Number(item.idShipment) <= 0) &&
        item.idSale &&
        !isTerminalShipStatus(item.statusShip) &&
        String(item.statusShip || "").toLowerCase() !== nextStatus,
    );

    for (const item of orphanSales) {
      const ok = await handleProductStatusChange(
        { target: { value: nextStatus } },
        Number(item.idSale),
        cancelReason ? { cancelReason } : undefined,
      );
      if (ok) anyOk = true;
    }

    if (shipmentIds.length === 0 && orphanSales.length === 0) {
      return nextStatus !== "cancelado";
    }

    if (anyOk) armBulkCooldown();
    return anyOk;
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

      {params?.row?.cancelReason ? (
        <Alert
          severity="warning"
          sx={{ borderRadius: "12px", margin: 0 }}
        >
          <strong>Motivo de cancelación:</strong> {params.row.cancelReason}
        </Alert>
      ) : null}

      {typeof openCancelOrderModal === "function" ? (
        <OrderCancelSection
          idOrder={idOrder}
          statusPay={statusPay}
          canCancelPermission={canCancelOrder === true}
          onCancelClick={openCancelOrderModal}
        />
      ) : null}

      {physicalProducts.length > 0 ? (
        <Alert
          severity="info"
          icon={<Clock3 size={18} />}
          sx={{ borderRadius: "12px", margin: 0 }}
        >
          Al cambiar el <strong>estatus del envío</strong> se actualizan los
          productos en vivo. El correo al cliente{" "}
          <strong>solo se envía</strong> desde el panel de abajo (botón{" "}
          <strong>Enviar correo al cliente</strong>), excepto al{" "}
          <strong>cancelar la orden completa</strong> (correo automático).
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
          bulkDisabled={bulkOnCooldown}
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
              cooldownShipmentIds={cooldownShipmentIds}
              cooldownSaleIds={cooldownSaleIds}
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
              cooldownShipmentIds={cooldownShipmentIds}
              cooldownSaleIds={cooldownSaleIds}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
};

export default DataProducts;
