"use client";

import ModalComponent from "../modal/ModalComponent";
import { useTheContext } from "@/app/hooks/global.hook";
import useProtected from "@/app/hooks/protectedRoute.hook";
import { usePathname } from "next/navigation";
import AdminSidebar from "../../layout/AdminSidebar";
import React, { useEffect } from "react";
import SpinnerComponent from "../spinner/Spinner";
import useProveedores from "@/app/proveedores/useProveedores";
import useDashboard from "@/app/dashboard/useDashboard";
import { ProductsI } from "@/app/interfaces/products/products.interface";
import useVentasInvitados from "@/app/ventasInvitados/useVentasInvitados";

export default function AppContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    dataModal,
    socketPagos,
    socketServer,
    setRowsVentas,
    setRowsVentasInvitados,
    setTableKey,
    setProductsProveedor,
  } = useTheContext();
  const pathName = usePathname();

  const { handleGetProveedores } = useProveedores();
  const { handleGetAllSales } = useDashboard();
  const { handleGetAllSalesInvitados } = useVentasInvitados();

  useProtected(pathName);

  useEffect(() => {
    if (!socketPagos.current || !socketServer.current) return;

    const handleNewOrder = (data: any) => {
      setRowsVentas((prev) => ({
        ...prev,
        totalRows: prev.totalRows + 1,
        data: [...prev.data, data],
      }));
      setTableKey((prev) => prev + 1);
    };

    const handleNewOrderInvitacion = (data: any) => {
      setRowsVentasInvitados((prev) => [data, ...prev]);
      setTableKey((prev) => prev + 1);
    };

    const handlePayOxxo = (data: any) => {
      setRowsVentas((prev) => ({
        ...prev,
        data: prev.data?.map((item) => {
          if (item.idOrder == data.idOrder) {
            return {
              ...item,
              statusPay: "paid",
            } as any;
          }

          return item;
        }),
      }));
    };

    const handleCancelledCompra = (data: any) => {
      setRowsVentas((prev) => ({
        ...prev,
        data: prev.data.map((item) => {
          if (item.idOrder == data.idOrder) {
            return {
              ...item,
              statusPay: "cancelled",
              statusShip: "cancelado",
              products: item.products.map((product) => ({
                ...product,
                statusShip: "cancelado",
              })),
            };
          }
          return item;
        }),
      }));
    };

    const handleUpdateOrder = (data: any) => {
      setRowsVentas((prev) => ({
        ...prev,
        data: prev.data.map((item) =>
          item.idOrder === data.idOrder
            ? {
                ...item,
                method_pay: data.method_pay,
                statusPay: data.statusPay,
                statusShip: data.statusShip,
              }
            : item,
        ),
      }));
    };

    const handleUpdateOrderInvitacion = (data: any) => {
      setRowsVentasInvitados((prev) =>
        prev.map((item) =>
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
      );
    };

    const handlerUpdateProduct = (data: ProductsI) => {
      setProductsProveedor((prev) => ({
        ...prev,

        data: prev.data.map((item) => {
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
        }),
        copyData: prev.data.map((item) => {
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
        }),
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

    socketPagos.current.on("newOrder", handleNewOrder);
    socketPagos.current.on("newOrderInvitacion", handleNewOrderInvitacion);
    socketPagos.current.on("updateOrder", handleUpdateOrder);
    socketPagos.current.on(
      "updateOrderInvitacion",
      handleUpdateOrderInvitacion,
    );
    socketPagos.current.on("paidOxxo", handlePayOxxo);
    socketPagos.current.on("cancelledCompra", handleCancelledCompra);
    socketServer.current.on("updateProductComponent", handlerUpdateProduct);

    socketServer.current.on("updateProduct", handlerUpdateProduct);

    socketPagos.current.on("updatedStock", handleUpdatedStock);

    return () => {
      socketPagos.current!.off("newOrder", handleNewOrder);
      socketPagos.current!.off("newOrderInvitacion", handleNewOrderInvitacion);
      socketPagos.current!.off("updateOrder", handleUpdateOrder);
      socketPagos.current!.off(
        "updateOrderInvitacion",
        handleUpdateOrderInvitacion,
      );
      socketPagos.current!.off("paidOxxo", handlePayOxxo);
      socketPagos.current!.off("cancelledCompra", handleCancelledCompra);
      socketPagos.current!.off("updatedStock", handleUpdatedStock);

      socketServer.current!.off("updateProductComponent", handlerUpdateProduct);

      socketServer.current!.off("updateProduct", handlerUpdateProduct);
    };
  }, [socketPagos.current, socketServer.current]);

  useEffect(() => {
    if (pathName) {
      if (pathName == "/dashboard") {
        handleGetAllSales();
      } else if (pathName == "/proveedores") {
        handleGetProveedores();
      } else if (pathName == "/ventasInvitados") {
        handleGetAllSalesInvitados();
      }
    }
  }, [pathName]);

  const isAuthPage =
    pathName === "/" ||
    pathName === "/features/auth/Login" ||
    pathName === "/features/auth/Register";

  return (
    <div className={isAuthPage ? "auth-page-shell" : "admin-layout"}>
      {!isAuthPage && <AdminSidebar />}
      <main className={isAuthPage ? "w-full" : "admin-main"}>
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
        />

        <SpinnerComponent />
      </main>
    </div>
  );
}
