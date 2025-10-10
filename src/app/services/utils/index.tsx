"use client";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useTheContext } from "@/app/hooks/global.hook";

const UtilsService = () => {
  const { setDataModal } = useTheContext();

  const router = useRouter();

  const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
  });

  api.interceptors.response.use(
    (response) => response,
    (er) => {
      if (er.response?.status == 401) {
        setDataModal({
          isOpen: true,
          message: "Tu sesión expiro, debes iniciar sesión nuevamente.",
          title: "Sesión expirada",
          onClose: () => {
            location.href = "/principal";
            localStorage.clear();
            setDataModal((prev) => ({ ...prev, isOpen: false }));
          },
          onConfirm: async () => {
            location.href = "/principal";
            localStorage.clear();

            setDataModal((prev) => ({ ...prev, isOpen: false }));
          },
          type: "info",
        });

        return;
      } else if (er.response?.status != 401) {
        setDataModal({
          isOpen: true,
          message: er.response?.data.message || er?.message,
          title: "Error",
          onClose: () => {
            setDataModal((prev) => ({ ...prev, isOpen: false }));
          },
          onConfirm: async () => {
            setDataModal((prev) => ({ ...prev, isOpen: false }));
          },
          type: "error",
        });
      }
    }
  );

  const onRouterPush = (pathName: string): void => {
    router.push(pathName);
  };

  const requestPost = async (data: any, endPoint: string) => {
    try {
      const res = await api.post(endPoint, data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return res;
    } catch (error: any) {
      throw error;
    }
  };

  const requestGet = async (
    endPoint: string,
    showErrorSesion: boolean = false
  ) => {
    try {
      const res = await api.get(endPoint, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      return res;
    } catch (error: any) {
      throw error;
    }
  };

  const requestDelete = async (endPoint: string) => {
    try {
      const res = await api.delete(endPoint, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return res;
    } catch (error: any) {
      throw error;
    }
  };

  return {
    onRouterPush,
    requestPost,
    requestGet,
    requestDelete,
  };
};

export default UtilsService;
