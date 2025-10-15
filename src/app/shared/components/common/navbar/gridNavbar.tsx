"use client";

import { ShoppingCart, Package, Settings } from "lucide-react";

const GridNavbar = () => {
  const navItems = [
    { id: "ventas", label: "Ventas", icon: ShoppingCart },
    { id: "proveedores", label: "Proveedores", icon: Package },
    { id: "ajustes", label: "Ajustes", icon: Settings },
  ];

  return {
    navItems,
  };
};

export default GridNavbar;
