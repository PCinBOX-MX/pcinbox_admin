"use client";

import { Button, Typography } from "@mui/material";
import { CanCancelOrderResult } from "@/app/types/orderCancellation";

type Props = {
  idOrder: number;
  statusPay?: string;
  canCancelPermission: boolean;
  onCancelClick: (idOrder: number) => void;
};

export default function OrderCancelSection({
  idOrder,
  statusPay,
  canCancelPermission,
  onCancelClick,
}: Props) {
  const payStatus = String(statusPay || "").toLowerCase();
  const isAlreadyCancelled =
    payStatus === "cancelled" || payStatus === "refunded";

  if (!canCancelPermission || isAlreadyCancelled) {
    return null;
  }

  return (
    <div className="order-cancel-section">
      <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
        Cancelación de la orden
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Usa esta opción solo cuando debas cancelar toda la compra (TechSmart,
        Dicotech y productos PCInbox). Se validará el plazo de 24 h, el estado
        del envío y el avance con proveedores antes de reembolsar.
      </Typography>
      <Button
        size="small"
        color="error"
        variant="outlined"
        onClick={() => onCancelClick(idOrder)}
      >
        Cancelar orden completa
      </Button>
    </div>
  );
}
