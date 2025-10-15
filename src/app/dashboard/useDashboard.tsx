"use client";

import { useState } from "react";
import ProveedoresUtils from "../services/utils/proveedores.utils";
import { SalesI } from "../interfaces/sales/sales.interface";
import { GridRowsProp } from "@mui/x-data-grid";
import UtilsService from "../services/utils";
import PagosUtils from "../services/utils/pagos.utils";

const useDashboard = () => {
  const [rows, setRows] = useState<GridRowsProp<SalesI>>([]);
  const { requestGetProveedores } = ProveedoresUtils();
  const [tableKey, setTableKey] = useState(0);

  const { requestPostPagos } = PagosUtils();

  const handleGetAllSales = async () => {
    try {
      const resp = await requestGetProveedores("/getAllSales");

      if (resp.status == 200) {
        const data = resp.data;
        setRows(
          data.data.data.map((item: SalesI, index: number) => {
            return {
              ...item,
              id: index,
            };
          })
        );
      }
    } catch (error) {}
  };

  const handleChangeStatusShip = async (
    event: any,
    idShipment: number,
    idUser: any
  ) => {
    const resp = await requestPostPagos(
      { idShipment, status: event.target.value, idUser },
      "/stripe/updateStatusShipByOrden"
    );

    if (resp.status == 200) {
      // const data = await resp.data;
      setRows((prev) => {
        return prev.map((item) => {
          if (item.idShipment == idShipment) {
            return { ...item, statusShip: event.target.value };
          }
          return item;
        });
      });

      setTableKey((prev) => prev + 1); // Forzar re-render
    }
  };

  return {
    rows,
    tableKey,
    handleGetAllSales,
    handleChangeStatusShip,
  };
};

export default useDashboard;
