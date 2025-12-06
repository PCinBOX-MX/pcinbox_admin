"use client";

import styles from "./dashboard.module.css";
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
import { DataGrid } from "@mui/x-data-grid";

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
  const { setDataModal } = useTheContext();

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "idOrder",
        headerName: "No.Orden",
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
                #{params.value}
              </span>
            </div>
          );
        },
      },
      {
        field: "requiredFactura",
        headerName: "¿Requiere factura?",
        flex: 1,
        renderCell: (params) => {
          return (
            <div
              onClick={() => {
                if (
                  Array.isArray(params.row.billing) &&
                  params.row.billing.length > 0
                ) {
                  setDataModal({
                    isOpen: true,
                    title: "Datos de facturación",
                    content: (
                      <div className="w-full flex flex-col">
                        {params.row.billing.map((b: any, indexB: number) => {
                          if (indexB == 0) {
                            return (
                              <div
                                className="w-auto max-w-[900px] grid grid-cols-[1fr_1fr_1fr] gap-2"
                                key={indexB}
                              >
                                <div
                                  className="border border-gray-200 rounded-lg flex flex-col bg-gray-50 hover:bg-gray-100 transition"
                                  style={{
                                    padding: "5px",
                                  }}
                                >
                                  <span className="font-semibold text-[13px] uppercase text-gray-500 tracking-wide block text-center">
                                    CFDI
                                  </span>
                                  <span
                                    className="text-[15px] font-medium text-gray-800 block text-center"
                                    style={{
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {b.cfdi}
                                  </span>
                                </div>

                                <div
                                  className="border border-gray-200 rounded-lg flex flex-col  bg-gray-50 hover:bg-gray-100 transition"
                                  style={{
                                    padding: "5px",
                                  }}
                                >
                                  <span className="font-semibold text-[13px] uppercase text-gray-500 tracking-wide block text-center">
                                    Compañia
                                  </span>
                                  <span
                                    className="text-[15px] font-medium text-gray-800 block text-center"
                                    style={{
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {b.companyName}
                                  </span>
                                </div>

                                <div
                                  className="border border-gray-200 rounded-lg flex flex-col  bg-gray-50 hover:bg-gray-100 transition"
                                  style={{
                                    padding: "5px",
                                  }}
                                >
                                  <span className="font-semibold text-[13px] uppercase text-gray-500 tracking-wide block text-center">
                                    Correo
                                  </span>
                                  <span
                                    className="text-[15px] font-medium text-gray-800  block text-center"
                                    style={{
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {b.email}
                                  </span>
                                </div>

                                <div
                                  className="border border-gray-200 rounded-lg flex flex-col bg-gray-50 hover:bg-gray-100 transition"
                                  style={{
                                    padding: "5px",
                                  }}
                                >
                                  <span className="font-semibold text-[13px] uppercase text-gray-500 tracking-wide block text-center">
                                    Metodo de pago
                                  </span>
                                  <span
                                    className="text-[15px] font-medium text-gray-800 block text-center"
                                    style={{
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {b.methodPay}
                                  </span>
                                </div>

                                <div
                                  className="border border-gray-200 rounded-lg flex flex-col bg-gray-50 hover:bg-gray-100 transition"
                                  style={{
                                    padding: "5px",
                                  }}
                                >
                                  <span className="font-semibold text-[13px] uppercase text-gray-500 tracking-wide block text-center">
                                    NO.Orden
                                  </span>
                                  <span
                                    className="text-[15px] font-medium text-gray-800 block text-center"
                                    style={{
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {b.orden}
                                  </span>
                                </div>

                                <div
                                  className="border border-gray-200 rounded-lg flex flex-col bg-gray-50 hover:bg-gray-100 transition"
                                  style={{
                                    padding: "5px",
                                  }}
                                >
                                  <span className="font-semibold text-[13px] uppercase text-gray-500 tracking-wide block text-center">
                                    RFC
                                  </span>
                                  <span
                                    className="text-[15px] font-medium text-gray-800 block text-center"
                                    style={{
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {b.rfc}
                                  </span>
                                </div>

                                <div
                                  className="border border-gray-200 rounded-lg flex flex-col bg-gray-50 hover:bg-gray-100 transition"
                                  style={{
                                    padding: "5px",
                                  }}
                                >
                                  <span className="font-semibold text-[13px] uppercase text-gray-500 tracking-wide block text-center">
                                    Regimen
                                  </span>
                                  <span
                                    className="text-[15px] font-medium text-gray-800 block text-center"
                                    style={{
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {b.taxRegimen}
                                  </span>
                                </div>

                                <div
                                  className="border border-gray-200 rounded-lg flex flex-col bg-gray-50 hover:bg-gray-100 transition"
                                  style={{
                                    padding: "5px",
                                  }}
                                >
                                  <span className="font-semibold text-[13px] uppercase text-gray-500 tracking-wide block text-center">
                                    Código Postal
                                  </span>
                                  <span
                                    className="text-[15px] font-medium text-gray-800 block text-center"
                                    style={{
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {b.codePostal}
                                  </span>
                                </div>

                                <div
                                  className="border border-gray-200 rounded-lg flex flex-col bg-gray-50 hover:bg-gray-100 transition"
                                  style={{
                                    padding: "5px",
                                  }}
                                >
                                  <span className="font-semibold text-[13px] uppercase text-gray-500 tracking-wide block text-center">
                                    Estado
                                  </span>
                                  <span
                                    className="text-[15px] font-medium text-gray-800 block text-center"
                                    style={{
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {b.state}
                                  </span>
                                </div>

                                <div
                                  className="border border-gray-200 rounded-lg flex flex-col bg-gray-50 hover:bg-gray-100 transition"
                                  style={{
                                    padding: "5px",
                                  }}
                                >
                                  <span className="font-semibold text-[13px] uppercase text-gray-500 tracking-wide block text-center">
                                    Ciudad
                                  </span>
                                  <span
                                    className="text-[15px] font-medium text-gray-800 block text-center"
                                    style={{
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {b.city}
                                  </span>
                                </div>
                              </div>
                            );
                          }
                        })}
                      </div>
                    ),
                    type: "info",
                    showActions: true,
                    onClose: () => {
                      setDataModal((prev) => ({ ...prev, isOpen: false }));
                    },
                    onConfirm: () => {
                      setDataModal((prev) => ({ ...prev, isOpen: false }));
                    },
                  });
                }
              }}
              className="flex justify-center items-center min-h-[100%]"
            >
              {params.value == null || params.value == "" || !params.value ? (
                <MdErrorOutline size={30} color="red" />
              ) : (
                <MdCheck size={30} color="green" />
              )}
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
              className={`${styles.truncateCell} flex justify-center flex-col items-center min-h-[100%] overflow-y-auto`}
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

                        {item?.upc && (
                          <div className="flex gap-2">
                            <span className="text-[#808080] font-bold">
                              UPC:
                            </span>
                            <span>{item.upc}</span>
                          </div>
                        )}

                        {item?.sku && (
                          <div className="flex gap-2">
                            <span className="text-[#808080] font-bold">
                              SKU:
                            </span>
                            <span>{item.sku}</span>
                          </div>
                        )}

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
      },

      {
        field: "totalAmount",
        headerName: "Pago Total",
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
        maxWidth: 200,
        minWidth: 200,
        renderCell: (params) => {
          return (
            <div
              className="flex justify-center flex-col items-center min-h-[100%] overflow-y-auto"
              style={{
                padding: "10px",
              }}
            >
              <div className="w-full flex flex-col">
                {params.value == "" ||
                Number(params.row.totalAmount) <= 1000 ? (
                  <span className="text-[#808080] font-bold text-center">
                    {"Entrega en sucursal"}
                  </span>
                ) : (
                  Array.isArray(params.value) &&
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
                  })
                )}
              </div>
            </div>
          );
        },
      },
      {
        field: "method_pay",
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
        field: "createdAt",
        headerName: "Fecha de compra",
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
                {new Date(params.value).toLocaleString()}
              </span>
            </div>
          );
        },
      },
      {
        field: "actionsShipment",
        headerName: "Acciones",
        flex: 1,
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
                    <MenuItem value={"failed"}>Fallido</MenuItem>
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
    ],
    [rows]
  );

  return {
    columns,
  };
};

export default GridDashboard;
