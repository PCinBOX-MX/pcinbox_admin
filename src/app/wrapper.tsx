"use client";

import ModalComponent from "./shared/components/especific/modal/ModalComponent";
import { useTheContext } from "./hooks/global.hook";
import useProtected from "./hooks/protectedRoute.hook";
import { usePathname } from "next/navigation";
import Navbar from "./shared/components/common/navbar/Navbar";
import React, { useEffect, useState } from "react";
import { useSound } from "react-sounds";
import { Button, IconButton, Snackbar } from "@mui/material";
import SpinnerComponent from "./shared/components/especific/spinner/Spinner";

export default function AppWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { dataModal, socketPagos, setRowsVentas } = useTheContext();
  const pathName = usePathname();
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const play = useSound("/audio/notification.mp3");
  const [messageNoti, setMessageNoti] = useState<string>("");

  useProtected(pathName);

  useEffect(() => {
    if (!socketPagos.current) return;

    const handleNewOrder = (data: any) => {
      setShowNotification(true);
      play.play();
      setMessageNoti(`Se generó la orden #${data.idOrder}`);
      setRowsVentas((prev) => [data, ...prev]);
    };

    const handlePayOxxo = (data: any) => {
      setShowNotification(true);
      play.play();
      setMessageNoti(`La orden #${data.idOrder} se pagó en OXXO`);
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
      setShowNotification(true);
      play.play();
      setMessageNoti(`La orden #${data.idOrder} fue cancelada`);
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

    socketPagos.current.on("newOrder", handleNewOrder);
    socketPagos.current.on("paidOxxo", handlePayOxxo);
    socketPagos.current.on("cancelledCompra", handleCancelledCompra);

    return () => {
      socketPagos.current?.off("newOrder", handleNewOrder);
      socketPagos.current?.off("paidOxxo", handlePayOxxo);
    };
  }, [socketPagos.current]);

  return (
    <div>
      <main className="min-h-[100%]">
        {pathName != "/features/auth/Login" &&
          pathName != "/" &&
          pathName != "/features/auth/Register" && <Navbar />}
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

        <Snackbar
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          open={showNotification}
          onClose={() => setShowNotification(false)}
          message={messageNoti}
          action={
            <React.Fragment>
              <Button
                color="secondary"
                size="small"
                onClick={() => setShowNotification(false)}
              >
                Cerrar
              </Button>
              {/* <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={() => setShowNotification(false)}
              >
                <span className="text-white font-bold text-[22px]">X</span>
              </IconButton> */}
            </React.Fragment>
          }
        />
        <SpinnerComponent />
      </main>
    </div>
  );
}
