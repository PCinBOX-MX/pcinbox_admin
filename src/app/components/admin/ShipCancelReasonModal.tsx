"use client";

import { useState } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";

type Props = {
  title?: string;
  description: string;
  onCancel: () => void;
  onConfirm: (cancelReason: string) => void;
};

export default function ShipCancelReasonModal({
  title = "Motivo de cancelación",
  description,
  onCancel,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("El motivo de la cancelación es obligatorio.");
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <Box
      sx={{
        width: "100%",
        minWidth: { xs: "100%", sm: 420 },
        textAlign: "left",
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {description}
      </Typography>

      <TextField
        fullWidth
        multiline
        minRows={4}
        label={title}
        required
        placeholder="Describe por qué se cancela..."
        value={reason}
        error={Boolean(error)}
        helperText={error || "Obligatorio para registrar la cancelación."}
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
          disabled={!reason.trim()}
          onClick={handleSubmit}
        >
          Confirmar cancelación
        </Button>
      </Stack>
    </Box>
  );
}
