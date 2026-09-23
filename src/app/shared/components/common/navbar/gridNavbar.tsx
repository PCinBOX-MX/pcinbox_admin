"use client";

import { useMemo } from "react";
import {
  Package,
  Settings,
  Calendar,
  CreditCard,
  LayoutDashboard,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  subItems?: { id: string; label: string; href: string }[];
};

const GridNavbar = () => {
  const navItems = useMemo<NavItem[]>(
    () => [
      {
        id: "puntoDeVenta",
        label: "Punto de Venta",
        icon: ShoppingCart,
        href: "/punto-de-venta",
      },
      {
        id: "ventas_group",
        label: "Ventas",
        icon: LayoutDashboard,
        subItems: [
          { id: "ventas", label: "Panel de Ventas", href: "/dashboard" },
          {
            id: "ventasInvitados",
            label: "Ventas Invitados",
            href: "/ventasInvitados",
          },
          { id: "cotizaciones", label: "Cotizaciones", href: "/cotizaciones" },
        ],
      },
      {
        id: "catalogos_group",
        label: "Catálogos",
        icon: Package,
        subItems: [
          { id: "proveedores", label: "Proveedores", href: "/proveedores" },
          { id: "clientes", label: "Clientes", href: "/customer" },
        ],
      },
      {
        id: "finanzas_group",
        label: "Finanzas",
        icon: CreditCard,
        subItems: [
          { id: "linkPago", label: "Links de Pagos", href: "/linkPagos" },
        ],
      },
      {
        id: "gestion_group",
        label: "Gestión",
        icon: Calendar,
        subItems: [{ id: "reservas", label: "Reservas", href: "/reservas" }],
      },
      {
        id: "ajustes_group",
        label: "Ajustes",
        icon: Settings,
        subItems: [
          { id: "ajustes", label: "Ajustes Generales", href: "/settings" },
        ],
      },
    ],
    [],
  );

  return {
    navItems,
  };
};

export default GridNavbar;
