"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import UtilsService from "../services/utils";
import {
  clearAdminMemoryToken,
  getAdminMemoryToken,
  setAdminMemoryToken,
} from "../utils/authMemory";
import { persistAdminRole, normalizeAdminRole } from "../constants/permissions";

export default function useProtectedRoute(pathname: string) {
  const router = useRouter();
  const { requestGet } = UtilsService();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Limpiar token legado en localStorage.
      localStorage.removeItem("token");

      try {
        const resp = await requestGet("/user/session");
        if (cancelled) return;

        if (resp && resp.status === 200) {
          const role = normalizeAdminRole(resp.data?.data?.role);
          if (role === "admin" || role === "support") {
            persistAdminRole(role);
            if (!getAdminMemoryToken()) {
              try {
                const tokenResp = await requestGet("/user/accessToken");
                const token = tokenResp?.data?.data?.token;
                if (token) setAdminMemoryToken(token);
              } catch {
                // Cookie basta para API principal.
              }
            }
            if (pathname === "/features/auth/Login" || pathname === "/") {
              router.replace("/dashboard");
            }
            return;
          }
        }
      } catch {
        // sin sesión
      }

      if (cancelled) return;
      clearAdminMemoryToken();
      if (pathname !== "/features/auth/Login") {
        router.replace("/features/auth/Login");
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, pathname]);
}
