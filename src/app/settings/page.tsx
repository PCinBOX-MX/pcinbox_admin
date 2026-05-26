"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import ProveedoresUtils from "../services/utils/proveedores.utils";
import useSettings from "./useSettings";

// ─── Constantes ────────────────────────────────────────────────────────────────

const TOTAL_SLOTS = 5;

const ENV = process.env.NEXT_PUBLIC_NODE_ENV === "local" ? "local" : "prod";

function bannerUrl(filename: string) {
  return `https://ik.imagekit.io/pcinboxkit/${ENV}/${filename}?v=${Date.now()}`;
}

// ─── Tipos ──────────────────────────────────────────────────────────────────────

type SlotState = {
  file: File | null;
  preview: string | null;
  status: "idle" | "uploaded" | "error";
  error: string | null;
};

type CategorySlotState = {
  file: File | null;
  preview: string | null;
  categoryId: string;
  status: "idle" | "uploaded" | "error";
  error: string | null;
};

type GlobalMessage = {
  type: "success" | "error";
  text: string;
  show: boolean;
} | null;

// ─── Helpers ────────────────────────────────────────────────────────────────────

const emptySlot = (): SlotState => ({
  file: null,
  preview: null,
  status: "idle",
  error: null,
});

const emptyCategorySlot = (): CategorySlotState => ({
  file: null,
  preview: null,
  categoryId: "",
  status: "idle",
  error: null,
});

// ─── Componente ─────────────────────────────────────────────────────────────────

export default function Settings() {
  // ── Banners principales ──────────────────────────────────────
  const [banners, setBanners] = useState<string[]>([]);
  const [slots, setSlots] = useState<SlotState[]>(
    Array.from({ length: TOTAL_SLOTS }, emptySlot),
  );
  const [isSubmittingPrincipal, setIsSubmittingPrincipal] = useState(false);
  const [principalMessage, setPrincipalMessage] = useState<GlobalMessage>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Banner por categoría ─────────────────────────────────────
  const [categoryBanners, setCategoryBanners] = useState<
    Record<string, string>
  >({});
  const [categorySlot, setCategorySlot] =
    useState<CategorySlotState>(emptyCategorySlot);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [categoryMessage, setCategoryMessage] = useState<GlobalMessage>(null);
  const categoryInputRef = useRef<HTMLInputElement | null>(null);
  const { BANNERS_X_CATEGORY } = useSettings();

  const { requestPostProveedores } = ProveedoresUtils();

  // ── Conteo ───────────────────────────────────────────────────
  const selectedCount = slots.filter((s) => s.file !== null).length;

  // ── Banner actual de la categoría seleccionada ───────────────
  const currentCategoryBannerUrl = categorySlot.categoryId
    ? BANNERS_X_CATEGORY.find(
        (banner) => banner.category === categorySlot.categoryId,
      )?.pathImg
    : null;

  // ════════════════════════════════════════════════════════════
  // Handlers — Banners principales
  // ════════════════════════════════════════════════════════════

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
    slots.forEach((s) => {
      if (s.preview) URL.revokeObjectURL(s.preview);
    });
    setSlots(Array.from({ length: TOTAL_SLOTS }, emptySlot));
    fileInputRefs.current.forEach((input) => {
      if (input) input.value = "";
    });
  };

  const handleSubmitPrincipal = async () => {
    if (selectedCount === 0) return;
    setIsSubmittingPrincipal(true);
    setPrincipalMessage(null);

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
        setBanners((prev) => {
          const updated = [...prev];
          data.data.forEach(({ slot, url }: { slot: number; url: string }) => {
            const index = slot - 1;
            if (updated[index] !== undefined) updated[index] = url;
          });
          return updated;
        });
        setPrincipalMessage({
          type: "success",
          text: data.message,
          show: true,
        });
        setTimeout(() => resetSlots(), 800);
      } else {
        setPrincipalMessage({ type: "error", text: data.message, show: true });
      }
    } catch {
      setPrincipalMessage({
        type: "error",
        text: "Error de red al conectar con el servidor.",
        show: true,
      });
    } finally {
      setIsSubmittingPrincipal(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // Handlers — Banner por categoría
  // ════════════════════════════════════════════════════════════

  const handleCategoryFileChange = (file: File | null) => {
    if (!file) return;
    if (categorySlot.preview) URL.revokeObjectURL(categorySlot.preview);
    const preview = URL.createObjectURL(file);
    setCategorySlot((prev) => ({
      ...prev,
      file,
      preview,
      status: "idle",
      error: null,
    }));
  };

  const handleClearCategory = () => {
    if (categorySlot.preview) URL.revokeObjectURL(categorySlot.preview);
    setCategorySlot(emptyCategorySlot);
    if (categoryInputRef.current) categoryInputRef.current.value = "";
  };

  const handleSubmitCategory = async () => {
    if (!categorySlot.file || !categorySlot.categoryId) return;
    setIsSubmittingCategory(true);
    setCategoryMessage(null);

    const formData = new FormData();
    formData.append("file", categorySlot.file);
    formData.append("categoryId", categorySlot.categoryId);

    try {
      const res = await requestPostProveedores(
        formData,
        "/updateCategoryBanner",
      );
      const data = await res.data;
      console.log("Data UpdateCategoryBanner");
      console.log(data);

      if (res.status === 200) {
        setCategoryBanners((prev) => ({
          ...prev,
          [categorySlot.categoryId]: data.data.url,
        }));
        setCategoryMessage({
          type: "success",
          text: data.message,
          show: true,
        });
        setTimeout(() => {
          if (categorySlot.preview) URL.revokeObjectURL(categorySlot.preview);
          setCategorySlot((prev) => ({
            ...prev,
            file: null,
            preview: null,
            status: "uploaded",
          }));
          if (categoryInputRef.current) categoryInputRef.current.value = "";
        }, 800);
      } else {
        setCategoryMessage({ type: "error", text: data.message, show: true });
      }
    } catch {
      setCategoryMessage({
        type: "error",
        text: "Error de red al conectar con el servidor.",
        show: true,
      });
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // Effects
  // ════════════════════════════════════════════════════════════

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBanners(
        Array.from({ length: TOTAL_SLOTS }, (_, i) =>
          bannerUrl(`carrusel-principal/banner_prin_0${i + 1}.png`),
        ),
      );
    }
  }, []);

  // Auto-ocultar mensajes después de 3 s
  useEffect(() => {
    if (!principalMessage?.show) return;
    const t = setTimeout(
      () =>
        setPrincipalMessage((prev) =>
          prev ? { ...prev, show: false, text: "" } : null,
        ),
      3000,
    );
    return () => clearTimeout(t);
  }, [principalMessage]);

  useEffect(() => {
    if (!categoryMessage?.show) return;
    const t = setTimeout(
      () =>
        setCategoryMessage((prev) =>
          prev ? { ...prev, show: false, text: "" } : null,
        ),
      3000,
    );
    return () => clearTimeout(t);
  }, [categoryMessage]);

  // ════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════

  return (
    <section className="min-h-screen bg-white dark:bg-[#111] text-gray-900 dark:text-white px-6 py-10 font-sans">
      <div
        className="max-w-5xl mx-auto"
        style={{
          margin: "auto",
        }}
      >
        <div className="mb-4">
          <h2
            className="text-sm font-semibold text-gray-700 dark:text-gray-200"
            style={{
              padding: "5px",
            }}
          >
            Banners del carrusel principal
          </h2>
        </div>

        {/* Grid de slots */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {slots.map((slot, index) => {
            const slotNumber = index + 1;
            const isSelected = slot.file !== null;
            const isUploaded = slot.status === "uploaded";
            const hasError = slot.status === "error";

            return (
              <div
                key={index}
                style={{ padding: "5px" }}
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
                {/* Thumbnail */}
                <div
                  className="relative w-full h-[90px] bg-gray-100 dark:bg-white/5"
                  style={{ padding: "5px" }}
                >
                  {slot.preview ? (
                    <Image
                      src={slot.preview}
                      alt={`Banner ${slotNumber}`}
                      fill
                      priority
                      className="object-cover"
                    />
                  ) : (
                    banners[index] && (
                      <Image
                        src={banners[index]}
                        alt={`Banner ${slotNumber}`}
                        fill
                        priority
                        className="object-cover"
                      />
                    )
                  )}
                </div>

                {/* Cuerpo */}
                <div className="p-3" style={{ padding: "10px" }}>
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

                  {slot.file && (
                    <p className="text-[11px] text-gray-400 truncate mb-2">
                      {slot.file.name}
                    </p>
                  )}
                  {slot.error && (
                    <p className="text-[11px] text-red-500 mb-2 line-clamp-2">
                      {slot.error}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[index]?.click()}
                      disabled={isSubmittingPrincipal}
                      style={{ padding: "10px" }}
                      className="cursor-pointer flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                        disabled={isSubmittingPrincipal}
                        title="Quitar selección"
                        style={{ padding: "5px" }}
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
                    accept="image/png"
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

        {/* Mensaje global — principal */}
        {principalMessage?.show && (
          <div
            style={{ padding: "10px" }}
            className={`rounded-xl px-4 py-3 text-sm border mb-4 ${
              principalMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-700/40 dark:text-emerald-300"
                : "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-700/40 dark:text-red-300"
            }`}
          >
            {principalMessage.text}
          </div>
        )}

        {/* Footer — principal */}
        <div
          className="flex items-center gap-4 justify-center"
          style={{ marginTop: "10px" }}
        >
          <button
            type="button"
            style={{ padding: "10px" }}
            onClick={handleSubmitPrincipal}
            disabled={isSubmittingPrincipal || selectedCount === 0}
            className={`cursor-pointer flex items-center justify-center gap-2 px-5 py-2.5 w-[300px] rounded-xl text-sm font-medium transition-all duration-150 ${
              isSubmittingPrincipal || selectedCount === 0
                ? "bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                : "bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-700 dark:hover:bg-gray-100 active:scale-95"
            }`}
          >
            {isSubmittingPrincipal ? (
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

          {selectedCount > 0 && !isSubmittingPrincipal && (
            <p className="text-xs text-gray-400">
              {selectedCount} de {TOTAL_SLOTS} banners seleccionados
            </p>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          SECCIÓN 2 — Banner por categoría
      ══════════════════════════════════════════════ */}
      <div className="max-w-5xl mx-auto" style={{ margin: "20px auto" }}>
        <div className="mb-4">
          <h2
            className="text-sm font-semibold text-gray-700 dark:text-gray-200"
            style={{
              marginBottom: "10px",
            }}
          >
            Banner de categoría
          </h2>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 space-y-5">
          {/* Fila: selector de categoría + drop zone */}
          <div
            className="flex flex-col sm:flex-row gap-4"
            style={{
              padding: "10px",
            }}
          >
            {/* Select */}
            <div
              className="flex flex-col gap-1.5 sm:w-52"
              style={{
                padding: "10px",
              }}
            >
              <label className="text-xs text-gray-400">Categoría</label>
              <select
                value={categorySlot.categoryId}
                onChange={(e) =>
                  setCategorySlot((prev) => ({
                    ...prev,
                    categoryId: e.target.value,
                    // si cambia la categoría, limpiar imagen seleccionada
                    file: null,
                    preview: (() => {
                      if (prev.preview) URL.revokeObjectURL(prev.preview);
                      return null;
                    })(),
                    status: "idle",
                    error: null,
                  }))
                }
                style={{
                  padding: "10px",
                }}
                className="text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-white/20"
              >
                <option value="">Selecciona una categoría</option>
                {BANNERS_X_CATEGORY.map((cat, index) => (
                  <option key={index} value={cat.category}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Drop zone / preview de nueva imagen */}
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Nueva imagen</label>

              <div
                onClick={() => categoryInputRef.current?.click()}
                className={`relative cursor-pointer rounded-lg border-2 border-dashed transition-colors flex items-center justify-center h-[90px] ${
                  categorySlot.preview
                    ? "border-blue-300 dark:border-blue-700"
                    : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
                }`}
              >
                {categorySlot.preview ? (
                  <Image
                    src={categorySlot.preview}
                    alt="Preview nueva imagen"
                    fill
                    className="object-cover rounded-lg"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 pointer-events-none">
                    <svg
                      className="w-5 h-5 text-gray-300 dark:text-white/20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12M8 8l4-4 4 4" />
                    </svg>
                    <p className="text-xs text-gray-400">
                      Haz clic para seleccionar
                    </p>
                    <p className="text-[11px] text-gray-300 dark:text-white/20">
                      Solo PNG
                    </p>
                  </div>
                )}
              </div>

              <input
                ref={categoryInputRef}
                type="file"
                accept="image/png"
                className="hidden"
                onChange={(e) =>
                  handleCategoryFileChange(e.target.files?.[0] ?? null)
                }
              />

              {categorySlot.file && (
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-gray-400 truncate">
                    {categorySlot.file.name}
                  </p>
                  <button
                    type="button"
                    onClick={handleClearCategory}
                    className="text-[11px] text-red-400 hover:text-red-500 ml-2 shrink-0"
                  >
                    Quitar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Banner actual de la categoría seleccionada */}
          {categorySlot.categoryId && currentCategoryBannerUrl && (
            <div className="flex items-center justify-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5">
              <div className="relative w-[80px] h-[44px] rounded overflow-hidden shrink-0 bg-gray-100 dark:bg-white/10">
                <Image
                  src={currentCategoryBannerUrl}
                  alt={`Banner actual — ${categorySlot.categoryId}`}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  Banner actual
                </p>
                <p className="text-[11px] text-gray-400">
                  {/* {CATEGORIES.find((c) => c.id === categorySlot.categoryId)
                    ?.name ?? categorySlot.categoryId} */}
                </p>
              </div>
            </div>
          )}

          {/* Error de slot */}
          {categorySlot.error && (
            <p className="text-[11px] text-red-500">{categorySlot.error}</p>
          )}

          {/* Mensaje global — categoría */}
          {categoryMessage?.show && (
            <div
              style={{ padding: "10px" }}
              className={`rounded-xl px-4 py-3 text-sm border ${
                categoryMessage.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-700/40 dark:text-emerald-300"
                  : "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-700/40 dark:text-red-300"
              }`}
            >
              {categoryMessage.text}
            </div>
          )}

          {/* Footer — categoría */}
          <div
            className="flex items-center justify-center gap-4"
            style={{
              paddingBottom: "20px",
            }}
          >
            <button
              type="button"
              style={{ padding: "10px", marginTop: "15px" }}
              onClick={handleSubmitCategory}
              disabled={
                isSubmittingCategory ||
                !categorySlot.file ||
                !categorySlot.categoryId
              }
              className={`cursor-pointer flex items-center justify-center gap-2 px-5 py-2.5 w-[300px] rounded-xl text-sm font-medium transition-all duration-150 ${
                isSubmittingCategory ||
                !categorySlot.file ||
                !categorySlot.categoryId
                  ? "bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                  : "bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-700 dark:hover:bg-gray-100 active:scale-95"
              }`}
            >
              {isSubmittingCategory ? (
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
                  Subir banner de categoría
                </>
              )}
            </button>

            {!categorySlot.file && !categorySlot.categoryId && (
              <p className="text-xs text-gray-400">
                Selecciona una categoría e imagen para continuar
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
