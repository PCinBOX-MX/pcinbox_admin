"use client";
import { useTheContext } from "@/app/hooks/global.hook";
import axios from "axios";

const ProveedoresUtils = () => {
  const { setDataModal } = useTheContext();

  const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL_PROVEEDORES,
  });

  api.interceptors.response.use(
    (response) => response,
    (er) => {
      setDataModal((prev) => ({ ...prev, isOpen: false }));

      if (er.response?.status == 401) {
        setDataModal({
          isOpen: true,
          content: "Tu sesión expiro, debes iniciar sesión nuevamente.",
          title: "Sesión expirada",
          onClose: () => {
            location.href = "/";
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
        return;
      } else if (er.response?.status != 401) {
        setDataModal({
          isOpen: true,
          content: er?.response?.data?.message,
          title: "Error",
          onClose: () => {
            setDataModal((prev) => ({ ...prev, isOpen: false }));
          },
          onConfirm: async () => {
            setDataModal((prev) => ({ ...prev, isOpen: false }));
          },
          type: "info",
          showActions: true,
        });
      }
    }
  );

  const requestGetProveedores = async (endPoint: string) => {
    try {
      const resp = await api.get(endPoint);
      return resp;
    } catch (error) {
      throw error;
    }
  };

  const requestPostProveedores = async (data: any, endPoint: string) => {
    try {
      const resp = await api.post(endPoint, data);
      return resp;
    } catch (error) {
      throw error;
    }
  };

  return {
    requestGetProveedores,
    requestPostProveedores,
  };
};

export default ProveedoresUtils;
