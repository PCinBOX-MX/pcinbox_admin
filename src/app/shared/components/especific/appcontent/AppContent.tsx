"use client";

import ModalComponent from "../modal/ModalComponent";
import { useTheContext } from "@/app/hooks/global.hook";
import useProtected from "@/app/hooks/protectedRoute.hook";
import { usePathname } from "next/navigation";
import AdminSidebar from "../../layout/AdminSidebar";
import React, { useEffect, useLayoutEffect, useRef } from "react";
import SpinnerComponent from "../spinner/Spinner";
import useProveedores from "@/app/proveedores/useProveedores";
import useDashboard from "@/app/dashboard/useDashboard";
import { ProductsI } from "@/app/interfaces/products/products.interface";
import { isAuthPathname } from "@/app/utils/authRoutes";
import { orderIdsMatch } from "@/app/utils/orderIdMatch";
import { SalesI } from "@/app/interfaces/sales/sales.interface";
import {
  getPageScrollY,
  readAdminScrollY,
  startAdminScrollRestore,
  writeAdminScrollY,
} from "@/app/shared/utils/adminScrollMemory";

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

  const { handleGetProveedores } = useProveedores();
  const { handleGetAllSales } = useDashboard();

  useProtected(pathName);

  // Scroll: el navegador en SPA/React suele perder Y en F5 por el shell corto.
  // Guardamos Y y lo reaplicamos cuando la página ya tiene altura.
  const restoreLockRef = useRef(true);
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if ("scrollRestoration" in window.history) {
        // Manual: nosotros restauramos (auto falla con contenido que crece al hidratar).
        window.history.scrollRestoration = "manual";
      }
    } catch {
      /* ignore */
    }

    restoreLockRef.current = true;
    const stop = startAdminScrollRestore(pathName);
    // Mantener el lock mientras corre el restore (hasta ~8s) + margen.
    const unlock = window.setTimeout(() => {
      restoreLockRef.current = false;
    }, 8500);
    return () => {
      stop();
      window.clearTimeout(unlock);
      restoreLockRef.current = false;
    };
  }, [pathName]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let lastY = Math.max(getPageScrollY(), readAdminScrollY(pathName));
    let raf = 0;

    const persist = (y: number, allowClear: boolean) => {
      if (restoreLockRef.current && y <= 12) return;
      writeAdminScrollY(y, { allowClear, pathname: pathName });
    };

    const onScroll = () => {
      const y = getPageScrollY();
      lastY = y;
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        // allowClear solo si el usuario realmente está arriba y ya pasó el restore.
        persist(lastY, !restoreLockRef.current && lastY <= 12);
      });
    };

    const flush = () => {
      const y = getPageScrollY();
      const out = y > 12 ? y : lastY > 12 ? lastY : y;
      persist(out, false);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, {
      passive: true,
      capture: true,
    });
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      flush();
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathName]);

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

  useEffect(() => {
    if (pathName) {
      if (pathName == "/dashboard") {
        handleGetAllSales();
      } else if (pathName == "/proveedores") {
        handleGetProveedores();
      }
    }
  }, [pathName]);

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
