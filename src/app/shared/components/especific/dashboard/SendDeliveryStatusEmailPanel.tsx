"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Package, Send } from "lucide-react";
import PagosUtils from "@/app/services/utils/pagos.utils";
import {
  getPaymentStatusLabel,
  isOrderPaid,
} from "@/app/utils/paymentStatus.util";
import {
  filterPhysicalProducts,
  isDigitalDeliveryProduct,
} from "@/app/utils/orderShipmentGroups";
import { orderModalSpacing as sp } from "./orderModalSpacing";

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

function inferDefaultStatus(
  products: Array<{ statusShip?: string | null }>,
): ShipStatusOption {
  if (!products.length) return "procesando";

  const statuses = products
    .map((item) => String(item.statusShip || "procesando").toLowerCase())
    .filter(Boolean);

  if (statuses.every((status) => status === "cancelado")) return "cancelado";
  if (statuses.every((status) => status === "entregado")) return "entregado";

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
  allProducts?: Array<{
    statusShip?: string | null;
    licenseType?: string | null;
    shipping_method?: string | null;
    address?: { shipping_method?: string | null } | null;
  }>;
  /** Al cambiar el select, sincroniza estatus de productos/envíos físicos. */
  onBulkStatusChange?: (status: ShipStatusOption) => Promise<void> | void;
};

export default function SendDeliveryStatusEmailPanel({
  idOrder,
  statusPay,
  customerEmail,
  products = [],
  allProducts,
  onBulkStatusChange,
}: SendDeliveryStatusEmailPanelProps) {
  const { requestPostPagos } = PagosUtils();
  const orderPaid = isOrderPaid(statusPay);
  const sourceProducts = allProducts ?? products;
  const physicalProducts = useMemo(
    () => filterPhysicalProducts(sourceProducts),
    [sourceProducts],
  );
  const digitalCount = useMemo(
    () =>
      sourceProducts.filter((item) => isDigitalDeliveryProduct(item)).length,
    [sourceProducts],
  );
  const defaultStatus = useMemo(
    () => inferDefaultStatus(physicalProducts),
    [physicalProducts],
  );

  const [open, setOpen] = useState(true);
  const [status, setStatus] = useState<ShipStatusOption>(defaultStatus);
  const [forceResend, setForceResend] = useState(false);
  const [sending, setSending] = useState(false);
  const [syncingStatus, setSyncingStatus] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    setStatus(defaultStatus);
  }, [defaultStatus]);

  const handleStatusSelect = async (next: ShipStatusOption) => {
    if (!onBulkStatusChange || !orderPaid) {
      setStatus(next);
      return;
    }

    setSyncingStatus(true);
    try {
      // Para cancelado el admin confirma en modal; solo aplica el select si confirma.
      await onBulkStatusChange(next);
      setStatus(next);
    } finally {
      setSyncingStatus(false);
    }
  };

  const handleSend = async () => {
    if (!orderPaid || idOrder <= 0 || !physicalProducts.length) return;

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
          message: `Correo de envío "${STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status}" enviado a ${customerEmail || "el cliente"}.`,
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
      const statusCode = error?.response?.status;
      const apiMessage = error?.response?.data?.message;
      let message = apiMessage || "No se pudo enviar el correo de estatus.";
      if (!apiMessage && (statusCode === 502 || statusCode === 503 || statusCode === 504)) {
        message =
          "La pasarela no responde (error " +
          statusCode +
          "). Reinicia server-pasarela-de-pagos (npm run dev en el puerto 8009) e inténtalo de nuevo.";
      } else if (!apiMessage && !error?.response) {
        message =
          "No hay conexión con la pasarela. Verifica que esté corriendo en http://localhost:8009.";
      }
      setFeedback({
        type: "error",
        message,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Box className="admin-delivery-email-panel" style={{ margin: 0, padding: 0 }}>
      <Button
        fullWidth
        onClick={() => setOpen((prev) => !prev)}
        startIcon={<Package size={18} />}
        className="admin-delivery-email-panel__toggle"
        style={sp.emailPanelToggle}
      >
        <span className="admin-delivery-email-panel__toggle-text" style={sp.emailToggleText}>
          Correo de estatus de envío
          <span className="admin-delivery-email-panel__toggle-meta">
            Orden #{idOrder} · {physicalProducts.length} físico
            {physicalProducts.length === 1 ? "" : "s"}
            {digitalCount > 0
              ? ` · ${digitalCount} licencia${digitalCount === 1 ? "" : "s"} excluida${digitalCount === 1 ? "" : "s"}`
              : ""}
          </span>
        </span>
      </Button>

      <Collapse in={open}>
        <Box className="admin-delivery-email-panel__body" style={sp.emailPanelBody}>
          {!orderPaid ? (
            <Alert severity="info" sx={{ mb: 1.5, borderRadius: "10px" }}>
              Disponible cuando la orden esté <strong>Pagada</strong> (actual:{" "}
              <strong>{getPaymentStatusLabel(statusPay)}</strong>).
            </Alert>
          ) : (
            <>
              <Typography
                variant="body2"
                sx={{ mb: 1, color: "#6b7280", lineHeight: 1.6 }}
              >
                Al cambiar el select se actualiza en vivo el estatus de los
                productos físicos de la orden #{idOrder}. El correo{" "}
                <strong>solo se envía</strong> cuando pulses{" "}
                <strong>Enviar correo al cliente</strong>. Cancelar (
                <strong>Cancelado</strong>) solo dentro de las{" "}
                <strong>24 horas</strong> posteriores a la compra confirmada.
                Las licencias digitales van aparte.
              </Typography>
              <Typography variant="body2" sx={{ mb: 1.5, color: "#374151" }}>
                Destinatario: <strong>{customerEmail || "correo del cliente"}</strong>
              </Typography>
            </>
          )}

          <Stack spacing={1.5}>
            <FormControl
              fullWidth
              size="small"
              disabled={!orderPaid || sending || syncingStatus}
            >
              <Select
                value={status}
                onChange={(event) =>
                  void handleStatusSelect(event.target.value as ShipStatusOption)
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
                  disabled={!orderPaid || sending || syncingStatus}
                />
              }
              label="Reenviar aunque ya se haya mandado este estatus"
            />

            <Button
              variant="contained"
              startIcon={<Send size={16} />}
              disabled={
                !orderPaid ||
                sending ||
                syncingStatus ||
                idOrder <= 0 ||
                !physicalProducts.length
              }
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
