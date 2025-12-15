"use client";

import ModalComponent from "../modal/ModalComponent";
import { useTheContext } from "@/app/hooks/global.hook";
import useProtected from "@/app/hooks/protectedRoute.hook";
import { usePathname } from "next/navigation";
import Navbar from "../../common/navbar/Navbar";
import React, { useEffect } from "react";
import { useSound } from "react-sounds";
import { IconButton } from "@mui/material";
import SpinnerComponent from "../spinner/Spinner";
import useProveedores from "@/app/proveedores/useProveedores";
import useDashboard from "@/app/dashboard/useDashboard";
import { SnackbarProvider, useSnackbar } from "notistack";
import { ProductsI } from "@/app/interfaces/products/products.interface";

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
    setTableKey,
    setProductsProveedor,
  } = useTheContext();
  const pathName = usePathname();
  const play = useSound("/audio/notification.mp3");

  const { handleGetProveedores } = useProveedores();
  const { handleGetAllSales } = useDashboard();

  useProtected(pathName);

  // Manejo de sockets
  useEffect(() => {
    if (!socketPagos.current || !socketServer.current) return;

    const handleNewOrder = (data: any) => {
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
      setRowsVentas((prev) => [data, ...prev]);
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
        return prev.map((item) => {
          if (item.idOrder == data.idOrder) {
            return {
              ...item,
              statusPay: "paid",
            } as any;
          }

          return item;
        });
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
        return prev.map((item) => {
          if (item.idOrder == data.idOrder) {
            return {
              ...item,
              statusPay: "cancelled",
              statusShip: "cancelado",
            } as any;
          }
          return item;
        });
      });
    };

    const handleUpdateOrder = (data: any) => {
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
      setRowsVentas((prev) =>
        prev.map((item) =>
          item.idOrder === data.idOrder
            ? {
                ...item,
                method_pay: data.method_pay,
                statusPay: data.statusPay,
                statusShip: data.statusShip,
              }
            : item
        )
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

    socketPagos.current.on("newOrder", handleNewOrder);
    socketPagos.current.on("updateOrder", handleUpdateOrder);
    socketPagos.current.on("paidOxxo", handlePayOxxo);
    socketPagos.current.on("cancelledCompra", handleCancelledCompra);
    socketServer.current.on("updateProductComponent", handlerUpdateProduct);

    socketServer.current.on("updateProduct", handlerUpdateProduct);

    return () => {
      socketPagos.current!.off("newOrder", handleNewOrder);
      socketPagos.current!.off("updateOrder", handleUpdateOrder);
      socketPagos.current!.off("paidOxxo", handlePayOxxo);
      socketPagos.current!.off("cancelledCompra", handleCancelledCompra);
      socketServer.current!.off("updateProductComponent", handlerUpdateProduct);

      socketServer.current!.off("updateProduct", handlerUpdateProduct);
    };
  }, [socketPagos.current]);

  useEffect(() => {
    handleGetAllSales();
    handleGetProveedores();
  }, []);

  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      preventDuplicate
      autoHideDuration={null}
    >
      <div>
        <main className="min-h-[100%]">
          {pathName !== "/features/auth/Login" &&
            pathName !== "/" &&
            pathName !== "/features/auth/Register" && <Navbar />}
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
    </SnackbarProvider>
  );
}
