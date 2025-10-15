"use client";

import UtilsService from "@/app/services/utils";
import { useState } from "react";

const useNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadStorage, setIsLoadStorage] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("ventas");

  const { onRouterPush } = UtilsService();

  const handleActiveTab = (label: string, id: any) => {
    setActiveTab(id);
    setIsOpen(false);

    onRouterPush(
      label == "Ventas"
        ? "/dashboard"
        : label == "Proveedores"
        ? "/proveedores"
        : ""
    );
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    onRouterPush("/features/auth/Login");
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
