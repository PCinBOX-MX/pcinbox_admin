"use client";

import { Box } from "@mui/material";
import { ReactNode } from "react";

/** Pie de acción fijo al hacer scroll dentro del modal (alta / editar). */
const StickyFormAction = ({ children }: { children: ReactNode }) => (
  <Box
    sx={{
      position: "sticky",
      bottom: 0,
      zIndex: 20,
      mt: 1,
      pt: 2,
      pb: 3,
      mb: -3,
      mx: -3,
      px: 3,
      flexShrink: 0,
      background: "#ffffff",
      // Sombra superior + “placa” blanca inferior para que no se filtre el formulario
      boxShadow: "0 -8px 16px rgba(0,0,0,0.06), 0 40px 0 0 #ffffff",
    }}
  >
    {children}
  </Box>
);

export default StickyFormAction;
