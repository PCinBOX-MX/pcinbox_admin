import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_API_URL_PROVEEDORES:
      process.env.NEXT_PUBLIC_API_URL_PROVEEDORES,
    NEXT_PUBLIC_API_URL_PAGOS: process.env.NEXT_PUBLIC_API_URL_PAGOS,
  },
};

export default nextConfig;
