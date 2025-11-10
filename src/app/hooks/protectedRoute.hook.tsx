"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function useProtectedRoute(pathname: string) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      // si no hay token, redirige a login
      router.replace("/features/auth/Login");
    } else {
      // si hay token y estás en login o register, redirige a home
      if ((pathname === "/features/auth/Login" || pathname == "/") && token) {
        router.replace("/dashboard");
      }
    }
  }, [router, pathname]);
}
