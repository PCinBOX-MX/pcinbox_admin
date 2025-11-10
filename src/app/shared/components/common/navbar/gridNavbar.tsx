"use client";

import { ShoppingCart, Package, Settings, User } from "lucide-react";

const GridNavbar = () => {
  const navItems = [
    { id: "ventas", label: "Ventas", icon: ShoppingCart },
    { id: "proveedores", label: "Proveedores", icon: Package },
    { id: "clientes", label: "Clientes", icon: User },
    { id: "ajustes", label: "Ajustes", icon: Settings },
  ];

  return {
    navItems,
  };
};

export default GridNavbar;
