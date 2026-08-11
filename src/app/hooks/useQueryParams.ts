import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function useQueryParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setQueryParams = useCallback(
    (params: Record<string, string | number | null | undefined>) => {
      const current =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : new URLSearchParams(Array.from(searchParams.entries()));
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
        if (typeof window !== "undefined") {
          window.history.replaceState(window.history.state, "", url);
        } else {
          router.replace(url, { scroll: false });
        }
      }
    },
    [pathname, router, searchParams]
  );

  return { searchParams, setQueryParams };
}
