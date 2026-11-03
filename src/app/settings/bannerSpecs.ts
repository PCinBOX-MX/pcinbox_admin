/** Medidas y forma en que pcinbox-client muestra cada tipo de banner. */

export type BannerFit = "contain" | "cover";

export type BannerSpec = {
  width: number;
  height: number;
  /** Cómo la tienda acomoda la imagen dentro de su marco. */
  fit: BannerFit;
  /** Fondo oscuro detrás de la imagen, como en el carrusel de la tienda. */
  dark?: boolean;
  /** Tipos de archivo aceptados; por defecto solo PNG. */
  formats?: readonly string[];
};

export const BANNER_SPECS = {
  principal: { width: 1182, height: 384, fit: "contain", dark: true },
  categoria: { width: 1812, height: 708, fit: "contain" },
  nivel: { width: 1060, height: 1484, fit: "cover" },
  armaTuPc: { width: 2560, height: 320, fit: "contain", formats: ["image/png", "image/gif"] },
} satisfies Record<string, BannerSpec>;

const FORMAT_LABEL: Record<string, string> = { "image/png": "PNG", "image/gif": "GIF" };

export const specFormats = (spec: BannerSpec) => spec.formats ?? ["image/png"];
export const formatsLabel = (spec: BannerSpec) =>
  specFormats(spec)
    .map((type) => FORMAT_LABEL[type] ?? type)
    .join(" o ");

export type ImageSize = { width: number; height: number };

const FIT_RATIO_DIFF = 0.02;
export const MIN_WIDTH_SHARE = 0.8;

export const specAspect = (spec: BannerSpec) => `${spec.width} / ${spec.height}`;
export const sizeLabel = (size: ImageSize) => `${size.width} × ${size.height} px`;

export function readImageSize(file: Blob): Promise<ImageSize> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      reject(new Error("No se pudo leer la imagen."));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/** La forma difiere lo suficiente como para que la tienda muestre franjas o recorte: hay que acomodarla. */
export function needsFit(spec: BannerSpec, size: ImageSize) {
  const expected = spec.width / spec.height;
  return Math.abs(size.width / size.height - expected) / expected > FIT_RATIO_DIFF;
}

/** Aviso (no bloquea) cuando la imagen tiene menos resolución de la recomendada. */
export function checkBannerSize(spec: BannerSpec, size: ImageSize): { text: string } | null {
  if (size.width < spec.width * MIN_WIDTH_SHARE) {
    return { text: `Resolución baja; puede verse borrosa. Recomendado ${sizeLabel(spec)}.` };
  }
  return null;
}
