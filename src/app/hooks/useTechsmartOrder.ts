"use client";

import { useCallback, useState } from "react";
import ProveedoresUtils from "../services/utils/proveedores.utils";
import { useTheContext } from "./global.hook";
import {
  TechsmartGuideI,
  TechsmartOrderI,
  TechsmartOrderStatusResponse,
} from "../interfaces/techsmart/techsmart.interface";
import { formatTechsmartErrorMessage } from "../utils/techsmartErrorMessage";

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
        content: formatTechsmartErrorMessage(message),
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
      try {
        const resp = await requestGetProveedores(
          `/getEstadoOrdenTechSmart/${idOrder}`,
          { silent: true },
        );
        return (resp.data?.data ?? null) as TechsmartOrderStatusResponse | null;
      } catch {
        return null;
      }
    },
    [requestGetProveedores],
  );

  const saveNumOrdenCompra = useCallback(
    async (
      idOrder: number,
      numOrdenCompra: string,
      options?: { silent?: boolean },
    ) => {
      setLoadingAction("saveReference");
      try {
        const resp = await requestPostProveedores(
          { idOrder, numOrdenCompra },
          "/guardarNumOrdenCompraOrdenTechSmart",
          { silent: true },
        );
        if (!options?.silent) {
          showSuccess("Referencia guardada");
        }
        return (resp.data?.data ?? null) as TechsmartOrderI | null;
      } catch (error: any) {
        showError(
          error?.response?.data?.message ||
            "No se pudo guardar la referencia",
        );
        return null;
      } finally {
        setLoadingAction(null);
      }
    },
    [requestPostProveedores, showError, showSuccess],
  );

  const previewOrder = useCallback(
    async (idOrder: number, numOrdenCompra?: string) => {
      setLoadingAction("preview");
      try {
        const resp = await requestPostProveedores(
          numOrdenCompra?.trim() ? { numOrdenCompra: numOrdenCompra.trim() } : {},
          `/previewPedidoOrdenTechSmart/${idOrder}`,
          { silent: true },
        );
        return resp.data?.data ?? null;
      } catch (error: any) {
        // El panel TechSmart ya muestra wsError; evitar modal duplicado con JSON crudo.
        console.warn(
          "[TechSmart] Vista previa fallida:",
          formatTechsmartErrorMessage(error?.response?.data?.message || error),
        );
        return null;
      } finally {
        setLoadingAction(null);
      }
    },
    [requestPostProveedores, showError],
  );

  const generateOrder = useCallback(
    async (idOrder: number, numOrdenCompra?: string) => {
      setLoadingAction("generate");
      try {
        const resp = await requestPostProveedores(
          {
            idOrder,
            ...(numOrdenCompra?.trim()
              ? { numOrdenCompra: numOrdenCompra.trim() }
              : {}),
          },
          "/generarPedidoOrdenTechSmart",
          { silent: true },
        );
        const order = (resp.data?.data?.techsmartOrder ?? null) as
          | TechsmartOrderI
          | null;
        const failedStatus = ["failed", "error"].includes(
          String(order?.status || "").toLowerCase(),
        );

        if (failedStatus) {
          const message =
            order?.wsError ||
            resp.data?.message ||
            "No se pudo generar el pedido en TechSmart";
          showError(String(message));
          return order;
        }

        showSuccess("Pedido TechSmart generado correctamente");
        return order;
      } catch (error: any) {
        showError(
          error?.response?.data?.message ||
            "No se pudo generar el pedido en TechSmart",
        );
        return null;
      } finally {
        setLoadingAction(null);
      }
    },
    [requestPostProveedores, showError, showSuccess],
  );

  const linkGuideUnit = useCallback(
    async (payload: {
      idTechsmartGuide: number;
      guiaPedido?: string;
      nombrePaqueteria?: string;
      pdfFile?: File | null;
    }) => {
      setLoadingAction(`guide-${payload.idTechsmartGuide}`);
      try {
        const formData = new FormData();
        formData.append("idTechsmartGuide", String(payload.idTechsmartGuide));
        if (payload.guiaPedido?.trim()) {
          formData.append("guiaPedido", payload.guiaPedido.trim());
        }
        if (payload.nombrePaqueteria?.trim()) {
          formData.append("nombrePaqueteria", payload.nombrePaqueteria.trim());
        }
        if (payload.pdfFile) {
          formData.append("pdfGuia", payload.pdfFile);
        }

        const resp = await requestPostProveedores(
          formData,
          "/relacionarGuiaUnidadOrdenTechSmart",
          { silent: true },
        );
        showSuccess("Guía vinculada correctamente en TechSmart");
        return resp.data?.data as {
          guide: TechsmartGuideI;
          techsmartOrder: TechsmartOrderI | null;
          guides: TechsmartGuideI[];
          guidesSummary: TechsmartOrderStatusResponse["guidesSummary"];
        } | null;
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
    saveNumOrdenCompra,
    previewOrder,
    generateOrder,
    linkGuideUnit,
    invoiceOrder,
  };
};

export default useTechsmartOrder;
