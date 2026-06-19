"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Chip, CircularProgress, Stack } from "@mui/material";
import useTechsmartOrder from "@/app/hooks/useTechsmartOrder";
import { TechsmartOrderI } from "@/app/interfaces/techsmart/techsmart.interface";

interface TechsmartOrderPanelProps {
  idOrder: number;
  initialOrder?: TechsmartOrderI | null;
  statusPay?: string;
  onOrderUpdated?: (order: TechsmartOrderI | null) => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  sent: "Pedido enviado",
  guide_linked: "Guía vinculada",
  invoiced: "Facturado",
  error: "Error",
};

const TechsmartOrderPanel = ({
  idOrder,
  initialOrder,
  statusPay,
  onOrderUpdated,
}: TechsmartOrderPanelProps) => {
  const {
    loadingAction,
    getOrderStatus,
    previewOrder,
    generateOrder,
    linkGuide,
    invoiceOrder,
  } = useTechsmartOrder();

  const [techsmartOrder, setTechsmartOrder] = useState<TechsmartOrderI | null>(
    initialOrder ?? null,
  );
  const [loadingStatus, setLoadingStatus] = useState(false);

  const refreshStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const data = await getOrderStatus(idOrder);
      const nextOrder = (data?.techsmartOrder ?? null) as TechsmartOrderI | null;
      setTechsmartOrder(nextOrder);
      onOrderUpdated?.(nextOrder);
    } finally {
      setLoadingStatus(false);
    }
  }, [getOrderStatus, idOrder, onOrderUpdated]);

  useEffect(() => {
    refreshStatus();
  }, [idOrder]);

  const isPaid = ["paid", "approved"].includes(String(statusPay || "").toLowerCase());
  const status = String(techsmartOrder?.status || "pending");
  const isBusy = Boolean(loadingAction) || loadingStatus;

  const handleGenerate = async () => {
    const preview = await previewOrder(idOrder);
    if (!preview) return;

    const updated = await generateOrder(idOrder);
    if (updated) {
      setTechsmartOrder(updated);
      onOrderUpdated?.(updated);
    } else {
      await refreshStatus();
    }
  };

  const handleLinkGuide = async () => {
    const updated = await linkGuide({ idOrder });
    if (updated) {
      setTechsmartOrder(updated);
      onOrderUpdated?.(updated);
    } else {
      await refreshStatus();
    }
  };

  const handleInvoice = async () => {
    const updated = await invoiceOrder(idOrder);
    if (updated) {
      setTechsmartOrder(updated);
      onOrderUpdated?.(updated);
    } else {
      await refreshStatus();
    }
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3 min-w-[320px]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-blue-900">TechSmart</span>
        <Chip
          size="small"
          label={STATUS_LABELS[status] || status}
          color={
            status === "invoiced"
              ? "success"
              : status === "error"
                ? "error"
                : "primary"
          }
        />
      </div>

      {!isPaid && (
        <Alert severity="warning" sx={{ py: 0.5 }}>
          El pago debe estar confirmado antes de procesar en TechSmart.
        </Alert>
      )}

      {techsmartOrder?.folioPedido && (
        <p className="text-sm text-gray-700">
          <strong>Folio:</strong> {techsmartOrder.folioPedido}
        </p>
      )}
      {techsmartOrder?.guiaPedido && (
        <p className="text-sm text-gray-700">
          <strong>Guía:</strong> {techsmartOrder.guiaPedido}
          {techsmartOrder.nombrePaqueteria
            ? ` (${techsmartOrder.nombrePaqueteria})`
            : ""}
        </p>
      )}
      {techsmartOrder?.folioFactura && (
        <p className="text-sm text-gray-700">
          <strong>Factura:</strong> {techsmartOrder.folioFactura}
        </p>
      )}
      {techsmartOrder?.wsError && (
        <Alert severity="error" sx={{ py: 0.5 }}>
          {techsmartOrder.wsError}
        </Alert>
      )}

      <Stack direction="row" flexWrap="wrap" gap={1}>
        <Button
          size="small"
          variant="outlined"
          disabled={isBusy || !isPaid || ["sent", "guide_linked", "invoiced"].includes(status)}
          onClick={handleGenerate}
        >
          {loadingAction === "generate" ? (
            <CircularProgress size={16} />
          ) : (
            "Generar pedido"
          )}
        </Button>
        <Button
          size="small"
          variant="outlined"
          disabled={isBusy || !isPaid || !techsmartOrder?.folioPedido || status === "invoiced"}
          onClick={handleLinkGuide}
        >
          {loadingAction === "guide" ? (
            <CircularProgress size={16} />
          ) : (
            "Vincular guía"
          )}
        </Button>
        <Button
          size="small"
          variant="contained"
          disabled={isBusy || !isPaid || !techsmartOrder?.folioPedido || status === "invoiced"}
          onClick={handleInvoice}
        >
          {loadingAction === "invoice" ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            "Facturar"
          )}
        </Button>
        <Button size="small" disabled={isBusy} onClick={refreshStatus}>
          Actualizar
        </Button>
      </Stack>
    </div>
  );
};

export default TechsmartOrderPanel;
