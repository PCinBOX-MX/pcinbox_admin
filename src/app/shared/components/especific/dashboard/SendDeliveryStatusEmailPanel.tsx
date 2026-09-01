"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Collapse,
  FormControl,
  FormControlLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { Mail, Send } from "lucide-react";
import PagosUtils from "@/app/services/utils/pagos.utils";
import {
  getPaymentStatusLabel,
  isOrderPaid,
} from "@/app/utils/paymentStatus.util";

type ShipStatusOption =
  | "procesando"
  | "disponible"
  | "enviado"
  | "entregado"
  | "cancelado";

const STATUS_OPTIONS: Array<{ value: ShipStatusOption; label: string }> = [
  { value: "procesando", label: "Procesando" },
  { value: "disponible", label: "Disponible" },
  { value: "enviado", label: "Enviado" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
];

const STATUS_RANK: Record<string, number> = {
  procesando: 1,
  disponible: 2,
  enviado: 3,
  entregado: 4,
  cancelado: 0,
};

function inferDefaultStatus(products: Array<{ statusShip?: string | null }>): ShipStatusOption {
  if (!products.length) return "procesando";

  const statuses = products
    .map((item) => String(item.statusShip || "procesando").toLowerCase())
    .filter(Boolean);

  if (statuses.every((status) => status === "cancelado")) {
    return "cancelado";
  }
  if (statuses.every((status) => status === "entregado")) {
    return "entregado";
  }

  const ranked = statuses
    .filter((status) => status !== "cancelado")
    .sort((a, b) => (STATUS_RANK[b] ?? 0) - (STATUS_RANK[a] ?? 0));

  const top = ranked[0] as ShipStatusOption | undefined;
  return top && STATUS_OPTIONS.some((option) => option.value === top)
    ? top
    : "procesando";
}

type SendDeliveryStatusEmailPanelProps = {
  idOrder: number;
  statusPay?: string | null;
  customerEmail?: string | null;
  products?: Array<{ statusShip?: string | null }>;
};

export default function SendDeliveryStatusEmailPanel({
  idOrder,
  statusPay,
  customerEmail,
  products = [],
}: SendDeliveryStatusEmailPanelProps) {
  const { requestPostPagos } = PagosUtils();
  const orderPaid = isOrderPaid(statusPay);
  const defaultStatus = useMemo(
    () => inferDefaultStatus(products),
    [products],
  );

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ShipStatusOption>(defaultStatus);
  const [forceResend, setForceResend] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSend = async () => {
    if (!orderPaid || idOrder <= 0) return;

    setSending(true);
    setFeedback(null);

    try {
      const resp = await requestPostPagos(
        {
          idOrder,
          status,
          force: forceResend,
        },
        "/orders/admin/sendDeliveryStatusEmail",
        { silent: true },
      );

      if (resp.status === 200) {
        setFeedback({
          type: "success",
          message: `Correo de estatus "${STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status}" enviado a ${customerEmail || "el cliente"}.`,
        });
      } else {
        setFeedback({
          type: "error",
          message:
            resp.data?.message ||
            "No se pudo enviar el correo. Verifica Resend y la pasarela.",
        });
      }
    } catch (error: any) {
      setFeedback({
        type: "error",
        message:
          error?.response?.data?.message ||
          "No se pudo enviar el correo de estatus.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Box
      sx={{
        mb: 2,
        border: "1px solid #eef0f4",
        borderRadius: "12px",
        overflow: "hidden",
        bgcolor: "#fafbfc",
      }}
    >
      <Button
        fullWidth
        onClick={() => setOpen((prev) => !prev)}
        startIcon={<Mail size={18} />}
        sx={{
          justifyContent: "flex-start",
          px: 2,
          py: 1.5,
          color: "#1f2937",
          fontWeight: 700,
          textTransform: "none",
          borderRadius: 0,
        }}
      >
        Enviar correo de estatus de la orden
      </Button>

      <Collapse in={open}>
        <Box sx={{ px: 2, pb: 2 }}>
          {!orderPaid ? (
            <Alert severity="info" sx={{ mb: 1.5, borderRadius: "10px" }}>
              El correo de estatus de envío solo se envía cuando la orden está{" "}
              <strong>Pagada</strong> (estado actual:{" "}
              <strong>{getPaymentStatusLabel(statusPay)}</strong>).
            </Alert>
          ) : (
            <Typography
              variant="body2"
              sx={{ mb: 1.5, color: "#6b7280", lineHeight: 1.6 }}
            >
              Se enviará <strong>un correo por orden</strong> con todos los
              productos, sus importes pagados y el estatus de envío de cada uno.
              Destinatario:{" "}
              <strong>{customerEmail || "correo del cliente"}</strong>.
            </Typography>
          )}

          <Stack spacing={1.5}>
            <FormControl fullWidth size="small" disabled={!orderPaid || sending}>
              <Select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as ShipStatusOption)
                }
                sx={{ borderRadius: "12px", bgcolor: "#fff", fontWeight: 600 }}
              >
                {STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={forceResend}
                  onChange={(event) => setForceResend(event.target.checked)}
                  disabled={!orderPaid || sending}
                />
              }
              label="Reenviar aunque ya se haya mandado este estatus"
            />

            <Button
              variant="contained"
              startIcon={<Send size={16} />}
              disabled={!orderPaid || sending || idOrder <= 0}
              onClick={handleSend}
              sx={{
                alignSelf: "flex-start",
                bgcolor: "#bb3d4b",
                fontWeight: 700,
                textTransform: "none",
                borderRadius: "10px",
                "&:hover": { bgcolor: "#a33441" },
              }}
            >
              {sending ? "Enviando…" : "Enviar correo al cliente"}
            </Button>

            {feedback ? (
              <Alert
                severity={feedback.type}
                sx={{ borderRadius: "10px" }}
                onClose={() => setFeedback(null)}
              >
                {feedback.message}
              </Alert>
            ) : null}
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
}
