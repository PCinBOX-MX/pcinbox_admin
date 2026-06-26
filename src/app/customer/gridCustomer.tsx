"use client";

import styles from "./customer.module.css";
import gridStyles from "@/app/shared/styles/grid-cells.module.css";
import { GridColDef } from "@mui/x-data-grid";
import { useMemo } from "react";

const GridCustomer = ({
  rows,
}: {
  rows: {
    totalRows: number;
    data: any[];
  };
}) => {
  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "idUser",
        headerName: "# ID",
        minWidth: 100,
        width: 110,
        renderCell: (params) => {
          return (
            <div
              className={`${styles.truncateCell} ${gridStyles.cellCol}`}
              style={{
                padding: "10px",
              }}
            >
              <span
                className={gridStyles.cellText}
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  wordBreak: "break-word",
                }}
              >
                #{params.value}
              </span>
            </div>
          );
        },
      },
      {
        field: "name",
        headerName: "Nombre",
        minWidth: 160,
        flex: 1,

        renderCell: (params) => {
          return (
            <div
              className={`${styles.truncateCell} ${gridStyles.cellCol}`}
              style={{
                padding: "10px",
              }}
            >
              <span
                className={gridStyles.cellText}
                style={{
                  fontSize: "15px",
                  wordBreak: "break-word",
                }}
              >
                {params.value}
              </span>
            </div>
          );
        },
      },
      {
        field: "email",
        headerName: "Correo electrónico",
        minWidth: 220,
        flex: 1.2,
        renderCell: (params) => {
          return (
            <div
              className={`${styles.truncateCell} ${gridStyles.cellCol}`}
              style={{
                padding: "10px",
              }}
            >
              <span
                className={gridStyles.cellText}
                style={{
                  fontSize: "15px",
                  wordBreak: "break-word",
                }}
              >
                {params.value}
              </span>
            </div>
          );
        },
      },
      {
        field: "phone",
        headerName: "Teléfono",
        minWidth: 140,
        width: 150,
        renderCell: (params) => {
          return (
            <div
              className={`${styles.truncateCell} ${gridStyles.cellCol}`}
              style={{
                padding: "10px",
              }}
            >
              <span
                className={gridStyles.cellText}
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  wordBreak: "break-word",
                }}
              >
                {params.value}
              </span>
            </div>
          );
        },
      },
      {
        field: "active",
        headerName: "Activo",
        flex: 1,
        renderCell: (params) => {
          return (
            <div
              className={`${styles.truncateCell} ${gridStyles.cellCol}`}
              style={{
                padding: "10px",
              }}
            >
              <p
                className={`block text-center font-bold ${params.value == 1 ? "text-[green]" : "text-[red]"}`}
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  wordBreak: "break-word",
                }}
              >
                {params.value == 1 ? "SÍ" : "NO"}
              </p>
            </div>
          );
        },
      },
      {
        field: "createdAT",
        headerName: "Fecha de Registro",
        flex: 1,
        renderCell: (params) => {
          return (
            <div
              className={`${styles.truncateCell} ${gridStyles.cellCol}`}
              style={{
                padding: "10px",
              }}
            >
              <p
                className={`block text-center font-bold`}
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  wordBreak: "break-word",
                }}
              >
                {new Date(params.value)?.toLocaleString()}
              </p>
            </div>
          );
        },
      },
    ],
    [rows],
  );

  return {
    columns,
  };
};

export default GridCustomer;
