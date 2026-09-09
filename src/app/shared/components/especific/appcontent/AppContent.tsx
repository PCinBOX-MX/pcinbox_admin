"use client";

import ModalComponent from "../modal/ModalComponent";
import { useTheContext } from "@/app/hooks/global.hook";
import useProtected from "@/app/hooks/protectedRoute.hook";
import { usePathname } from "next/navigation";
import AdminSidebar from "../../layout/AdminSidebar";
import React, { useEffect } from "react";
import SpinnerComponent from "../spinner/Spinner";
import { ProductsI } from "@/app/interfaces/products/products.interface";
import { isAuthPathname } from "@/app/utils/authRoutes";
import { orderIdsMatch } from "@/app/utils/orderIdMatch";
import { SalesI } from "@/app/interfaces/sales/sales.interface";

export default function AppContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    dataModal,
    socketPagos,
    socketServer,
    socketPagosReady,
    socketServerReady,
    setRowsVentas,
    setRowsVentasInvitados,
    setTableKey,
    setProductsProveedor,
  } = useTheContext();
  const pathName = usePathname();

  useProtected(pathName);

  useEffect(() => {
    const socket = socketPagos.current;
    if (!socket || !socketPagosReady) return;

    const patchVentasOrder = (
      idOrder: number | string,
      patch: Partial<SalesI>,
    ) => {
      setRowsVentas((prev) => {
        let matched = false;
        const data = prev.data.map((item) => {
          if (!orderIdsMatch(item.idOrder, idOrder)) {
            return item;
          }

          matched = true;
          return {
            ...item,
            ...patch,
          };
        });

        return matched ? { ...prev, data } : prev;
      });
      setTableKey((prev) => prev + 1);
    };

    const handleNewOrder = (data: any) => {
      setRowsVentas((prev) => ({
        ...prev,
        totalRows: prev.totalRows + 1,
        data: [...prev.data, data],
      }));
      setTableKey((prev) => prev + 1);
    };

    const handleNewOrderInvitacion = (data: any) => {
      setRowsVentasInvitados((prev) => ({
        totalRows: prev.totalRows + 1,
        data: [data, ...prev.data],
      }));
      setTableKey((prev) => prev + 1);
    };

    const handlePayOxxo = (data: any) => {
      patchVentasOrder(data.idOrder, { statusPay: "paid" });
    };

    const handleCancelledCompra = (data: any) => {
      setRowsVentas((prev) => ({
        ...prev,
        data: prev.data.map((item) => {
          if (!orderIdsMatch(item.idOrder, data.idOrder)) {
            return item;
          }

          return {
            ...item,
            statusPay: "cancelled",
            statusShip: "cancelado",
            products: item.products.map((product) => ({
              ...product,
              statusShip: "cancelado",
            })),
          };
        }),
      }));
      setTableKey((prev) => prev + 1);
    };

    const handleUpdateOrder = (data: any) => {
      patchVentasOrder(data.idOrder, {
        method_pay: data.method_pay,
        statusPay: data.statusPay,
        statusShip: data.statusShip,
        totalAmount:
          data.totalAmount != null ? Number(data.totalAmount) : undefined,
      });
    };

    const handleUpdateOrderInvitacion = (data: any) => {
      setRowsVentasInvitados((prev) => ({
        ...prev,
        data: prev.data.map((item) =>
          item.id == data.id || item.referencia == data.idOrder
            ? {
                ...item,
                pay_method: data.pay_method,
                statusPay: data.statusPay,
                statusShip: data.statusShip,
                updatedAt: data.updatedAt,
              }
            : item,
        ),
      }));
    };

    const handleUpdatedStock = (data: any) => {
      setProductsProveedor((prev) => {
        return {
          ...prev,
          data: prev?.data.map((product) => {
            if (Number(product.idProduct) == Number(data.idProduct)) {
              return {
                ...product,
                stock:
                  product.stock == 0
                    ? 0
                    : Number(product.stock) - Number(data.stock),
              };
            } else {
              return product;
            }
          }),
          copyData: prev?.copyData!.map((product) => {
            if (Number(product.idProduct) == Number(data.idProduct)) {
              return {
                ...product,
                stock:
                  product.stock == 0
                    ? 0
                    : Number(product?.stock) - Number(data?.stock),
              };
            } else {
              return product;
            }
          }),
        };
      });
    };

    socket.on("newOrder", handleNewOrder);
    socket.on("newOrderInvitacion", handleNewOrderInvitacion);
    socket.on("updateOrder", handleUpdateOrder);
    socket.on("updateOrderInvitacion", handleUpdateOrderInvitacion);
    socket.on("paidOxxo", handlePayOxxo);
    socket.on("cancelledCompra", handleCancelledCompra);
    socket.on("updatedStock", handleUpdatedStock);

    return () => {
      socket.off("newOrder", handleNewOrder);
      socket.off("newOrderInvitacion", handleNewOrderInvitacion);
      socket.off("updateOrder", handleUpdateOrder);
      socket.off("updateOrderInvitacion", handleUpdateOrderInvitacion);
      socket.off("paidOxxo", handlePayOxxo);
      socket.off("cancelledCompra", handleCancelledCompra);
      socket.off("updatedStock", handleUpdatedStock);
    };
  }, [socketPagosReady, setRowsVentas, setRowsVentasInvitados, setTableKey, setProductsProveedor]);

  useEffect(() => {
    const socket = socketServer.current;
    if (!socket || !socketServerReady) return;

    const handlerUpdateProduct = (data: ProductsI) => {
      setProductsProveedor((prev) => {
        const applyUpdate = (item: ProductsI) => {
          const match = Number(item.idProduct) === Number(data.idProduct);
          return match
            ? {
                ...item,
                name: data.name,
                description: data.description,
                caracteristicas: data.caracteristicas,
                price: Number(data.price),
                stock: Number(data.stock),
                sku: data.sku,
              }
            : item;
        };

        return {
          ...prev,
          data: prev.data.map(applyUpdate),
          copyData: (prev.copyData ?? prev.data).map(applyUpdate),
        };
      });
    };

    socket.on("updateProductComponent", handlerUpdateProduct);
    socket.on("updateProduct", handlerUpdateProduct);

    return () => {
      socket.off("updateProductComponent", handlerUpdateProduct);
      socket.off("updateProduct", handlerUpdateProduct);
    };
  }, [socketServerReady, setProductsProveedor]);

  const isAuthPage = isAuthPathname(pathName);

  return (
    <div className={isAuthPage ? "auth-page-shell" : "admin-layout"}>
      {!isAuthPage && <AdminSidebar />}
      <main className={isAuthPage ? "auth-main" : "admin-main"}>
        {children}

        <ModalComponent
          isOpen={dataModal.isOpen}
          title={dataModal.title}
          content={dataModal.content}
          onConfirm={() => dataModal.onConfirm()}
          onClose={() => dataModal.onClose()}
          type={dataModal.type}
          children={dataModal.children}
          showActions={dataModal.showActions}
          maxWidth={dataModal.maxWidth}
          loading={dataModal.loading}
          confirmLabel={dataModal.confirmLabel}
          cancelLabel={dataModal.cancelLabel}
        />

        <SpinnerComponent />
      </main>
    </div>
  );
}
