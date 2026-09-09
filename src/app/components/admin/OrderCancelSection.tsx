"use client";

import { Button, Typography } from "@mui/material";
import { Ban } from "lucide-react";

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
    <div className="admin-order-cancel-panel">
      <div className="admin-order-cancel-panel__icon">
        <Ban size={18} strokeWidth={2.25} />
      </div>
      <div className="admin-order-cancel-panel__body">
        <Typography
          variant="subtitle2"
          sx={{ mb: 0.35, fontWeight: 800, color: "#111827" }}
        >
          Cancelación de la orden
        </Typography>
        <Typography
          variant="body2"
          sx={{ mb: 1.25, color: "#6b7280", lineHeight: 1.55 }}
        >
          Cancela toda la compra (TechSmart, Dicotech y PCInbox). Se validan plazo,
          envío y avance con proveedores antes del reembolso.
        </Typography>
        <Button
          size="small"
          color="error"
          variant="contained"
          onClick={() => onCancelClick(idOrder)}
          sx={{
            borderRadius: "10px",
            textTransform: "none",
            fontWeight: 800,
            px: 1.75,
            background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
            boxShadow: "0 8px 18px rgba(185, 28, 28, 0.28)",
          }}
        >
          Cancelar orden completa
        </Button>
      </div>
    </div>
  );
}
