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
import {
  CustomerDetailsContent,
  InvitadoProductsContent,
  modalCloseOnly,
} from "../shared/components/especific/modal/ModalContentHelpers";

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
                  type: "info",
                  title: "Datos del cliente",
                  size: "md",
                  ...modalCloseOnly,
                  content: (
                    <CustomerDetailsContent data={params.value?.[0]} />
                  ),
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
                  type: "info",
                  title: "Productos de la orden",
                  size: "xl",
                  ...modalCloseOnly,
                  content: (
                    <InvitadoProductsContent products={params.value} />
                  ),
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
        headerName: "Pago total",
        minWidth: 120,
        width: 130,
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
        headerName: "Método de pago",
        minWidth: 190,
        width: 200,
        renderCell: (params) => {
          return (
            <div
              className="flex justify-center items-center min-h-[100%]"
              style={{
                padding: "8px 4px",
              }}
            >
              <span
                className="text-[black] block text-center font-semibold whitespace-nowrap"
                style={{
                  fontSize: "0.9rem",
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
        minWidth: 180,
        width: 190,
        renderCell: (params) => {
          return (
            <div
              className="flex justify-center flex-col items-center min-h-full"
              style={{
                padding: "8px 4px",
              }}
            >
              <div className="w-full">
                <span
                  className="text-[black] block text-center font-medium whitespace-nowrap"
                  style={{
                    fontSize: "0.875rem",
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
        minWidth: 240,
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
                        event.target.value,
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
    [rows],
  );

  return {
    columns,
  };
};

export default GridVentasInvitados;
