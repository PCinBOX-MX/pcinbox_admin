import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SOCKET_PROVEEDOR: process.env.NEXT_PUBLIC_SOCKET_PROVEEDOR,
    NEXT_PUBLIC_SOCKET_PAGOS: process.env.NEXT_PUBLIC_SOCKET_PAGOS,
    NEXT_PUBLIC_API_URL_PROVEEDOR: process.env.NEXT_PUBLIC_API_URL_PROVEEDOR,
    NEXT_PUBLIC_API_URL_PAGOS: process.env.NEXT_PUBLIC_API_URL_PAGOS,
  },
};

export default nextConfig;
