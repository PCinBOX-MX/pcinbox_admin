"use client";

import ModalComponent from "../modal/ModalComponent";
import { useTheContext } from "@/app/hooks/global.hook";
import useProtected from "@/app/hooks/protectedRoute.hook";
import { usePathname } from "next/navigation";
import AdminLayout from "../../common/layout/AdminLayout";
import React, { useEffect } from "react";
import { useSound } from "react-sounds";
import { IconButton } from "@mui/material";
import SpinnerComponent from "../spinner/Spinner";
import useProveedores from "@/app/proveedores/useProveedores";
import { useSnackbar } from "notistack";
import { ProductsI } from "@/app/interfaces/products/products.interface";

const AUTH_ROUTES = ["/", "/features/auth/Login", "/features/auth/Register"];

export default function AppContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const {
    dataModal,
    socketPagos,
    socketServer,
    setRowsVentas,
    setRowsVentasInvitados,
    setTableKey,
    setProductsProveedor,
    socketsReady,
  } = useTheContext();
  const pathName = usePathname();
  const play = useSound("/audio/notification.mp3");

  const { handleGetProveedores } = useProveedores();

  useProtected(pathName);

  // Manejo de sockets
  useEffect(() => {
    if (!socketPagos.current || !socketServer.current) return;

    const handleNewOrder = (data: any) => {
      console.log(`Nueva Orden`, data);
      enqueueSnackbar(`Se generó la orden #${data.idOrder}`, {
        variant: "info",
        action: (snackbarId) => (
          <IconButton
            size="small"
            onClick={() => closeSnackbar(snackbarId)}
            style={{ color: "white" }}
          >
            Cerrar
          </IconButton>
        ),
      });
      play.play();
      setRowsVentas((prev) => ({
        ...prev,
        totalRows: prev.totalRows + 1,
      }));
      setTableKey((prev) => prev + 1);
    };

    const handleNewOrderInvitacion = (data: any) => {
      enqueueSnackbar(`Se generó la orden #${data.idOrder}`, {
        variant: "info",
        action: (snackbarId) => (
          <IconButton
            size="small"
            onClick={() => closeSnackbar(snackbarId)}
            style={{ color: "white" }}
          >
            Cerrar
          </IconButton>
        ),
      });
      play.play();

      setRowsVentasInvitados((prev) => ({
        ...prev,
        totalRows: prev.totalRows + 1,
      }));

      setTableKey((prev) => prev + 1);
    };

    const handlePayOxxo = (data: any) => {
      enqueueSnackbar(`La orden #${data.idOrder} se pagó en efectivo`, {
        variant: "info",
        action: (snackbarId) => (
          <IconButton
            size="small"
            onClick={() => closeSnackbar(snackbarId)}
            style={{ color: "white" }}
          >
            Cerrar
          </IconButton>
        ),
      });
      play.play();
      setRowsVentas((prev) => {
        return {
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
        };
      });
    };

    const handleCancelledCompra = (data: any) => {
      enqueueSnackbar(`La orden #${data.idOrder} fue cancelada`, {
        variant: "error",
        action: (snackbarId) => (
          <IconButton
            size="small"
            onClick={() => closeSnackbar(snackbarId)}
            style={{ color: "white" }}
          >
            Cerrar
          </IconButton>
        ),
      });
      play.play();
      setRowsVentas((prev) => {
        return {
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
        };
      });
    };

    const handleUpdateOrder = (data: any) => {
      console.log("update orden");
      console.log(data);
      enqueueSnackbar(`La orden #${data.idOrder} fue actualizada`, {
        variant: "info",
        action: (snackbarId) => (
          <IconButton
            size="small"
            onClick={() => closeSnackbar(snackbarId)}
            style={{ color: "white" }}
          >
            Cerrar
          </IconButton>
        ),
      });
      play.play();
      setRowsVentas((prev) => {
        return {
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
        };
      });
    };

    const handleUpdateOrderInvitacion = (data: any) => {
      enqueueSnackbar(`La orden #${data.idOrder} fue actualizada`, {
        variant: "info",
        action: (snackbarId) => (
          <IconButton
            size="small"
            onClick={() => closeSnackbar(snackbarId)}
            style={{ color: "white" }}
          >
            Cerrar
          </IconButton>
        ),
      });
      play.play();
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
  }, [socketsReady, enqueueSnackbar, closeSnackbar, play, setRowsVentas, setRowsVentasInvitados, setTableKey, setProductsProveedor]);

  useEffect(() => {
    if (pathName === "/proveedores") {
      handleGetProveedores();
    }
  }, [pathName, handleGetProveedores]);

  const isAuthRoute = AUTH_ROUTES.includes(pathName);

  return (
    <>
      <main className={isAuthRoute ? "auth-shell" : undefined}>
        {isAuthRoute ? children : <AdminLayout>{children}</AdminLayout>}

        <ModalComponent
          isOpen={dataModal.isOpen}
          title={dataModal.title}
          content={dataModal.content}
          onConfirm={() => dataModal.onConfirm()}
          onClose={() => dataModal.onClose()}
          type={dataModal.type}
          children={dataModal.children}
          showActions={dataModal.showActions}
          size={dataModal.size}
          confirmLabel={dataModal.confirmLabel}
          showCancel={dataModal.showCancel}
        />

        <SpinnerComponent />
      </main>
    </>
  );
}
