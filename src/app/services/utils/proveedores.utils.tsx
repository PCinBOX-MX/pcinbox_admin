"use client";

import { useTheContext } from "@/app/hooks/global.hook";
import axios, { AxiosError } from "axios";
import { usePathname } from "next/navigation";
import { useCallback } from "react";
import { RequestOptions } from "./request-options";

export type { RequestOptions };

export const proveedoresApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL_PROVEEDOR,
});

proveedoresApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

const ProveedoresUtils = () => {
  const pathName = usePathname();
  const { setDataModal, setShowSpinner } = useTheContext();

  const handleSessionExpired = useCallback(() => {
    setDataModal({
      isOpen: true,
      content: "Tu sesión expiro, debes iniciar sesión nuevamente.",
      title: "Sesión expirada",
      onClose: () => {
        location.href = "/features/auth/Login";
        localStorage.clear();
        setDataModal((prev) => ({ ...prev, isOpen: false }));
      },
      onConfirm: async () => {
        location.href = "/features/auth/Login";
        localStorage.clear();
        setDataModal((prev) => ({ ...prev, isOpen: false }));
      },
      type: "info",
      showActions: true,
    });
  }, [setDataModal]);

  const requestGetProveedores = useCallback(
    async (endPoint: string, options?: RequestOptions) => {
      const silent = options?.silent === true;
      try {
        if (!silent) setShowSpinner(true);
        const resp = await proveedoresApi.get(endPoint);
        if (!silent) setShowSpinner(false);
        return resp;
      } catch (error) {
        if (!silent) setShowSpinner(false);

        const axiosError = error as AxiosError;
        if (
          axiosError.response?.status === 401 &&
          pathName !== "/features/auth/Login" &&
          pathName !== "/"
        ) {
          handleSessionExpired();
        }

        throw error;
      }
    },
    [setShowSpinner, pathName, handleSessionExpired],
  );

  const requestPostProveedores = useCallback(
    async (data: unknown, endPoint: string, options?: RequestOptions) => {
      const silent = options?.silent === true;
      try {
        if (!silent) setShowSpinner(true);
        const resp = await proveedoresApi.post(endPoint, data);
        if (!silent) setShowSpinner(false);
        return resp;
      } catch (error) {
        if (!silent) setShowSpinner(false);

        const axiosError = error as AxiosError;
        if (
          axiosError.response?.status === 401 &&
          pathName !== "/features/auth/Login" &&
          pathName !== "/"
        ) {
          handleSessionExpired();
        }

        throw error;
      }
    },
    [setShowSpinner, pathName, handleSessionExpired],
  );

  return {
    requestGetProveedores,
    requestPostProveedores,
  };
};

export default ProveedoresUtils;
