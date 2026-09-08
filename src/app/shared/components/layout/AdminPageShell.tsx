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
      <header
        className="admin-page-header"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 20,
          marginBottom: 28,
          padding: 0,
        }}
      >
        <div
          className="admin-page-header__lead"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 18,
            margin: 0,
            padding: 0,
          }}
        >
          <span
            className="admin-page-header__mark"
            aria-hidden
            style={{ marginTop: 2, padding: 0 }}
          />
          <div className="admin-page-header__text" style={{ margin: 0, padding: 0 }}>
            <h1 className="admin-page-title" style={{ margin: 0, padding: 0 }}>
              {title}
            </h1>
            {subtitle && (
              <p
                className="admin-page-subtitle"
                style={{ marginTop: 8, marginBottom: 0, padding: 0 }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="admin-page-actions" style={{ margin: 0, padding: 0, gap: 10 }}>
            {actions}
          </div>
        )}
      </header>

      {filters && (
        <div
          className="admin-filters-card"
          style={{ padding: "22px 26px", marginBottom: 18 }}
        >
          {filters}
        </div>
      )}

      {paginationTop && (
        <div
          className="admin-pagination-bar admin-pagination-top"
          style={{ padding: "8px 4px", marginBottom: 8 }}
        >
          {paginationTop}
        </div>
      )}

      <div className="admin-content-card" style={{ padding: 0, margin: 0 }}>
        <div
          className="admin-content-card__inner"
          style={{ padding: 6, margin: 0 }}
        >
          {children}
        </div>
      </div>

      {paginationBottom && (
        <div
          className="admin-pagination-bar admin-pagination-bottom"
          style={{ padding: "8px 4px", marginTop: 12 }}
        >
          {paginationBottom}
        </div>
      )}
    </div>
  );
};

export default AdminPageShell;
