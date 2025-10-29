"use client";

import TableComponent from "../shared/components/especific/table/TableComponent";
import GridDashboard from "./gridDashboard";
import useDashboard from "./useDashboard";
import React, { useEffect } from "react";
import { useTheContext } from "../hooks/global.hook";
import { Alert } from "@mui/material";

const DashBoard = () => {
  const { rowsVentas } = useTheContext();
  const {
    tableKey,
    handleGetAllSales,
    handleChangeStatusShip,
    handleChangeStatusPay,
  } = useDashboard();

  useEffect(() => {
    handleGetAllSales();
  }, []);

  const { columns } = GridDashboard({
    handleChangeStatusShip,
    rows: rowsVentas,
    handleChangeStatusPay,
  });

  return (
    <section className="w-full">
      <div className="w-full flex justify-center items-center">
        <div className="w-[95%]">
          {rowsVentas && rowsVentas.length > 0 ? (
            <TableComponent
              key={tableKey}
              columnsDataGrid={columns}
              rowsDataGrid={rowsVentas}
            />
          ) : (
            <Alert severity="info">Sin contenido disponible</Alert>
          )}
        </div>
      </div>
    </section>
  );
};

export default DashBoard;
