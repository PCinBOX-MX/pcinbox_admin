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
      {/* <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 z-50 ${
          isVisible
            ? "opacity-50 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={handleClose}
      > */}
      <Modal
        className="flex justify-center items-center"
        open={isVisible}
        onClick={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
        sx={{
          zIndex: 1300, // z-index por defecto de MUI Modal
        }}
        BackdropProps={{
          style: {
            backgroundColor: "rgba(0, 0, 0, 0.5)", // Tu fondo negro con opacidad
          },
        }}
      >
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{
            background: "white",
            width: "auto",
            maxWidth: "800px",
            padding: "10px",
            borderRadius: "10px",
          }}
        >
          <div className="flex justify-end items-center">
            <button
              onClick={handleClose}
              className="cursor-pointer font-bold"
              style={{
                padding: "10px",
                fontSize: "18px",
              }}
            >
              X
            </button>
          </div>
          <Typography
            id="modal-modal-title"
            variant="h6"
            component="h2"
            sx={{
              textAlign: "center",
              color: "#bb3d4b",
              fontWeight: "bold",
              fontSize: "25px",
            }}
          >
            {title}
          </Typography>
          <div
            className="flex justify-center"
            style={{
              padding: "10px",

              marginBottom: "10px",
            }}
          >
            {content}
          </div>

          {showActions && showActions == true && (
            <div
              className="flex justify-center items-center gap-3"
              style={{ padding: "10px" }}
            >
              <button
                className="bg-[#bb3d4b] text-white font-bold rounded cursor-pointer"
                style={{ padding: "10px" }}
                onClick={handleConfirm}
              >
                Aceptar
              </button>
              <button
                className="bg-[#808080] text-white font-bold rounded cursor-pointer"
                style={{ padding: "10px" }}
                onClick={handleClose}
              >
                Cancelar
              </button>
            </div>
          )}
        </Box>
      </Modal>
      {/* </div> */}
    </div>
  );
};

export default ModalComponent;
