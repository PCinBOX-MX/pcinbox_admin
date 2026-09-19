/**
 * Logo → bitmap ESC/POS (GS v 0). Contraste agresivo para logos grises/color.
 */

const GS = "\x1D";
const ESC = "\x1B";
const LF = "\x0A";

/** ~48mm en 203dpi; múltiplo de 8. Más compatible que 384 en Nextep. */
const LOGO_TARGET_WIDTH = 256;

let cachedRaster: string | null | undefined;

function bytesToBinaryString(bytes: Uint8Array): string {
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return out;
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen del logo"));
    img.src = url;
  });
}

async function fetchLogoBlob(logoUrl: string): Promise<Blob> {
  const res = await fetch(logoUrl, { cache: "reload" });
  if (!res.ok) throw new Error(`Logo HTTP ${res.status}`);
  return res.blob();
}

function rasterFromImageSource(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
): string | null {
  if (!srcW || !srcH) return null;

  let width = Math.min(LOGO_TARGET_WIDTH, Math.max(160, srcW));
  width = width - (width % 8);
  const height = Math.max(1, Math.round((srcH * width) / srcW));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);

  const { data } = ctx.getImageData(0, 0, width, height);
  const widthBytes = width / 8;
  const raster = new Uint8Array(widthBytes * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      // Cualquier píxel no-blanco casi transparente → negro (logos grises/café).
      const on = a > 8 && lum < 248;
      if (on) {
        raster[y * widthBytes + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }

  // Si quedó casi vacío, invertir criterio (logo claro sobre fondo oscuro).
  let ink = 0;
  for (let i = 0; i < raster.length; i++) if (raster[i]) ink++;
  if (ink < Math.max(8, (raster.length * 0.002) | 0)) {
    raster.fill(0);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const on = a > 8 && lum > 40;
        if (on) {
          raster[y * widthBytes + (x >> 3)] |= 0x80 >> (x & 7);
        }
      }
    }
  }

  const xL = widthBytes & 0xff;
  const xH = (widthBytes >> 8) & 0xff;
  const yL = height & 0xff;
  const yH = (height >> 8) & 0xff;

  return (
    ESC +
    "a" +
    "\x01" +
    GS +
    "v" +
    "0" +
    "\x00" +
    String.fromCharCode(xL, xH, yL, yH) +
    bytesToBinaryString(raster) +
    LF +
    LF
  );
}

/**
 * Devuelve comandos ESC/POS del logo. Fuerza recarga si `force`.
 */
export async function buildEscPosLogoRaster(
  logoUrl = "/api/qz/logo",
  force = false,
): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!force && cachedRaster !== undefined) return cachedRaster;

  const urls = [logoUrl, "/api/qz/logo"];
  const unique = [...new Set(urls.filter(Boolean))];

  for (const url of unique) {
    try {
      const blob = await fetchLogoBlob(url);
      const objectUrl = URL.createObjectURL(blob);
      try {
        let result: string | null = null;
        try {
          const bitmap = await createImageBitmap(blob);
          result = rasterFromImageSource(bitmap, bitmap.width, bitmap.height);
          bitmap.close();
        } catch {
          const img = await loadImageElement(objectUrl);
          result = rasterFromImageSource(
            img,
            img.naturalWidth || img.width,
            img.naturalHeight || img.height,
          );
        }
        if (result && result.length > 32) {
          cachedRaster = result;
          return cachedRaster;
        }
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch {
      /* siguiente URL */
    }
  }

  cachedRaster = null;
  return null;
}

export function clearEscPosLogoCache() {
  cachedRaster = undefined;
}
