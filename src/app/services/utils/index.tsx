"use client";

import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";
import { useTheContext } from "@/app/hooks/global.hook";
import { usePathname } from "next/navigation";
import { useCallback } from "react";
import { RequestOptions } from "./request-options";
import { isVoluntaryLogoutPending } from "@/app/utils/sessionAuth";
import { clearLocalStorageKeepingDevicePrefs } from "@/app/utils/clearLocalStorageKeepingDevicePrefs";

const mainApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

mainApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

const UtilsService = () => {
  const pathName = usePathname();
  const { setDataModal, setShowSpinner } = useTheContext();
  const router = useRouter();

  const handleSessionExpired = useCallback(() => {
    // Logout voluntario: no asustar con «Sesión expirada».
    if (isVoluntaryLogoutPending()) return;

    setDataModal({
      isOpen: true,
      content: "Tu sesión expiró, debes iniciar sesión nuevamente.",
      title: "Sesión expirada",
      onClose: () => {
        location.href = "/features/auth/Login";
        clearLocalStorageKeepingDevicePrefs();
        setDataModal((prev) => ({ ...prev, isOpen: false }));
      },
      onConfirm: async () => {
        location.href = "/features/auth/Login";
        clearLocalStorageKeepingDevicePrefs();
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
      const axiosError = error as AxiosError<{ message?: string }>;

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
          axiosError.response?.data?.message ||
            axiosError.message ||
            "Error en la solicitud",
        );
      }
    },
    [pathName, handleSessionExpired, showRequestError],
  );

  const onRouterPush = useCallback(
    async (route: string) => {
      try {
        await router.prefetch(route);
        router.push(route);
      } catch (error) {
        showRequestError("Error navegando a la ruta " + route);
        console.error("Error navegando a la ruta:", error);
      }
    },
    [router, showRequestError],
  );

  const requestPost = useCallback(
    async (data: unknown, endPoint: string, options?: RequestOptions) => {
      const silent = options?.silent === true;
      try {
        if (!silent) setShowSpinner(true);
        const res = await mainApi.post(endPoint, data);
        if (!silent) setShowSpinner(false);
        return res;
      } catch (error) {
        if (!silent) setShowSpinner(false);
        handleRequestError(error, silent);
        throw error;
      }
    },
    [setShowSpinner, handleRequestError],
  );

  const requestGet = useCallback(
    async (endPoint: string, options?: RequestOptions) => {
      const silent = options?.silent === true;
      try {
        if (!silent) setShowSpinner(true);
        const res = await mainApi.get(endPoint);
        if (!silent) setShowSpinner(false);
        return res;
      } catch (error) {
        if (!silent) setShowSpinner(false);
        handleRequestError(error, silent);
        throw error;
      }
    },
    [setShowSpinner, handleRequestError],
  );

  const requestBlob = useCallback(
    async (endPoint: string, options?: RequestOptions) => {
      const silent = options?.silent === true;
      try {
        if (!silent) setShowSpinner(true);
        const res = await mainApi.get<Blob>(endPoint, {
          responseType: "blob",
        });
        if (!silent) setShowSpinner(false);
        return res;
      } catch (error) {
        if (!silent) setShowSpinner(false);
        handleRequestError(error, silent);
        throw error;
      }
    },
    [setShowSpinner, handleRequestError],
  );

  const requestDelete = useCallback(
    async (endPoint: string, options?: RequestOptions) => {
      const silent = options?.silent === true;
      try {
        if (!silent) setShowSpinner(true);
        const res = await mainApi.delete(endPoint);
        if (!silent) setShowSpinner(false);
        return res;
      } catch (error) {
        if (!silent) setShowSpinner(false);
        handleRequestError(error, silent);
        throw error;
      }
    },
    [setShowSpinner, handleRequestError],
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(value);

  const BRANCHES_DICO: { id: number; name: string }[] = [
    { id: 4, name: "Arboledas" },
    { id: 1, name: "dicotech" },
    { id: 3, name: "Zacatecas" },
    { id: 16, name: "gdl" },
    { id: 26, name: "dicoags2" },
    { id: 7, name: "leon" },
    { id: 22, name: "talentland" },
    { id: 35, name: "pn" },
    { id: 34, name: "santafe" },
    { id: 30, name: "leon2" },
  ];

  return {
    onRouterPush,
    requestPost,
    requestGet,
    requestBlob,
    requestDelete,
    formatCurrency,
    BRANCHES_DICO,
  };
};

export default UtilsService;
