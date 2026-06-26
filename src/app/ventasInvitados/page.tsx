"use client";

import { Alert } from "@mui/material";
import { useEffect, useState } from "react";
import { useTheContext } from "../hooks/global.hook";
import TableComponent from "../shared/components/especific/table/TableComponent";
import GridVentasInvitados from "./gridVentasInvitados";
import useVentasInvitados from "./useVentasInvitados";

const VentasInvitados = () => {
  const { rowsVentasInvitados } = useTheContext();
  const { handleGetAllSalesInvitados, loading } = useVentasInvitados();
  const [paginationModel, setPaginationModel] = useState<{
    page: number;
    pageSize: number;
  }>({
    page: 0,
    pageSize: 25,
  });

  useEffect(() => {
    handleGetAllSalesInvitados(paginationModel);
  }, [paginationModel.page, paginationModel.pageSize]);

  const rowsWithId = rowsVentasInvitados.data.map((item, index) => ({
    email: item.email,
    monto: item.monto,
    description: item.description,
    referencia: item.referencia,
    name: item.name,
    lastname: item.lastname,
    chargeId: item.chargeId,
    products: item.products,
    id:
      item.idLinkPago ??
      item.id ??
      item.idOrder ??
      item.referencia ??
      `row-${index}`,
    pay_method: item.pay_method,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    dataUser: item.dataUser,
    statusPay: item.statusPay ?? item.status,
    statusShip: item.statusShip,
  }));

  const { columns } = GridVentasInvitados({
    rows: rowsWithId,
  });

  const handlePaginationChange = (model: {
    page: number;
    pageSize: number;
  }) => {
    setPaginationModel(model);
  };

  const hasRows =
    rowsVentasInvitados.totalRows > 0 || rowsVentasInvitados.data.length > 0;

  return (
    <section className="admin-page admin-page--flush-top">
      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2 className="admin-panel__title">Ventas invitados</h2>
          <p className="admin-panel__subtitle">
            Órdenes generadas por enlace de pago sin registro
          </p>
        </div>
        <div className="admin-panel__body">
          {hasRows || loading ? (
            <TableComponent
              loading={loading}
              fitColumns
              paginationModel={paginationModel}
              handlePaginationChange={handlePaginationChange}
              totalRows={rowsVentasInvitados.totalRows}
              columnsDataGrid={columns}
              rowsDataGrid={rowsWithId}
            />
          ) : (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Sin ventas de invitados registradas
            </Alert>
          )}
        </div>
      </div>
    </section>
  );
};

export default VentasInvitados;
