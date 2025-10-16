"use client";

import { Button, IconButton, Snackbar } from "@mui/material";
import TableComponent from "../shared/components/especific/table/TableComponent";
import GridDashboard from "./gridDashboard";
import useDashboard from "./useDashboard";
import React, { useEffect, useState } from "react";
import { useTheContext } from "../hooks/global.hook";
import { useSound } from "react-sounds";

const DashBoard = () => {
  const { socketPagos } = useTheContext();
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [messageNoti, setMessageNoti] = useState<string>("");
  const {
    rows,
    tableKey,
    handleGetAllSales,
    handleChangeStatusShip,
    setRows,
    handleChangeStatusPay,
  } = useDashboard();
  const play = useSound("/audio/notification.mp3");

  useEffect(() => {
    handleGetAllSales();
  }, []);

  const { columns } = GridDashboard({
    handleChangeStatusShip,
    rows,
    handleChangeStatusPay,
  });

  useEffect(() => {
    if (!socketPagos.current) return;

    const handleNewOrder = (data: any) => {
      setShowNotification(true);
      play.play();
      setMessageNoti(`Se genero la orden #${data.idOrder}`);
      setRows((prev) => [data, ...prev]);
    };

    const handlePayOxxo = (data: any) => {
      setShowNotification(true);
      play.play();
      setMessageNoti(`La orden #${data.idOrder} se pagó en OXXO`);
      setRows((prev) => {
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

    socketPagos.current.on("newOrder", handleNewOrder);
    socketPagos.current.on("paidOxxo", handlePayOxxo);

    return () => {
      socketPagos.current?.off("newOrder", handleNewOrder);
      socketPagos.current?.off("paidOxxo", handlePayOxxo);
    };
  }, [socketPagos.current]);

  return (
    <section className="w-full">
      <div className="w-full flex justify-center items-center">
        {/* {rows.length == 0 ? (
          <Alert severity="info">Sin contenido disponible</Alert>
        ) : ( */}
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
              <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={() => setShowNotification(false)}
              >
                <span className="text-white font-bold text-[22px]">X</span>
              </IconButton>
            </React.Fragment>
          }
        />
        <div className="w-[95%]">
          <TableComponent
            key={tableKey}
            columnsDataGrid={columns}
            rowsDataGrid={rows}
          />
        </div>
        {/* )} */}
      </div>
    </section>
  );
};

export default DashBoard;
