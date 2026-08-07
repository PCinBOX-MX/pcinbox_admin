export const MIN_PRODUCT_IMAGES = 1;
export const MAX_PRODUCT_IMAGES = 5;

export function validateProductImagesCount(count: number): string | null {
  if (count < MIN_PRODUCT_IMAGES) {
    return "Debes tener al menos 1 imagen del producto.";
  }
  if (count > MAX_PRODUCT_IMAGES) {
    return "Solo puedes tener máximo 5 imágenes por producto.";
  }
  return null;
}

export function takeFilesWithinLimit(
  currentCount: number,
  incoming: File[],
): { accepted: File[]; error: string | null } {
  const remaining = MAX_PRODUCT_IMAGES - currentCount;
  if (remaining <= 0) {
    return {
      accepted: [],
      error: "Solo puedes tener máximo 5 imágenes por producto.",
    };
  }
  const accepted = incoming.slice(0, remaining);
  if (incoming.length > remaining) {
    return {
      accepted,
      error: "Máximo 5 imágenes. Solo se agregaron las que cabían.",
    };
  }
  return { accepted, error: null };
}
