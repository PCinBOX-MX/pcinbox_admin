"use client";

import TableComponent from "../shared/components/especific/table/TableComponent";
import GridDashboard from "./gridDashboard";
import useDashboard from "./useDashboard";
import React, { useEffect, useState } from "react";
import { useTheContext } from "../hooks/global.hook";
import { Alert } from "@mui/material";

const DashBoard = () => {
  const { rowsVentas } = useTheContext();
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
    <section className="w-full no-padding-top">
      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2 className="admin-panel__title">Órdenes de venta</h2>
          <p className="admin-panel__subtitle">
            Gestiona pagos, envíos y pedidos TechSmart
          </p>
        </div>
        <div className="admin-panel__body">
          {rowsVentas?.data && rowsVentas.data.length > 0 ? (
            <TableComponent
              paginationModel={paginationModel}
              handlePaginationChange={handlePaginationChange}
              totalRows={rowsVentas?.totalRows}
              columnsDataGrid={columns}
              rowsDataGrid={rowsVentas?.data}
            />
          ) : (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Sin ventas registradas en esta página
            </Alert>
          )}
        </div>
      </div>
    </section>
  );
};

export default DashBoard;
