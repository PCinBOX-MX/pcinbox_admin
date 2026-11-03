"use client";

import { useCallback, useEffect, useState } from "react";
import ProveedoresUtils from "../services/utils/proveedores.utils";

/** Misma regla que pcinbox-client y server-proveedores: local y qa usan la carpeta `local` de ImageKit. */
const ENV_LABEL = process.env.NEXT_PUBLIC_NODE_ENV?.trim();
const ENV = ENV_LABEL === "local" || ENV_LABEL === "qa" ? "local" : "prod";
const IMAGEKIT_BASE = `https://ik.imagekit.io/pcinboxkit/${ENV}`;
/**
 * QA arranca con NEXT_PUBLIC_NODE_ENV=local igual que en desarrollo, así que la tienda se elige
 * por el dominio del admin. Solo se llama en el navegador (las URLs se arman después de cargar versiones).
 */
export function storeUrl() {
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return "http://localhost:3000";
  if (host.includes("qa")) return "https://client-qa.pcinbox.com.mx";
  return "https://www.pcinbox.com.mx";
}

export type BannerVersions = Record<string, string>;
export type PcLevel = "entrada" | "intermedia" | "profesional";

export type CategoryBanner = {
  category: string;
  name: string;
  file: string;
};

export const PRINCIPAL_SLOTS = [1, 2, 3, 4, 5] as const;

export const CATEGORY_BANNERS: CategoryBanner[] = [
  { category: "ALMACENAMIENTO", name: "Almacenamiento", file: "almacenamientos.png" },
  { category: "AUDIO_Y_BOCINAS", name: "Audio y bocinas", file: "audio.png" },
  {
    category: "REGULADORES,_NOBREAKS_Y_ENERGIA",
    name: "Reguladores, nobreaks y energía",
    file: "energia.png",
  },
  { category: "ENFRIAMIENTO", name: "Enfriamiento", file: "enfriamientos.png" },
  { category: "FUENTES_DE_PODER", name: "Fuentes de poder", file: "fuentes de poder.png" },
  { category: "GABINETES", name: "Gabinetes", file: "gabinetes pc.png" },
  { category: "LAPTOPS", name: "Laptops", file: "laptops.png" },
  { category: "MEMORIAS_RAM_Y_FLASH", name: "Memorias RAM y flash", file: "memoria ram.png" },
  {
    category: "MONITORES_Y_ACCESORIOS_PARA_MONITOR",
    name: "Monitores y accesorios",
    file: "monitores.png",
  },
  {
    category: "MOUSES_Y_ACCESORIOS_DE_MOUSE",
    name: "Mouses y accesorios",
    file: "mouses.png",
  },
  { category: "PROCESADORES", name: "Procesadores", file: "procesadores.png" },
  { category: "REDES", name: "Redes", file: "redes.png" },
  { category: "TARJETAS_DE_VIDEO", name: "Tarjetas de video", file: "tarjetas de video.png" },
  { category: "TARJETAS_MADRE", name: "Tarjetas madre", file: "tarjetas madre.png" },
  { category: "TECLADOS", name: "Teclados", file: "teclados.png" },
  { category: "VENTILADORES", name: "Ventiladores", file: "ventiladores.png" },
];

export const PC_LEVELS: {
  id: PcLevel;
  name: string;
  range: string;
  tone: string;
  fallback: string;
}[] = [
  {
    id: "entrada",
    name: "PC Gamer de entrada",
    range: "Hasta $15,999",
    tone: "#0ea5e9",
    fallback: "/PC_Gamer_de_Entrada.png",
  },
  {
    id: "intermedia",
    name: "PC Gamer intermedia",
    range: "$16,000 a $39,999",
    tone: "#8b5cf6",
    fallback: "/PC_Gamer_Intermedia.png",
  },
  {
    id: "profesional",
    name: "PC Gamer profesional",
    range: "Desde $40,000",
    tone: "#f59e0b",
    fallback: "/PC_Gamer_Profesional.png",
  },
];

export const bannerKey = {
  principal: (slot: number) => `principal:${slot}`,
  categoria: (category: string) => `categoria:${category}`,
  nivel: (level: PcLevel) => `nivel:${level}`,
  armaTuPc: "promo:armaTuPc",
  armaTuPcExt: "promo:armaTuPc:ext",
};

const ARMA_TU_PC_FALLBACK = "/arma-tu-pc-gamer.gif";

function withVersion(url: string, version: string | undefined) {
  return version ? `${url}?v=${encodeURIComponent(version)}` : url;
}

export function versionFromUrl(url: string): string {
  try {
    return new URL(url).searchParams.get("v") ?? String(Date.now());
  } catch {
    return String(Date.now());
  }
}

export function principalBannerUrl(slot: number, versions: BannerVersions) {
  return withVersion(
    `${IMAGEKIT_BASE}/carrusel-principal/banner_prin_0${slot}.png`,
    versions[bannerKey.principal(slot)],
  );
}

export function categoryBannerUrl(banner: CategoryBanner, versions: BannerVersions) {
  return withVersion(
    `${IMAGEKIT_BASE}/banners_x_categoria/${banner.category}/${encodeURIComponent(banner.file)}`,
    versions[bannerKey.categoria(banner.category)],
  );
}

/** Si el nivel nunca se subió a ImageKit, la tienda usa su imagen incluida. */
export function pcLevelBannerUrl(level: (typeof PC_LEVELS)[number], versions: BannerVersions) {
  const version = versions[bannerKey.nivel(level.id)];
  if (!version) return `${storeUrl()}${level.fallback}`;
  return withVersion(`${IMAGEKIT_BASE}/niveles-pc-gamer/${level.id}.png`, version);
}

/** Banner "Arma tu PC Gamer" de /principal; si nunca se subió, la tienda usa su GIF incluido. */
export function armaTuPcBannerUrl(versions: BannerVersions) {
  const version = versions[bannerKey.armaTuPc];
  const ext = versions[bannerKey.armaTuPcExt];
  if (!version || (ext !== "gif" && ext !== "png")) return `${storeUrl()}${ARMA_TU_PC_FALLBACK}`;
  return withVersion(`${IMAGEKIT_BASE}/arma-tu-pc/arma-tu-pc-gamer.${ext}`, version);
}

const useSettings = () => {
  const { requestGetProveedores } = ProveedoresUtils();
  const [versions, setVersions] = useState<BannerVersions | null>(null);

  const loadVersions = useCallback(async () => {
    try {
      const res = await requestGetProveedores("/banners/versions", { silent: true });
      const data = res.data?.data;
      setVersions(data && typeof data === "object" ? data : {});
    } catch {
      setVersions({});
    }
  }, [requestGetProveedores]);

  useEffect(() => {
    void loadVersions();
  }, [loadVersions]);

  const setVersion = useCallback((key: string, version: string) => {
    setVersions((prev) => ({ ...(prev ?? {}), [key]: version }));
  }, []);

  return { versions, setVersion };
};

export default useSettings;
