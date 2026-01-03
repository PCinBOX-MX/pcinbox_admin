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
import {
  MdAccessTime,
  MdAccountBalance,
  MdCheck,
  MdCreditCard,
  MdErrorOutline,
  MdMoney,
} from "react-icons/md";
import { useTheContext } from "../hooks/global.hook";
import useVentasInvitados from "./useVentasInvitados";

const GridVentasInvitados = ({ rows }: { rows?: any }) => {
  const { formatCurrency } = UtilsService();
  const { setDataModal } = useTheContext();

  const { handleChangeStatusShip } = useVentasInvitados();

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "referencia",
        headerName: "No.Orden",
        minWidth: 200,
        maxWidth: 300,
        renderCell: (params) => {
          return (
            <div
              className={`flex justify-center flex-col items-center min-h-[100%] overflow-y-auto`}
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
        field: "dataUser",
        headerName: "Datos Cliente",
        flex: 1,

        renderCell: (params) => {
          return (
            <div
              className="flex justify-center items-center min-h-[100%]"
              style={{
                padding: "10px",
              }}
              onClick={() => {
                setDataModal({
                  isOpen: true,
                  type: "success",
                  content: (
                    <div className="min-w-[550px] max-w-[900px] grid grid-cols-[1fr] gap-2">
                      <div
                        className="border border-gray-200 rounded-lg flex flex-col bg-gray-50 hover:bg-gray-100 transition"
                        style={{
                          padding: "5px",
                        }}
                      >
                        <span className="font-semibold text-[13px] uppercase text-gray-500 tracking-wide block text-center">
                          Nombre
                        </span>
                        <span
                          className="text-[15px] font-medium text-gray-800 block text-center"
                          style={{
                            wordBreak: "break-word",
                          }}
                        >
                          {params.value?.[0]?.name}{" "}
                          {params?.value?.[0]?.lastName}
                        </span>
                      </div>

                      <div
                        className="border border-gray-200 rounded-lg flex flex-col bg-gray-50 hover:bg-gray-100 transition"
                        style={{
                          padding: "5px",
                        }}
                      >
                        <span className="font-semibold text-[13px] uppercase text-gray-500 tracking-wide block text-center">
                          Correo
                        </span>
                        <span
                          className="text-[15px] font-medium text-gray-800 block text-center"
                          style={{
                            wordBreak: "break-word",
                          }}
                        >
                          {params.value?.[0]?.email}
                        </span>
                      </div>

                      <div
                        className="border border-gray-200 rounded-lg flex flex-col bg-gray-50 hover:bg-gray-100 transition"
                        style={{
                          padding: "5px",
                        }}
                      >
                        <span className="font-semibold text-[13px] uppercase text-gray-500 tracking-wide block text-center">
                          Teléfono(1)
                        </span>
                        <span
                          className="text-[15px] font-medium text-gray-800 block text-center"
                          style={{
                            wordBreak: "break-word",
                          }}
                        >
                          {params.value?.[0]?.phone1}
                        </span>
                      </div>

                      <div
                        className="border border-gray-200 rounded-lg flex flex-col bg-gray-50 hover:bg-gray-100 transition"
                        style={{
                          padding: "5px",
                        }}
                      >
                        <span className="font-semibold text-[13px] uppercase text-gray-500 tracking-wide block text-center">
                          Teléfono(2)
                        </span>
                        <span
                          className="text-[15px] font-medium text-gray-800 block text-center"
                          style={{
                            wordBreak: "break-word",
                          }}
                        >
                          {params.value?.[0]?.phone2}
                        </span>
                      </div>
                    </div>
                  ),
                  title: "Datos del usuario",
                  showActions: true,
                  onClose: () => {
                    setDataModal((prev) => ({ ...prev, isOpen: false }));
                  },
                  onConfirm: () => {
                    setDataModal((prev) => ({ ...prev, isOpen: false }));
                  },
                });
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
                {params.value?.[0]?.name}
              </span>
            </div>
          );
        },
      },
      {
        field: "products",
        maxWidth: 250,
        minWidth: 250,
        headerName: "Productos",
        renderCell: (params) => {
          return (
            <div
              className={`flex justify-center flex-col items-center min-h-[100%]`}
              style={{
                padding: "10px",
              }}
              onClick={() => {
                setDataModal({
                  isOpen: true,
                  type: "success",
                  content: (
                    <div className="flex flex-col gap-3 min-w-[500px] max-w-[700px] max-h-[500px] overflow-y-auto pr-2">
                      {Array.isArray(params.value) &&
                        params.value.map((item: any, index: number) => (
                          <div
                            key={item.idProduct}
                            style={{
                              padding: "10px",
                            }}
                            className="rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex flex-col gap-3 p-2">
                              <div>
                                <span className="text-gray-500 text-sm font-semibold block mb-1">
                                  Nombre:
                                </span>
                                <p className="text-gray-900 font-medium">
                                  {item.name}
                                </p>
                              </div>

                              <div className="p-2">
                                <span className="text-gray-500 text-sm font-semibold block mb-1">
                                  Descripción:
                                </span>
                                <p className="text-gray-700">
                                  {item.description}
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-3 p-2">
                                {item?.sku && (
                                  <div className="p-2">
                                    <span className="text-gray-500 text-sm font-semibold block mb-1">
                                      SKU:
                                    </span>
                                    <p className="text-gray-700">{item.sku}</p>
                                  </div>
                                )}

                                {item?.upc && (
                                  <div className="p-2">
                                    <span className="text-gray-500 text-sm font-semibold block mb-1">
                                      UPC:
                                    </span>
                                    <p className="text-gray-700">{item.upc}</p>
                                  </div>
                                )}

                                {item?.clave && (
                                  <div className="p-2">
                                    <span className="text-gray-500 text-sm font-semibold block mb-1">
                                      Clave:
                                    </span>
                                    <p className="text-gray-700">
                                      {item.clave}
                                    </p>
                                  </div>
                                )}

                                <div className="px-2 py-2">
                                  <span className="text-gray-500 text-sm font-semibold block mb-1">
                                    Cantidad:
                                  </span>
                                  <p className="text-gray-700 font-semibold">
                                    {item.quantity}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ),
                  title: "Productos",
                  showActions: true,
                  onClose: () => {
                    setDataModal((prev) => ({ ...prev, isOpen: false }));
                  },
                  onConfirm: () => {
                    setDataModal((prev) => ({ ...prev, isOpen: false }));
                  },
                });
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
                {Array.isArray(params.value) &&
                  `${
                    params.value.length == 1
                      ? `1 Producto`
                      : `${params.value.length} Productos`
                  }`}
              </span>
            </div>
          );
        },
      },

      {
        field: "monto",
        headerName: "Pago Total",
        flex: 1,
        renderCell: (params) => {
          return (
            <div
              className={`flex justify-center flex-col items-center min-h-[100%] overflow-y-auto`}
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
        field: "pay_method",
        headerName: "Metodo de pago",
        flex: 1,
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
                    {/* <img
                      src={"/oxxo.png"}
                      width={50}
                      height={50}
                      className="object-contain"
                    />{" "} */}
                    Efectivo <MdMoney size={22} />
                  </span>
                ) : params.value == "tarjeta_sucursal" ? (
                  <span className="flex gap-2">
                    Tarjeta <MdCreditCard size={22} />{" "}
                  </span>
                ) : params.value == "mercadopago" ? (
                  <img
                    src={"/mercadopago.jpg"}
                    style={{
                      width: "100px",
                      height: "100px",
                      objectFit: "contain",
                    }}
                    loading="lazy"
                  />
                ) : params.value == "transferencia_bancaria" ? (
                  <span className="flex gap-2">
                    Transferencia <MdAccountBalance size={22} />{" "}
                  </span>
                ) : params.value == "esperando" ? (
                  <span>
                    Esperando <MdAccessTime size={22} />
                  </span>
                ) : (
                  params.value
                )}
              </span>
            </div>
          );
        },
      },
      {
        field: "updatedAt",
        headerName: "Fecha de compra",
        flex: 1,
        renderCell: (params) => {
          return (
            <div
              className="flex justify-center flex-col items-center min-h-full"
              style={{
                padding: "10px",
              }}
            >
              <div className="w-full">
                <span
                  className="text-[black] block text-center font-bold"
                  style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    wordBreak: "break-word",
                  }}
                >
                  {params.value
                    ? new Date(params.value).toLocaleString()
                    : "Esperando...."}
                </span>
              </div>
            </div>
          );
        },
      },

      {
        field: "actionsShipment",
        headerName: "Acciones",
        flex: 1,
        renderCell: (params) => {
          const currentStatusShip = params?.row?.statusShip;
          const currentStatusPay = params.row?.statusPay;

          return (
            <div
              className="flex justify-center flex-col items-center min-h-full"
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
                    value={currentStatusShip || ""}
                    onChange={(event) => {
                      handleChangeStatusShip(
                        params?.row?.id,
                        event.target.value
                      );
                    }}
                  >
                    <MenuItem value={"entregado"}>Entregado</MenuItem>
                    <MenuItem value={"cancelado"}>Cancelado</MenuItem>
                    <MenuItem value={"enviado"}>Enviado</MenuItem>
                    <MenuItem value={"procesando"}>Procesando</MenuItem>
                    <MenuItem value={"disponible"}>Disponible</MenuItem>
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
                      //   handleChangeStatusPay(
                      //     event,
                      //     params.row.idOrder,
                      //     params.row.idUser
                      //   );
                    }}
                  >
                    <MenuItem value={"paid"}>Pagado</MenuItem>
                    <MenuItem value={"failed"}>Fallido</MenuItem>
                    <MenuItem value={"payment_pending"}>Pendiente</MenuItem>
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
    ],
    [rows]
  );

  return {
    columns,
  };
};

export default GridVentasInvitados;
