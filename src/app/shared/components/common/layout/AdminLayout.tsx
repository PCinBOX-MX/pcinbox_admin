"use client";

import { usePathname } from "next/navigation";
import Sidebar from "../sidebar/Sidebar";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Ventas",
  "/proveedores": "Proveedores",
  "/customer": "Clientes",
  "/settings": "Ajustes",
  "/reservas": "Reservas",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "Panel";

  return (
    <div className="admin-shell">
      <Sidebar />
      <div className="admin-shell__main">
        <header className="admin-topbar">
          <div>
            <p className="admin-topbar__eyebrow">PCinBOX</p>
            <h1 className="admin-topbar__title">{title}</h1>
          </div>
        </header>
        <div className="admin-shell__content">{children}</div>
      </div>
    </div>
  );
}
