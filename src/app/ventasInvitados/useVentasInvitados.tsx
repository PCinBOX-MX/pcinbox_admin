"use client";

import { useTheContext } from "../hooks/global.hook";
import PagosUtils from "../services/utils/pagos.utils";
import ProveedoresUtils from "../services/utils/proveedores.utils";
import {
  buildPaginatedUrl,
  PaginationModel,
  parsePaginatedResponse,
} from "../utils/pagination.util";
import { useCallback, useState } from "react";

const useVentasInvitados = () => {
  const { requestGetProveedores } = ProveedoresUtils();
  const { requestPostPagos } = PagosUtils();
  const { setRowsVentasInvitados } = useTheContext();
  const [loading, setLoading] = useState(false);

  const handleGetAllSalesInvitados = useCallback(
    async (pagination: PaginationModel) => {
      setLoading(true);
      try {
        const resp = await requestGetProveedores(
          buildPaginatedUrl("/getAllSalesInvitados", pagination),
          { silent: true },
        );

        if (resp.status == 200) {
          const { rows, totalRows } = parsePaginatedResponse(resp.data);

          setRowsVentasInvitados({
            totalRows,
            data: rows.map((item: any) => ({
              ...item,
              id: item.idLinkPago ?? item.id,
            })),
          });
        }
      } catch (error) {
        setRowsVentasInvitados({ totalRows: 0, data: [] });
      } finally {
        setLoading(false);
      }
    },
    [requestGetProveedores, setRowsVentasInvitados],
  );

  const handleChangeStatusShip = async (
    idLinkPago: number | string,
    newStatus: string,
  ) => {
    try {
      const resp = await requestPostPagos(
        {
          idLinkPago,
          statusShip: newStatus,
        },
        "/openpay/changeStatusShipOrdenInvitado",
        { silent: true },
      );

      if (resp.status == 200) {
        setRowsVentasInvitados((prev) => ({
          ...prev,
          data: prev.data.map((row) =>
            row.id === idLinkPago ? { ...row, statusShip: newStatus } : row,
          ),
        }));
      }
    } catch (error) {}
  };

  return {
    handleGetAllSalesInvitados,
    handleChangeStatusShip,
    loading,
  };
};

export default useVentasInvitados;
