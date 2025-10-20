"use client";
import { useTheContext } from "@/app/hooks/global.hook";
import { GridLoader } from "react-spinners";

const SpinnerComponent = () => {
  const { showSpinner } = useTheContext();

  return showSpinner ? (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
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
