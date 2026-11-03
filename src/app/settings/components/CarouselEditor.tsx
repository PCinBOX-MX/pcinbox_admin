"use client";

import { useState } from "react";
import { ArrowRight, ImageUp, Loader2, RotateCcw, Upload, X } from "lucide-react";
import ModalComponent from "../../shared/components/especific/modal/ModalComponent";
import { cx, useFilePicker, usePersistentState, type Draft } from "../useBannerDrafts";
import { BANNER_SPECS, specAspect, type ImageSize } from "../bannerSpecs";
import BannerPreview, { DraftFileInfo, SizeWarning, StateBadge } from "./BannerPreview";
import styles from "../settings.module.css";

const SPEC = BANNER_SPECS.principal;
const frame = { aspect: specAspect(SPEC), fit: SPEC.fit, dark: SPEC.dark };

type CarouselEditorProps = {
  slots: readonly number[];
  currentSrc: (slot: number) => string | null;
  drafts: Record<string, Draft>;
  slotKey: (slot: number) => string;
  doneKeys: string[];
  uploading: boolean;
  disabled: boolean;
  onPick: (key: string, file: File, size: ImageSize) => void;
  onDiscard: (keys: string[]) => void;
  onPublish: () => void;
  onInvalid: (message: string) => void;
};

export default function CarouselEditor({
  slots,
  currentSrc,
  drafts,
  slotKey,
  doneKeys,
  uploading,
  disabled,
  onPick,
  onDiscard,
  onPublish,
  onInvalid,
}: CarouselEditorProps) {
  const [selected, setSelected] = usePersistentState(
    "carouselSlot",
    slots[0] ?? 1,
    (value): value is number => typeof value === "number" && slots.includes(value),
  );
  const key = slotKey(selected);
  const draft = drafts[key];
  const current = currentSrc(selected);
  const picker = useFilePicker(SPEC, (file, size) => onPick(key, file, size), onInvalid);
  const draftKeys = slots.map(slotKey).filter((item) => drafts[item]);
  const draftSlots = slots.filter((slot) => drafts[slotKey(slot)]);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  return (
    <div className={styles.carousel}>
      <div className={styles.stage}>
        {draft ? (
          <div className={styles.compare}>
            <figure className={styles.comparePane}>
              <figcaption>Actual</figcaption>
              <BannerPreview src={current} alt={`Banner ${selected} actual`} {...frame} />
            </figure>
            <span className={styles.compareArrow} aria-hidden>
              <ArrowRight />
            </span>
            <figure className={styles.comparePane}>
              <figcaption className={styles.compareNew}>Nueva</figcaption>
              <BannerPreview
                src={draft.preview}
                alt={`Banner ${selected} nuevo`}
                {...frame}
                disabled={disabled}
                uploading={uploading}
                onOpen={picker.open}
                onDropFile={picker.take}
              />
            </figure>
          </div>
        ) : (
          <BannerPreview
            src={current}
            alt={`Banner ${selected}`}
            {...frame}
            badge={<StateBadge state={doneKeys.includes(key) ? "done" : "current"} />}
            disabled={disabled}
            onOpen={picker.open}
            onDropFile={picker.take}
            className={styles.stagePreview}
          />
        )}

        <div className={styles.stageBar}>
          <div className={styles.tileText}>
            <strong>Banner {selected}</strong>
            {draft ? (
              <DraftFileInfo draft={draft} />
            ) : (
              <span className={styles.caption}>Posición {selected} de {slots.length} en el carrusel</span>
            )}
          </div>
          <div className={styles.tileActions}>
            {draft ? (
              <button
                type="button"
                className={cx(styles.ghostBtn, styles.btnSm)}
                onClick={() => onDiscard([key])}
                disabled={disabled}
              >
                <X aria-hidden />
                Descartar
              </button>
            ) : null}
            <button
              type="button"
              className={cx(styles.ghostBtn, styles.btnSm)}
              onClick={picker.open}
              disabled={disabled}
            >
              <ImageUp aria-hidden />
              {draft ? "Cambiar imagen" : "Reemplazar"}
            </button>
          </div>
          {draft ? (
            <SizeWarning spec={SPEC} size={draft.size} className={styles.stageWarning} />
          ) : null}
        </div>
        {picker.input}
      </div>

      <ol className={styles.film} aria-label="Banners del carrusel">
        {slots.map((slot) => {
          const itemKey = slotKey(slot);
          const itemDraft = drafts[itemKey];
          const done = doneKeys.includes(itemKey);
          return (
            <li key={slot}>
              <button
                type="button"
                className={cx(
                  styles.filmItem,
                  slot === selected && styles.filmItemActive,
                  itemDraft && styles.filmItemDraft,
                  done && !itemDraft && styles.filmItemDone,
                )}
                onClick={() => setSelected(slot)}
                disabled={disabled}
                aria-current={slot === selected ? "true" : undefined}
                aria-label={`Banner ${slot}${itemDraft ? ", con imagen nueva" : ""}`}
              >
                <BannerPreview
                  src={itemDraft?.preview ?? currentSrc(slot)}
                  alt={`Banner ${slot}`}
                  {...frame}
                />
                <span className={styles.filmNumber}>{slot}</span>
                {itemDraft ? <span className={styles.filmDot} aria-hidden /> : null}
              </button>
            </li>
          );
        })}
      </ol>

      <div className={cx(styles.publishBar, draftKeys.length > 0 && styles.publishBarOn)}>
        <p role="status">
          {uploading
            ? "Subiendo a la tienda. No recargues ni cierres esta pestaña."
            : draftKeys.length
            ? `${draftKeys.length} de ${slots.length} banners listos para publicar`
            : "Elige un banner, cambia su imagen y publícalo. Puedes preparar varios a la vez."}
        </p>
        <div>
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={() => setConfirmDiscard(true)}
            disabled={disabled || !draftKeys.length}
          >
            <RotateCcw aria-hidden />
            Descartar todo
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={onPublish}
            disabled={disabled || !draftKeys.length}
            aria-busy={uploading || undefined}
          >
            {uploading ? <Loader2 className={styles.spin} aria-hidden /> : <Upload aria-hidden />}
            {uploading
              ? "Publicando…"
              : draftKeys.length > 1
                ? `Publicar ${draftKeys.length} banners`
                : "Publicar"}
          </button>
        </div>
      </div>

      <ModalComponent
        isOpen={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        type="warning"
        title="¿Descartar los cambios?"
        showActions
        confirmLabel={draftKeys.length > 1 ? `Descartar ${draftKeys.length} banners` : "Descartar"}
        cancelLabel="No, conservar"
        onConfirm={() => {
          onDiscard(draftKeys);
          setConfirmDiscard(false);
        }}
        content={
          <div className={styles.confirmBody}>
            <p>
              {draftKeys.length === 1
                ? "Se quitará la imagen nueva que preparaste. El banner publicado en la tienda no cambia."
                : `Se quitarán las ${draftKeys.length} imágenes nuevas que preparaste. Los banners publicados en la tienda no cambian.`}
            </p>
            <ul className={styles.confirmList}>
              {draftSlots.map((slot) => (
                <li key={slot}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={drafts[slotKey(slot)]?.preview} alt="" />
                  <span>Banner {slot}</span>
                </li>
              ))}
            </ul>
          </div>
        }
      >
        {null}
      </ModalComponent>
    </div>
  );
}
