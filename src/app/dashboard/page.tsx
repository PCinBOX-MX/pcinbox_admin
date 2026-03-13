"use client";

import TableComponent from "../shared/components/especific/table/TableComponent";
import GridDashboard from "./gridDashboard";
import useDashboard from "./useDashboard";
import React, { useEffect, useState } from "react";
import { useTheContext } from "../hooks/global.hook";
import { Alert } from "@mui/material";

const DashBoard = () => {
  const { rowsVentas, tableKey } = useTheContext();
  const [paginationModel, setPaginationModel] = useState<{
    page: number;
    pageSize: number;
  }>({
    page: 0,
    pageSize: 25,
  });

  const { handleChangeStatusShip, handleChangeStatusPay, handleGetAllSales } =
    useDashboard();

  const { columns } = GridDashboard({
    handleChangeStatusShip,
    rows: rowsVentas,
    handleChangeStatusPay,
  });

  const handlePaginationChange = (model: any) => {
    setPaginationModel(model);
  };

  useEffect(() => {
    handleGetAllSales(paginationModel?.page + 1);
  }, [paginationModel]);

  return (
    <section className="w-full">
      <div className="w-full flex justify-center items-center">
        <div className="w-[95%]">
          {rowsVentas?.data && rowsVentas.data?.length > 0 ? (
            <TableComponent
              paginationModel={paginationModel}
              handlePaginationChange={handlePaginationChange}
              totalRows={rowsVentas?.totalRows}
              columnsDataGrid={columns}
              rowsDataGrid={rowsVentas?.data}
            />
          ) : (
            // <TableComponent
            //   key={tableKey}
            //   paginationModel={paginationModel}
            //   handlePaginationChange={handlePaginationChange}
            //   totalRows={rowsVentas?.totalRows}
            //   columnsDataGrid={columns}
            //   rowsDataGrid={rowsVentas?.data}
            // />
            <Alert severity="info">Sin contenido disponible</Alert>
          )}
        </div>
      </div>
    </section>
  );
};

export default DashBoard;
