"use client";

import React, { useEffect, useState } from "react";
import TableComponent from "../shared/components/especific/table/TableComponent";
import GridCustomer from "./gridCustomer";
import useProveedores from "../proveedores/useProveedores";
import ProveedoresUtils from "../services/utils/proveedores.utils";

const Customer = () => {
  const { requestGetProveedores } = ProveedoresUtils();
  const [dataRows, setDataRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [paginationModel, setPaginationModel] = useState<{
    page: number;
    pageSize: number;
  }>({
    page: 0,
    pageSize: 25,
  });

  useEffect(() => {
    async function getListUsers() {
      try {
        const resp = await requestGetProveedores(
          `/listUsers?page=${paginationModel?.page == 0 ? 1 : paginationModel?.page + 1}`,
        );
        if (resp.status === 200) {
          setDataRows(resp.data.users);
          setTotalRows(resp.data.totalUsers);
        }
      } catch (error) {
        setDataRows([]);
        setTotalRows(0);
      }
    }

    getListUsers();
  }, [paginationModel?.page]);

  const handlePaginationChange = (model: any) => {
    setPaginationModel(model);
  };
  const { columns } = GridCustomer({
    rows: {
      data: dataRows,
      totalRows: totalRows,
    },
  });

  return (
    <section className="w-full no-padding-top">
      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2 className="admin-panel__title">Clientes</h2>
          <p className="admin-panel__subtitle">
            Usuarios registrados en la plataforma
          </p>
        </div>
        <div className="admin-panel__body">
          <TableComponent
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
