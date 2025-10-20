"use client";

import TableComponent from "../shared/components/especific/table/TableComponent";
import GridDashboard from "./gridDashboard";
import useDashboard from "./useDashboard";
import React, { useEffect } from "react";
import { useTheContext } from "../hooks/global.hook";

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
        {/* {rows.length == 0 ? (
          <Alert severity="info">Sin contenido disponible</Alert>
        ) : ( */}

        <div className="w-[95%]">
          <TableComponent
            key={tableKey}
            columnsDataGrid={columns}
            rowsDataGrid={rowsVentas}
          />
        </div>
        {/* )} */}
      </div>
    </section>
  );
};

export default DashBoard;
