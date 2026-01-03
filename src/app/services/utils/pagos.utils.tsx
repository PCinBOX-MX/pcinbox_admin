"use client";
import { useTheContext } from "@/app/hooks/global.hook";
import axios from "axios";
import { usePathname } from "next/navigation";

const PagosUtils = () => {
  const pathName = usePathname();
  const { setDataModal, setShowSpinner } = useTheContext();

  const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL_PAGOS,
  });

  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("token");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  api.interceptors.response.use(
    (response) => response,
    (er) => {
      setShowSpinner(false);
      setDataModal((prev) => ({ ...prev, isOpen: false }));

      if (
        er.response?.status == 401 &&
        pathName !== "/features/auth/Login" &&
        pathName !== "/"
      ) {
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
            location.href = "/";
            localStorage.clear();
            setDataModal((prev) => ({ ...prev, isOpen: false }));
          },
          type: "info",
          showActions: true,
        });
        return Promise.reject(er);
      }
    }
  );

  const requestGetPagos = async (endPoint: string) => {
    try {
      setShowSpinner(true);
      const resp = await api.get(endPoint);
      setShowSpinner(false);
      return resp;
    } catch (error) {
      setShowSpinner(false);
      throw error;
    }
  };

  const requestPostPagos = async (data: any, endPoint: string) => {
    try {
      setShowSpinner(true);
      const resp = await api.post(endPoint, data);
      setShowSpinner(false);
      return resp;
    } catch (error) {
      setShowSpinner(false);
      throw error;
    }
  };

  return {
    requestGetPagos,
    requestPostPagos,
  };
};

export default PagosUtils;
