"use client";

import { useTheContext } from "@/app/hooks/global.hook";
import UtilsService from "@/app/services/utils";
import { useState } from "react";
import { clearAllQuerySessions } from "@/app/utils/querySession";
import { clearAdminRole } from "@/app/constants/permissions";

const ROUTES_BY_TAB: Record<string, string> = {
  ventas: "/dashboard",
  proveedores: "/proveedores",
  clientes: "/customer",
  ajustes: "/settings",
  linkPago: "/linkPagos",
  ventasInvitados: "/ventasInvitados",
  reservas: "/reservas",
  cotizaciones: "/cotizaciones",
  puntoDeVenta: "/punto-de-venta",
};

const LOGIN_ROUTE = "/features/auth/Login";

const useNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadStorage, setIsLoadStorage] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("ventas");
  const { setDataModal } = useTheContext();
  const { onRouterPush } = UtilsService();

  const handleActiveTab = (id: string) => {
    setActiveTab(id);
    setIsOpen(false);
    const route = ROUTES_BY_TAB[id];
    if (route) onRouterPush(route);
  };

  const closeLogoutModal = () => {
    setDataModal((prev) => {
      if (prev.loading) return prev;
      return { ...prev, isOpen: false, loading: false };
    });
  };

  const runLogout = async () => {
    setDataModal((prev) => ({
      ...prev,
      loading: true,
      confirmLabel: "Cerrando…",
    }));

    try {
      // Limpieza local + navegación (sin API de logout en admin).
      // Se mantiene el modal bloqueado hasta terminar.
      await new Promise((resolve) => window.setTimeout(resolve, 150));

      localStorage.removeItem("token");
      localStorage.removeItem("email");
      clearAdminRole();
      clearAllQuerySessions();

      await onRouterPush(LOGIN_ROUTE);

      setDataModal((prev) => ({
        ...prev,
        isOpen: false,
        loading: false,
      }));
    } catch {
      setDataModal({
        isOpen: true,
        type: "error",
        title: "No se pudo cerrar sesión",
        content:
          "Ocurrió un error al cerrar la sesión. Intenta de nuevo.",
        showActions: true,
        loading: false,
        confirmLabel: "Aceptar",
        cancelLabel: "Cerrar",
        onClose: closeLogoutModal,
        onConfirm: closeLogoutModal,
      });
    }
  };

  const handleLogout = () => {
    setDataModal({
      isOpen: true,
      type: "warning",
      title: "Cierre de sesión",
      showActions: true,
      loading: false,
      confirmLabel: "Cerrar sesión",
      cancelLabel: "Cancelar",
      content:
        "¿Seguro que deseas cerrar sesión? Dejarás de tener acceso al panel hasta volver a iniciar.",
      onClose: closeLogoutModal,
      onConfirm: () => {

        setDataModal((prev) => ({ ...prev, isOpen: false }));

        localStorage.removeItem("token");

        localStorage.removeItem("email");

        localStorage.removeItem("adminRole");

        clearAllQuerySessions();

        onRouterPush("/features/auth/Login");

      },
    });
  };

  return {
    isOpen,
    activeTab,
    isLoadStorage,
    setIsOpen,
    setActiveTab,
    handleLogout,
    handleActiveTab,
    setIsLoadStorage,
  };
};

export default useNavbar;
