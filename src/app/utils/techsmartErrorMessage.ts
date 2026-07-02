type TechSmartProductMsg = {
  CveProductoTMM?: string | null;
  CodFabricante?: string | null;
  Descripcion?: string | null;
  Precio?: string | number | null;
  Existencia?: string | number | null;
  GDL?: string | number | null;
  CDMX?: string | number | null;
};

function isProductLikeMsg(value: unknown): value is TechSmartProductMsg {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    "CodFabricante" in o ||
    "CveProductoTMM" in o ||
    "Existencia" in o ||
    "GDL" in o
  );
}

function readStock(value: string | number | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatTechsmartErrorMessage(msg: unknown): string {
  if (typeof msg === "string" && msg.trim()) {
    const trimmed = msg.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return formatTechsmartErrorMessage(JSON.parse(trimmed));
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }

  if (msg == null) {
    return "Error en el webservice TechSmart";
  }

  if (isProductLikeMsg(msg)) {
    const label =
      String(msg.Descripcion || "").trim() ||
      String(msg.CodFabricante || msg.CveProductoTMM || "").trim() ||
      "producto TechSmart";
    const sku = String(msg.CodFabricante || "").trim();
    const cveTmm = String(msg.CveProductoTMM || "").trim();
    const gdl = readStock(msg.GDL);
    const cdmx = readStock(msg.CDMX);
    const existencia = readStock(msg.Existencia);
    const totalStock = existencia > 0 ? existencia : gdl + cdmx;

    if (!cveTmm) {
      return sku
        ? `La clave "${sku}" no está en el catálogo TechSmart. idProductExt debe ser el campo clave del FTP (ej. TVPCEASUDR505O8G).`
        : "El producto no está registrado en TechSmart.";
    }

    if (totalStock <= 0) {
      return `Sin existencia en TechSmart para ${label} (GDL: ${gdl}, CDMX: ${cdmx}).`;
    }
  }

  if (typeof msg === "object") {
    try {
      return JSON.stringify(msg);
    } catch {
      return "Error en el webservice TechSmart";
    }
  }

  return String(msg);
}
