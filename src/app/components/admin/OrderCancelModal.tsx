"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { CanCancelOrderResult } from "@/app/types/orderCancellation";

type Props = {
  idOrder: number;
  eligibility: CanCancelOrderResult | null;
  canOverride: boolean;
  onCancel: () => void;
  onConfirm: (payload: {
    cancelReason: string;
    manualOverride: boolean;
  }) => void;
};

const OVERRIDE_FORBIDDEN_CODES = new Set([
  "TECHSMART_WINDOW",
  "TECHSMART_SENT",
  "SHIPMENT_STATUS",
  "DICOTECH_PROCESSING",
]);

export default function OrderCancelModal({
  idOrder,
  eligibility,
  canOverride,
  onCancel,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState("");
  const [manualOverride, setManualOverride] = useState(false);
  const [error, setError] = useState("");

  const blocked = eligibility != null && !eligibility.canCancel;
  const overrideForbidden = OVERRIDE_FORBIDDEN_CODES.has(
    eligibility?.code ?? "",
  );
  const canTryOverride = blocked && canOverride && !overrideForbidden;
  const hardBlocked = blocked && !canTryOverride;

  const handleSubmit = () => {
    if (!reason.trim()) {
      setError("El motivo de la cancelación es obligatorio.");
      return;
    }

    if (blocked && !manualOverride) {
      setError(
        eligibility?.reason ||
          "Activa el override manual para continuar con esta cancelación.",
      );
      return;
    }

    onConfirm({
      cancelReason: reason.trim(),
      manualOverride: blocked ? manualOverride : false,
    });
  };

  const formDisabled = canTryOverride && !manualOverride;
  const confirmDisabled = !reason.trim() || (canTryOverride && !manualOverride);

  if (hardBlocked) {
    return (
      <Box
        sx={{
          width: "100%",
          minWidth: { xs: "100%", sm: 420 },
          textAlign: "left",
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Orden{" "}
          <Box component="span" fontWeight={700} color="text.primary">
            #{idOrder}
          </Box>
        </Typography>

        <Alert severity="warning" sx={{ mb: 2, textAlign: "left" }}>
          {eligibility?.reason ||
            "Esta orden no puede cancelarse en este momento."}
        </Alert>

        <Typography variant="body2" color="text.secondary">
          Cuando el envío ya está en proceso, la cancelación automática no está
          disponible. Revisa el estado del pedido o contacta soporte si necesitas
          ayuda operativa.
        </Typography>

        <Stack
          direction="row"
          justifyContent="flex-end"
          spacing={1.5}
          sx={{ mt: 3, pt: 1 }}
        >
          <Button variant="contained" onClick={onCancel}>
            Entendido
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        minWidth: { xs: "100%", sm: 440 },
        textAlign: "left",
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Vas a cancelar la orden{" "}
        <Box component="span" fontWeight={700} color="text.primary">
          #{idOrder}
        </Box>
        . Se intentará reembolso si el pago ya fue capturado.
      </Typography>

      {canTryOverride && eligibility?.reason ? (
        <Alert severity="info" sx={{ mb: 2, textAlign: "left" }}>
          {eligibility.reason}
        </Alert>
      ) : null}

      {canTryOverride ? (
        <FormControlLabel
          sx={{
            mb: 2,
            alignItems: "flex-start",
            mx: 0,
            "& .MuiCheckbox-root": { pt: 0.25 },
          }}
          control={
            <Checkbox
              checked={manualOverride}
              onChange={(event) => {
                setManualOverride(event.target.checked);
                if (event.target.checked) setError("");
              }}
            />
          }
          label={
            <Typography variant="body2" color="text.secondary">
              <Box component="span" fontWeight={700} color="text.primary">
                Override manual
              </Box>{" "}
              — solo para casos operativos excepcionales. No aplica si el envío
              ya fue enviado o entregado, hay licencia digital entregada, Dicotech
              en surtido o TechSmart fuera de plazo.
            </Typography>
          }
        />
      ) : null}

      <TextField
        fullWidth
        multiline
        minRows={4}
        id={`cancel-reason-${idOrder}`}
        label="Motivo de la cancelación"
        required
        placeholder="Describe por qué se cancela esta orden..."
        value={reason}
        disabled={formDisabled}
        error={Boolean(error)}
        helperText={
          error ||
          (formDisabled
            ? "Activa el override manual para escribir el motivo."
            : "Obligatorio para registrar la cancelación.")
        }
        onChange={(event) => {
          setReason(event.target.value);
          if (event.target.value.trim()) setError("");
        }}
      />

      <Stack
        direction={{ xs: "column-reverse", sm: "row" }}
        justifyContent="flex-end"
        spacing={1.5}
        sx={{ mt: 3, pt: 1 }}
      >
        <Button variant="outlined" color="inherit" onClick={onCancel}>
          Cerrar
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={confirmDisabled}
          onClick={handleSubmit}
        >
          Confirmar cancelación
        </Button>
      </Stack>
    </Box>
  );
}
