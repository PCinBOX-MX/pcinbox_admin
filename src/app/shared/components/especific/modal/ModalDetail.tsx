"use client";

import { ReactNode } from "react";

export function ModalDetailGrid({
  children,
  columns = 2,
}: {
  children: ReactNode;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div
      className="admin-modal-detail-grid"
      data-columns={columns}
    >
      {children}
    </div>
  );
}

export function ModalDetailField({
  label,
  value,
  fullWidth = false,
  highlight = false,
}: {
  label: string;
  value: ReactNode;
  fullWidth?: boolean;
  highlight?: boolean;
}) {
  if (value == null || value === "") return null;

  return (
    <div
      className={`admin-modal-detail-field${fullWidth ? " admin-modal-detail-field--full" : ""}${highlight ? " admin-modal-detail-field--highlight" : ""}`}
    >
      <span className="admin-modal-detail-field__label">{label}</span>
      <span className="admin-modal-detail-field__value">{value}</span>
    </div>
  );
}

export function ModalDetailSection({
  title,
  icon,
  children,
  variant = "default",
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  variant?: "default" | "accent" | "muted";
}) {
  return (
    <section
      className={`admin-modal-detail-section admin-modal-detail-section--${variant}`}
    >
      <header className="admin-modal-detail-section__header">
        {icon ? (
          <span className="admin-modal-detail-section__icon">{icon}</span>
        ) : null}
        <h4 className="admin-modal-detail-section__title">{title}</h4>
      </header>
      <div className="admin-modal-detail-section__body">{children}</div>
    </section>
  );
}
