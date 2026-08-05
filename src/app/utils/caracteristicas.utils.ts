export type Caracteristica = { prop: string; value: string };

export const PC_TIPO_OPTIONS = [
  {
    tipo: "Oficina y Gaming",
    label: "Laptops, Escritorios y sillas Gamer",
  },
  { tipo: "workStation", label: "PC Estación de trabajo" },
  { tipo: "pro", label: "Pc Gamer Pro" },
  { tipo: "intermedia", label: "Pc Gamer Intermedio" },
  { tipo: "entrada", label: "Pc Gamer de entrada" },
] as const;

export const stripTipoLinesFromText = (text: string) =>
  text
    .split(/\r?\n/)
    .filter((line) => !/^\s*tipo\s*:/i.test(line))
    .join("\n");

export const parseCharacteristics = (text: string): Caracteristica[] => {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      let prop = "";
      let value = "";
      if (line.includes(":")) {
        const parts = line.split(":");
        prop = parts.shift() || "";
        value = parts.join(":");
      } else {
        const match = line.match(/^(.*?)(\d+.*)$/);
        if (match) {
          prop = match[1];
          value = match[2];
        } else {
          prop = line;
        }
      }
      return { prop: prop.trim(), value: value.trim() };
    })
    .filter(
      (item) =>
        item.prop !== "" &&
        item.value !== "" &&
        item.prop.toLowerCase() !== "tipo",
    );
};

export const parseCaracteristicasRaw = (
  raw: unknown,
): Caracteristica[] => {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((c: any) => ({
        prop: String(c?.prop ?? "").trim(),
        value: String(c?.value ?? "").trim(),
      }))
      .filter((c) => c.prop !== "");
  } catch {
    return [];
  }
};

export const extractTipo = (list: Caracteristica[]) =>
  list.find((c) => c.prop.toLowerCase() === "tipo")?.value || null;

export const stripTipoFromList = (list: Caracteristica[]) =>
  list.filter((c) => c.prop.toLowerCase() !== "tipo");

/** Array final para PC: tipo interno + líneas del textarea. */
export const buildPcCaracteristicas = (
  text: string,
  tipo: string | null,
): Caracteristica[] => {
  const fromText = parseCharacteristics(text);
  if (!tipo) return fromText;
  return [{ prop: "tipo", value: tipo }, ...fromText];
};

export const buildCaracteristicasPayload = (
  text: string,
  tipo: string | null,
  isPc: boolean,
): Caracteristica[] => {
  const fromText = parseCharacteristics(text);
  if (isPc && tipo) {
    return [{ prop: "tipo", value: tipo }, ...fromText];
  }
  return fromText;
};

export const serializeCaracteristicas = (
  raw: string | Caracteristica[],
): string => {
  const parsed =
    typeof raw === "string" ? parseCharacteristics(raw) : [...raw];
  return JSON.stringify(
    parsed.filter(
      (item) => item.prop !== "" && item.prop.toLowerCase() !== "tipo",
    ),
  );
};

export const caracteristicasToTextarea = (list: Caracteristica[]) =>
  stripTipoFromList(list)
    .map((c) =>
      c.prop === "Característica" && !c.value.includes("Característica")
        ? c.value
        : `${c.prop}: ${c.value}`,
    )
    .join("\n");

export const isPcProduct = (product: {
  isPc?: unknown;
  isPC?: unknown;
}) => {
  const flag = product?.isPc ?? product?.isPC;
  return flag === 1 || flag === "1" || flag === true || flag === "true";
};

export const remoteImageUrls = (urls: unknown): string[] => {
  if (!Array.isArray(urls)) return [];
  return urls.filter(
    (url): url is string =>
      typeof url === "string" &&
      url.length > 0 &&
      !url.startsWith("blob:"),
  );
};
