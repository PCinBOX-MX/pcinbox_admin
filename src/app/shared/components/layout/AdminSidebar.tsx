"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import GridNavbar from "../common/navbar/gridNavbar";
import useNavbar from "../common/navbar/useNavbar";
import styles from "./admin-sidebar.module.css";

const PATH_TO_TAB: Record<string, string> = {
  "/dashboard": "ventas",
  "/proveedores": "proveedores",
  "/customer": "clientes",
  "/settings": "ajustes",
  "/linkPagos": "linkPago",
  "/ventasInvitados": "ventasInvitados",
  "/reservas": "reservas",
};

const AdminSidebar = () => {
  const pathName = usePathname();
  const { navItems } = GridNavbar();
  const {
    activeTab,
    setActiveTab,
    handleActiveTab,
    handleLogout,
    setIsLoadStorage,
  } = useNavbar();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!pathName) return;
    setIsLoadStorage(true);
    setActiveTab(PATH_TO_TAB[pathName] ?? "");
    setMobileOpen(false);
  }, [pathName, setActiveTab, setIsLoadStorage]);

  return (
    <>
      <button
        type="button"
        className={styles.mobileToggle}
        onClick={() => setMobileOpen((prev) => !prev)}
        aria-label="Menú"
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {mobileOpen && (
        <div
          className={styles.overlay}
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.brand}>
          <img
            src="https://ik.imagekit.io/pcinboxkit/logos/logo.png?updatedAt=1759534318587"
            alt="PCInbox Admin"
            width={120}
            height={48}
            style={{ objectFit: "contain" }}
            loading="lazy"
          />
          <span className={styles.brandTitle}>Admin</span>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
                onClick={() => handleActiveTab(item.id)}
              >
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.logoutBtn}
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
