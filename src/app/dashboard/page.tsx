"use client";

import { Alert } from "@mui/material";
import TableComponent from "../shared/components/especific/table/TableComponent";
import GridDashboard from "./gridDashboard";
import useDashboard from "./useDashboard";
import { useEffect } from "react";

const DashBoard = () => {
  const { rows, tableKey, handleGetAllSales, handleChangeStatusShip } =
    useDashboard();

  useEffect(() => {
    handleGetAllSales();
  }, []);

  const { columns } = GridDashboard({ handleChangeStatusShip, rows });

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
            rowsDataGrid={rows}
          />
        </div>
        {/* )} */}
      </div>
    </section>
  );
};

export default DashBoard;
