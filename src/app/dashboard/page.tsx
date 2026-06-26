"use client";

import TableComponent from "../shared/components/especific/table/TableComponent";
import GridDashboard from "./gridDashboard";
import useDashboard from "./useDashboard";
import React, { useEffect, useState } from "react";
import { useTheContext } from "../hooks/global.hook";
import { Alert, Chip, Stack } from "@mui/material";

const DashBoard = () => {
  const { rowsVentas } = useTheContext();
  const [techsmartPendingOnly, setTechsmartPendingOnly] = useState(false);
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
    openCancelOrderModal,
    loading,
    can,
  } = useDashboard();

  const { columns } = GridDashboard({
    handleChangeStatusShip,
    rows: rowsVentas,
    handleChangeStatusPay,
    openCancelOrderModal,
    can,
  });

  const handlePaginationChange = (model: {
    page: number;
    pageSize: number;
  }) => {
    setPaginationModel(model);
  };

  useEffect(() => {
    handleGetAllSales(paginationModel, {
      techsmartPending: techsmartPendingOnly,
    });
  }, [
    paginationModel.page,
    paginationModel.pageSize,
    techsmartPendingOnly,
    handleGetAllSales,
  ]);

  const hasRows = rowsVentas.totalRows > 0 || rowsVentas.data.length > 0;

  return (
    <section className="admin-page admin-page--flush-top">
      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2 className="admin-panel__title">Órdenes de venta</h2>
          <p className="admin-panel__subtitle">
            Gestiona pagos, envíos y pedidos por proveedor (PCInBOX, TechSmart,
            Dicotech)
          </p>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Chip
              label="TechSmart pendiente"
              clickable
              color={techsmartPendingOnly ? "primary" : "default"}
              variant={techsmartPendingOnly ? "filled" : "outlined"}
              onClick={() => {
                setTechsmartPendingOnly((prev) => !prev);
                setPaginationModel((prev) => ({ ...prev, page: 0 }));
              }}
            />
          </Stack>
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
              {techsmartPendingOnly
                ? "No hay órdenes TechSmart pendientes de procesar"
                : "Sin ventas registradas"}
            </Alert>
          )}
        </div>
      </div>
    </section>
  );
};

export default DashBoard;
