"use client";

import { RefreshCw } from "lucide-react";

type AdminRefreshButtonProps = {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
};

export default function AdminRefreshButton({
  onClick,
  loading = false,
  disabled = false,
  label = "Actualizar",
  className = "",
}: AdminRefreshButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`admin-btn-secondary ${className}`.trim()}
      disabled={disabled || loading}
    >
      <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
      {label}
    </button>
  );
}
