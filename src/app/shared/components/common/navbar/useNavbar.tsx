"use client";



import { useTheContext } from "@/app/hooks/global.hook";

import UtilsService from "@/app/services/utils";

import { useState } from "react";

import { clearAllQuerySessions } from "@/app/utils/querySession";



const ROUTES_BY_TAB: Record<string, string> = {

  ventas: "/dashboard",

  proveedores: "/proveedores",

  clientes: "/customer",

  ajustes: "/settings",

  linkPago: "/linkPagos",

  ventasInvitados: "/ventasInvitados",

  reservas: "/reservas",

  cotizaciones: "/cotizaciones",

};



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



  const handleLogout = () => {

    setDataModal({

      isOpen: true,

      type: "info",

      title: "Cierre de sesión",

      showActions: true,

      content: "¿Seguro que deseas cerrar sesión?",

      onClose: () => {

        setDataModal((prev) => ({ ...prev, isOpen: false }));

      },

      onConfirm: () => {

        setDataModal((prev) => ({ ...prev, isOpen: false }));

        localStorage.removeItem("token");

        localStorage.removeItem("email");

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

