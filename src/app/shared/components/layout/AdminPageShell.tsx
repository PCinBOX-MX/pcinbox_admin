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
        <div className="admin-page-header__lead">
          <span className="admin-page-header__mark" aria-hidden />
          <div className="admin-page-header__text">
            <h1 className="admin-page-title">{title}</h1>
            {subtitle ? (
              <p className="admin-page-subtitle">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="admin-page-actions">{actions}</div> : null}
      </header>

      {filters ? <div className="admin-filters-card">{filters}</div> : null}

      {paginationTop ? (
        <div className="admin-pagination-bar admin-pagination-top">
          {paginationTop}
        </div>
      ) : null}

      <div className="admin-content-card">
        <div className="admin-content-card__inner">{children}</div>
      </div>

      {paginationBottom ? (
        <div className="admin-pagination-bar admin-pagination-bottom">
          {paginationBottom}
        </div>
      ) : null}
    </div>
  );
};

export default AdminPageShell;
