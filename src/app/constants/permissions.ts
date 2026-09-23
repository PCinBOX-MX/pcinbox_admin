export type AdminRole = "admin" | "support";

export type AdminPermission =
  | "orders.view"
  | "orders.update_status_pay"
  | "orders.update_status_ship"
  | "orders.cancel"
  | "orders.cancel.override"
  | "techsmart.manage"
  | "reservas.manage"
  | "quotes.manage"
  | "catalog.manage"
  | "users.view"
  | "users.deactivate"
  | "settings.manage"
  | "pos.manage"
  | "pos.cancel"
  | "pos.cancel.override";

export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  admin: [
    "orders.view",
    "orders.update_status_pay",
    "orders.update_status_ship",
    "orders.cancel",
    "orders.cancel.override",
    "techsmart.manage",
    "reservas.manage",
    "quotes.manage",
    "catalog.manage",
    "users.view",
    "users.deactivate",
    "settings.manage",
    "pos.manage",
    "pos.cancel",
    "pos.cancel.override",
  ],
  support: [
    "orders.view",
    "orders.update_status_pay",
    "orders.update_status_ship",
    "orders.cancel",
    "reservas.manage",
    "users.view",
    "pos.manage",
    "pos.cancel",
  ],
};

export const NAV_PERMISSIONS: Record<string, AdminPermission> = {
  ventas: "orders.view",
  proveedores: "catalog.manage",
  clientes: "users.view",
  ventasInvitados: "orders.view",
  linkPagos: "orders.view",
  linkPago: "orders.view",
  reservas: "reservas.manage",
  cotizaciones: "quotes.manage",
  ajustes: "settings.manage",
  puntoDeVenta: "pos.manage",
};

export function normalizeAdminRole(raw: string | null | undefined): AdminRole | null {
  if (raw === "admin") return "admin";
  if (raw === "support") return "support";
  return null;
}

export function roleHasPermission(
  role: AdminRole | null,
  permission: AdminPermission,
): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

const ROLE_STORAGE_KEY = "adminRole";

export function persistAdminRole(role: AdminRole) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ROLE_STORAGE_KEY, role);
}

export function readAdminRole(): AdminRole | null {
  if (typeof window === "undefined") return null;
  return normalizeAdminRole(localStorage.getItem(ROLE_STORAGE_KEY));
}

export function clearAdminRole() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ROLE_STORAGE_KEY);
}
