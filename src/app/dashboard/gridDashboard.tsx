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
import { SalesI } from "../interfaces/sales/sales.interface";

const GridDashboard = ({
  handleChangeStatusShip,
  handleChangeStatusPay,
  rows,
}: {
  handleChangeStatusShip: any;
  handleChangeStatusPay: any;
  rows: {
    totalRows: number;
    data: SalesI[];
  };
}) => {
  const { formatCurrency, BRANCHES_DICO } = UtilsService();
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
                          {params.value?.name} {params?.value?.lastName}
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
                          {params.value?.email}
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
                          {params.value?.phone1}
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
                          {params.value?.phone2}
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
                {params.value?.name}
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
              className={`${styles.truncateCell} flex justify-center flex-col items-center min-h-[100%]`}
              style={{ padding: "10px" }}
              onClick={() => {
                setDataModal({
                  isOpen: true,
                  type: "success",
                  title: "Productos",
                  showActions: true,
                  onClose: () =>
                    setDataModal((prev) => ({ ...prev, isOpen: false })),
                  onConfirm: () =>
                    setDataModal((prev) => ({ ...prev, isOpen: false })),
                  content: (
                    <div className="flex flex-col gap-3 min-w-[500px] max-w-[700px] max-h-[500px] overflow-y-auto pr-2">
                      {Array.isArray(params.value) &&
                        params.value.map((item: any, index: number) => {
                          // ✨ Organizamos la info en variables
                          const productInfo = {
                            name: item.productName,
                            description: item.description,
                            sku: item.sku,
                            upc: item.upc,
                            clave: item.clave,
                            quantity: item.quantity,
                            statusShip: item?.statusShip,
                          };

                          const addressInfo = item.address
                            ? {
                                delivery: "Domicilio",
                                street: item.address.street,
                                noExt: item.address.noExt,
                                noInt: item.address.noInt || "",
                                cp: item.address.cp,
                                cologne: item.address.cologne,
                                city: item.address.city,
                                state: item.address.state,
                                country: item.address.country,
                                requireInsurance:
                                  item.address.requireInsurance === 1,
                                branch: BRANCHES_DICO.find(
                                  (bd) => bd.name === item.address.branche,
                                )?.name,
                                shippingMethod: item.address.shipping_method,
                                trackingNumber: item.address.trackingNumber,
                              }
                            : { delivery: "PCinBOX-LEON" };

                          return (
                            <div
                              key={index}
                              style={{
                                padding: "10px",
                              }}
                              className="rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors p-4"
                            >
                              {/* Información del producto */}
                              <div className="flex flex-col gap-3">
                                <div>
                                  <span className="text-gray-500 text-sm font-semibold block mb-1">
                                    Nombre:
                                  </span>
                                  <p className="text-gray-900 font-medium">
                                    {productInfo.name}
                                  </p>
                                </div>

                                {productInfo.description && (
                                  <div>
                                    <span className="text-gray-500 text-sm font-semibold block mb-1">
                                      Descripción:
                                    </span>
                                    <p className="text-gray-700">
                                      {productInfo.description}
                                    </p>
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                  {productInfo.sku && (
                                    <div>
                                      <span className="text-gray-500 text-sm font-semibold block mb-1">
                                        SKU:
                                      </span>
                                      <p className="text-gray-700">
                                        {productInfo.sku}
                                      </p>
                                    </div>
                                  )}

                                  {productInfo.upc && (
                                    <div>
                                      <span className="text-gray-500 text-sm font-semibold block mb-1">
                                        UPC:
                                      </span>
                                      <p className="text-gray-700">
                                        {productInfo.upc}
                                      </p>
                                    </div>
                                  )}

                                  {productInfo.clave && (
                                    <div>
                                      <span className="text-gray-500 text-sm font-semibold block mb-1">
                                        Clave:
                                      </span>
                                      <p className="text-gray-700">
                                        {productInfo.clave}
                                      </p>
                                    </div>
                                  )}

                                  <div>
                                    <span className="text-gray-500 text-sm font-semibold block mb-1">
                                      Cantidad:
                                    </span>
                                    <p className="text-gray-700 font-semibold">
                                      {productInfo.quantity}
                                    </p>
                                  </div>
                                </div>

                                {/* Información de entrega */}
                                <div
                                  className="bg-orange-50 rounded-lg border border-orange-200 p-2 space-y-2"
                                  style={{
                                    padding: "10px",
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-orange-700 font-bold text-sm">
                                      📦 Entrega:
                                    </span>
                                    <span className="text-gray-800 font-medium text-sm">
                                      {addressInfo.delivery}
                                    </span>
                                  </div>

                                  {addressInfo.street && (
                                    <>
                                      <div className="flex items-start gap-2">
                                        <span className="text-blue-700 font-bold text-sm">
                                          📍
                                        </span>
                                        <span className="text-gray-700 text-sm">
                                          {`${addressInfo.street} #${addressInfo.noExt} ${addressInfo.noInt}, CP: ${addressInfo.cp}, Colonia: ${addressInfo.cologne}, Ciudad: ${addressInfo.city}, Estado: ${addressInfo.state}, País: ${addressInfo.country}`}
                                        </span>
                                      </div>

                                      {addressInfo.requireInsurance && (
                                        <div className="flex items-center gap-2 bg-amber-100 rounded p-1">
                                          <span className="text-amber-700 font-bold text-sm">
                                            Seguro Requerido
                                          </span>
                                          <span className="text-green-700 font-bold text-sm">
                                            ✓
                                          </span>
                                        </div>
                                      )}

                                      {addressInfo.branch && (
                                        <div className="flex items-center gap-2 bg-amber-100 rounded p-1">
                                          <span className="text-amber-700 font-bold text-sm">
                                            Sucursal de pedido
                                          </span>
                                          <span className="text-green-700 font-bold text-sm">
                                            {addressInfo.branch}
                                          </span>
                                        </div>
                                      )}

                                      <div className="flex items-center gap-2 bg-amber-100 rounded p-1">
                                        <span className="text-amber-700 font-bold text-sm">
                                          Paquetería
                                        </span>
                                        <span className="text-green-700 font-bold text-sm">
                                          {addressInfo.shippingMethod ===
                                          "estafeta"
                                            ? "Estafeta"
                                            : "Paquete Express"}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2 bg-amber-100 rounded p-1">
                                        <span className="text-amber-700 font-bold text-sm">
                                          NO. Guía
                                        </span>
                                        <span className="text-green-700 font-bold text-sm">
                                          {addressInfo.trackingNumber}
                                        </span>
                                      </div>

                                      {/* Aquí puedes agregar tu select para cambiar el estado */}
                                    </>
                                  )}
                                  <div
                                    className="pt-2 my-2"
                                    style={{
                                      marginTop: "10px",
                                    }}
                                  >
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                      Estado de envío:
                                    </label>

                                    <div className="w-[150px]">
                                      <FormControl fullWidth>
                                        <Select
                                          labelId="demo-simple-select-label"
                                          id="demo-simple-select"
                                          value={productInfo.statusShip}
                                          onChange={(event) => {
                                            console.log(params.row);

                                            // handleChangeStatusShip(
                                            //   event,
                                            //   params.row.idOrder,
                                            //   params.row.idUser,
                                            // );
                                          }}
                                        >
                                          <MenuItem value={"entregado"}>
                                            Entregado
                                          </MenuItem>
                                          <MenuItem value={"cancelado"}>
                                            Cancelado
                                          </MenuItem>
                                          <MenuItem value={"enviado"}>
                                            Enviado
                                          </MenuItem>
                                          <MenuItem value={"procesando"}>
                                            Procesando
                                          </MenuItem>
                                          <MenuItem value={"disponible"}>
                                            Disponible
                                          </MenuItem>
                                        </Select>
                                      </FormControl>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ),
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
      // {
      //   field: "address",
      //   headerName: "Dirección",
      //   maxWidth: 200,
      //   minWidth: 200,
      //   renderCell: (params) => {
      //     return (
      //       <div
      //         className="flex justify-center flex-col items-center min-h-[100%] overflow-y-auto"
      //         style={{
      //           padding: "10px",
      //         }}
      //       >
      //         <div className="w-full flex flex-col">
      //           {params.value == "" ||
      //           Number(params.row.totalAmount) <= 1000 ? (
      //             <span className="text-[#808080] font-bold text-center">
      //               {"Entrega en sucursal"}
      //             </span>
      //           ) : (
      //             Array.isArray(params.value) &&
      //             params.value.slice(0, 1).map((item, index) => {
      //               return item.street == null ? (
      //                 <div
      //                   className="w-full flex justify-center gap-1"
      //                   key={index}
      //                   style={{ marginTop: "5px", marginBottom: "5px" }}
      //                 >
      //                   <span className="text-[#808080] font-bold">
      //                     {"Entrega en sucursal"}
      //                   </span>
      //                 </div>
      //               ) : (
      //                 <div
      //                   className="w-full flex flex-col gap-1"
      //                   key={index}
      //                   style={{ marginTop: "5px", marginBottom: "5px" }}
      //                 >
      //                   <div className="flex gap-2">
      //                     <span className="text-[#808080] font-bold">
      //                       Calle:
      //                     </span>
      //                     <span>{item.street}</span>
      //                   </div>

      //                   <div className="flex gap-2">
      //                     <span className="text-[#808080] font-bold">
      //                       No.Ext:
      //                     </span>
      //                     <span>{item.noExt}</span>
      //                   </div>

      //                   <div className="flex gap-2">
      //                     <span className="text-[#808080] font-bold">
      //                       No.Int:
      //                     </span>
      //                     <span>{item.noInt}</span>
      //                   </div>

      //                   <div className="flex gap-2">
      //                     <span className="text-[#808080] font-bold">
      //                       Colonia:
      //                     </span>
      //                     <span>{item.cologne}</span>
      //                   </div>

      //                   <div className="flex gap-2">
      //                     <span className="text-[#808080] font-bold">
      //                       Estado:
      //                     </span>
      //                     <span>{item.state}</span>
      //                   </div>

      //                   <div className="flex gap-2">
      //                     <span className="text-[#808080] font-bold">
      //                       Ciudad:
      //                     </span>
      //                     <span>{item.city}</span>
      //                   </div>
      //                 </div>
      //               );
      //             })
      //           )}
      //         </div>
      //       </div>
      //     );
      //   },
      // },
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
          if (params.value) {
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
                    {new Date(params.value).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          }
        },
      },

      {
        field: "actionsShipment",
        headerName: "Acciones",
        flex: 1,
        renderCell: (params) => {
          const currentRow = rows.data?.find(
            (row: any) => row.idShipment === params.row.idShipment,
          );
          const currentStatus = currentRow?.statusShip || "";
          const currentStatusPay = currentRow?.statusPay || "";

          return (
            <div
              className="flex justify-center flex-col items-center min-h-full"
              style={{
                padding: "10px",
              }}
            >
              {/* <div className="w-full">
                <span>Estatus Envío</span>
                <FormControl fullWidth>
                  <Select
                    labelId="demo-simple-select-label"
                    id="demo-simple-select"
                    value={currentStatus}
                    onChange={(event) => {
                      console.log(params.row);

                      handleChangeStatusShip(
                        event,
                        params.row.idOrder,
                        params.row.idUser,
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
              </div> */}

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
                        params.row.idUser,
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
    [rows],
  );

  return {
    columns,
  };
};

export default GridDashboard;
