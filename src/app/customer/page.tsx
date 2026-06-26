"use client";

import React, { useEffect, useState } from "react";
import TableComponent from "../shared/components/especific/table/TableComponent";
import GridCustomer from "./gridCustomer";
import ProveedoresUtils from "../services/utils/proveedores.utils";
import {
  buildPaginatedUrl,
  parsePaginatedResponse,
} from "../utils/pagination.util";

const Customer = () => {
  const { requestGetProveedores } = ProveedoresUtils();
  const [dataRows, setDataRows] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paginationModel, setPaginationModel] = useState<{
    page: number;
    pageSize: number;
  }>({
    page: 0,
    pageSize: 25,
  });

  useEffect(() => {
    let cancelled = false;

    async function getListUsers() {
      setLoading(true);
      try {
        const resp = await requestGetProveedores(
          buildPaginatedUrl("/listUsers", paginationModel),
          { silent: true },
        );
        if (cancelled) return;

        if (resp.status === 200) {
          const { rows, totalRows: total } = parsePaginatedResponse(resp.data);
          setDataRows(rows);
          setTotalRows(total);
        }
      } catch (error) {
        if (!cancelled) {
          setDataRows([]);
          setTotalRows(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    getListUsers();

    return () => {
      cancelled = true;
    };
  }, [paginationModel.page, paginationModel.pageSize]);

  const handlePaginationChange = (model: {
    page: number;
    pageSize: number;
  }) => {
    setPaginationModel(model);
  };

  const { columns } = GridCustomer({
    rows: {
      data: dataRows,
      totalRows: totalRows,
    },
  });

  return (
    <section className="admin-page admin-page--flush-top">
      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2 className="admin-panel__title">Clientes</h2>
          <p className="admin-panel__subtitle">
            Usuarios registrados en la plataforma
          </p>
        </div>
        <div className="admin-panel__body">
          <TableComponent
            loading={loading}
            fitColumns
            paginationModel={paginationModel}
            handlePaginationChange={handlePaginationChange}
            totalRows={totalRows}
            columnsDataGrid={columns}
            rowsDataGrid={dataRows}
          />
        </div>
      </div>
    </section>
  );
};
export default Customer;
