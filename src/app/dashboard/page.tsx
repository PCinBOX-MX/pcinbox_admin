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

  const {
    handleChangeStatusShip,
    handleChangeStatusPay,
    handleGetAllSales,
    loading,
  } = useDashboard();

  const { columns } = GridDashboard({
    handleChangeStatusShip,
    rows: rowsVentas,
    handleChangeStatusPay,
  });

  const handlePaginationChange = (model: {
    page: number;
    pageSize: number;
  }) => {
    setPaginationModel(model);
  };

  useEffect(() => {
    handleGetAllSales(paginationModel);
    // Solo re-fetch cuando cambia página o tamaño, no cuando cambia la referencia del handler
  }, [paginationModel.page, paginationModel.pageSize]);

  const hasRows = rowsVentas.totalRows > 0 || rowsVentas.data.length > 0;

  return (
    <section className="w-full no-padding-top">
      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2 className="admin-panel__title">Órdenes de venta</h2>
          <p className="admin-panel__subtitle">
            Gestiona pagos, envíos y pedidos por proveedor (PCInBOX, TechSmart, Dicotech)
          </p>
        </div>
        <div className="admin-panel__body">
          {hasRows || loading ? (
            <TableComponent
              loading={loading}
              fitColumns
              paginationModel={paginationModel}
              handlePaginationChange={handlePaginationChange}
              totalRows={rowsVentas.totalRows}
              columnsDataGrid={columns}
              rowsDataGrid={rowsVentas.data}
            />
          ) : (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Sin ventas registradas
            </Alert>
          )}
        </div>
      </div>
    </section>
  );
};

export default DashBoard;
