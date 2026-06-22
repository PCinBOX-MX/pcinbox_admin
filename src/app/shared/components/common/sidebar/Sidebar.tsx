"use client";

import {
  Calendar,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  UserCheck,
  Users,
} from "lucide-react";
import { usePathname } from "next/navigation";
import useNavbar from "../navbar/useNavbar";
import UtilsService from "@/app/services/utils";
import { useSidebar } from "@/app/hooks/sidebar.context";

const NAV_ITEMS = [
  { id: "ventas", label: "Ventas", href: "/dashboard", icon: LayoutDashboard },
  { id: "proveedores", label: "Proveedores", href: "/proveedores", icon: Package },
  { id: "clientes", label: "Clientes", href: "/customer", icon: Users },
  { id: "ventasInvitados", label: "Ventas invitados", href: "/ventasInvitados", icon: UserCheck },
  { id: "linkPagos", label: "Links de pago", href: "/linkPagos", icon: CreditCard },
  { id: "reservas", label: "Reservas", href: "/reservas", icon: Calendar },
  { id: "ajustes", label: "Ajustes", href: "/settings", icon: Settings },
];

const Sidebar = () => {
  const pathname = usePathname();
  const { handleLogout } = useNavbar();
  const { onRouterPush } = UtilsService();
  const { close } = useSidebar();

  const navigate = (href: string) => {
    onRouterPush(href);

    if (window.matchMedia("(max-width: 900px)").matches) {
      close();
    }
  };

  return (
    <aside id="admin-sidebar" className="admin-sidebar" aria-label="Menú principal">
      <div className="admin-sidebar__brand">
        <img
          src="https://ik.imagekit.io/pcinboxkit/logos/logo.png?updatedAt=1759534318587"
          alt="PCinBOX Admin"
          className="admin-sidebar__logo"
        />
        <span className="admin-sidebar__badge">Admin</span>
      </div>

      <nav className="admin-sidebar__nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <button
              key={item.id}
              type="button"
              className={`admin-sidebar__link${isActive ? " admin-sidebar__link--active" : ""}`}
              onClick={() => navigate(item.href)}
            >
              <Icon size={20} strokeWidth={2} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="admin-sidebar__footer">
        <button
          type="button"
          className="admin-sidebar__logout"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
