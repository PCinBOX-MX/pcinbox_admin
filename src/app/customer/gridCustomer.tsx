"use client";

import styles from "./customer.module.css";
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
        headerName: "#ID",
        flex: 1,
        renderCell: (params) => {
          return (
            <div
              className={`${styles.truncateCell} flex justify-center flex-col items-center min-h-[100%] overflow-y-auto`}
              style={{
                padding: "10px",
              }}
            >
              <span
                className="block text-center font-bold"
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
        flex: 1,

        renderCell: (params) => {
          return (
            <div
              className={`${styles.truncateCell} flex justify-center flex-col items-center min-h-[100%] overflow-y-auto`}
              style={{
                padding: "10px",
              }}
            >
              <span
                className="block text-center"
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
        flex: 1,
        renderCell: (params) => {
          return (
            <div
              className={`${styles.truncateCell} flex justify-center flex-col items-center min-h-[100%] overflow-y-auto`}
              style={{
                padding: "10px",
              }}
            >
              <span
                className="block text-center"
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
        flex: 1,
        renderCell: (params) => {
          return (
            <div
              className={`${styles.truncateCell} flex justify-center flex-col items-center min-h-[100%] overflow-y-auto`}
              style={{
                padding: "10px",
              }}
            >
              <span
                className="text-[black] block text-center font-bold"
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
              className={`${styles.truncateCell} flex justify-center flex-col items-center min-h-[100%] overflow-y-auto`}
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
              className={`${styles.truncateCell} flex justify-center flex-col items-center min-h-[100%] overflow-y-auto`}
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
