"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "pcinbox_admin_sidebar_open";

type SidebarContextValue = {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

function readSidebarOpenFromStorage(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) {
    return true;
  }

  return stored === "true";
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    setIsOpen(readSidebarOpenFromStorage());
  }, []);

  const persist = useCallback((next: boolean) => {
    setIsOpen(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const open = useCallback(() => persist(true), [persist]);
  const close = useCallback(() => persist(false), [persist]);

  const value = useMemo(
    () => ({ isOpen, toggle, open, close }),
    [isOpen, toggle, open, close],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar debe usarse dentro de SidebarProvider");
  }
  return context;
}
