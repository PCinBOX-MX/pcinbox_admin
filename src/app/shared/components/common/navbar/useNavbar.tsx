"use client";

import { useTheContext } from "@/app/hooks/global.hook";
import UtilsService from "@/app/services/utils";
import { useState } from "react";

const useNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadStorage, setIsLoadStorage] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("ventas");
  const { setDataModal } = useTheContext();
  const { onRouterPush } = UtilsService();

  const handleActiveTab = (label: string, id: any) => {
    setActiveTab(id);
    setIsOpen(false);

    onRouterPush(
      label == "Ventas"
        ? "/dashboard"
        : label == "Proveedores"
          ? "/proveedores"
          : label == "Clientes"
            ? "/customer"
            : label == "Ajustes"
              ? "/settings"
              : // : label == "Links de Pagos"
                // ? "/linkPagos"
                // : label == "Ventas (Invitados)"
                // ? "/ventasInvitados"
                "",
    );
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
