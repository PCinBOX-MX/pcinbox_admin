"use client";

import { useState, useEffect, useRef } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { MdCheckCircle, MdError, MdInfo, MdWarningAmber, MdAutorenew } from "react-icons/md";
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
  maxWidth,
  loading = false,
  confirmLabel = "Aceptar",
  cancelLabel = "Cancelar",
}: {
  isOpen: boolean;
  onClose: () => void;
  type: ModalType;
  title: string;
  content: any;
  children: React.ReactNode;
  onConfirm: () => void;
  showActions: boolean;
  maxWidth?: string;
  loading?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

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

  const initialSnapshot = useRef<string | null>(null);

  const getSnapshot = () => {
    if (!boxRef.current) return null;
    const inputs = boxRef.current.querySelectorAll("input, textarea");
    const vals: any[] = [];
    inputs.forEach((input: any) => {
      if (
        input.type !== "submit" &&
        input.type !== "button" &&
        input.type !== "file" &&
        !input.readOnly &&
        !input.disabled
      ) {
        if (input.type === "checkbox" || input.type === "radio") {
          vals.push(input.checked);
        } else {
          vals.push(input.value);
        }
      }
    });
    return JSON.stringify(vals);
  };

  useEffect(() => {
    if (isOpen) {
      initialSnapshot.current = null;

      // Retrasar el snapshot 800ms para ignorar autocompletado y carga de datos asíncrona
      const timer = setTimeout(() => {
        initialSnapshot.current = getSnapshot();
      }, 800);

      const scrollY = window.scrollY;
      setIsVisible(true);
      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.position = "fixed";
      document.documentElement.style.top = `-${scrollY}px`;
      document.documentElement.style.width = "100%";

      return () => {
        clearTimeout(timer);
        document.documentElement.style.overflow = "";
        document.documentElement.style.position = "";
        document.documentElement.style.top = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen, type]);

  useEffect(() => {
    if (!loading) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [loading]);

  const handleClose = () => {
    if (loading) return;
    if (initialSnapshot.current !== null) {
      const currentSnapshot = getSnapshot();
      if (currentSnapshot !== null && currentSnapshot !== initialSnapshot.current) {
        setShowConfirmClose(true);
        return;
      }
    }
    forceClose();
  };

  const forceClose = () => {
    if (loading) return;
    setIsVisible(false);
    setShowConfirmClose(false);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleConfirm = () => {
    if (loading) return;
    if (onConfirm) {
      onConfirm();
    }
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
        onClose={(_, reason) => {
          // Bloquear backdrop / Escape mientras loading (p. ej. import Excel).
          if (loading) return;
          if (reason === "backdropClick" || reason === "escapeKeyDown") {
            handleClose();
            return;
          }
          handleClose();
        }}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
        sx={{
          zIndex: 1300,
        }}
        slotProps={{
          backdrop: {
            className: "animate-fade-in-overlay",
            sx: {
              backgroundColor: "rgba(15, 23, 42, 0.6)",
              backdropFilter: "blur(4px)",
              pointerEvents: loading ? "none" : "auto",
            }
          }
        }}
      >
        <Box
          ref={boxRef}
          onClick={(e) => e.stopPropagation()}
          sx={{
            width: "fit-content",
            minWidth: "min(90vw, 320px)",
            maxWidth: maxWidth || "min(90vw, 600px)",
          }}
          className="admin-modal-box animate-in fade-in zoom-in-95 duration-200"
        >
          <div style={{ display: "flex", justifyContent: "flex-end", flexShrink: 0, padding: "16px 16px 0 0" }}>
          <button
            onClick={handleClose}
            disabled={loading}
            className="admin-modal-close"
            aria-label="Cerrar modal"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, padding: "0 24px 8px 24px", textAlign: "center" }}>
            <div 
              className={`admin-modal-icon ${config.bgColor} ${config.iconColor}`}
            >
              <IconComponent size={34} strokeWidth={2} />
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

          {/* Contenido: unico contenedor con scroll */}
          <div
            className="admin-modal-content-scroll"
            style={{
              display: "flex",
              flex: "1 1 auto",
              minHeight: 0,
              overflowX: "hidden",
              overflowY: "auto",
              padding: "0 28px 28px",
              margin: 0,
            }}
          >
            <div className="admin-modal-content-inner" style={{ margin: 0, padding: 0, width: "100%" }}>
              {content}
            </div>
          </div>
          {/* Botones de Accion */}
          {showActions && (
            <div className="admin-modal-actions">
              <button
                disabled={loading}
                className="admin-modal-btn-cancel"
                onClick={handleClose}
              >
                {cancelLabel}
              </button>
              <button
                disabled={loading}
                className="admin-modal-btn-confirm"
                style={{
                  background:
                    type === "error"
                      ? "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"
                      : undefined,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
                onClick={handleConfirm}
              >
                {loading && <MdAutorenew size={18} className="the-spinner" />}
                {loading ? "Procesando…" : confirmLabel}
              </button>
            </div>
          )}
        </Box>
      </Modal>

      {/* Segundo Modal de Confirmacin para Cierre */}
      {showConfirmClose && (
        <Modal
          open={showConfirmClose}
          onClose={() => setShowConfirmClose(false)}
          sx={{ zIndex: 1400 }}
          className="flex justify-center items-center"
          slotProps={{
            backdrop: {
              className: "animate-fade-in-overlay",
              sx: { backgroundColor: "rgba(0, 0, 0, 0.6)" }
            }
          }}
        >
          <Box className="admin-modal-box" sx={{ maxWidth: "400px", padding: "24px", textAlign: "center" }}>
            <AlertTriangle size={48} color="#eab308" style={{ margin: "0 auto 16px auto" }} />
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
              ¿Descartar cambios?
            </Typography>
            <Typography sx={{ color: "#4b5563", mb: 3 }}>
              Tienes datos sin guardar. ¿Estás seguro de que deseas cerrar y perder la información?
            </Typography>
            <div className="admin-modal-actions">
              <button
                onClick={() => setShowConfirmClose(false)}
                className="admin-modal-btn-cancel"
              >
                No, volver
              </button>
              <button
                onClick={forceClose}
                className="admin-modal-btn-confirm"
                style={{
                  background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                }}
              >
                Sí, cerrar
              </button>
            </div>
          </Box>
        </Modal>
      )}
    </div>
  );
};

export default ModalComponent;
