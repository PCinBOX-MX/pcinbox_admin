"use client";

import { useTheContext } from "../hooks/global.hook";
import PagosUtils from "../services/utils/pagos.utils";
import ProveedoresUtils from "../services/utils/proveedores.utils";

const useVentasInvitados = () => {
  const { requestGetProveedores } = ProveedoresUtils();
  const { requestPostPagos } = PagosUtils();
  const { setRowsVentasInvitados } = useTheContext();

  const handleGetAllSalesInvitados = async () => {
    try {
      const resp = await requestGetProveedores("/getAllSalesInvitados");
      if (resp.status == 200) {
        const data = resp.data;
        setRowsVentasInvitados(data.data.data);
      }
    } catch (error) {}
  };

  const handleChangeStatusShip = async (
    idLinkPago: number | string,
    newStatus: string
  ) => {
    try {
      const resp = await requestPostPagos(
        {
          idLinkPago,
          statusShip: newStatus,
        },
        "/openpay/changeStatusShipOrdenInvitado"
      );

      if (resp.status == 200) {
        setRowsVentasInvitados((prev) =>
          prev.map((row) =>
            row.id === idLinkPago ? { ...row, statusShip: newStatus } : row
          )
        );
      }
    } catch (error) {}
  };

  return {
    handleGetAllSalesInvitados,
    handleChangeStatusShip,
  };
};

export default useVentasInvitados;
