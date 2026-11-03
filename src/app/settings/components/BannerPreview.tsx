"use client";

import { useState, type DragEvent, type ReactNode } from "react";
import { AlertTriangle, Check, ImageOff, ImageUp, Loader2 } from "lucide-react";
import { cx, type Draft } from "../useBannerDrafts";
import {
  checkBannerSize,
  sizeLabel,
  type BannerFit,
  type BannerSpec,
  type ImageSize,
} from "../bannerSpecs";
import styles from "../settings.module.css";

export type PreviewState = "current" | "draft" | "done" | "default";

const STATE_LABEL: Record<PreviewState, string> = {
  current: "Actual",
  draft: "Nueva",
  done: "Publicado",
  default: "Predeterminada",
};

export function StateBadge({ state }: { state: PreviewState }) {
  return (
    <span
      className={cx(
        styles.badge,
        state === "draft" && styles.badgeDraft,
        state === "done" && styles.badgeDone,
        state === "default" && styles.badgeDefault,
      )}
    >
      {state === "done" ? <Check aria-hidden /> : null}
      {STATE_LABEL[state]}
    </span>
  );
}

/** Nombre del archivo nuevo con sus medidas reales. */
export function DraftFileInfo({ draft }: { draft: Draft }) {
  const text = draft.size ? `${draft.file.name} · ${sizeLabel(draft.size)}` : draft.file.name;
  return (
    <span className={styles.fileName} title={text}>
      {text}
    </span>
  );
}

/** Aviso cuando la imagen nueva no tiene exactamente la forma o resolución del banner. */
export function SizeWarning({
  spec,
  size,
  className,
}: {
  spec: BannerSpec;
  size?: ImageSize;
  className?: string;
}) {
  const check = size ? checkBannerSize(spec, size) : null;
  if (!check) return null;
  return (
    <p className={cx(styles.sizeWarning, className)} role="note">
      <AlertTriangle aria-hidden />
      {check.text}
    </p>
  );
}

type BannerPreviewProps = {
  src: string | null;
  alt: string;
  aspect: string;
  fit?: BannerFit;
  dark?: boolean;
  badge?: ReactNode;
  disabled?: boolean;
  uploading?: boolean;
  onOpen?: () => void;
  onDropFile?: (file: File | undefined) => void;
  className?: string;
};

/** Imagen del banner con carga, imagen faltante y zona para soltar un archivo. */
export default function BannerPreview({
  src,
  alt,
  aspect,
  fit = "contain",
  dark,
  badge,
  disabled,
  uploading,
  onOpen,
  onDropFile,
  className,
}: BannerPreviewProps) {
  const [dragging, setDragging] = useState(false);
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const broken = Boolean(src) && src === brokenSrc;

  const dropProps = onDropFile
    ? {
        onDragOver: (event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        },
        onDragLeave: () => setDragging(false),
        onDrop: (event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) onDropFile(event.dataTransfer.files?.[0]);
        },
      }
    : {};

  return (
    <div
      className={cx(
        styles.preview,
        fit === "cover" && styles.previewCover,
        dark && styles.previewDark,
        dragging && styles.previewDragging,
        className,
      )}
      style={{ aspectRatio: aspect }}
      {...dropProps}
    >
      {src && !broken ? (
        <>
          {loadedSrc !== src ? <span className={styles.skeleton} aria-hidden /> : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className={cx(styles.previewImg, loadedSrc === src && styles.previewImgReady)}
            onLoad={() => setLoadedSrc(src)}
            onError={() => setBrokenSrc(src)}
          />
        </>
      ) : src ? (
        <span className={styles.previewEmpty}>
          <ImageOff aria-hidden />
          Sin imagen publicada
        </span>
      ) : (
        <span className={styles.skeleton} aria-hidden />
      )}

      {badge ? <span className={styles.previewBadge}>{badge}</span> : null}

      {onOpen ? (
        <button
          type="button"
          className={styles.dropHint}
          onClick={onOpen}
          disabled={disabled}
          aria-label={`Reemplazar ${alt}`}
        >
          <ImageUp aria-hidden />
          <span>{dragging ? "Suelta la imagen" : "Arrastra una imagen o haz clic"}</span>
        </button>
      ) : null}

      {uploading ? (
        <span className={styles.uploadingVeil} role="status">
          <Loader2 className={styles.spin} aria-hidden />
          Publicando…
        </span>
      ) : null}
    </div>
  );
}
