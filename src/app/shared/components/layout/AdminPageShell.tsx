"use client";

import { ReactNode } from "react";

type AdminPageShellProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  filters?: ReactNode;
  paginationTop?: ReactNode;
  paginationBottom?: ReactNode;
  children: ReactNode;
};

const AdminPageShell = ({
  title,
  subtitle,
  actions,
  filters,
  paginationTop,
  paginationBottom,
  children,
}: AdminPageShellProps) => {
  return (
    <div className="admin-page-shell">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{title}</h1>
          {subtitle && <p className="admin-page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="admin-page-actions">{actions}</div>}
      </header>

      {filters && <div className="admin-filters-card">{filters}</div>}

      {paginationTop && (
        <div className="admin-pagination-bar admin-pagination-top">
          {paginationTop}
        </div>
      )}

      <div className="admin-content-card">{children}</div>

      {paginationBottom && (
        <div className="admin-pagination-bar admin-pagination-bottom">
          {paginationBottom}
        </div>
      )}
    </div>
  );
};

export default AdminPageShell;
