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
import { useRequestSequence } from "../hooks/useRequestSequence";

export type VentasInvitadosFilters = {
  search?: string;
  status?: string;
};

const useVentasInvitados = () => {
  const { requestGetProveedores } = ProveedoresUtils();
  const { requestPostPagos } = PagosUtils();
  const { setRowsVentasInvitados, setDataModal } = useTheContext();
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");
  const { nextSequence, isCurrent } = useRequestSequence();

  const handleGetAllSalesInvitados = useCallback(
    async (
      pagination: PaginationModel = { page: 0, pageSize: 10 },
      filters: VentasInvitadosFilters = {},
    ) => {
      const sequence = nextSequence();
      setLoading(true);
      setListError("");
      try {
        const resp = await requestGetProveedores(
          buildPaginatedUrl("/getAllSalesInvitados", pagination, {
            search: filters.search?.trim() || undefined,
            status:
              filters.status && filters.status !== "all"
                ? filters.status
                : undefined,
          }),
          { silent: true },
        );

        if (!isCurrent(sequence)) return;

        if (resp.status == 200) {
          const { rows, totalRows } = parsePaginatedResponse(resp.data);

          setRowsVentasInvitados({
            totalRows,
            data: rows.map((item: any) => ({
              ...item,
              id: item.idLinkPago ?? item.id,
              statusPay: item.statusPay ?? item.status,
            })),
          });
        }
      } catch {
        if (!isCurrent(sequence)) return;
        setListError(
          "No se pudieron cargar las ventas de invitados. Revisa tu conexión e intenta de nuevo.",
        );
        setRowsVentasInvitados({ totalRows: 0, data: [] });
      } finally {
        if (isCurrent(sequence)) setLoading(false);
      }
    },
    [requestGetProveedores, setRowsVentasInvitados, nextSequence, isCurrent],
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
            row.id === idLinkPago || row.idLinkPago === idLinkPago
              ? { ...row, statusShip: newStatus }
              : row,
          ),
        }));
      } else {
        setDataModal({
          isOpen: true,
          type: "error",
          title: "No se actualizó el envío",
          content:
            resp?.data?.message ||
            "No se pudo cambiar el estatus. Intenta de nuevo.",
          showActions: true,
          onClose: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
          onConfirm: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
        });
      }
    } catch {
      setDataModal({
        isOpen: true,
        type: "error",
        title: "No se actualizó el envío",
        content:
          "Ocurrió un error al cambiar el estatus. Revisa tu conexión e intenta de nuevo.",
        showActions: true,
        onClose: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
        onConfirm: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
      });
    }
  };

  return {
    handleGetAllSalesInvitados,
    handleChangeStatusShip,
    loading,
    listError,
  };
};

export default useVentasInvitados;
