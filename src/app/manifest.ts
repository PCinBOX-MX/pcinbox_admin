import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "PCInbox Admin",
    short_name: "PC Admin",
    description: "Panel de administración de PCInbox.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#eceef4",
    theme_color: "#bb3d4b",
    lang: "es-MX",
    dir: "ltr",
    categories: ["business"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
