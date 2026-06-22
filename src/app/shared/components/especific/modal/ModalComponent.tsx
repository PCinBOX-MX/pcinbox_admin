"use client";

import { useEffect } from "react";
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import { Modal } from "@mui/material";
import Box from "@mui/material/Box";

type ModalType = "success" | "error" | "warning" | "info";
type ModalSize = "sm" | "md" | "lg" | "xl";

const SIZE_MAP: Record<ModalSize, { maxWidth: number; minWidth: number }> = {
  sm: { maxWidth: 420, minWidth: 320 },
  md: { maxWidth: 560, minWidth: 360 },
  lg: { maxWidth: 760, minWidth: 480 },
  xl: { maxWidth: 980, minWidth: 560 },
};

const ModalComponent = ({
  isOpen,
  onClose,
  type = "success",
  title,
  content,
  onConfirm,
  showActions,
  size = "md",
  confirmLabel = "Aceptar",
  showCancel = true,
}: {
  isOpen: boolean;
  onClose: () => void;
  type: ModalType;
  title: string;
  content: React.ReactNode;
  children?: React.ReactNode;
  onConfirm: () => void;
  showActions: boolean;
  size?: ModalSize;
  confirmLabel?: string;
  showCancel?: boolean;
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.position = "fixed";
    document.documentElement.style.top = `-${scrollY}px`;
    document.documentElement.style.width = "100%";

    return () => {
      document.documentElement.style.overflow = "";
      document.documentElement.style.position = "";
      document.documentElement.style.top = "";
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  const handleClose = () => {
    onClose();
  };

  const handleConfirm = () => {
    onConfirm?.();
    handleClose();
  };

  const getTypeConfig = () => {
    const configs = {
      success: {
        icon: CheckCircle,
        accent: "#16a34a",
        soft: "#f0fdf4",
        border: "#bbf7d0",
      },
      error: {
        icon: AlertCircle,
        accent: "#dc2626",
        soft: "#fef2f2",
        border: "#fecaca",
      },
      warning: {
        icon: AlertTriangle,
        accent: "#d97706",
        soft: "#fffbeb",
        border: "#fde68a",
      },
      info: {
        icon: Info,
        accent: "#bb3d4b",
        soft: "#fdf2f3",
        border: "#f5c6cb",
      },
    };
    return configs[type] || configs.info;
  };

  const config = getTypeConfig();
  const IconComponent = config.icon;
  const dimensions = SIZE_MAP[size] ?? SIZE_MAP.md;

  if (!isOpen) return null;

  return (
    <Modal
      className="admin-modal-root"
      open={isOpen}
      onClose={handleClose}
      aria-labelledby="admin-modal-title"
      aria-describedby="admin-modal-description"
      sx={{ zIndex: 1400 }}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
          },
        },
      }}
    >
      <Box
        className="admin-modal"
        onClick={(e) => e.stopPropagation()}
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "calc(100% - 2rem)",
          maxWidth: dimensions.maxWidth,
          maxHeight: "calc(100vh - 2.5rem)",
          display: "flex",
          flexDirection: "column",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow:
            "0 24px 48px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(255,255,255,0.06)",
          bgcolor: "#fff",
          outline: "none",
        }}
      >
        <div
          className="admin-modal__header"
          style={{
            borderBottomColor: config.border,
            background: `linear-gradient(135deg, ${config.soft} 0%, #ffffff 55%)`,
          }}
        >
          <div className="admin-modal__header-main">
            <span
              className="admin-modal__type-icon"
              style={{
                color: config.accent,
                background: config.soft,
                borderColor: config.border,
              }}
            >
              <IconComponent size={20} strokeWidth={2.25} />
            </span>
            <div className="admin-modal__titles">
              <p className="admin-modal__eyebrow">PCinBOX Admin</p>
              <h2 id="admin-modal-title" className="admin-modal__title">
                {title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="admin-modal__close"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        <div id="admin-modal-description" className="admin-modal__body">
          {content}
        </div>

        {showActions ? (
          <div className="admin-modal__footer">
            <button
              type="button"
              className="admin-btn admin-btn--primary admin-modal__btn-primary"
              onClick={handleConfirm}
            >
              {confirmLabel}
            </button>
            {showCancel ? (
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-modal__btn-secondary"
                onClick={handleClose}
              >
                Cancelar
              </button>
            ) : null}
          </div>
        ) : null}
      </Box>
    </Modal>
  );
};

export default ModalComponent;
