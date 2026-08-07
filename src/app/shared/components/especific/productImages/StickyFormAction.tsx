"use client";

import { Box } from "@mui/material";
import { ReactNode } from "react";

/** Pie de acción fijo al hacer scroll dentro del modal (alta / editar). */
const StickyFormAction = ({ children }: { children: ReactNode }) => (
  <Box
    sx={{
      position: "sticky",
      bottom: 0,
      zIndex: 6,
      mt: 1,
      pt: 1.5,
      pb: 0.5,
      flexShrink: 0,
      background:
        "linear-gradient(180deg, rgba(255,255,255,0) 0%, #fff 28%, #fff 100%)",
      // Evita que el sticky tape campos del formulario en viewports cortos.
      boxShadow: "0 -8px 16px rgba(255,255,255,0.9)",
    }}
  >
    {children}
  </Box>
);

export default StickyFormAction;
