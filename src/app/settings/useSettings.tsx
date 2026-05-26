"use client";

const useSettings = () => {
  const ENV = process.env.NEXT_PUBLIC_NODE_ENV === "local" ? "local" : "prod";

  const BANNERS_X_CATEGORY: { category: string; pathImg: string }[] = [
    {
      category: "ALMACENAMIENTO",
      pathImg: `https://ik.imagekit.io/pcinboxkit/${ENV}/banners_x_categoria/${"ALMACENAMIENTO"}/almacenamientos.png?v=${Date.now()}`,
    },
    {
      category: "AUDIO_Y_BOCINAS",
      pathImg: `https://ik.imagekit.io/pcinboxkit/${ENV}/banners_x_categoria/${"AUDIO_Y_BOCINAS"}/audio.png?v=${Date.now()}`,
    },
    {
      category: "REGULADORES,_NOBREAKS_Y_ENERGIA",
      pathImg: `https://ik.imagekit.io/pcinboxkit/${ENV}/banners_x_categoria/${"REGULADORES,_NOBREAKS_Y_ENERGIA"}/energia.png?v=${Date.now()}`,
    },
    {
      category: "ENFRIAMIENTO",
      pathImg: `https://ik.imagekit.io/pcinboxkit/${ENV}/banners_x_categoria/${"ENFRIAMIENTO"}/enfriamientos.png?v=${Date.now()}`,
    },
    {
      category: "FUENTES_DE_PODER",
      pathImg: `https://ik.imagekit.io/pcinboxkit/${ENV}/banners_x_categoria/${"FUENTES_DE_PODER"}/fuentes de poder.png?v=${Date.now()}`,
    },
    {
      category: "GABINETES",
      pathImg: `https://ik.imagekit.io/pcinboxkit/${ENV}/banners_x_categoria/${"GABINETES"}/gabinetes pc.png?v=${Date.now()}`,
    },
    {
      category: "LAPTOPS",
      pathImg: `https://ik.imagekit.io/pcinboxkit/${ENV}/banners_x_categoria/${"LAPTOPS"}/laptops.png?v=${Date.now()}`,
    },
    {
      category: "MEMORIAS_RAM_Y_FLASH",
      pathImg: `https://ik.imagekit.io/pcinboxkit/${ENV}/banners_x_categoria/${"MEMORIAS_RAM_Y_FLASH"}/memoria ram.png?v=${Date.now()}`,
    },
    {
      category: "MONITORES_Y_ACCESORIOS_PARA_MONITOR",
      pathImg: `https://ik.imagekit.io/pcinboxkit/${ENV}/banners_x_categoria/${"MONITORES_Y_ACCESORIOS_PARA_MONITOR"}/monitores.png?v=${Date.now()}`,
    },
    {
      category: "MOUSES_Y_ACCESORIOS_DE_MOUSE",
      pathImg: `https://ik.imagekit.io/pcinboxkit/${ENV}/banners_x_categoria/${"MOUSES_Y_ACCESORIOS_DE_MOUSE"}/mouses.png?v=${Date.now()}`,
    },
    {
      category: "PROCESADORES",
      pathImg: `https://ik.imagekit.io/pcinboxkit/${ENV}/banners_x_categoria/${"PROCESADORES"}/procesadores.png?v=${Date.now()}`,
    },
    {
      category: "REDES",
      pathImg: `https://ik.imagekit.io/pcinboxkit/${ENV}/banners_x_categoria/${"REDES"}/redes.png?v=${Date.now()}`,
    },
    {
      category: "TARJETAS_DE_VIDEO",
      pathImg: `https://ik.imagekit.io/pcinboxkit/${ENV}/banners_x_categoria/${"TARJETAS_DE_VIDEO"}/tarjetas de video.png?v=${Date.now()}`,
    },
    {
      category: "TARJETAS_MADRE",
      pathImg: `https://ik.imagekit.io/pcinboxkit/${ENV}/banners_x_categoria/${"TARJETAS_MADRE"}/tarjetas madre.png?v=${Date.now()}`,
    },
    {
      category: "TECLADOS",
      pathImg: `https://ik.imagekit.io/pcinboxkit/${ENV}/banners_x_categoria/${"TECLADOS"}/teclados.png?v=${Date.now()}`,
    },
    {
      category: "VENTILADORES",
      pathImg: `https://ik.imagekit.io/pcinboxkit/${ENV}/banners_x_categoria/${"VENTILADORES"}/ventiladores.png?v=${Date.now()}`,
    },
  ];

  return {
    BANNERS_X_CATEGORY,
  };
};

export default useSettings;
