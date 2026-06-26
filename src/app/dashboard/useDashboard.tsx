"use client";



import ProveedoresUtils from "../services/utils/proveedores.utils";

import { SalesI } from "../interfaces/sales/sales.interface";

import PagosUtils from "../services/utils/pagos.utils";

import { useTheContext } from "../hooks/global.hook";

import {

  buildPaginatedUrl,

  PaginationModel,

  parsePaginatedResponse,

} from "../utils/pagination.util";

import { useCallback, useState } from "react";

import usePermissions from "../hooks/usePermissions";

import OrderCancelModal from "../components/admin/OrderCancelModal";

import { CanCancelOrderResult } from "../types/orderCancellation";



const useDashboard = () => {

  const { requestGetProveedores } = ProveedoresUtils();

  const { setRowsVentas, setDataModal } = useTheContext();

  const { requestPostPagos } = PagosUtils();

  const { can } = usePermissions();

  const [loading, setLoading] = useState(false);



  const handleGetAllSales = useCallback(

    async (

      pagination: PaginationModel,

      filters?: { techsmartPending?: boolean },

    ) => {

      setLoading(true);

      try {

        const resp = await requestGetProveedores(

          buildPaginatedUrl("/getAllSales", pagination, {

            techsmartPending: filters?.techsmartPending ? "true" : undefined,

          }),

          { silent: true },

        );



        if (resp.status == 200) {

          const { rows, totalRows } = parsePaginatedResponse<SalesI>(

            resp.data,

          );



          const grouped = new Map<number, SalesI>();



          rows.forEach((item: any) => {

            const products =

              typeof item.products === "string"

                ? JSON.parse(item.products)

                : (item.products ?? []);



            const existing = grouped.get(item.idOrder);



            if (existing) {

              existing.totalAmount = (

                parseFloat(existing.totalAmount) + parseFloat(item.totalAmount)

              ).toFixed(2);



              products.forEach((product: any) => {

                const existingProduct = existing.products.find(

                  (p) => p.productName === product.productName,

                );



                if (existingProduct) {

                  existingProduct.quantity += product.quantity;

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

            totalRows,

            data: Array.from(grouped.values()).map((item, index) => ({

              ...item,

              id: index,

            })),

          });

        }

      } catch (error) {

        setRowsVentas({ totalRows: 0, data: [] });

      } finally {

        setLoading(false);

      }

    },

    [requestGetProveedores, setRowsVentas],

  );



  const handleChangeStatusShip = async (

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

        { idShipment: Number(idShipment), status: nextStatus, idUser },

        "/openpay/updateStatusShipByOrden",

        { silent: true },

      );



      if (resp.status == 200) {

        setRowsVentas((prev) => ({

          ...prev,

          data: prev.data.map((order) => ({

            ...order,

            products: order.products.map((product) => {

              if (

                Number(product.idShipment) ===

                Number(resp.data.data.data.idShipment)

              ) {

                return { ...product, statusShip: resp.data.data.data.status };

              }

              return product;

            }),

          })),

        }));

      }

    } catch (error) {}

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

    [

      applyCancelledOrderState,

      can,

      requestPostPagos,

      setDataModal,

    ],

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

    } catch (error) {}

  };



  return {

    handleGetAllSales,

    handleChangeStatusShip,

    handleChangeStatusPay,

    openCancelOrderModal,

    loading,

    can,

  };

};



export default useDashboard;


