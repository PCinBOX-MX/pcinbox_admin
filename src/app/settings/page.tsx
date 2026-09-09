"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import ProveedoresUtils from "../services/utils/proveedores.utils";
import useSettings from "./useSettings";
import AdminPageShell from "../shared/components/layout/AdminPageShell";
import styles from "./settings.module.css";

// ─── Constantes ────────────────────────────────────────────────────────────────

const TOTAL_SLOTS = 5;

const ENV = process.env.NEXT_PUBLIC_NODE_ENV === "local" ? "local" : "prod";

function bannerUrl(filename: string, version?: number) {
  const base = `https://ik.imagekit.io/pcinboxkit/${ENV}/${filename}`;
  return version != null ? `${base}?v=${version}` : base;
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
    <AdminPageShell
      title="Ajustes Generales"
      subtitle="Configuración global del sistema, banners promocionales y opciones de la tienda"
    >
      <div className={styles.pageStack}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon} aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 9h18" />
              </svg>
            </div>
            <div>
              <h2 className={styles.sectionTitle}>Banners del carrusel principal</h2>
              <p className={styles.sectionSubtitle}>
                Reemplaza hasta 5 imágenes PNG del carrusel de la tienda
              </p>
            </div>
          </div>

          <div className={styles.sectionBody}>
            <div className={styles.bannerGrid}>
              {slots.map((slot, index) => {
                const slotNumber = index + 1;
                const isSelected = slot.file !== null;
                const isUploaded = slot.status === "uploaded";
                const hasError = slot.status === "error";

                const slotClass = [
                  styles.slot,
                  isUploaded ? styles.slotUploaded : "",
                  hasError ? styles.slotError : "",
                  isSelected && !isUploaded && !hasError ? styles.slotSelected : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <div key={index} className={slotClass}>
                    <div className={styles.thumb}>
                      {slot.preview ? (
                        <Image
                          src={slot.preview}
                          alt={`Banner ${slotNumber}`}
                          fill
                          priority
                          className={styles.thumbImg}
                        />
                      ) : (
                        banners[index] && (
                          <Image
                            src={banners[index]}
                            alt={`Banner ${slotNumber}`}
                            fill
                            priority
                            className={styles.thumbImg}
                          />
                        )
                      )}
                    </div>

                    <div className={styles.slotBody}>
                      <div className={styles.slotHead}>
                        <span className={styles.slotLabel}>Banner {slotNumber}</span>
                        {isUploaded && (
                          <span className={styles.badgeSuccess}>✓ Subido</span>
                        )}
                        {hasError && <span className={styles.badgeError}>Error</span>}
                        {isSelected && !isUploaded && !hasError && (
                          <span className={styles.badgeSelected}>Nueva imagen</span>
                        )}
                        {!isSelected && !isUploaded && !hasError && (
                          <span className={styles.badgeIdle}>Actual</span>
                        )}
                      </div>

                      {slot.file && (
                        <p className={styles.fileName}>{slot.file.name}</p>
                      )}
                      {slot.error && (
                        <p className={styles.errorText}>{slot.error}</p>
                      )}

                      <div className={styles.slotActions}>
                        <button
                          type="button"
                          onClick={() => fileInputRefs.current[index]?.click()}
                          disabled={isSubmittingPrincipal}
                          className={styles.replaceBtn}
                        >
                          <svg
                            className={styles.iconSm}
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
                            className={styles.clearBtn}
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
                        className={styles.hiddenInput}
                        onChange={(e) =>
                          handleFileChange(index, e.target.files?.[0] ?? null)
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {principalMessage?.show && (
              <div
                className={
                  principalMessage.type === "success"
                    ? styles.messageSuccess
                    : styles.messageError
                }
              >
                {principalMessage.text}
              </div>
            )}

            <div className={styles.footer}>
              <button
                type="button"
                onClick={handleSubmitPrincipal}
                disabled={isSubmittingPrincipal || selectedCount === 0}
                className={`${styles.submitBtn} ${styles.btnRow}`}
              >
                {isSubmittingPrincipal ? (
                  <>
                    <svg className={styles.spinner} viewBox="0 0 24 24" fill="none">
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
                      className={styles.iconSm}
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
              {selectedCount > 0 && !isSubmittingPrincipal ? (
                <p className={styles.footerHint}>
                  {selectedCount} de {TOTAL_SLOTS} banners seleccionados
                </p>
              ) : (
                <p className={styles.footerHint}>
                  Selecciona al menos un banner para habilitar la subida
                </p>
              )}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon} aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M4 7h16M4 12h10M4 17h14" />
              </svg>
            </div>
            <div>
              <h2 className={styles.sectionTitle}>Banner de categoría</h2>
              <p className={styles.sectionSubtitle}>
                Actualiza el banner de una categoría específica
              </p>
            </div>
          </div>

          <div className={styles.sectionBody}>
            <div className={styles.categoryRow}>
              <div className={styles.categorySelect}>
                <label className={styles.fieldLabel}>Categoría</label>
                <select
                  value={categorySlot.categoryId}
                  onChange={(e) =>
                    setCategorySlot((prev) => ({
                      ...prev,
                      categoryId: e.target.value,
                      file: null,
                      preview: (() => {
                        if (prev.preview) URL.revokeObjectURL(prev.preview);
                        return null;
                      })(),
                      status: "idle",
                      error: null,
                    }))
                  }
                  className={styles.select}
                >
                  <option value="" disabled>
                    Selecciona una categoría
                  </option>
                  {BANNERS_X_CATEGORY.map((cat, index) => (
                    <option key={index} value={cat.category}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.dropZoneWrap}>
                <label className={styles.fieldLabel}>Nueva imagen</label>
                <div
                  onClick={() => categoryInputRef.current?.click()}
                  className={`${styles.dropZone} ${
                    categorySlot.preview ? styles.dropZoneActive : ""
                  }`}
                >
                  {categorySlot.preview ? (
                    <Image
                      src={categorySlot.preview}
                      alt="Preview nueva imagen"
                      fill
                      className={styles.thumbImg}
                    />
                  ) : (
                    <div className={styles.dropPlaceholder}>
                      <svg
                        className={styles.dropIcon}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12M8 8l4-4 4 4" />
                      </svg>
                      <p className={styles.dropText}>Haz clic para seleccionar</p>
                      <p className={styles.dropHint}>Solo PNG</p>
                    </div>
                  )}
                </div>

                <input
                  ref={categoryInputRef}
                  type="file"
                  accept="image/png"
                  className={styles.hiddenInput}
                  onChange={(e) =>
                    handleCategoryFileChange(e.target.files?.[0] ?? null)
                  }
                />

                {categorySlot.file && (
                  <div className={styles.fileRow}>
                    <p className={styles.fileRowName}>{categorySlot.file.name}</p>
                    <button
                      type="button"
                      onClick={handleClearCategory}
                      className={styles.removeFileBtn}
                    >
                      Quitar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {categorySlot.categoryId && currentCategoryBannerUrl && (
              <div className={styles.currentBanner}>
                <div className={styles.currentThumb}>
                  <Image
                    src={currentCategoryBannerUrl}
                    alt={`Banner actual — ${categorySlot.categoryId}`}
                    fill
                    className={styles.thumbImg}
                  />
                </div>
                <div>
                  <p className={styles.currentLabel}>Banner actual</p>
                  <p className={styles.currentHint}>
                    Se reemplazará al subir la nueva imagen
                  </p>
                </div>
              </div>
            )}

            {categorySlot.error && (
              <p className={styles.errorText}>{categorySlot.error}</p>
            )}

            {categoryMessage?.show && (
              <div
                className={
                  categoryMessage.type === "success"
                    ? styles.messageSuccess
                    : styles.messageError
                }
              >
                {categoryMessage.text}
              </div>
            )}

            <div className={styles.footer}>
              <button
                type="button"
                onClick={handleSubmitCategory}
                disabled={
                  isSubmittingCategory ||
                  !categorySlot.file ||
                  !categorySlot.categoryId
                }
                className={`${styles.submitBtn} ${styles.btnRow}`}
              >
                {isSubmittingCategory ? (
                  <>
                    <svg className={styles.spinner} viewBox="0 0 24 24" fill="none">
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
                      className={styles.iconSm}
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

              {!categorySlot.file || !categorySlot.categoryId ? (
                <p className={styles.footerHint}>
                  Selecciona una categoría e imagen para continuar
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </AdminPageShell>
  );
}
