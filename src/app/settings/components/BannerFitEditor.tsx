"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { AlertTriangle, Move, RotateCcw } from "lucide-react";
import ModalComponent from "../../shared/components/especific/modal/ModalComponent";
import { MIN_WIDTH_SHARE, sizeLabel, type BannerSpec, type ImageSize } from "../bannerSpecs";
import styles from "../settings.module.css";

type BannerFitEditorProps = {
  spec: BannerSpec;
  file: File;
  size: ImageSize;
  onCancel: () => void;
  onConfirm: (file: File, size: ImageSize) => void;
  onError: (message: string) => void;
};

type Placement = { zoom: number; x: number; y: number };

const MAX_ZOOM = 3;
const smallBtn = `${styles.ghostBtn} ${styles.btnSm}`;
/** Si al llenar el marco se pierde más que esto de la imagen, se empieza mostrándola completa. */
const MAX_START_CROP = 0.35;

/**
 * Acomoda una imagen con otra forma dentro del marco exacto del banner y la exporta como PNG
 * con las medidas del banner. Todo se calcula en píxeles del resultado (spec.width × spec.height).
 */
export default function BannerFitEditor({
  spec,
  file,
  size,
  onCancel,
  onConfirm,
  onError,
}: BannerFitEditorProps) {
  const W = spec.width;
  const H = spec.height;
  const coverScale = Math.max(W / size.width, H / size.height);
  const containScale = Math.min(W / size.width, H / size.height);
  const minZoom = containScale / coverScale;

  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; px: number; py: number; x: number; y: number } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [background, setBackground] = useState(spec.dark ? "#111827" : "#ffffff");

  const place = (zoom: number, cx = 0.5, cy = 0.5): Placement => {
    const s = coverScale * zoom;
    const dw = size.width * s;
    const dh = size.height * s;
    return clamp({ zoom, x: W / 2 - dw * cx, y: H / 2 - dh * cy });
  };

  const clamp = (p: Placement): Placement => {
    const s = coverScale * p.zoom;
    const dw = size.width * s;
    const dh = size.height * s;
    const x = dw >= W ? Math.min(0, Math.max(W - dw, p.x)) : (W - dw) / 2;
    const y = dh >= H ? Math.min(0, Math.max(H - dh, p.y)) : (H - dh) / 2;
    return { zoom: p.zoom, x, y };
  };

  const startZoom = 1 - minZoom ** 2 > MAX_START_CROP ? minZoom : 1;
  const [placement, setPlacement] = useState<Placement>(() => place(startZoom));

  const scale = coverScale * placement.zoom;
  const dw = size.width * scale;
  const dh = size.height * scale;
  const hasGaps = dw < W - 0.5 || dh < H - 0.5;
  const lowRes = scale > 1 / MIN_WIDTH_SHARE;
  const isGif = file.type === "image/gif";

  const setZoom = (zoom: number) => {
    setPlacement((prev) => {
      const prevScale = coverScale * prev.zoom;
      const cx = (W / 2 - prev.x) / (size.width * prevScale);
      const cy = (H / 2 - prev.y) / (size.height * prevScale);
      return place(zoom, cx, cy);
    });
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      id: event.pointerId,
      px: event.clientX,
      py: event.clientY,
      x: placement.x,
      y: placement.y,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    const frame = frameRef.current;
    if (!current || current.id !== event.pointerId || !frame) return;
    const factor = W / frame.clientWidth;
    setPlacement((prev) =>
      clamp({
        zoom: prev.zoom,
        x: current.x + (event.clientX - current.px) * factor,
        y: current.y + (event.clientY - current.py) * factor,
      }),
    );
  };

  const endDrag = () => {
    drag.current = null;
  };

  const exportImage = async () => {
    if (!src) return;
    setExporting(true);
    try {
      const img = new Image();
      img.src = src;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, W, H);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, placement.x, placement.y, dw, dh);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("blob");
      const name = file.name.replace(/\.[^.]+$/, "") || "banner";
      onConfirm(new File([blob], `${name}.png`, { type: "image/png" }), { width: W, height: H });
    } catch {
      onError("No se pudo acomodar la imagen. Intenta con otro archivo.");
    } finally {
      setExporting(false);
    }
  };

  const pct = (value: number, total: number) => `${(value / total) * 100}%`;

  return (
    <ModalComponent
      isOpen
      onClose={onCancel}
      type="info"
      headerLayout="inline"
      title="Acomoda la imagen"
      maxWidth="min(94vw, 760px)"
      showActions
      loading={exporting}
      confirmLabel="Usar esta imagen"
      cancelLabel="Cancelar"
      onConfirm={() => void exportImage()}
      content={
        <div className={styles.fitBody}>
          <p className={styles.fitIntro}>
            Tu imagen mide {sizeLabel(size)} y este banner mide {sizeLabel(spec)}. Arrastra para
            elegir qué parte se ve y usa el zoom para acercar o mostrarla completa.
          </p>

          <div
            ref={frameRef}
            className={styles.fitFrame}
            style={{
              aspectRatio: `${W} / ${H}`,
              maxWidth: `calc(42vh * ${W / H})`,
              background,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt=""
                draggable={false}
                style={{
                  left: pct(placement.x, W),
                  top: pct(placement.y, H),
                  width: pct(dw, W),
                  height: pct(dh, H),
                }}
              />
            ) : null}
            <span className={styles.fitHint} aria-hidden>
              <Move /> Arrastra para mover
            </span>
          </div>

          <div className={styles.fitControls}>
            <label className={styles.fitZoom}>
              <span>Zoom</span>
              <input
                type="range"
                min={minZoom}
                max={MAX_ZOOM}
                step={0.01}
                value={placement.zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                aria-label="Zoom"
              />
            </label>
            <div className={styles.fitQuick}>
              <button type="button" className={smallBtn} onClick={() => setPlacement(place(minZoom))}>
                Mostrar completa
              </button>
              <button type="button" className={smallBtn} onClick={() => setPlacement(place(1))}>
                Llenar el marco
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => setPlacement(place(startZoom))}
                aria-label="Volver al inicio"
                title="Volver al inicio"
              >
                <RotateCcw aria-hidden />
              </button>
            </div>
            {hasGaps ? (
              <label className={styles.fitColor}>
                <span>Color de fondo</span>
                <input
                  type="color"
                  value={background}
                  onChange={(event) => setBackground(event.target.value)}
                />
              </label>
            ) : null}
          </div>

          {lowRes || isGif ? (
            <div className={styles.fitNotes}>
              {lowRes ? (
                <p className={styles.sizeWarning}>
                  <AlertTriangle aria-hidden />
                  Con este zoom la imagen se agranda más de lo que mide; puede verse borrosa.
                </p>
              ) : null}
              {isGif ? (
                <p className={styles.sizeWarning}>
                  <AlertTriangle aria-hidden />
                  Al acomodar un GIF se guarda como imagen fija y pierde la animación.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      }
    >
      {null}
    </ModalComponent>
  );
}
