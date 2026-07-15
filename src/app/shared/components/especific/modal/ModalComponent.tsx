"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { MdCheckCircle, MdError, MdInfo, MdWarningAmber } from "react-icons/md";
import { Modal, Typography } from "@mui/material";
import Box from "@mui/material/Box";

type ModalType = "success" | "error" | "warning" | "info";

const ModalComponent = ({
  isOpen,
  onClose,
  type = "success",
  title,
  content,
  children,
  onConfirm,
  showActions,
}: {
  isOpen: boolean;
  onClose: () => void;
  type: ModalType;
  title: string;
  content: any;
  children: React.ReactNode;
  onConfirm: () => void;
  showActions: boolean;
}) => {
  const [isVisible, setIsVisible] = useState(false);

  // useEffect(() => {
  //   if (isOpen) {
  //     setIsVisible(true);
  //     document.body.style.overflow = "hidden";
  //   } else {
  //     document.body.style.overflow = "unset";
  //   }

  //   return () => {
  //     document.body.style.overflow = "unset";
  //   };
  // }, [isOpen, type]);

  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      setIsVisible(true);
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
    }
  }, [isOpen, type]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    handleClose();
  };

  const getTypeConfig = () => {
    const configs = {
      success: {
        icon: CheckCircle,
        bgColor: "bg-green-50",
        iconColor: "text-green-500",
        borderColor: "border-green-200",
        buttonColor: "bg-green-600 hover:bg-green-700",
        type: "success",
      },
      error: {
        icon: AlertCircle,
        bgColor: "bg-red-50",
        iconColor: "text-red-500",
        borderColor: "border-red-200",
        buttonColor: "bg-red-600 hover:bg-red-700",
        type: "error",
      },
      warning: {
        icon: AlertTriangle,
        bgColor: "bg-yellow-50",
        iconColor: "text-yellow-500",
        borderColor: "border-yellow-200",
        buttonColor: "bg-yellow-600 hover:bg-yellow-700",
        type: "warning",
      },
      info: {
        icon: Info,
        bgColor: "bg-blue-50",
        iconColor: "text-blue-500",
        borderColor: "border-blue-200",
        buttonColor: "bg-blue-600 hover:bg-blue-700",
        type: "info",
      },
    };
    return configs[type] || configs.info;
  };

  const config = getTypeConfig();
  const IconComponent = config.icon;

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 flex items-center justify-center w-auto`}>
      <Modal
        className="flex justify-center items-center"
        open={isVisible}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
        sx={{
          zIndex: 1300,
        }}
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: "rgba(15, 23, 42, 0.6)",
              backdropFilter: "blur(4px)",
            }
          }
        }}
      >
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{
            background: "white",
            width: "90vw",
            maxWidth: "800px",
            maxHeight: "90vh",
            overflowY: "auto",
            borderRadius: "16px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            outline: "none",
            display: "flex",
            flexDirection: "column",
            paddingBottom: "24px",
          }}
          className="animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Cabecera con botón cerrar */}
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 16px 0 0" }}>
            <button
              onClick={handleClose}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                color: "#9ca3af",
                transition: "background-color 0.2s, color 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f3f4f6";
                e.currentTarget.style.color = "#4b5563";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#9ca3af";
              }}
              aria-label="Cerrar modal"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>

          {/* Ícono y Título */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 24px 8px 24px", textAlign: "center" }}>
            <div 
              className={`${config.bgColor} ${config.iconColor}`}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "64px", height: "64px", borderRadius: "50%", marginBottom: "16px" }}
            >
              <IconComponent size={32} strokeWidth={2} />
            </div>
            
            <Typography
              id="modal-modal-title"
              variant="h6"
              component="h2"
              sx={{
                color: type === 'error' ? '#ef4444' : '#1f2937',
                fontWeight: "700",
                fontSize: "1.25rem",
                lineHeight: "1.75rem",
                marginBottom: "8px"
              }}
            >
              {title}
            </Typography>
          </div>

          {/* Contenido */}
          <div style={{ display: "flex", justifyContent: "center", padding: "0 24px 24px 24px", color: "#4b5563", textAlign: "left", fontSize: "15px" }}>
            <div style={{ width: "100%", textAlign: "left" }}>
              {content}
            </div>
          </div>

          {/* Botones de Acción */}
          {showActions && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", padding: "8px 24px 0 24px" }}>
              <button
                style={{
                  padding: "10px 24px",
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  fontWeight: "500",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  transition: "background-color 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#e5e7eb"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                onClick={handleClose}
              >
                Cancelar
              </button>
              <button
                style={{
                  padding: "10px 24px",
                  backgroundColor: type === 'error' ? '#dc2626' : '#bb3d4b',
                  color: "white",
                  fontWeight: "500",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                  transition: "background-color 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = type === 'error' ? '#b91c1c' : '#a03440'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = type === 'error' ? '#dc2626' : '#bb3d4b'}
                onClick={handleConfirm}
              >
                Aceptar
              </button>
            </div>
          )}
        </Box>
      </Modal>
    </div>
  );
};

export default ModalComponent;
