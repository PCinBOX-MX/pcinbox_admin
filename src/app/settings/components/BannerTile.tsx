"use client";

import type { CSSProperties } from "react";
import { ImageUp, Loader2, Upload, X } from "lucide-react";
import { cx, useFilePicker, type Draft } from "../useBannerDrafts";
import { specAspect, type BannerSpec, type ImageSize } from "../bannerSpecs";
import BannerPreview, { DraftFileInfo, SizeWarning, StateBadge } from "./BannerPreview";
import styles from "../settings.module.css";

type BannerTileProps = {
  title: string;
  caption?: string;
  src: string | null;
  spec: BannerSpec;
  draft?: Draft;
  done?: boolean;
  isDefault?: boolean;
  uploading?: boolean;
  disabled?: boolean;
  tone?: string;
  onPick: (file: File, size: ImageSize) => void;
  onDiscard: () => void;
  onPublish: () => void;
  onInvalid: (message: string) => void;
};

/** Tarjeta de un banner que se publica por separado (categorías y niveles). */
export default function BannerTile({
  title,
  caption,
  src,
  spec,
  draft,
  done,
  isDefault,
  uploading,
  disabled,
  tone,
  onPick,
  onDiscard,
  onPublish,
  onInvalid,
}: BannerTileProps) {
  const picker = useFilePicker(spec, onPick, onInvalid);
  const state = draft ? "draft" : done ? "done" : isDefault ? "default" : "current";

  return (
    <article
      className={cx(styles.tile, draft && styles.tileDraft, done && !draft && styles.tileDone)}
      aria-busy={uploading || undefined}
      style={tone ? ({ "--tile-tone": tone } as CSSProperties) : undefined}
    >
      <BannerPreview
        src={draft?.preview ?? src}
        alt={title}
        aspect={specAspect(spec)}
        fit={spec.fit}
        dark={spec.dark}
        badge={<StateBadge state={state} />}
        disabled={disabled}
        uploading={uploading}
        onOpen={picker.open}
        onDropFile={picker.take}
      />

      <div className={styles.tileBody}>
        <div className={styles.tileText}>
          <strong title={title}>{title}</strong>
          {draft ? (
            <DraftFileInfo draft={draft} />
          ) : caption ? (
            <span className={styles.caption}>{caption}</span>
          ) : null}
        </div>

        <div className={styles.tileActions}>
          {draft ? (
            <>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={onDiscard}
                disabled={disabled}
                aria-label={`Descartar imagen nueva de ${title}`}
                title="Descartar"
              >
                <X aria-hidden />
              </button>
              <button
                type="button"
                className={cx(styles.primaryBtn, styles.btnSm)}
                onClick={onPublish}
                disabled={disabled}
                aria-busy={uploading || undefined}
              >
                {uploading ? <Loader2 className={styles.spin} aria-hidden /> : <Upload aria-hidden />}
                {uploading ? "Publicando…" : "Publicar"}
              </button>
            </>
          ) : (
            <button
              type="button"
              className={cx(styles.ghostBtn, styles.btnSm)}
              onClick={picker.open}
              disabled={disabled}
            >
              <ImageUp aria-hidden />
              Reemplazar
            </button>
          )}
        </div>
      </div>

      {draft ? <SizeWarning spec={spec} size={draft.size} className={styles.tileWarning} /> : null}

      {picker.input}
    </article>
  );
}
