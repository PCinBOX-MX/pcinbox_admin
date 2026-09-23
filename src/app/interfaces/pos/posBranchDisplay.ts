/**

 * Etiquetas de bodega PCinBOX (mismas reglas que pcinbox-client / server).

 */

export function formatPcinboxBranchDisplayName(

  rawName?: string | null | undefined,

): string | null {

  const name = String(rawName ?? "").trim();

  if (!name) return null;

  const key = name.toLowerCase().replace(/\s+/g, "");



  if (key === "leon2" || key === "león" || key === "leon") {

    return "PCinBOX-León";

  }

  if (key === "santafe") {

    return "PCinBOX-SFD";

  }

  if (key === "gdl") {

    return "PCinBOX-GDL";

  }

  if (key === "cdmx") {

    return "PCinBOX-CDMX";

  }

  if (key === "dicoags2") {

    return "PCinBOX-AG2D";

  }

  if (key === "arboledas") {

    return "PCinBOX-AGD";

  }



  if (/^pcinbox-/i.test(name) || /^pc-/i.test(name)) return name;



  return name;

}



/** Label para UI POS: nunca preferir el código crudo si hay mapeo. */

export function formatPosBranchUiLabel(input: {

  name?: string | null;

  label?: string | null;

  city?: string | null;

  fallback?: string | null;

}): string {

  const rawName = String(input.name || "").trim();

  const mapped = formatPcinboxBranchDisplayName(rawName);

  if (mapped && mapped.toLowerCase() !== rawName.toLowerCase()) {

    return mapped;

  }



  const labelHead = String(input.label || "")

    .split("·")[0]

    ?.trim();

  const fromLabel = formatPcinboxBranchDisplayName(labelHead);

  if (fromLabel && fromLabel.toLowerCase() !== String(labelHead || "").toLowerCase()) {

    return fromLabel;

  }

  if (fromLabel && !/^(leon2|santafe|gdl|cdmx|dicoags2|arboledas)$/i.test(fromLabel)) {

    return fromLabel;

  }

  if (mapped && !/^(leon2|santafe|gdl|cdmx|dicoags2|arboledas)$/i.test(mapped)) {

    return mapped;

  }

  if (input.label) {

    // Reemplaza códigos crudos dentro del label compuesto

    return String(input.label)

      .replace(/\bleon2\b/gi, "PCinBOX-León")

      .replace(/\bsantafe\b/gi, "PCinBOX-SFD")

      .replace(/\bgdl\b/gi, "PCinBOX-GDL")

      .replace(/\bcdmx\b/gi, "PCinBOX-CDMX");

  }

  if (mapped) return mapped;

  const city = String(input.city || "").trim();

  if (city) return city;

  return String(input.fallback || "Bodega");

}



export const POS_TICKET_BRANCH_FALLBACK = "PCinBOX-León";



export function resolveTicketBranchLabel(params: {

  itemBranchName?: string | null | undefined;

  saleBranchName?: string | null | undefined;

}): string {

  return (

    formatPcinboxBranchDisplayName(params.itemBranchName) ||

    formatPcinboxBranchDisplayName(params.saleBranchName) ||

    POS_TICKET_BRANCH_FALLBACK

  );

}


