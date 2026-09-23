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
import { Ban, ShieldAlert, Wallet } from "lucide-react";
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
      <Box className="admin-cancel-modal">
        <div className="admin-cancel-modal__banner admin-cancel-modal__banner--blocked">
          <div className="admin-cancel-modal__banner-icon">
            <ShieldAlert size={22} strokeWidth={2.25} />
          </div>
          <div>
            <p className="admin-cancel-modal__eyebrow">No disponible</p>
            <h3 className="admin-cancel-modal__heading">
              Esta orden no se puede cancelar
            </h3>
          </div>
        </div>

        <div className="admin-cancel-modal__order-pill">Orden #{idOrder}</div>

        <Alert
          severity="warning"
          sx={{
            mb: 2,
            borderRadius: "14px",
            border: "1px solid #fde68a",
            bgcolor: "#fffbeb",
          }}
        >
          {eligibility?.reason ||
            "Esta orden no puede cancelarse en este momento."}
        </Alert>

        <Typography
          variant="body2"
          sx={{ color: "#6b7280", lineHeight: 1.6, mb: 3 }}
        >
          Cuando el envío ya está en tránsito o entregado, la cancelación
          automática no está disponible. Revisa el estado del pedido o contacta
          soporte si necesitas ayuda operativa.
        </Typography>

        <Stack direction="row" justifyContent="flex-end">
          <Button
            variant="contained"
            onClick={onCancel}
            sx={{
              borderRadius: "12px",
              px: 2.5,
              py: 1.1,
              fontWeight: 700,
              textTransform: "none",
              background:
                "linear-gradient(135deg, #bb3d4b 0%, #9a3139 100%)",
              boxShadow: "0 8px 20px rgba(187, 61, 75, 0.28)",
            }}
          >
            Entendido
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box className="admin-cancel-modal">
      <div className="admin-cancel-modal__banner">
        <div className="admin-cancel-modal__banner-icon">
          <Ban size={22} strokeWidth={2.25} />
        </div>
        <div>
          <p className="admin-cancel-modal__eyebrow">Acción sensible</p>
          <h3 className="admin-cancel-modal__heading">
            Cancelar orden completa
          </h3>
        </div>
      </div>

      <div className="admin-cancel-modal__order-pill">Orden #{idOrder}</div>

      <div className="admin-cancel-modal__impact">
        <div className="admin-cancel-modal__impact-item">
          <Wallet size={16} />
          <span>Se intentará reembolso si el pago ya fue capturado</span>
        </div>
        <div className="admin-cancel-modal__impact-item">
          <Ban size={16} />
          <span>Todos los productos quedarán en Cancelado</span>
        </div>
      </div>

      {canTryOverride && eligibility?.reason ? (
        <Alert
          severity="info"
          sx={{
            mb: 2,
            borderRadius: "14px",
            border: "1px solid #bfdbfe",
            bgcolor: "#eff6ff",
          }}
        >
          {eligibility.reason}
        </Alert>
      ) : null}

      {canTryOverride ? (
        <FormControlLabel
          className="admin-cancel-modal__override"
          sx={{
            mb: 2,
            alignItems: "flex-start",
            mx: 0,
            p: 1.5,
            borderRadius: "14px",
            border: "1px solid #e8ecf4",
            bgcolor: "#f8fafc",
            "& .MuiCheckbox-root": { pt: 0.25, color: "#bb3d4b" },
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
            <Typography variant="body2" sx={{ color: "#4b5563", lineHeight: 1.5 }}>
              <Box component="span" fontWeight={800} color="#111827">
                Override manual
              </Box>{" "}
              — solo casos operativos excepcionales. No aplica si el envío ya
              fue enviado/entregado, hay licencia digital entregada, Dicotech en
              surtido o TechSmart fuera de plazo.
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
            : "El cliente verá este motivo en su historial y en el correo.")
        }
        onChange={(event) => {
          setReason(event.target.value);
          if (event.target.value.trim()) setError("");
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: "14px",
            bgcolor: formDisabled ? "#f3f4f6" : "#fff",
          },
        }}
      />

      <Stack
        direction={{ xs: "column-reverse", sm: "row" }}
        justifyContent="flex-end"
        spacing={1.5}
        sx={{ mt: 3 }}
      >
        <Button
          variant="outlined"
          color="inherit"
          onClick={onCancel}
          sx={{
            borderRadius: "12px",
            px: 2.25,
            py: 1.05,
            fontWeight: 700,
            textTransform: "none",
            borderColor: "#d1d5db",
          }}
        >
          Cerrar
        </Button>
        <Button
          variant="contained"
          disabled={confirmDisabled}
          onClick={handleSubmit}
          sx={{
            borderRadius: "12px",
            px: 2.5,
            py: 1.05,
            fontWeight: 800,
            textTransform: "none",
            background: confirmDisabled
              ? undefined
              : "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
            boxShadow: confirmDisabled
              ? "none"
              : "0 10px 24px rgba(185, 28, 28, 0.35)",
          }}
        >
          Confirmar cancelación
        </Button>
      </Stack>
    </Box>
  );
}
