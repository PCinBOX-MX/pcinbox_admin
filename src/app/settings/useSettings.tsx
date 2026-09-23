"use client";

const ENV = process.env.NEXT_PUBLIC_NODE_ENV === "local" ? "local" : "prod";

type BannerCategory = {
  category: string;
  pathImg: string;
  name: string;
};

const CATEGORY_BANNERS: Array<Omit<BannerCategory, "pathImg"> & { file: string }> = [
  { category: "ALMACENAMIENTO", name: "ALMACENAMIENTO", file: "almacenamientos.png" },
  { category: "AUDIO_Y_BOCINAS", name: "AUDIO Y BOCINAS", file: "audio.png" },
  {
    category: "REGULADORES,_NOBREAKS_Y_ENERGIA",
    name: "REGULADORES,NOBREAKS Y ENERGIA",
    file: "energia.png",
  },
  { category: "ENFRIAMIENTO", name: "ENFRIAMIENTO", file: "enfriamientos.png" },
  { category: "FUENTES_DE_PODER", name: "FUENTES DE PODER", file: "fuentes de poder.png" },
  { category: "GABINETES", name: "GABINETES", file: "gabinetes pc.png" },
  { category: "LAPTOPS", name: "LAPTOPS", file: "laptops.png" },
  {
    category: "MEMORIAS_RAM_Y_FLASH",
    name: "MEMORIAS RAM Y FLASH",
    file: "memoria ram.png",
  },
  {
    category: "MONITORES_Y_ACCESORIOS_PARA_MONITOR",
    name: "MONITORES Y ACCESORIOS PARA MONITOR",
    file: "monitores.png",
  },
  {
    category: "MOUSES_Y_ACCESORIOS_DE_MOUSE",
    name: "MOUSES Y ACCESORIOS DE MOUSE",
    file: "mouses.png",
  },
  { category: "PROCESADORES", name: "PROCESADORES", file: "procesadores.png" },
  { category: "REDES", name: "REDES", file: "redes.png" },
  {
    category: "TARJETAS_DE_VIDEO",
    name: "TARJETAS DE VIDEO",
    file: "tarjetas de video.png",
  },
  { category: "TARJETAS_MADRE", name: "TARJETAS MADRE", file: "tarjetas madre.png" },
  { category: "TECLADOS", name: "TECLADOS", file: "teclados.png" },
  { category: "VENTILADORES", name: "VENTILADORES", file: "ventiladores.png" },
];

export function categoryBannerUrl(category: string, file: string, version?: number) {
  const base = `https://ik.imagekit.io/pcinboxkit/${ENV}/banners_x_categoria/${category}/${file}`;
  return version ? `${base}?v=${version}` : base;
}

const useSettings = () => {
  const BANNERS_X_CATEGORY: BannerCategory[] = CATEGORY_BANNERS.map((item) => ({
    category: item.category,
    name: item.name,
    pathImg: categoryBannerUrl(item.category, item.file),
  }));

  return {
    BANNERS_X_CATEGORY,
    categoryBannerUrl,
  };
};

export default useSettings;
