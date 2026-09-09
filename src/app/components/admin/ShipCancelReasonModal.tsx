"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Ban } from "lucide-react";

type Props = {
  open: boolean;
  title?: string;
  description: string;
  onCancel: () => void;
  onConfirm: (cancelReason: string) => void;
};

/**
 * Dialog propio (z-index alto) para no reemplazar el modal de detalle de orden.
 */
export default function ShipCancelReasonModal({
  open,
  title = "Motivo de cancelación",
  description,
  onCancel,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleClose = () => {
    setReason("");
    setError("");
    onCancel();
  };

  const handleSubmit = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("El motivo de la cancelación es obligatorio.");
      return;
    }
    onConfirm(trimmed);
    setReason("");
    setError("");
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      sx={{ zIndex: 2000 }}
      slotProps={{
        backdrop: {
          sx: {
            zIndex: 1999,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(6px)",
          },
        },
        paper: {
          sx: {
            borderRadius: "20px",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.7)",
            boxShadow:
              "0 25px 50px -12px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(15,23,42,0.04)",
          },
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <div className="admin-cancel-modal admin-cancel-modal--dialog">
          <div className="admin-cancel-modal__banner">
            <div className="admin-cancel-modal__banner-icon">
              <Ban size={22} strokeWidth={2.25} />
            </div>
            <div>
              <p className="admin-cancel-modal__eyebrow">Cancelar envío</p>
              <h3 className="admin-cancel-modal__heading">¿Cancelar?</h3>
            </div>
          </div>

          <Typography
            variant="body2"
            sx={{ color: "#4b5563", lineHeight: 1.6, mb: 2.25 }}
          >
            {description}
          </Typography>

          <TextField
            fullWidth
            multiline
            minRows={4}
            autoFocus
            label={title}
            required
            placeholder="Describe por qué se cancela..."
            value={reason}
            error={Boolean(error)}
            helperText={
              error ||
              "Obligatorio. El cliente verá este motivo en su historial y correo."
            }
            onChange={(event) => {
              setReason(event.target.value);
              if (event.target.value.trim()) setError("");
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "14px",
                bgcolor: "#fff",
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
              onClick={handleClose}
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
              disabled={!reason.trim()}
              onClick={handleSubmit}
              sx={{
                borderRadius: "12px",
                px: 2.5,
                py: 1.05,
                fontWeight: 800,
                textTransform: "none",
                background: !reason.trim()
                  ? undefined
                  : "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                boxShadow: !reason.trim()
                  ? "none"
                  : "0 10px 24px rgba(185, 28, 28, 0.35)",
              }}
            >
              Confirmar cancelación
            </Button>
          </Stack>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type ShipCancelPromptState = {
  description: string;
  resolve: (value: string | null) => void;
} | null;
