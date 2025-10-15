"use client";

import { GridColDef, GridRowsProp } from "@mui/x-data-grid";
import UtilsService from "../services/utils";
import {
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from "@mui/material";
//  import useDashboard from "./useDashboard";
import { useMemo } from "react";
import { SalesI } from "../interfaces/sales/sales.interface";

const GridDashboard = ({
  handleChangeStatusShip,
  rows,
}: {
  handleChangeStatusShip: any;
  rows: any;
}) => {
  const { formatCurrency } = UtilsService();
  //  const { handleChangeStatusShip, rows } = useDashboard();

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "idOrder",
        headerName: "No.Orden",
        width: 100,
        maxWidth: 250,
        renderCell: (params) => {
          return (
            <div
              className="flex justify-center items-center min-h-[100%] flex-wrap"
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
                #{params.value}
              </span>
            </div>
          );
        },
      },
      {
        field: "name",
        headerName: "Nombre del Cliente",
        width: 240,
        minWidth: 240,
        maxWidth: 250,
        renderCell: (params) => {
          return (
            <div
              className="flex justify-center items-center min-h-[100%]"
              style={{
                padding: "10px",
              }}
            >
              <span
                className="text-[#808080] block text-center"
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
        field: "products",
        headerName: "Productos",
        renderCell: (params) => {
          return (
            <div
              className="flex justify-center flex-col items-center min-h-[100%]"
              style={{
                padding: "10px",
              }}
            >
              <div className="w-full flex flex-col">
                {Array.isArray(params.value) &&
                  params.value.map((item, index) => {
                    return (
                      <div
                        className="w-full flex flex-col gap-1"
                        key={index}
                        style={{ marginTop: "5px", marginBottom: "5px" }}
                      >
                        <div className="flex gap-2">
                          <span className="text-[#808080] font-bold">
                            Nombre:
                          </span>
                          <span>{item.productName}</span>
                        </div>

                        <div className="flex gap-2">
                          <span className="text-[#808080] font-bold">
                            Descripcion:
                          </span>
                          <span title={item.description}>
                            {item.description && item.description.length > 30
                              ? `${item.description.slice(0, 30)}...`
                              : item.description}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <span className="text-[#808080] font-bold">
                            Cantidad:
                          </span>
                          <span>{item.quantity}</span>
                        </div>
                        {params.value.length > 1 && <hr />}
                      </div>
                    );
                  })}
              </div>
              {/* <span
              className="text-[#808080] block"
              style={{
                fontSize: "18px",
                fontWeight: "600",
                wordBreak: "break-word",
              }}
            >
              {JSON.stringify(params.value)}
            </span> */}
            </div>
          );
        },
        minWidth: 500,
        maxWidth: 520,
      },

      {
        field: "totalAmount",
        headerName: "Pago Total",
        minWidth: 200,
        renderCell: (params) => {
          return (
            <div
              className="flex justify-center items-center min-h-[100%]"
              style={{
                padding: "10px",
              }}
            >
              <span
                className="text-[#808080] block text-center"
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  wordBreak: "break-word",
                }}
              >
                {formatCurrency(Number(params.value))}
              </span>
            </div>
          );
        },
      },

      {
        field: "statusPay",
        minWidth: 200,
        headerName: "Estado de pago",
        renderCell: (params) => {
          return (
            <div
              className="flex justify-center items-center min-h-[100%]"
              style={{
                padding: "10px",
              }}
            >
              <Stack>
                <Chip
                  label={
                    params.value == "paid"
                      ? "Pagado"
                      : params.value == "pending" ||
                        params.value == "payment_pending"
                      ? "Pendiente"
                      : params.value == "cancelled"
                      ? "Cancelado"
                      : params.value == "rejected"
                      ? "Rechazado"
                      : params.value == "refunded"
                      ? "Reembolsado"
                      : params.value == "charged_back"
                      ? "Retornado"
                      : "Desconocido"
                  }
                  color={
                    params.value == "paid"
                      ? "success"
                      : params.value == "pending" ||
                        params.value == "payment_pending"
                      ? "primary"
                      : params.value == "cancelled"
                      ? "error"
                      : params.value == "rejected"
                      ? "error"
                      : params.value == "refunded"
                      ? "info"
                      : params.value == "charged_back"
                      ? "error"
                      : "info"
                  }
                />
              </Stack>
            </div>
          );
        },
      },
      {
        field: "statusShip",
        minWidth: 200,
        headerName: "Estado de envío",
        renderCell: (params) => {
          return (
            <div
              className="flex justify-center items-center min-h-[100%]"
              style={{
                padding: "10px",
              }}
            >
              <Stack direction="row" spacing={1}>
                <Chip
                  label={params.value}
                  color={
                    params.value == "entregado"
                      ? "success"
                      : params.value == "cancelado"
                      ? "error"
                      : params.value == "enviado"
                      ? "info"
                      : params.value == "procesando"
                      ? "info"
                      : "default"
                  }
                />
              </Stack>
            </div>
          );
        },
      },
      {
        field: "actions",
        headerName: "acciones",
        width: 300,

        renderCell: (params) => {
          const currentRow = rows.find(
            (row: any) => row.idShipment === params.row.idShipment
          );
          const currentStatus = currentRow?.statusShip || "";

          return (
            <div
              className="flex justify-center items-center min-h-[100%]"
              style={{
                padding: "10px",
              }}
            >
              <FormControl fullWidth>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={currentStatus}
                  onChange={(event) =>
                    handleChangeStatusShip(
                      event,
                      params.row.idShipment,
                      params.row.idUser
                    )
                  }
                >
                  <MenuItem value={"entregado"}>Entregado</MenuItem>
                  <MenuItem value={"cancelado"}>Cancelado</MenuItem>
                  <MenuItem value={"enviado"}>Enviado</MenuItem>
                  <MenuItem value={"procesando"}>Procesando</MenuItem>
                </Select>
              </FormControl>
            </div>
          );
        },
      },
    ],
    [rows]
  );

  return {
    columns,
  };
};

export default GridDashboard;
