import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const devDefaults = isDev
  ? {
      NEXT_PUBLIC_API_URL: "http://localhost:8000/api/v1",
      NEXT_PUBLIC_API_URL_PROVEEDOR: "http://localhost:8001/api/v1",
      NEXT_PUBLIC_API_URL_PAGOS: "http://localhost:8009/api/v1",
      NEXT_PUBLIC_SOCKET_PROVEEDOR: "http://localhost:8001",
      NEXT_PUBLIC_SOCKET_PAGOS: "http://localhost:8009",
      NEXT_PUBLIC_NODE_ENV: "local",
    }
  : {};

function env(key: string): string {
  return process.env[key] || devDefaults[key as keyof typeof devDefaults] || "";
}

const nextConfig: NextConfig = {
  
  images: {
    unoptimized: true,
    domains: [
      "img.icons8.com",
      "authjs.dev",
      "ik.imagekit.io",
      "lh3.googleusercontent.com",
      "commons.wikimedia.org",
      "upload.wikimedia.org",
    ],
  },
  env: {
    NEXT_PUBLIC_NODE_ENV: env("NEXT_PUBLIC_NODE_ENV"),
    NEXT_PUBLIC_API_URL: env("NEXT_PUBLIC_API_URL"),
    NEXT_PUBLIC_SOCKET_PROVEEDOR: env("NEXT_PUBLIC_SOCKET_PROVEEDOR"),
    NEXT_PUBLIC_SOCKET_PAGOS: env("NEXT_PUBLIC_SOCKET_PAGOS"),
    NEXT_PUBLIC_API_URL_PROVEEDOR: env("NEXT_PUBLIC_API_URL_PROVEEDOR"),
    NEXT_PUBLIC_API_URL_PAGOS: env("NEXT_PUBLIC_API_URL_PAGOS"),
  },
};

export default nextConfig;
