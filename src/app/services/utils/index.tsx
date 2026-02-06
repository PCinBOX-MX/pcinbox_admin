"use client";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useTheContext } from "@/app/hooks/global.hook";
import { usePathname } from "next/navigation";

const UtilsService = () => {
  const pathName = usePathname();

  const { setDataModal, setShowSpinner } = useTheContext();

  const router = useRouter();

  const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
  });

  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("token");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (error) => Promise.reject(error),
  );
  api.interceptors.response.use(
    (response) => response,
    (er) => {
      setShowSpinner(false);
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
          showActions: true,
        });

        return;
      } else if (er.response?.status != 401) {
        setDataModal({
          isOpen: true,
          content: er.response?.data.message || er?.message,
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
      }
    },
  );

  const onRouterPush = async (route: string) => {
    try {
      await router.prefetch(route);
      router.push(route);
    } catch (error) {
      setDataModal({
        isOpen: true,
        title: "Error",
        type: "error",
        showActions: true,
        content: "Error navegando a la ruta " + route,
        onConfirm: () => {
          setDataModal((prev) => ({ ...prev, isOpen: false }));
        },
        onClose: () => {
          setDataModal((prev) => ({ ...prev, isOpen: false }));
        },
      });
      console.error("Error navegando a la ruta:", error);
    }
  };

  const requestPost = async (data: any, endPoint: string) => {
    try {
      setShowSpinner(true);
      const res = await api.post(endPoint, data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setShowSpinner(false);
      return res;
    } catch (error: any) {
      setShowSpinner(false);
      throw error;
    }
  };

  const requestGet = async (
    endPoint: string,
    showErrorSesion: boolean = false,
  ) => {
    try {
      setShowSpinner(true);
      const res = await api.get(endPoint, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setShowSpinner(false);

      return res;
    } catch (error: any) {
      setShowSpinner(false);
      throw error;
    }
  };

  const requestDelete = async (endPoint: string) => {
    try {
      setShowSpinner(true);
      const res = await api.delete(endPoint, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setShowSpinner(false);
      return res;
    } catch (error: any) {
      setShowSpinner(false);
      throw error;
    }
  };

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
  ];

  return {
    onRouterPush,
    requestPost,
    requestGet,
    requestDelete,
    formatCurrency,
    BRANCHES_DICO,
  };
};

export default UtilsService;
