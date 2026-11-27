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
import UtilsService from "../services/utils";
import { getAdminMemoryToken } from "../utils/authMemory";

export { clearAdminRole, persistAdminRole, readAdminRole } from "../constants/permissions";

/** Fallback: JWT en memoria (solo UI; la verdad es DB vía /user/session). */
function roleFromToken(): AdminRole | null {
  if (typeof window === "undefined") return null;
  const token = getAdminMemoryToken();
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
  const { requestGet } = UtilsService();

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      // Cache local solo para primer paint; se corrige con /user/session.
      let resolved = readAdminRole() || roleFromToken();
      if (!cancelled && resolved) {
        setRole(resolved);
        setHydrated(true);
      }

      try {
        const resp = await requestGet("/user/session");
        if (cancelled) return;
        if (resp && resp.status === 200) {
          const serverRole = normalizeAdminRole(resp.data?.data?.role);
          if (serverRole) {
            persistAdminRole(serverRole);
            setRole(serverRole);
          } else {
            setRole(null);
          }
        }
      } catch {
        // Sin session: mantener cache/JWT si existe (UI); mutaciones seguirán 403.
      } finally {
        if (!cancelled) setHydrated(true);
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
