"use client";
import { useTheContext } from "@/app/hooks/global.hook";
import axios from "axios";

const PagosUtils = () => {
  const { setDataModal, setShowSpinner } = useTheContext();

  const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL_PAGOS,
  });

  api.interceptors.response.use(
    (response) => response,
    (er) => {
      setShowSpinner(false);
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
