"use client";

import { useCallback, useState } from "react";
import ProveedoresUtils from "../services/utils/proveedores.utils";
import { useTheContext } from "./global.hook";
import { TechsmartOrderI } from "../interfaces/techsmart/techsmart.interface";

const useTechsmartOrder = () => {
  const { requestGetProveedores, requestPostProveedores } = ProveedoresUtils();
  const { setDataModal } = useTheContext();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const showError = useCallback(
    (message: string) => {
      setDataModal({
        isOpen: true,
        type: "error",
        title: "TechSmart",
        content: message,
        showActions: true,
        onClose: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
        onConfirm: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
      });
    },
    [setDataModal],
  );

  const showSuccess = useCallback(
    (message: string) => {
      setDataModal({
        isOpen: true,
        type: "success",
        title: "TechSmart",
        content: message,
        showActions: true,
        onClose: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
        onConfirm: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
      });
    },
    [setDataModal],
  );

  const getOrderStatus = useCallback(
    async (idOrder: number) => {
      const resp = await requestGetProveedores(
        `/getEstadoOrdenTechSmart/${idOrder}`,
        { silent: true },
      );
      return resp.data?.data ?? null;
    },
    [requestGetProveedores],
  );

  const previewOrder = useCallback(
    async (idOrder: number) => {
      setLoadingAction("preview");
      try {
        const resp = await requestPostProveedores(
          {},
          `/previewPedidoOrdenTechSmart/${idOrder}`,
          { silent: true },
        );
        return resp.data?.data ?? null;
      } catch (error: any) {
        showError(
          error?.response?.data?.message ||
            "No se pudo obtener la vista previa del pedido TechSmart",
        );
        return null;
      } finally {
        setLoadingAction(null);
      }
    },
    [requestPostProveedores, showError],
  );

  const generateOrder = useCallback(
    async (idOrder: number) => {
      setLoadingAction("generate");
      try {
        const resp = await requestPostProveedores(
          { idOrder },
          "/generarPedidoOrdenTechSmart",
          { silent: true },
        );
        showSuccess("Pedido TechSmart generado correctamente");
        return (resp.data?.data?.techsmartOrder ?? null) as TechsmartOrderI | null;
      } catch (error: any) {
        showError(
          error?.response?.data?.message ||
            "No se pudo generar el pedido TechSmart",
        );
        return null;
      } finally {
        setLoadingAction(null);
      }
    },
    [requestPostProveedores, showError, showSuccess],
  );

  const linkGuide = useCallback(
    async (payload: {
      idOrder: number;
      guiaPedido?: string;
      nombrePaqueteria?: string;
    }) => {
      setLoadingAction("guide");
      try {
        const resp = await requestPostProveedores(
          payload,
          "/relacionarGuiaOrdenTechSmart",
          { silent: true },
        );
        showSuccess("Guía vinculada correctamente en TechSmart");
        return (resp.data?.data?.techsmartOrder ?? null) as TechsmartOrderI | null;
      } catch (error: any) {
        showError(
          error?.response?.data?.message ||
            "No se pudo vincular la guía en TechSmart",
        );
        return null;
      } finally {
        setLoadingAction(null);
      }
    },
    [requestPostProveedores, showError, showSuccess],
  );

  const invoiceOrder = useCallback(
    async (idOrder: number) => {
      setLoadingAction("invoice");
      try {
        const resp = await requestPostProveedores(
          { idOrder },
          "/facturarPedidoOrdenTechSmart",
          { silent: true },
        );
        showSuccess("Pedido facturado correctamente en TechSmart");
        return (resp.data?.data?.techsmartOrder ?? null) as TechsmartOrderI | null;
      } catch (error: any) {
        showError(
          error?.response?.data?.message ||
            "No se pudo facturar el pedido TechSmart",
        );
        return null;
      } finally {
        setLoadingAction(null);
      }
    },
    [requestPostProveedores, showError, showSuccess],
  );

  return {
    loadingAction,
    getOrderStatus,
    previewOrder,
    generateOrder,
    linkGuide,
    invoiceOrder,
  };
};

export default useTechsmartOrder;
