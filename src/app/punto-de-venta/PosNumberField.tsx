"use client";

import { useEffect, useState } from "react";
import { TextField, type SxProps, type Theme } from "@mui/material";
import { formatQty, moneyToWordsEsMx } from "./posFormat";
import styles from "./punto-de-venta.module.css";

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    backgroundColor: "#fff",
    transition: "box-shadow 160ms ease",
    "&:hover fieldset": { borderColor: "#bb3d4b" },
    "&.Mui-focused": {
      boxShadow: "0 0 0 3px rgba(187, 61, 75, 0.16)",
    },
    "&.Mui-focused fieldset": { borderColor: "#bb3d4b" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#bb3d4b" },
};

/** Campo numérico que permite vaciar al editar (sin atascarse en 0). */
function formatPosNumberDisplay(
  value: string | number,
  integer: boolean,
): string {
  if (value === "" || value === null || value === undefined) return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (integer) return formatQty(n);
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** Vista con miles mientras se escribe (draft ya sin comas). */
function formatPosNumberDraft(draft: string, integer: boolean): string {
  if (draft === "") return "";
  if (integer) {
    const digits = draft.replace(/\D/g, "");
    if (!digits) return "";
    return formatQty(Number(digits));
  }
  const cleaned = draft.replace(/,/g, "");
  if (cleaned === ".") return "0.";
  const match = cleaned.match(/^(\d*)(?:\.(\d*))?$/);
  if (!match) return draft;
  const intRaw = match[1] ?? "";
  const hasDot = cleaned.includes(".");
  const decRaw = match[2];
  const intFmt =
    intRaw === ""
      ? hasDot
        ? "0"
        : ""
      : Number(intRaw).toLocaleString("en-US");
  if (!hasDot) return intFmt;
  return `${intFmt}.${decRaw ?? ""}`;
}

function parsePosNumberInput(raw: string, integer: boolean): string {
  let v = String(raw ?? "").trim();
  if (!v) return "";
  v = v.replace(/,/g, "");
  if (!integer) {
    // ya sin comas; punto decimal
  }
  return v;
}

export default function PosNumberField({
  label,
  value,
  onCommit,
  integer = false,
  sx,
  fullWidth,
  className,
  emptyAs = "",
  moneyInWords,
  error = false,
}: {
  label: string;
  value: string | number | null;
  onCommit: (raw: string) => void;
  integer?: boolean;
  sx?: SxProps<Theme>;
  fullWidth?: boolean;
  className?: string;
  /** Valor a confirmar si el campo queda vacío al salir. */
  emptyAs?: string;
  /** Mostrar monto en letras debajo (default: sí si no es entero). */
  moneyInWords?: boolean;
  error?: boolean;
}) {
  const committed =
    value === null || value === undefined ? "" : String(value);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(committed);

  useEffect(() => {
    if (!focused) setDraft(committed);
  }, [committed, focused]);

  // Siempre con comas en UI; al API/estado van números sin formato.
  const display = focused
    ? formatPosNumberDraft(draft, integer)
    : formatPosNumberDisplay(committed, integer);

  const showWords = moneyInWords ?? !integer;
  const liveRaw = focused ? draft : committed;
  const liveNum = Number(String(liveRaw).replace(/,/g, ""));
  const wordsLabel =
    showWords && Number.isFinite(liveNum) && String(liveRaw).trim() !== ""
      ? moneyToWordsEsMx(liveNum)
      : "";

  return (
    <div className={`${styles.posNumberField}${className ? ` ${className}` : ""}`}>
      <TextField
        size="small"
        label={label}
        fullWidth={fullWidth ?? true}
        value={display}
        error={error}
        onFocus={() => {
          setFocused(true);
          setDraft(committed);
        }}
        onChange={(e) => {
          let v = e.target.value.replace(/,/g, "");
          if (integer) {
            v = v.replace(/\D/g, "");
          } else if (v !== "" && !/^\d*\.?\d*$/.test(v)) {
            return;
          }
          setDraft(v);
          if (v.trim() !== "" && v !== ".") onCommit(v);
        }}
        onBlur={() => {
          setFocused(false);
          const trimmed = parsePosNumberInput(draft, integer);
          const raw = trimmed === "" || trimmed === "." ? emptyAs : trimmed;
          onCommit(raw);
        }}
        sx={sx ?? fieldSx}
        inputProps={{ inputMode: integer ? "numeric" : "decimal" }}
      />
      {showWords ? (
        <p
          className={`${styles.moneyWords}${wordsLabel ? "" : ` ${styles.moneyWordsEmpty}`}`}
          aria-live="polite"
        >
          {wordsLabel || "—"}
        </p>
      ) : null}
    </div>
  );
}
