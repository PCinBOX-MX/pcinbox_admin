"use client";

import ProveedoresUtils from "../services/utils/proveedores.utils";
import { SalesI } from "../interfaces/sales/sales.interface";
import PagosUtils from "../services/utils/pagos.utils";
import { useTheContext } from "../hooks/global.hook";
import { useCallback, useState } from "react";
import usePermissions from "../hooks/usePermissions";
import OrderCancelModal from "../components/admin/OrderCancelModal";
import { CanCancelOrderResult } from "../types/orderCancellation";
import { useRequestSequence } from "../hooks/useRequestSequence";
import { safeJsonParse } from "../utils/safeJsonParse";

type SalesFilters = {
  search?: string;
  statusPay?: string;
  methodPay?: string;
  dateFrom?: string;
  dateTo?: string;
  techsmartPending?: boolean;
  dicotechPending?: boolean;
};

const useDashboard = () => {
  const { requestGetProveedores } = ProveedoresUtils();
  const { setRowsVentas, setDataModal } = useTheContext();
  const { requestPostPagos } = PagosUtils();
  const { can } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");
  const { nextSequence, isCurrent } = useRequestSequence();

  const handleGetAllSales = useCallback(
    async (page?: number, pageSize = 25, filters: SalesFilters = {}) => {
      const sequence = nextSequence();
      setLoading(true);
      setListError("");
      try {
        const params = new URLSearchParams();
        params.set("page", String(page ?? 1));
        params.set("pageSize", String(pageSize));
        if (filters.search) params.set("search", filters.search);
        if (filters.statusPay) params.set("statusPay", filters.statusPay);
        if (filters.methodPay) params.set("methodPay", filters.methodPay);
        if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
        if (filters.dateTo) params.set("dateTo", filters.dateTo);
        if (filters.techsmartPending) {
          params.set("techsmartPending", "true");
        }
        if (filters.dicotechPending) {
          params.set("dicotechPending", "true");
        }

        const resp = await requestGetProveedores(
          `/getAllSales?${params.toString()}`,
          { silent: true },
        );

        if (!isCurrent(sequence)) return;

        if (resp.status == 200) {
          const data = resp.data;
          const grouped = new Map<number, SalesI>();

          data.data.data.forEach((item: any) => {
            const products = safeJsonParse<any[]>(
              item.products,
              item.products ?? [],
            );

            const existing = grouped.get(item.idOrder);

            if (existing) {
              existing.totalAmount = (
                parseFloat(existing.totalAmount) + parseFloat(item.totalAmount)
              ).toFixed(2);

              if (existing.shippingTotal == null && item.shippingTotal != null) {
                existing.shippingTotal = item.shippingTotal;
              }
              if (
                existing.insuranceTotal == null &&
                item.insuranceTotal != null
              ) {
                existing.insuranceTotal = item.insuranceTotal;
              }

              products.forEach((product: any) => {
                const existingProduct = existing.products.find(
                  (p) => p.productName === product.productName,
                );

                if (existingProduct) {
                  existingProduct.quantity += product.quantity;
                  const prevTotal = Number(existingProduct.lineTotal) || 0;
                  const nextTotal = Number(product.lineTotal) || 0;
                  if (prevTotal > 0 || nextTotal > 0) {
                    existingProduct.lineTotal = prevTotal + nextTotal;
                  }
                } else {
                  existing.products.push({ ...product });
                }
              });
            } else {
              grouped.set(item.idOrder, {
                ...item,
                products: [...products],
              });
            }
          });

          setRowsVentas({
            totalRows: data?.data?.totalSales,
            data: Array.from(grouped.values()).map((item, index) => ({
              ...item,
              id: index,
            })),
          });
        } else {
          setListError(
            "No se pudieron cargar las ventas. Revisa tu conexión e intenta de nuevo.",
          );
          setRowsVentas({ totalRows: 0, data: [] });
        }
      } catch {
        if (!isCurrent(sequence)) return;
        setListError(
          "No se pudieron cargar las ventas. Revisa tu conexión e intenta de nuevo.",
        );
        setRowsVentas({ totalRows: 0, data: [] });
      } finally {
        if (isCurrent(sequence)) setLoading(false);
      }
    },
    [requestGetProveedores, setRowsVentas, nextSequence, isCurrent],
  );

  const handleChangeStatusShip = async (
    event: any,
    idSale: number,
    idUser: any,
  ) => {
    if (!can("orders.update_status_ship")) {
      setDataModal({
        isOpen: true,
        type: "warning",
        title: "Sin permiso",
        showActions: false,
        content: "Tu rol no puede cambiar el estatus de envío.",
        onClose: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
        onConfirm: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    const nextStatus = event.target.value;

    if (nextStatus === "cancelado" && !can("orders.cancel")) {
      setDataModal({
        isOpen: true,
        type: "warning",
        title: "Sin permiso",
        showActions: false,
        content: "Tu rol no puede cancelar envíos.",
        onClose: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
        onConfirm: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    try {
      const resp = await requestPostPagos(
        {
          idSale: Number(idSale),
          status: nextStatus,
          idUser,
          skipDeliveryEmail: true,
        },
        "/openpay/updateStatusShipByOrden",
        { silent: true },
      );

      if (resp.status == 200) {
        const payload = resp.data?.data?.data ?? {};
        const updatedIdSale = Number(payload.idSale ?? idSale);
        const updatedStatus = payload.status ?? nextStatus;
        const idOrder = Number(payload.idOrder);
        const orderCancelled = payload.orderCancelled === true;
        const orderCancelError = payload.orderCancelError
          ? String(payload.orderCancelError)
          : null;

        setRowsVentas((prev) => ({
          ...prev,
          data: prev.data.map((order) => {
            const matchesOrder =
              orderCancelled &&
              Number.isFinite(idOrder) &&
              Number(order.idOrder) === idOrder;
            return {
              ...order,
              ...(matchesOrder ? { statusPay: "cancelled" } : {}),
              products: order.products.map((product) => {
                if (Number(product.idSale) === updatedIdSale) {
                  return { ...product, statusShip: updatedStatus };
                }
                if (matchesOrder) {
                  return { ...product, statusShip: "cancelado" };
                }
                return product;
              }),
            };
          }),
        }));

        if (orderCancelled) {
          const gateway = String(payload.orderCancelGateway || "");
          setDataModal({
            isOpen: true,
            type: "success",
            title: "Orden cancelada",
            showActions: false,
            content:
              gateway === "manual"
                ? "Todos los productos quedaron cancelados. La orden se marcó como cancelada; el reembolso se coordina según el método de pago (sucursal / transferencia)."
                : "Todos los productos quedaron cancelados. Se canceló la orden y se solicitó el reembolso al método de pago del cliente.",
            onClose: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
            onConfirm: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
          });
        } else if (orderCancelError) {
          setDataModal({
            isOpen: true,
            type: "warning",
            title: "Reembolso pendiente",
            showActions: false,
            content: `Los productos quedaron cancelados, pero no se completó el reembolso automático: ${orderCancelError}`,
            onClose: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
            onConfirm: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
          });
        }

        return true;
      }
    } catch (error: any) {
      const message = error?.response?.data?.message;
      if (nextStatus === "cancelado" && message) {
        setDataModal({
          isOpen: true,
          type: "warning",
          title: "No se puede cancelar",
          showActions: false,
          content: message,
          onClose: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
          onConfirm: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
        });
      }
      return false;
    }
    return false;
  };

  const handleChangeStatusShipByShipment = async (
    event: any,
    idShipment: number,
    idUser: any,
  ) => {
    if (!can("orders.update_status_ship")) {
      setDataModal({
        isOpen: true,
        type: "warning",
        title: "Sin permiso",
        showActions: false,
        content: "Tu rol no puede cambiar el estatus de envío.",
        onClose: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
        onConfirm: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
      });
      return false;
    }

    const nextStatus = event.target.value;

    if (nextStatus === "cancelado" && !can("orders.cancel")) {
      setDataModal({
        isOpen: true,
        type: "warning",
        title: "Sin permiso",
        showActions: false,
        content: "Tu rol no puede cancelar envíos.",
        onClose: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
        onConfirm: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
      });
      return false;
    }

    try {
      const resp = await requestPostPagos(
        {
          idShipment: Number(idShipment),
          status: nextStatus,
          idUser,
          skipDeliveryEmail: true,
        },
        "/openpay/updateStatusShipByOrden",
        { silent: true },
      );

      if (resp.status == 200) {
        const payload = resp.data?.data?.data ?? {};
        const updatedStatus = payload.status ?? nextStatus;
        const updatedShipmentId = Number(payload.idShipment ?? idShipment);
        const updatedSaleIds = Array.isArray(payload.idSales)
          ? payload.idSales.map((id: unknown) => Number(id))
          : [];
        const saleIdSet = new Set(updatedSaleIds.filter((id: number) => id > 0));
        const idOrder = Number(payload.idOrder);
        const orderCancelled = payload.orderCancelled === true;
        const orderCancelError = payload.orderCancelError
          ? String(payload.orderCancelError)
          : null;

        setRowsVentas((prev) => ({
          ...prev,
          data: prev.data.map((order) => {
            const matchesOrder =
              orderCancelled &&
              Number.isFinite(idOrder) &&
              Number(order.idOrder) === idOrder;
            return {
              ...order,
              ...(matchesOrder ? { statusPay: "cancelled" } : {}),
              products: order.products.map((product) => {
                const matchesShipment =
                  Number(product.idShipment) === updatedShipmentId;
                const matchesSale =
                  saleIdSet.size > 0 && saleIdSet.has(Number(product.idSale));
                if (matchesShipment || matchesSale || matchesOrder) {
                  return {
                    ...product,
                    statusShip: matchesOrder ? "cancelado" : updatedStatus,
                  };
                }
                return product;
              }),
            };
          }),
        }));

        if (orderCancelled) {
          const gateway = String(payload.orderCancelGateway || "");
          setDataModal({
            isOpen: true,
            type: "success",
            title: "Orden cancelada",
            showActions: false,
            content:
              gateway === "manual"
                ? "Todos los productos quedaron cancelados. La orden se marcó como cancelada; el reembolso se coordina según el método de pago (sucursal / transferencia)."
                : "Todos los productos quedaron cancelados. Se canceló la orden y se solicitó el reembolso al método de pago del cliente.",
            onClose: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
            onConfirm: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
          });
        } else if (orderCancelError) {
          setDataModal({
            isOpen: true,
            type: "warning",
            title: "Reembolso pendiente",
            showActions: false,
            content: `Los productos quedaron cancelados, pero no se completó el reembolso automático: ${orderCancelError}`,
            onClose: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
            onConfirm: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
          });
        }

        return true;
      }

      const failMessage = resp.data?.message;
      if (nextStatus === "cancelado" && failMessage) {
        setDataModal({
          isOpen: true,
          type: "warning",
          title: "No se puede cancelar",
          showActions: false,
          content: String(failMessage),
          onClose: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
          onConfirm: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
        });
      }
    } catch (error: any) {
      const message = error?.response?.data?.message;
      if (nextStatus === "cancelado" && message) {
        setDataModal({
          isOpen: true,
          type: "warning",
          title: "No se puede cancelar",
          showActions: false,
          content: message,
          onClose: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
          onConfirm: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
        });
      }
      return false;
    }
    return false;
  };

  const applyCancelledOrderState = useCallback(
    (idOrder: number) => {
      setRowsVentas((prev) => ({
        ...prev,
        data: prev.data.map((order) =>
          order.idOrder === idOrder
            ? {
              ...order,
              statusPay: "cancelled",
              products: order.products.map((product) => ({
                ...product,
                statusShip: "cancelado",
              })),
            }
            : order,
        ),
      }));
    },
    [setRowsVentas],
  );

  const openCancelOrderModal = useCallback(
    async (idOrder: number) => {
      if (!can("orders.cancel")) {
        setDataModal({
          isOpen: true,
          type: "warning",
          title: "Sin permiso",
          showActions: false,
          content: "Tu rol no puede cancelar órdenes.",
          onClose: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
          onConfirm: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
        });
        return;
      }

      let eligibility: CanCancelOrderResult | null = null;

      try {
        const resp = await requestPostPagos(
          { idOrder },
          "/orders/admin/canCancelOrder",
          { silent: true },
        );

        if (resp.status === 200) {
          eligibility = resp.data?.data ?? null;
        }
      } catch {
        setDataModal({
          isOpen: true,
          type: "error",
          title: "Error",
          showActions: false,
          content:
            "No se pudo consultar si la orden es cancelable. Verifica que la pasarela esté en marcha.",
          onClose: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
          onConfirm: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
        });
        return;
      }

      setDataModal({
        isOpen: true,
        type: "warning",
        title: "Cancelar orden",
        showActions: false,
        maxWidth: "480px",
        content: (
          <OrderCancelModal
            idOrder={idOrder}
            eligibility={eligibility}
            canOverride={can("orders.cancel.override")}
            onCancel={() => setDataModal((prev) => ({ ...prev, isOpen: false }))}
            onConfirm={async ({ cancelReason, manualOverride }) => {
              setDataModal((prev) => ({ ...prev, isOpen: false }));
              try {
                const resp = await requestPostPagos(
                  { idOrder, cancelReason, manualOverride },
                  "/orders/admin/cancelOrder",
                );

                if (resp.status === 200) {
                  applyCancelledOrderState(idOrder);
                  setDataModal({
                    isOpen: true,
                    type: "info",
                    title: "Orden cancelada",
                    showActions: false,
                    content: manualOverride
                      ? `La orden #${idOrder} se canceló con override manual.`
                      : `La orden #${idOrder} se canceló correctamente.`,
                    onClose: () =>
                      setDataModal((prev) => ({ ...prev, isOpen: false })),
                    onConfirm: () =>
                      setDataModal((prev) => ({ ...prev, isOpen: false })),
                  });
                }
              } catch (error: any) {
                setDataModal({
                  isOpen: true,
                  type: "error",
                  title: "No se pudo cancelar",
                  showActions: false,
                  content:
                    error?.response?.data?.message ||
                    "Ocurrió un error al cancelar la orden.",
                  onClose: () =>
                    setDataModal((prev) => ({ ...prev, isOpen: false })),
                  onConfirm: () =>
                    setDataModal((prev) => ({ ...prev, isOpen: false })),
                });
              }
            }}
          />
        ),
        onClose: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
        onConfirm: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
      });
    },
    [applyCancelledOrderState, can, requestPostPagos, setDataModal],
  );

  const handleChangeStatusPay = async (
    event: any,
    idOrder: number,
    idUser: any,
  ) => {
    const nextStatus = event.target.value;

    if (nextStatus === "cancelled") {
      await openCancelOrderModal(idOrder);
      return;
    }

    if (!can("orders.update_status_pay")) {
      setDataModal({
        isOpen: true,
        type: "warning",
        title: "Sin permiso",
        showActions: false,
        content: "Tu rol no puede cambiar el estatus de pago.",
        onClose: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
        onConfirm: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    try {
      const resp = await requestPostPagos(
        { status: nextStatus, idUser, idOrder },
        "/openpay/updateStatusPayByOrden",
        { silent: true },
      );

      if (resp.status == 200) {
        setRowsVentas((prev) => ({
          ...prev,
          data: prev.data.map((order) =>
            order.idOrder === idOrder
              ? { ...order, statusPay: nextStatus }
              : order,
          ),
        }));
      }
    } catch (error) { }
  };

  const handleRetryDicotechPostPayment = useCallback(
    async (idOrder: number) => {
      if (!can("orders.update_status_ship")) {
        setDataModal({
          isOpen: true,
          type: "warning",
          title: "Sin permiso",
          showActions: false,
          content: "Tu rol no puede reintentar el post-pago Dicotech.",
          onClose: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
          onConfirm: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
        });
        return false;
      }

      try {
        const resp = await requestPostPagos(
          { idOrder: Number(idOrder) },
          "/orders/admin/retryDicotechPostPayment",
          { silent: true },
        );

        if (resp.status === 200 && resp.data?.ok !== false) {
          setRowsVentas((prev) => ({
            ...prev,
            data: prev.data.map((order) =>
              order.idOrder === idOrder
                ? { ...order, hasDicotechPendingProducts: false }
                : order,
            ),
          }));
          setDataModal({
            isOpen: true,
            type: "success",
            title: "Dicotech",
            showActions: false,
            content:
              resp.data?.message ||
              `Post-pago Dicotech reintentado para la orden #${idOrder}.`,
            onClose: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
            onConfirm: () =>
              setDataModal((prev) => ({ ...prev, isOpen: false })),
          });
          return true;
        }

        setDataModal({
          isOpen: true,
          type: "error",
          title: "Dicotech incompleto",
          showActions: false,
          content:
            resp.data?.message ||
            `No se completó el post-pago Dicotech de la orden #${idOrder}. Revisa e intenta de nuevo.`,
          onClose: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
          onConfirm: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
        });
        return false;
      } catch (error: any) {
        setDataModal({
          isOpen: true,
          type: "error",
          title: "Error Dicotech",
          showActions: false,
          content:
            error?.response?.data?.message ||
            `No se pudo reintentar Dicotech para la orden #${idOrder}.`,
          onClose: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
          onConfirm: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
        });
        return false;
      }
    },
    [can, requestPostPagos, setDataModal, setRowsVentas],
  );

  return {
    handleGetAllSales,
    handleChangeStatusShip,
    handleChangeStatusShipByShipment,
    handleChangeStatusPay,
    openCancelOrderModal,
    handleRetryDicotechPostPayment,
    loading,
    listError,
    can,
  };
};

export default useDashboard;
