"use client";

import { ShoppingCart, Package, Settings, User, Link } from "lucide-react";

const GridNavbar = () => {
  const navItems = [
    { id: "ventas", label: "Ventas", icon: ShoppingCart },
    { id: "proveedores", label: "Proveedores", icon: Package },
    { id: "clientes", label: "Clientes", icon: User },
    { id: "ajustes", label: "Ajustes", icon: Settings },
    { id: "linkPago", label: "Links de Pagos", icon: Link },
    { id: "ventasInvitados", label: "Ventas (Invitados)", icon: ShoppingCart },
  ];

  return {
    navItems,
  };
};

export default GridNavbar;
