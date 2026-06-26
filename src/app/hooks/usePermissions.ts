"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminPermission,
  AdminRole,
  readAdminRole,
  roleHasPermission,
} from "../constants/permissions";

export { clearAdminRole, persistAdminRole, readAdminRole } from "../constants/permissions";

export default function usePermissions() {
  const [role, setRole] = useState<AdminRole | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setRole(readAdminRole());
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
