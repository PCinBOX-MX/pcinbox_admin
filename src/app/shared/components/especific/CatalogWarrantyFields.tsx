"use client";

import { MenuItem, TextField } from "@mui/material";
import {
  CatalogWarrantyState,
  catalogWarrantyForcedTwelve,
  catalogWarrantyNeedsSelect,
} from "@/app/shared/utils/catalogWarranty";

type Props = {
  providerId?: number | null;
  isPC?: boolean | number | null;
  value: CatalogWarrantyState;
  onChange: (next: CatalogWarrantyState) => void;
  /** compact = una fila; default grid */
  dense?: boolean;
  /** Forzar select (p. ej. captura POS sin catálogo). */
  alwaysShow?: boolean;
};

/**
 * Select de garantía para catálogo proveedores.
 * Visible solo DicoTech o componentes PCinBOX (o alwaysShow).
 */
export default function CatalogWarrantyFields({
  providerId,
  isPC,
  value,
  onChange,
  dense,
  alwaysShow,
}: Props) {
  if (!alwaysShow && catalogWarrantyForcedTwelve({ providerId, isPC })) {
    return (
      <TextField
        size="small"
        fullWidth
        label="Garantía"
        value="1 año (fijo)"
        InputProps={{ readOnly: true }}
        helperText={
          Number(providerId) === 2
            ? "TechSmart: siempre 1 año"
            : "PC gamer / estación: siempre 1 año"
        }
      />
    );
  }

  if (!alwaysShow && !catalogWarrantyNeedsSelect({ providerId, isPC })) {
    return null;
  }

  const selectValue = value.choice || "";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: dense
          ? "1fr"
          : value.choice === "months" || value.choice === "years"
            ? "1fr 1fr"
            : "1fr",
        gap: 12,
        width: "100%",
      }}
    >
      <TextField
        select
        required
        size="small"
        fullWidth
        label="Garantía"
        value={selectValue}
        onChange={(e) => {
          const choice = e.target.value as CatalogWarrantyState["choice"];
          if (choice === "none" || choice === "service_center" || choice === "") {
            onChange({ choice, amount: "" });
            return;
          }
          onChange({
            choice,
            amount:
              value.amount !== "" && Number(value.amount) > 0
                ? value.amount
                : choice === "years"
                  ? 1
                  : 12,
          });
        }}
      >
        <MenuItem value="">Elegir…</MenuItem>
        <MenuItem value="months">Meses</MenuItem>
        <MenuItem value="years">Años</MenuItem>
        <MenuItem value="none">No aplica</MenuItem>
        <MenuItem value="service_center">Centro de servicio</MenuItem>
      </TextField>
      {value.choice === "months" || value.choice === "years" ? (
        <TextField
          required
          size="small"
          fullWidth
          type="number"
          label={
            value.choice === "years" ? "Cantidad (años)" : "Cantidad (meses)"
          }
          value={value.amount}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            onChange({
              ...value,
              amount: Number.isFinite(n) ? n : "",
            });
          }}
          inputProps={{ min: 1, step: 1 }}
        />
      ) : null}
    </div>
  );
}
