"use client";

import { useEffect, useRef, useState } from "react";
import { deleteDrafts, loadDrafts, saveDraft } from "./draftStore";
import {
  formatsLabel,
  needsFit,
  readImageSize,
  specFormats,
  type BannerSpec,
  type ImageSize,
} from "./bannerSpecs";
import BannerFitEditor from "./components/BannerFitEditor";

export type Draft = { file: File; preview: string; size?: ImageSize };

const MAX_BYTES = 10 * 1024 * 1024;

export function validateFile(file: File, spec: BannerSpec): string | null {
  if (!specFormats(spec).includes(file.type)) return `Solo se aceptan imágenes ${formatsLabel(spec)}.`;
  if (file.size > MAX_BYTES) return "La imagen pesa más de 10 MB.";
  return null;
}

export function cx(...names: (string | false | null | undefined)[]) {
  return names.filter(Boolean).join(" ");
}

/** Muestra la alerta nativa del navegador al recargar o cerrar mientras `active` sea verdadero. */
export function useLeaveWarning(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);
}

/**
 * Imágenes elegidas que todavía no se publican, por clave de banner.
 * Se guardan en IndexedDB para que una recarga no las pierda; `unsaved` son las que no se pudieron guardar.
 */
export function useBannerDrafts() {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [unsaved, setUnsaved] = useState<string[]>([]);
  const [restored, setRestored] = useState(0);
  const draftsRef = useRef(drafts);
  const touched = useRef(new Set<string>());

  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  useEffect(() => {
    let cancelled = false;
    loadDrafts()
      .then(async (files) => {
        const entries = await Promise.all(
          Object.entries(files).map(async ([key, file]) => {
            const size = await readImageSize(file).catch(() => undefined);
            return [key, file, size] as const;
          }),
        );
        if (cancelled) return;
        const fresh = entries.filter(([key]) => !touched.current.has(key));
        if (!fresh.length) return;
        setDrafts((prev) => {
          const next = { ...prev };
          fresh.forEach(([key, file, size]) => {
            next[key] = { file, size, preview: URL.createObjectURL(file) };
          });
          return next;
        });
        setRestored(fresh.length);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      Object.values(draftsRef.current).forEach((draft) => URL.revokeObjectURL(draft.preview));
    };
  }, []);

  const markSaved = (keys: string[], ok: boolean) =>
    setUnsaved((prev) => {
      const rest = prev.filter((key) => !keys.includes(key));
      return ok ? rest : [...rest, ...keys];
    });

  const pick = (key: string, file: File, size?: ImageSize) => {
    touched.current.add(key);
    const preview = URL.createObjectURL(file);
    setDrafts((prev) => {
      const old = prev[key];
      if (old) URL.revokeObjectURL(old.preview);
      return { ...prev, [key]: { file, preview, size } };
    });
    saveDraft(key, file).then(
      () => markSaved([key], true),
      () => markSaved([key], false),
    );
  };

  const discard = (keys: string[]) => {
    keys.forEach((key) => touched.current.add(key));
    setDrafts((prev) => {
      const next = { ...prev };
      keys.forEach((key) => {
        const old = next[key];
        if (old) URL.revokeObjectURL(old.preview);
        delete next[key];
      });
      return next;
    });
    markSaved(keys, true);
    void deleteDrafts(keys).catch(() => undefined);
  };

  return {
    drafts,
    hasUnsaved: unsaved.some((key) => drafts[key]),
    restored,
    clearRestored: () => setRestored(0),
    pick,
    discard,
  };
}

/** Estado de la interfaz que se conserva al recargar la pestaña (sessionStorage). */
export function usePersistentState<T>(
  key: string,
  initial: T,
  isValid: (value: unknown) => value is T,
) {
  const storageKey = `admin-settings:${key}`;
  const [value, setValue] = useState<T>(initial);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw);
        if (isValid(parsed)) setValue(parsed);
      }
    } catch {
      /* sessionStorage bloqueado o valor corrupto: se queda el inicial */
    }
    loaded.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* sin espacio o bloqueado */
    }
  }, [storageKey, value]);

  return [value, setValue] as const;
}

/** Claves que se marcan como recién publicadas durante unos segundos. */
export function useRecentKeys(ms: number) {
  const [keys, setKeys] = useState<string[]>([]);
  useEffect(() => {
    if (!keys.length) return;
    const timer = window.setTimeout(() => setKeys([]), ms);
    return () => window.clearTimeout(timer);
  }, [keys, ms]);
  return [keys, setKeys] as const;
}

/**
 * Input de archivo oculto que valida formato y peso, para abrirlo desde cualquier botón.
 * Si la forma de la imagen no coincide con el banner, abre el editor para acomodarla.
 */
export function useFilePicker(
  spec: BannerSpec,
  onFile: (file: File, size: ImageSize) => void,
  onInvalid: (message: string) => void,
) {
  const ref = useRef<HTMLInputElement>(null);
  const [fitting, setFitting] = useState<{ file: File; size: ImageSize } | null>(null);

  const take = async (file: File | null | undefined) => {
    if (!file) return;
    const error = validateFile(file, spec);
    if (error) return onInvalid(error);
    let size: ImageSize;
    try {
      size = await readImageSize(file);
    } catch {
      return onInvalid("No se pudo leer la imagen. Revisa que el archivo no esté dañado.");
    }
    if (needsFit(spec, size)) setFitting({ file, size });
    else onFile(file, size);
  };

  const input = (
    <>
      <input
        ref={ref}
        type="file"
        accept={specFormats(spec).join(",")}
        hidden
        onChange={(event) => {
          void take(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {fitting ? (
        <BannerFitEditor
          spec={spec}
          file={fitting.file}
          size={fitting.size}
          onCancel={() => setFitting(null)}
          onConfirm={(file, size) => {
            setFitting(null);
            onFile(file, size);
          }}
          onError={(message) => {
            setFitting(null);
            onInvalid(message);
          }}
        />
      ) : null}
    </>
  );

  return { open: () => ref.current?.click(), take, input };
}
