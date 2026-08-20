import { AxiosError } from "axios";

/** Extrae mensaje usable para modales/alertas de admin. */
export function resolveApiErrorMessage(
  error: unknown,
  fallback = "No se pudo completar la solicitud. Intenta de nuevo.",
): string {
  const axiosError = error as AxiosError<{ message?: string; content?: string }>;
  const fromBody =
    axiosError?.response?.data?.message ||
    axiosError?.response?.data?.content;
  if (typeof fromBody === "string" && fromBody.trim()) {
    return fromBody.trim();
  }
  if (axiosError?.message && !axiosError.message.startsWith("Request failed")) {
    return axiosError.message;
  }
  return fallback;
}
