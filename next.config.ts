import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.icons8.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "authjs.dev",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "commons.wikimedia.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/**",
      },
    ],
  },

  env: {
    NEXT_PUBLIC_NODE_ENV: process.env.NEXT_PUBLIC_NODE_ENV,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SOCKET_PROVEEDOR: process.env.NEXT_PUBLIC_SOCKET_PROVEEDOR,
    NEXT_PUBLIC_SOCKET_PAGOS: process.env.NEXT_PUBLIC_SOCKET_PAGOS,
    NEXT_PUBLIC_API_URL_PROVEEDOR: process.env.NEXT_PUBLIC_API_URL_PROVEEDOR,
    NEXT_PUBLIC_API_URL_PAGOS: process.env.NEXT_PUBLIC_API_URL_PAGOS,
  },
};

export default nextConfig;
