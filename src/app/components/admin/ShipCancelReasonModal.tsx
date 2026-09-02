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
        backdrop: { sx: { zIndex: 1999 } },
      }}
    >
      <DialogContent sx={{ pt: 3, pb: 2.5 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
          ¿Cancelar?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
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
          helperText={error || "Obligatorio. El cliente verá este motivo en su historial y correo."}
          onChange={(event) => {
            setReason(event.target.value);
            if (event.target.value.trim()) setError("");
          }}
        />

        <Stack
          direction={{ xs: "column-reverse", sm: "row" }}
          justifyContent="flex-end"
          spacing={1.5}
          sx={{ mt: 3 }}
        >
          <Button variant="outlined" color="inherit" onClick={handleClose}>
            Cerrar
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!reason.trim()}
            onClick={handleSubmit}
          >
            Confirmar cancelación
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

export type ShipCancelPromptState = {
  description: string;
  resolve: (value: string | null) => void;
} | null;
