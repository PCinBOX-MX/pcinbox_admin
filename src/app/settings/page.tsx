"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import ProveedoresUtils from "../services/utils/proveedores.utils";

const TOTAL_SLOTS = 5;

type SlotState = {
  file: File | null;
  preview: string | null;
  status: "idle" | "uploaded" | "error";
  error: string | null;
};

const emptySlot = (): SlotState => ({
  file: null,
  preview: null,
  status: "idle",
  error: null,
});

export default function Settings() {
  const [banners, setBanners] = useState<string[]>([]);

  const [slots, setSlots] = useState<SlotState[]>(
    Array.from({ length: TOTAL_SLOTS }, emptySlot),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalMessage, setGlobalMessage] = useState<{
    type: "success" | "error";
    text: string;
    show: boolean;
  } | null>(null);

  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const selectedCount = slots.filter((s) => s.file !== null).length;

  const { requestPostProveedores } = ProveedoresUtils();

  const handleFileChange = (index: number, file: File | null) => {
    if (!file) return;
    const prev = slots[index].preview;
    if (prev) URL.revokeObjectURL(prev);
    const preview = URL.createObjectURL(file);
    setSlots((prev) =>
      prev.map((s, i) =>
        i === index ? { file, preview, status: "idle", error: null } : s,
      ),
    );
  };

  const handleClear = (index: number) => {
    const prev = slots[index].preview;
    if (prev) URL.revokeObjectURL(prev);
    setSlots((s) => s.map((slot, i) => (i === index ? emptySlot() : slot)));
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index]!.value = "";
    }
  };

  const resetSlots = () => {
    // limpiar object URLs (IMPORTANTE)
    slots.forEach((s) => {
      if (s.preview) URL.revokeObjectURL(s.preview);
    });

    // reset estado
    setSlots(Array.from({ length: TOTAL_SLOTS }, emptySlot));

    // limpiar inputs file del DOM
    fileInputRefs.current.forEach((input) => {
      if (input) input.value = "";
    });
  };

  const handleSubmit = async () => {
    if (selectedCount === 0) return;

    setIsSubmitting(true);
    setGlobalMessage(null);

    const formData = new FormData();
    slots.forEach((s, i) => {
      if (s.file) {
        formData.append("files", s.file);
        formData.append("slots", String(i + 1));
      }
    });

    try {
      const res = await requestPostProveedores(formData, "/updateBanners");
      const data = await res.data;

      if (res.status === 200) {
        const uploadedSet = new Set<number>(
          (data.data as { slot: number }[]).map((u) => u.slot),
        );

        // 🔥 1. actualizar estados (opcional, antes del reset)
        setSlots((prev) =>
          prev.map((s, i) => {
            const slot = i + 1;

            if (uploadedSet.has(slot)) {
              return { ...s, status: "uploaded" as const };
            }

            return s;
          }),
        );

        setGlobalMessage({ type: "success", text: data.message, show: true });

        // ⏱️ 2. pequeño delay opcional para que se vea el "uploaded"
        setTimeout(() => {
          resetSlots();
        }, 800);
      } else {
        setGlobalMessage({ type: "error", text: data.message, show: true });
      }
    } catch {
      setGlobalMessage({
        type: "error",
        text: "Error de red al conectar con el servidor.",
        show: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  useEffect(() => {
    if (typeof window !== "undefined") {
      setBanners([
        `https://ik.imagekit.io/pcinboxkit/${process.env.NEXT_PUBLIC_NODE_ENV === "local" ? "local" : "prod"}/carrusel-principal/banner_prin_01.png?v=${Date.now()}`,
        `https://ik.imagekit.io/pcinboxkit/${process.env.NEXT_PUBLIC_NODE_ENV === "local" ? "local" : "prod"}/carrusel-principal/banner_prin_02.png?v=${Date.now()}`,
        `https://ik.imagekit.io/pcinboxkit/${process.env.NEXT_PUBLIC_NODE_ENV === "local" ? "local" : "prod"}/carrusel-principal/banner_prin_03.png?v=${Date.now()}`,
        `https://ik.imagekit.io/pcinboxkit/${process.env.NEXT_PUBLIC_NODE_ENV === "local" ? "local" : "prod"}/carrusel-principal/banner_prin_04.png?v=${Date.now()}`,
        `https://ik.imagekit.io/pcinboxkit/${process.env.NEXT_PUBLIC_NODE_ENV === "local" ? "local" : "prod"}/carrusel-principal/banner_prin_05.png?v=${Date.now()}`,
      ]);
    }
  }, []);

  useEffect(() => {
    if (globalMessage?.show === true) {
      setTimeout(() => {
        setGlobalMessage((prev) => ({
          ...prev,
          type: "success",
          show: false,
          text: "",
        }));
      }, 3000);
    }
  }, [globalMessage]);

  return (
    <section className="min-h-screen bg-white dark:bg-[#111] text-gray-900 dark:text-white px-6 py-10 font-sans">
      {/* Grid */}
      <div
        className="max-w-5xl mx-auto mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
        style={{ margin: "auto" }}
      >
        {slots.map((slot, index) => {
          const slotNumber = index + 1;
          const isSelected = slot.file !== null;
          const isUploaded = slot.status === "uploaded";
          const hasError = slot.status === "error";

          return (
            <div
              style={{
                padding: "5px",
              }}
              key={index}
              className={`rounded-xl border overflow-hidden transition-all duration-150 ${
                isUploaded
                  ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                  : hasError
                    ? "border-red-400 bg-red-50 dark:bg-red-950/30"
                    : isSelected
                      ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30"
                      : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5"
              }`}
            >
              {/* Imagen */}
              <div
                className="relative w-full h-[90px] bg-gray-100 dark:bg-white/5"
                style={{
                  padding: "5px",
                }}
              >
                {slot.preview ? (
                  <Image
                    src={slot.preview}
                    alt={`Nueva imagen para banner ${slotNumber}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  banners[index] && (
                    <Image
                      src={banners[index]}
                      alt={`Banner actual ${slotNumber}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  )
                )}
              </div>

              {/* Cuerpo */}
              <div
                className="p-3"
                style={{
                  padding: "10px",
                }}
              >
                {/* Fila: número + badge */}
                <div
                  className="flex items-center justify-between mb-2"
                  style={{ padding: "10px" }}
                >
                  <span className="text-xs font-mono text-gray-400">
                    Banner {slotNumber}
                  </span>
                  {isUploaded && (
                    <span
                      style={{ padding: "5px" }}
                      className="text-[11px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 px-2 py-0.5 rounded-full"
                    >
                      ✓ Subido
                    </span>
                  )}
                  {hasError && (
                    <span
                      style={{ padding: "5px" }}
                      className="text-[11px] font-medium bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 px-2 py-0.5 rounded-full"
                    >
                      Error
                    </span>
                  )}
                  {isSelected && !isUploaded && !hasError && (
                    <span
                      style={{ padding: "5px" }}
                      className="text-[11px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-0.5 rounded-full"
                    >
                      Nueva imagen
                    </span>
                  )}
                  {!isSelected && !isUploaded && !hasError && (
                    <span
                      style={{ padding: "5px" }}
                      className="text-[11px] text-gray-400 border border-gray-200 dark:border-white/10 px-2 py-0.5 rounded-full"
                    >
                      Actual
                    </span>
                  )}
                </div>

                {/* Nombre del archivo */}
                {slot.file && (
                  <p className="text-[11px] text-gray-400 truncate mb-2">
                    {slot.file.name}
                  </p>
                )}

                {/* Error */}
                {slot.error && (
                  <p className="text-[11px] text-red-500 mb-2 line-clamp-2">
                    {slot.error}
                  </p>
                )}

                {/* Acciones */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[index]?.click()}
                    disabled={isSubmitting}
                    style={{
                      padding: "10px",
                    }}
                    className=" cursor-pointer flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12M8 8l4-4 4 4" />
                    </svg>
                    {slot.file ? "Cambiar" : "Reemplazar"}
                  </button>

                  {slot.file && (
                    <button
                      type="button"
                      onClick={() => handleClear(index)}
                      disabled={isSubmitting}
                      title="Quitar selección"
                      style={{
                        padding: "5px",
                      }}
                      className="text-xs py-1.5 px-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 hover:border-red-200 dark:hover:border-red-800 transition-colors disabled:opacity-40"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <input
                  ref={(el) => {
                    fileInputRefs.current[index] = el;
                  }}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) =>
                    handleFileChange(index, e.target.files?.[0] ?? null)
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
      {/* Mensaje global */}
      {globalMessage && (
        <div className="max-w-5xl mx-auto mb-6" style={{ margin: "auto" }}>
          <div
            style={{
              padding: "10px",
            }}
            className={`rounded-xl px-4 py-3 text-sm border ${
              globalMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-700/40 dark:text-emerald-300"
                : "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-700/40 dark:text-red-300"
            }`}
          >
            {globalMessage.text}
          </div>
        </div>
      )}
      {/* Footer: botón + conteo */}
      <div className="mx-auto flex justify-center items-center gap-4">
        <button
          type="button"
          style={{
            padding: "10px",
            marginTop: "20px",
          }}
          onClick={handleSubmit}
          disabled={isSubmitting || selectedCount === 0}
          className={` cursor-pointer flex items-center justify-center gap-2 px-5 py-2.5 w-[300px] rounded-xl text-sm font-medium transition-all duration-150 ${
            isSubmitting || selectedCount === 0
              ? "bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-gray-600 cursor-not-allowed"
              : "bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-700 dark:hover:bg-gray-100 active:scale-95"
          }`}
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              Subiendo...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12M8 8l4-4 4 4" />
              </svg>
              Subir
              {selectedCount > 0
                ? ` ${selectedCount} banner${selectedCount > 1 ? "s" : ""}`
                : ""}
            </>
          )}
        </button>

        {selectedCount > 0 && !isSubmitting && (
          <p className="text-xs text-gray-400">
            {selectedCount} de {TOTAL_SLOTS} banners seleccionados
          </p>
        )}
      </div>
    </section>
  );
}
