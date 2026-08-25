"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import GridNavbar from "../common/navbar/gridNavbar";
import useNavbar from "../common/navbar/useNavbar";
import styles from "./admin-sidebar.module.css";
import usePermissions from "@/app/hooks/usePermissions";
import { NAV_PERMISSIONS } from "@/app/constants/permissions";

const PATH_TO_TAB: Record<string, string> = {
  "/dashboard": "ventas",
  "/proveedores": "proveedores",
  "/customer": "clientes",
  "/settings": "ajustes",
  "/linkPagos": "linkPago",
  "/ventasInvitados": "ventasInvitados",
  "/reservas": "reservas",
  "/cotizaciones": "cotizaciones",
  "/punto-de-venta": "puntoDeVenta",
};

const SIDEBAR_PREF_KEY = "pcinbox-admin-sidebar-open";

function readSidebarPreference(): boolean {
  const stored = localStorage.getItem(SIDEBAR_PREF_KEY);
  if (stored === "false") return false;
  if (stored === "true") return true;
  return true;
}

const AdminSidebar = () => {
  const pathName = usePathname();
  const { navItems } = GridNavbar();
  const { can, hydrated } = usePermissions();
  const {
    activeTab,
    setActiveTab,
    handleActiveTab,
    handleLogout,
    setIsLoadStorage,
  } = useNavbar();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [sidebarHydrated, setSidebarHydrated] = useState(false);
  const visibleNavItems = useMemo(() => {
    if (!hydrated) return [];

    return navItems
      .map((item) => {
        // Ítem de nivel superior (sin submenú)
        if (!item.subItems) {
          const permission = NAV_PERMISSIONS[item.id];
          if (permission && !can(permission)) return null;
          return item;
        }
        return {
          ...item,
          subItems: item.subItems.filter((subItem) => {
            const permission = NAV_PERMISSIONS[subItem.id];
            return permission ? can(permission) : true;
          }),
        };
      })
      .filter((item): item is (typeof navItems)[number] => {
        if (!item) return false;
        return !item.subItems || item.subItems.length > 0;
      });
  }, [can, hydrated, navItems]);

  useEffect(() => {
    const open = readSidebarPreference();
    setDesktopOpen(open);
    document.documentElement.dataset.adminSidebar = open ? "open" : "closed";
    setSidebarHydrated(true);
  }, []);

  useEffect(() => {
    if (!sidebarHydrated) return;

    localStorage.setItem(SIDEBAR_PREF_KEY, String(desktopOpen));
    document.documentElement.dataset.adminSidebar = desktopOpen
      ? "open"
      : "closed";
  }, [desktopOpen, sidebarHydrated]);

  useEffect(() => {
    if (!pathName) return;
    setIsLoadStorage(true);
    setActiveTab(PATH_TO_TAB[pathName] ?? "");
    setMobileOpen(false);
  }, [pathName, setActiveTab, setIsLoadStorage]);

  const toggleDesktopSidebar = () => {
    setDesktopOpen((prev) => !prev);
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    ventas_group: true,
  });

  useEffect(() => {
    const parentGroup = visibleNavItems.find((item) =>
      item.subItems?.some((sub) => sub.id === activeTab)
    );
    if (parentGroup) {
      setOpenGroups((prev) => {
        if (prev[parentGroup.id]) return prev;
        return { ...prev, [parentGroup.id]: true };
      });
    }
  }, [activeTab, visibleNavItems]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

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

      {/* Eliminamos el botón flotante desktopReopen porque ahora el sidebar colapsado tendrá su propio botón */}

      {mobileOpen && (
        <div
          className={styles.overlay}
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ""} ${
          !desktopOpen ? styles.sidebarCollapsed : ""
        }`}
      >
        <div className={styles.brand}>
          {!desktopOpen ? (
            <button
              type="button"
              className={styles.desktopReopenInside}
              onClick={toggleDesktopSidebar}
              aria-label="Expandir menú lateral"
              title="Expandir menú"
            >
              <PanelLeftOpen size={20} />
            </button>
          ) : (
            <>
              <img
                src="https://ik.imagekit.io/pcinboxkit/logos/logo.png?updatedAt=1759534318587"
                alt="PCInbox Admin"
                width={120}
                height={48}
                style={{ objectFit: "contain" }}
                loading="lazy"
              />
              <span className={styles.brandTitle}>Admin</span>
              <button
                type="button"
                className={styles.collapseBtn}
                onClick={toggleDesktopSidebar}
                aria-label="Ocultar menú lateral"
                title="Ocultar menú"
              >
                <PanelLeftClose size={18} />
              </button>
            </>
          )}
        </div>

        <nav className={styles.nav}>
          {visibleNavItems.length === 0 && hydrated ? (
            <p
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: 12,
                padding: "12px 16px",
                lineHeight: 1.4,
              }}
            >
              No hay menús visibles. Cierra sesión y vuelve a entrar para
              actualizar permisos.
            </p>
          ) : null}
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const hasSubItems = item.subItems && item.subItems.length > 0;
            
            // Check if any subitem is active
            const isGroupActive = hasSubItems 
              ? item.subItems!.some(sub => sub.id === activeTab)
              : activeTab === item.id;
              
            // Is this specific menu expanded?
            const isExpanded = openGroups[item.id] || isGroupActive;

            return (
              <div key={item.id} className={styles.navItemGroup}>
                <button
                  type="button"
                  className={`${styles.navItem} ${isGroupActive && !hasSubItems ? styles.navItemActive : ""}`}
                  onClick={() => {
                    if (hasSubItems) {
                      toggleGroup(item.id);
                    } else {
                      handleActiveTab(item.id);
                    }
                  }}
                >
                  <div className={styles.navItemIcon}>
                    <Icon size={20} strokeWidth={isGroupActive ? 2.2 : 1.8} />
                  </div>
                  <span className={styles.navItemLabel} style={{ marginLeft: "12px", fontWeight: isGroupActive ? "600" : "500" }}>
                    {item.label}
                  </span>
                  {hasSubItems && (
                    <div className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ""}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                  )}
                </button>
                
                {hasSubItems && (
                  <div className={`${styles.submenu} ${isExpanded ? styles.submenuOpen : ""}`}>
                    {item.subItems!.map(sub => {
                      const isSubActive = activeTab === sub.id;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          className={`${styles.subItem} ${isSubActive ? styles.subItemActive : ""}`}
                          onClick={() => handleActiveTab(sub.id)}
                        >
                          {sub.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
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
            <span className={styles.logoutBtnLabel}>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
