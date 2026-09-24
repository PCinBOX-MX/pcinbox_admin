import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useLayoutEffect, useRef } from "react";
import {
  readQuerySession,
  saveQuerySession,
} from "@/app/utils/querySession";

export function useQueryParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const restoredRef = useRef(false);
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  // Restaurar filtros de la pestaña si se entra por menú (path limpio).
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const currentSearch = window.location.search || "";
    const hasQuery = Boolean(currentSearch && currentSearch !== "?");

    if (hasQuery) {
      saveQuerySession(pathname, currentSearch);
      restoredRef.current = true;
      return;
    }

    // Path limpio tras haber restaurado/navegado (p. ej. tab Cobrar sin ?tab=).
    // NO borrar la sesión: si no, al cambiar de pestaña o volver al default
    // se pierden selects/filtros (hStatus, w*, paginación, etc.).
    if (restoredRef.current) {
      return;
    }

    const saved = readQuerySession(pathname);
    if (saved) {
      restoredRef.current = true;
      window.history.replaceState(window.history.state, "", `${pathname}${saved}`);
      router.replace(`${pathname}${saved}`, { scroll: false });
      return;
    }

    restoredRef.current = true;
  }, [pathname, router, searchParams]);

  // Identidad estable: no depender de `searchParams` (cada cambio de URL
  // recreaba el callback y re-disparaba efectos que lo listaban como dep).
  const setQueryParams = useCallback(
    (params: Record<string, string | number | null | undefined>) => {
      const current =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : new URLSearchParams(Array.from(searchParamsRef.current.entries()));
      let hasChanges = false;

      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
          if (current.has(key)) {
            current.delete(key);
            hasChanges = true;
          }
        } else {
          const strVal = String(value);
          if (current.get(key) !== strVal) {
            current.set(key, strVal);
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        const search = current.toString();
        const query = search ? `?${search}` : "";
        const url = `${pathname}${query}`;
        if (query) {
          saveQuerySession(pathname, query);
        } else {
          // URL limpia (p. ej. tab Cobrar): quitar `tab` del snapshot sin
          // borrar filtros h*/w*/c* que aún puedan vivir en sesión.
          const saved = readQuerySession(pathname);
          if (saved) {
            const sp = new URLSearchParams(
              saved.startsWith("?") ? saved.slice(1) : saved,
            );
            sp.delete("tab");
            const rest = sp.toString();
            saveQuerySession(pathname, rest ? `?${rest}` : "", {
              allowEmpty: true,
            });
          } else {
            saveQuerySession(pathname, "", { allowEmpty: true });
          }
        }
        // Debe pasar por el router de Next: replaceState solo cambia la barra
        // de URL y NO actualiza useSearchParams(), así que page/filtros quedan
        // desincronizados (p. ej. /proveedores solo cambia la URL).
        router.replace(url, { scroll: false });
      }
    },
    [pathname, router],
  );

  return { searchParams, setQueryParams };
}
