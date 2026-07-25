"use client";
import { useTheContext } from "@/app/hooks/global.hook";
import { GridLoader } from "react-spinners";

import { useEffect } from "react";

const SpinnerComponent = () => {
  const { showSpinner } = useTheContext();

  useEffect(() => {
    if (!showSpinner) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Enter, Space, Tab to prevent triggering focused elements
      if (e.key === "Enter" || e.key === " " || e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Capture phase to intercept before React or other listeners
    document.addEventListener("keydown", handleKeyDown, true);
    
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [showSpinner]);

  return showSpinner ? (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <GridLoader
        color="#bb3d4b"
        cssOverride={{
          display: "block",
          margin: "0 auto",
        }}
        aria-label="Cargando..."
        size={20}
        loading={showSpinner}
        title="Cargando..."
      />
    </div>
  ) : null;
};

export default SpinnerComponent;
