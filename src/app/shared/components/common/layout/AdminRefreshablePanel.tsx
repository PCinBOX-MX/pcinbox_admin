"use client";

import { CircularProgress } from "@mui/material";
import type { ReactNode } from "react";

type AdminRefreshablePanelProps = {
  loading: boolean;
  hasContent: boolean;
  children: ReactNode;
  emptyState: ReactNode;
};

/**
 * Mismo comportamiento que /dashboard: si ya hay datos, al actualizar
 * se mantiene la tabla/lista visible con overlay de carga encima.
 */
export default function AdminRefreshablePanel({
  loading,
  hasContent,
  children,
  emptyState,
}: AdminRefreshablePanelProps) {
  if (!hasContent) {
    return <>{emptyState}</>;
  }

  return (
    <div
      className={`admin-refreshable-panel${loading ? " admin-refreshable-panel--loading" : ""}`}
    >
      {loading ? (
        <div
          className="admin-refreshable-panel__overlay"
          aria-live="polite"
          aria-busy="true"
        >
          <CircularProgress size={32} sx={{ color: "#bb3d4b" }} />
        </div>
      ) : null}
      <div className="admin-refreshable-panel__content">{children}</div>
    </div>
  );
}
