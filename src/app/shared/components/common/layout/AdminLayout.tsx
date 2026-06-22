"use client";

import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose } from "lucide-react";
import Sidebar from "../sidebar/Sidebar";
import { SidebarProvider, useSidebar } from "@/app/hooks/sidebar.context";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Ventas",
  "/proveedores": "Proveedores",
  "/customer": "Clientes",
  "/ventasInvitados": "Ventas invitados",
  "/linkPagos": "Links de pago",
  "/settings": "Ajustes",
  "/reservas": "Reservas",
};

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "Panel";
  const { isOpen, toggle, close } = useSidebar();

  return (
    <div
      className={`admin-shell${isOpen ? " admin-shell--sidebar-open" : " admin-shell--sidebar-closed"}`}
    >
      <Sidebar />

      {isOpen ? (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          aria-label="Cerrar menú lateral"
          onClick={close}
        />
      ) : null}

      <div className="admin-shell__main">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-topbar__toggle"
            onClick={toggle}
            aria-label={isOpen ? "Ocultar menú lateral" : "Mostrar menú lateral"}
            aria-expanded={isOpen}
            aria-controls="admin-sidebar"
          >
            {isOpen ? <PanelLeftClose size={20} /> : <Menu size={20} />}
          </button>

          <div className="admin-topbar__titles">
            <p className="admin-topbar__eyebrow">PCinBOX</p>
            <h1 className="admin-topbar__title">{title}</h1>
          </div>
        </header>
        <div className="admin-shell__content">{children}</div>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </SidebarProvider>
  );
}
