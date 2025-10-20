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
import { MdCardGiftcard, MdCreditCard, MdMoney } from "react-icons/md";

const GridDashboard = ({
  handleChangeStatusShip,
  handleChangeStatusPay,
  rows,
}: {
  handleChangeStatusShip: any;
  handleChangeStatusPay: any;
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
              className="flex justify-center flex-col items-center min-h-[100%] overflow-y-auto"
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
        field: "address",
        headerName: "Dirección",
        minWidth: 300,
        maxWidth: 400,
        renderCell: (params) => {
          return (
            <div
              className="flex justify-center flex-col items-center min-h-[100%] overflow-y-auto"
              style={{
                padding: "10px",
              }}
            >
              <div className="w-full flex flex-col">
                {Array.isArray(params.value) &&
                  params.value.slice(0, 1).map((item, index) => {
                    return item.street == null ? (
                      <div
                        className="w-full flex justify-center gap-1"
                        key={index}
                        style={{ marginTop: "5px", marginBottom: "5px" }}
                      >
                        <span className="text-[#808080] font-bold">
                          {"Entrega en sucursal"}
                        </span>
                      </div>
                    ) : (
                      <div
                        className="w-full flex flex-col gap-1"
                        key={index}
                        style={{ marginTop: "5px", marginBottom: "5px" }}
                      >
                        <div className="flex gap-2">
                          <span className="text-[#808080] font-bold">
                            Calle:
                          </span>
                          <span>{item.street}</span>
                        </div>

                        <div className="flex gap-2">
                          <span className="text-[#808080] font-bold">
                            No.Ext:
                          </span>
                          <span>{item.noExt}</span>
                        </div>

                        <div className="flex gap-2">
                          <span className="text-[#808080] font-bold">
                            No.Int:
                          </span>
                          <span>{item.noInt}</span>
                        </div>

                        <div className="flex gap-2">
                          <span className="text-[#808080] font-bold">
                            Colonia:
                          </span>
                          <span>{item.cologne}</span>
                        </div>

                        <div className="flex gap-2">
                          <span className="text-[#808080] font-bold">
                            Estado:
                          </span>
                          <span>{item.state}</span>
                        </div>

                        <div className="flex gap-2">
                          <span className="text-[#808080] font-bold">
                            Ciudad:
                          </span>
                          <span>{item.city}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        },
      },
      {
        field: "method_pay",
        headerName: "Metodo de pago",
        minWidth: 200,
        maxWidth: 300,
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
                {params.value == "tarjeta_de_debito" ||
                params.value == "tarjeta_de_credito" ? (
                  <span className="flex gap-2">
                    Tarjeta <MdCreditCard size={22} />{" "}
                  </span>
                ) : params.value == "efectivo_sucursal" ? (
                  <span className="flex gap-2">
                    Efectivo <MdMoney size={22} />{" "}
                  </span>
                ) : params.value == "oxxo" ? (
                  <span className="flex gap-2">
                    <img
                      src={"/oxxo.png"}
                      width={50}
                      height={50}
                      className="object-contain"
                    />{" "}
                  </span>
                ) : params.value == "tarjeta_sucursal" ? (
                  <span className="flex gap-2">
                    Tarjeta <MdCreditCard size={22} />{" "}
                  </span>
                ) : (
                  params.value
                )}
              </span>
            </div>
          );
        },
      },
      // {
      //   field: "statusPay",
      //   minWidth: 200,
      //   headerName: "Estado de pago",
      //   renderCell: (params) => {
      //     return (
      //       <div
      //         className="flex justify-center items-center min-h-[100%]"
      //         style={{
      //           padding: "10px",
      //         }}
      //       >
      //         <Stack>
      //           <Chip
      //             label={
      //               params.value == "paid"
      //                 ? "Pagado"
      //                 : params.value == "pending" ||
      //                   params.value == "payment_pending"
      //                 ? "Pendiente"
      //                 : params.value == "cancelled"
      //                 ? "Cancelado"
      //                 : params.value == "rejected"
      //                 ? "Rechazado"
      //                 : params.value == "refunded"
      //                 ? "Reembolsado"
      //                 : params.value == "charged_back"
      //                 ? "Retornado"
      //                 : "Desconocido"
      //             }
      //             color={
      //               params.value == "paid"
      //                 ? "success"
      //                 : params.value == "pending" ||
      //                   params.value == "payment_pending"
      //                 ? "primary"
      //                 : params.value == "cancelled"
      //                 ? "error"
      //                 : params.value == "rejected"
      //                 ? "error"
      //                 : params.value == "refunded"
      //                 ? "info"
      //                 : params.value == "charged_back"
      //                 ? "error"
      //                 : "info"
      //             }
      //           />
      //         </Stack>
      //       </div>
      //     );
      //   },
      // },
      // {
      //   field: "statusShip",
      //   minWidth: 200,
      //   headerName: "Estado de envío",
      //   renderCell: (params) => {
      //     return (
      //       <div
      //         className="flex justify-center items-center min-h-[100%]"
      //         style={{
      //           padding: "10px",
      //         }}
      //       >
      //         <Stack direction="row" spacing={1}>
      //           <Chip
      //             label={params.value}
      //             color={
      //               params.value == "entregado"
      //                 ? "success"
      //                 : params.value == "cancelado"
      //                 ? "error"
      //                 : params.value == "enviado"
      //                 ? "info"
      //                 : params.value == "procesando"
      //                 ? "info"
      //                 : "default"
      //             }
      //           />
      //         </Stack>
      //       </div>
      //     );
      //   },
      // },
      // {
      //   field: "actionsPay",
      //   headerName: "Acciones de Pago",
      //   width: 300,
      //   renderCell: (params) => {
      //     const currentRow = rows.find(
      //       (row: any) => row.idShipment === params.row.idShipment
      //     );
      //     const currentStatusPay = currentRow?.statusPay || "";

      //     return (
      //       <div
      //         className="flex justify-center items-center min-h-[100%]"
      //         style={{
      //           padding: "10px",
      //         }}
      //       >
      //         <FormControl fullWidth>
      //           <Select
      //             labelId="demo-simple-select-label"
      //             id="demo-simple-select"
      //             value={currentStatusPay}
      //             onChange={(event) => {
      //               handleChangeStatusPay(
      //                 event,
      //                 params.row.idOrder,
      //                 params.row.idUser
      //               );
      //               // handleChangeStatusShip(
      //               //   event,
      //               //   params.row.idShipment,
      //               //   params.row.idUser
      //               // )
      //             }}
      //           >
      //             <MenuItem value={"paid"}>Pagado</MenuItem>
      //             <MenuItem value={"pending"}>Pendiente</MenuItem>
      //             <MenuItem value={"cancelled"}>Cancelado</MenuItem>
      //             <MenuItem value={"rejected"}>Rechazado</MenuItem>
      //             <MenuItem value={"refunded"}>Reembolsado</MenuItem>
      //             <MenuItem value={"charged_back"}>Desconocido</MenuItem>
      //           </Select>
      //         </FormControl>
      //       </div>
      //     );
      //   },
      // },
      {
        field: "actionsShipment",
        headerName: "Acciones",
        width: 300,
        renderCell: (params) => {
          const currentRow = rows.find(
            (row: any) => row.idShipment === params.row.idShipment
          );
          const currentStatus = currentRow?.statusShip || "";
          const currentStatusPay = currentRow?.statusPay || "";

          return (
            <div
              className="flex justify-center flex-col items-center min-h-[100%]"
              style={{
                padding: "10px",
              }}
            >
              <div className="w-full">
                <span>Estatus Envío</span>
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

              <div className="w-full" style={{ marginTop: "5px" }}>
                <span>Estatus Pago</span>
                <FormControl fullWidth>
                  <Select
                    labelId="demo-simple-select-label"
                    id="demo-simple-select"
                    value={currentStatusPay}
                    onChange={(event) => {
                      handleChangeStatusPay(
                        event,
                        params.row.idOrder,
                        params.row.idUser
                      );
                    }}
                  >
                    <MenuItem value={"paid"}>Pagado</MenuItem>
                    <MenuItem value={"pending"}>Pendiente</MenuItem>
                    <MenuItem value={"cancelled"}>Cancelado</MenuItem>
                    <MenuItem value={"rejected"}>Rechazado</MenuItem>
                    <MenuItem value={"refunded"}>Reembolsado</MenuItem>
                    <MenuItem value={"charged_back"}>Desconocido</MenuItem>
                  </Select>
                </FormControl>
              </div>
            </div>
          );
        },
      },
      {
        field: "",
      },
    ],
    [rows]
  );

  return {
    columns,
  };
};

export default GridDashboard;
