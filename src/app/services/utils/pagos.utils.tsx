"use client";

import { useTheContext } from "@/app/hooks/global.hook";
import axios, { AxiosError } from "axios";
import { usePathname } from "next/navigation";
import { useCallback } from "react";
import { RequestOptions } from "./request-options";
import { resolveApiErrorMessage } from "@/app/utils/apiErrorMessage";

export const pagosApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL_PAGOS,
});

pagosApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

const PagosUtils = () => {
  const pathName = usePathname();
  const { setDataModal, setShowSpinner } = useTheContext();

  const handleSessionExpired = useCallback(() => {
    setDataModal({
      isOpen: true,
      content: "Tu sesión expiró, debes iniciar sesión nuevamente.",
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

  const showRequestError = useCallback(
    (message: string) => {
      setDataModal({
        isOpen: true,
        content: message,
        title: "Error",
        onClose: () => {
          setDataModal((prev) => ({ ...prev, isOpen: false }));
        },
        onConfirm: async () => {
          setDataModal((prev) => ({ ...prev, isOpen: false }));
        },
        type: "error",
        showActions: true,
      });
    },
    [setDataModal],
  );

  const handleRequestError = useCallback(
    (error: unknown, silent: boolean) => {
      const axiosError = error as AxiosError;
      if (
        axiosError.response?.status === 401 &&
        pathName !== "/features/auth/Login" &&
        pathName !== "/"
      ) {
        handleSessionExpired();
        return;
      }

      if (!silent && axiosError.response?.status !== 401) {
        showRequestError(
          resolveApiErrorMessage(
            error,
            "No se pudo completar la operación de pagos.",
          ),
        );
      }
    },
    [pathName, handleSessionExpired, showRequestError],
  );

  const requestGetPagos = useCallback(
    async (endPoint: string, options?: RequestOptions) => {
      const silent = options?.silent === true;
      try {
        if (!silent) setShowSpinner(true);
        const resp = await pagosApi.get(endPoint);
        if (!silent) setShowSpinner(false);
        return resp;
      } catch (error) {
        if (!silent) setShowSpinner(false);
        handleRequestError(error, silent);
        throw error;
      }
    },
    [setShowSpinner, handleRequestError],
  );

  const requestPostPagos = useCallback(
    async (data: unknown, endPoint: string, options?: RequestOptions) => {
      const silent = options?.silent === true;
      try {
        if (!silent) setShowSpinner(true);
        const resp = await pagosApi.post(endPoint, data);
        if (!silent) setShowSpinner(false);
        return resp;
      } catch (error) {
        if (!silent) setShowSpinner(false);
        handleRequestError(error, silent);
        throw error;
      }
    },
    [setShowSpinner, handleRequestError],
  );

  return {
    requestGetPagos,
    requestPostPagos,
  };
};

export default PagosUtils;
