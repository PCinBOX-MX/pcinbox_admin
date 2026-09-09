import type { SxProps, Theme } from "@mui/material/styles";

/** Estilo compartido para TextField / Select / Autocomplete en filtros admin. */
export const adminFieldSx: SxProps<Theme> = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    backgroundColor: "#fff",
    "&:hover fieldset": { borderColor: "#bb3d4b" },
    "&.Mui-focused fieldset": { borderColor: "#bb3d4b" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#bb3d4b" },
};
