"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminPermission,
  AdminRole,
  normalizeAdminRole,
  persistAdminRole,
  readAdminRole,
  roleHasPermission,
} from "../constants/permissions";

export { clearAdminRole, persistAdminRole, readAdminRole } from "../constants/permissions";

/** Intenta leer el rol desde el JWT si localStorage no lo tiene (sesión antigua). */
function roleFromToken(): AdminRole | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("token");
  if (!token || !token.includes(".")) return null;
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const json = atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as {
      role?: string;
      rol?: string;
      data?: { role?: string; rol?: string };
    };
    return normalizeAdminRole(
      payload.role ||
        payload.rol ||
        payload.data?.role ||
        payload.data?.rol,
    );
  } catch {
    return null;
  }
}

export default function usePermissions() {
  const [role, setRole] = useState<AdminRole | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let resolved = readAdminRole();
    if (!resolved) {
      resolved = roleFromToken();
      if (resolved) persistAdminRole(resolved);
    }
    setRole(resolved);
    setHydrated(true);
  }, []);

  const can = useCallback(
    (permission: AdminPermission) => roleHasPermission(role, permission),
    [role],
  );

  return {
    role,
    can,
    hydrated,
    isAdmin: role === "admin",
    isSupport: role === "support",
  };
}
