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
import DataProducts from "../shared/components/especific/dashboard/DataProducts";
import TechsmartOrderPanel from "../shared/components/especific/dashboard/TechsmartOrderPanel";
import OrderCancelSection from "../components/admin/OrderCancelSection";
import {
  BillingDetailsContent,
  CustomerDetailsContent,
  modalCloseOnly,
} from "../shared/components/especific/modal/ModalContentHelpers";

const GridDashboard = ({
  handleChangeStatusShip,
  handleChangeStatusPay,
  openCancelOrderModal,
  can,
  rows,
}: {
  handleChangeStatusShip: any;
  handleChangeStatusPay: any;
  openCancelOrderModal: (idOrder: number) => void;
  can: (permission: import("../constants/permissions").AdminPermission) => boolean;
  rows: {
    totalRows: number;
    data: SalesI[];
  };
}) => {
  const { formatCurrency } = UtilsService();
  const { setDataModal, rowsVentas, setRowsVentas } = useTheContext();

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "idOrder",
        headerName: "No. Orden",
        flex: 0.55,
        minWidth: 82,
        renderCell: (params) => {
          return (
            <div
              className={`${styles.truncateCell} ${styles.cellCol}`}
              style={{ padding: "6px 4px" }}
            >
              <span className={styles.cellText}>
                #{params.value}
              </span>
            </div>
          );
        },
      },
      {
        field: "requiredFactura",
        headerName: "¿Factura?",
        flex: 0.5,
        minWidth: 72,
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
                    type: "info",
                    title: "Datos de facturación",
                    size: "lg",
                    ...modalCloseOnly,
                    content: (
                      <BillingDetailsContent billing={params.row.billing} />
                    ),
                    onClose: () => {
                      setDataModal((prev) => ({ ...prev, isOpen: false }));
                    },
                    onConfirm: () => {
                      setDataModal((prev) => ({ ...prev, isOpen: false }));
                    },
                  });
                }
              }}
              className={styles.cell}
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
        headerName: "Datos cliente",
        flex: 0.95,
        minWidth: 105,

        renderCell: (params) => {
          return (
            <div
              className={styles.cell}
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
                  content: <CustomerDetailsContent data={params.value} />,
                  onClose: () => {
                    setDataModal((prev) => ({ ...prev, isOpen: false }));
                  },
                  onConfirm: () => {
                    setDataModal((prev) => ({ ...prev, isOpen: false }));
                  },
                });
              }}
            >
              <span className={styles.cellTextMuted}>
                {params.value?.name}
              </span>
            </div>
          );
        },
      },
      {
        field: "products",
        flex: 0.85,
        minWidth: 95,
        headerName: "Productos",
        renderCell: (params) => {
          return (
            <div
              className={`${styles.truncateCell} ${styles.cellCol}`}
              style={{ padding: "10px" }}
              onClick={() => {
                const orderRow = rowsVentas.data.find(
                  (o) => o.idOrder === params.row.idOrder,
                );

                setDataModal({
                  isOpen: true,
                  type: "info",
                  title: "Productos de la orden",
                  size: "xl",
                  showActions: true,
                  showCancel: false,
                  confirmLabel: "Cerrar",
                  onClose: () =>
                    setDataModal((prev) => ({ ...prev, isOpen: false })),
                  onConfirm: () =>
                    setDataModal((prev) => ({ ...prev, isOpen: false })),
                  content: (
                    <div className="admin-order-products-modal">
                      {orderRow?.hasTechsmartProducts && can("techsmart.manage") && (
                        <section className="admin-order-products-modal__techsmart">
                          <h3 className="admin-order-products-modal__section-title">
                            Gestión TechSmart
                          </h3>
                          <TechsmartOrderPanel
                            idOrder={orderRow.idOrder}
                            initialOrder={orderRow.techsmartOrder}
                            statusPay={orderRow.statusPay}
                            onOrderUpdated={(updated) => {
                              if (!updated) return;
                              setRowsVentas((prev) => ({
                                ...prev,
                                data: prev.data.map((row) =>
                                  row.idOrder === orderRow.idOrder
                                    ? {
                                        ...row,
                                        techsmartOrder: updated,
                                      }
                                    : row,
                                ),
                              }));
                            }}
                          />
                        </section>
                      )}
                      <section className="admin-order-products-modal__list">
                        <h3 className="admin-order-products-modal__section-title">
                          {orderRow?.products?.length === 1
                            ? "1 producto en la orden"
                            : `${orderRow?.products?.length ?? 0} productos en la orden`}
                        </h3>
                        <DataProducts
                          params={{
                            value: orderRow?.products,
                            row: params.row,
                          }}
                          handleChangeStatusShip={handleChangeStatusShip}
                        />
                      </section>
                      {can("orders.cancel") && (
                        <OrderCancelSection
                          idOrder={orderRow?.idOrder ?? params.row.idOrder}
                          statusPay={orderRow?.statusPay ?? params.row.statusPay}
                          canCancelPermission={can("orders.cancel")}
                          onCancelClick={openCancelOrderModal}
                        />
                      )}
                    </div>
                  ),
                });
              }}
            >
              <span className={`${styles.cellText} admin-whitespace-normal`}>
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
        headerName: "Pago total",
        flex: 0.65,
        minWidth: 92,
        renderCell: (params) => {
          return (
            <div
              className={`${styles.truncateCell} ${styles.cellCol}`}
              style={{ padding: "6px 4px" }}
            >
              <span className={styles.cellTextMuted}>
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
      //         onClick={() => {
      //           if (
      //             params.value != "" &&
      //             Number(params.row.totalAmount) >= 1000 &&
      //             params.value[0].street != null
      //           ) {
      //             setDataModal({
      //               isOpen: true,
      //               type: "success",
      //               content: (
      //                 <div className="min-w-[550px] max-w-[900px]">
      //                   <div
      //                     className=" grid grid-cols-[1fr_1fr] border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
      //                     style={{
      //                       padding: "5px",
      //                       marginBottom: "10px",
      //                     }}
      //                   >
      //                     <div>
      //                       <span className="font-semibold text-[13px] uppercase text-gray-500 tracking-wide block text-center">
      //                         Calle
      //                       </span>
      //                       <span
      //                         className="text-[15px] font-medium text-gray-800 block text-center"
      //                         style={{
      //                           wordBreak: "break-word",
      //                           padding: "5px",
      //                         }}
      //                       >
      //                         {params.value?.[0]?.street}
      //                       </span>
      //                     </div>

      //                     <div>
      //                       <span className="font-semibold text-[13px] uppercase text-gray-500 tracking-wide block text-center">
      //                         No. Ext
      //                       </span>
      //                       <span
      //                         className="text-[15px] font-medium text-gray-800 block text-center"
      //                         style={{
      //                           wordBreak: "break-word",
      //                         }}
      //                       >
      //                         {params.value?.[0]?.noExt}
      //                       </span>
      //                     </div>
      //                   </div>

      //                   <div
      //                     className=" grid grid-cols-[1fr_1fr] border border-gray-200 rounded-lg  bg-gray-50 hover:bg-gray-100 transition"
      //                     style={{
      //                       padding: "5px",
      //                       marginBottom: "10px",
      //                     }}
      //                   >
      //                     <div>
      //                       <span className="font-semibold text-[13px] uppercase text-gray-500 tracking-wide block text-center">
      //                         No.Int
      //                       </span>
      //                       <span
      //                         className="text-[15px] font-medium text-gray-800 block text-center"
      //                         style={{
      //                           wordBreak: "break-word",
      //                         }}
      //                       >
      //                         {params.value?.[0]?.noInt}
      //                       </span>
      //                     </div>

      //                     <div>
      //                       <span className="font-semibold text-[13px] uppercase text-gray-500 tracking-wide block text-center">
      //                         Colonia
      //                       </span>
      //                       <span
      //                         className="text-[15px] font-medium text-gray-800 block text-center"
      //                         style={{
      //                           wordBreak: "break-word",
      //                         }}
      //                       >
      //                         {params.value?.[0]?.cologne}
      //                       </span>
      //                     </div>
      //                   </div>

      //                   <div
      //                     className=" grid grid-cols-[1fr_1fr] border border-gray-200 rounded-lgbg-gray-50 hover:bg-gray-100 transition"
      //                     style={{
      //                       padding: "5px",
      //                       marginBottom: "10px",
      //                     }}
      //                   >
      //                     <div>
      //                       <span className="font-semibold text-[13px] uppercase text-gray-500 tracking-wide block text-center">
      //                         Estado
      //                       </span>
      //                       <span
      //                         className="text-[15px] font-medium text-gray-800 block text-center"
      //                         style={{
      //                           wordBreak: "break-word",
      //                         }}
      //                       >
      //                         {params.value?.[0]?.state}
      //                       </span>
      //                     </div>

      //                     <div>
      //                       <span className="font-semibold text-[13px] uppercase text-gray-500 tracking-wide block text-center">
      //                         Ciudad
      //                       </span>
      //                       <span
      //                         className="text-[15px] font-medium text-gray-800 block text-center"
      //                         style={{
      //                           wordBreak: "break-word",
      //                         }}
      //                       >
      //                         {params.value?.[0]?.city}
      //                       </span>
      //                     </div>
      //                   </div>
      //                 </div>
      //               ),
      //               showActions: true,
      //               title: "Domicilio",
      //               onConfirm: () => {
      //                 setDataModal((prev) => ({ ...prev, isOpen: false }));
      //               },
      //               onClose: () => {
      //                 setDataModal((prev) => ({ ...prev, isOpen: false }));
      //               },
      //             });
      //           }
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
      //               if (item.street == null) {
      //                 return (
      //                   <div
      //                     className="w-full flex justify-center gap-1"
      //                     key={index}
      //                     style={{ marginTop: "5px", marginBottom: "5px" }}
      //                   >
      //                     <span className="text-[#808080] font-bold">
      //                       {"Entrega en sucursal"}
      //                     </span>
      //                   </div>
      //                 );
      //               } else {
      //                 return (
      //                   <div
      //                     className="w-full flex justify-center gap-1"
      //                     key={index}
      //                     style={{ marginTop: "5px", marginBottom: "5px" }}
      //                   >
      //                     <span className="text-[#808080] font-bold">
      //                       {"Entrega a domicilio"}
      //                     </span>
      //                   </div>
      //                 );
      //               }
      //             })
      //           )}
      //         </div>
      //       </div>
      //     );
      //   },
      // },
      {
        field: "method_pay",
        headerName: "Método de pago",
        flex: 0.9,
        minWidth: 110,
        renderCell: (params) => {
          return (
            <div
              className={styles.cell}
              style={{ padding: "6px 4px" }}
            >
              <span className={`${styles.cellTextSemibold} admin-whitespace-normal admin-text-xs`}>
                {params.value == "tarjeta_de_debito" ||
                params.value == "tarjeta_de_credito" ? (
                  <span className={styles.chipRow}>
                    Tarjeta <MdCreditCard size={22} />{" "}
                  </span>
                ) : params.value == "efectivo_sucursal" ? (
                  <span className={styles.chipRow}>
                    Efectivo <MdMoney size={22} />{" "}
                  </span>
                ) : params.value == "oxxo" ? (
                  <span className={styles.chipRow}>
                    {/* <img
                      src={"/oxxo.png"}
                      width={50}
                      height={50}
                      className="object-contain"
                    />{" "} */}
                    Efectivo <MdMoney size={22} />
                  </span>
                ) : params.value == "tarjeta_sucursal" ? (
                  <span className={styles.chipRow}>
                    Tarjeta <MdCreditCard size={22} />{" "}
                  </span>
                ) : params.value == "mercadopago" ? (
                  <img
                    src={"/mercadopago.jpg"}
                    alt="Mercado Pago"
                    style={{
                      width: "52px",
                      height: "36px",
                      objectFit: "contain",
                    }}
                    loading="lazy"
                  />
                ) : params.value == "transferencia_bancaria" ? (
                  <span className={styles.chipRow}>
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
        minWidth: 125,
        renderCell: (params) => {
          if (params.value) {
            return (
              <div
                className={styles.cellColFull}
              >
                <span className={`${styles.cellTextSemibold} admin-text-xs`}>
                  {new Date(params.value).toLocaleString("es-MX", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            );
          }
        },
      },

      {
        field: "actionsShipment",
        headerName: "Acciones",
        flex: 1.15,
        minWidth: 155,
        renderCell: (params) => {
          const currentRow = rows.data?.find(
            (row: any) => row.idShipment === params.row.idShipment,
          );
          const currentStatus = currentRow?.statusShip || "";

          return (
            <div
              className={styles.cellColFull}
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

              <div className={styles.cellStack}>
                <span className="admin-text-xs admin-text-semibold admin-text-muted">
                  Estatus Pago
                </span>
                <FormControl fullWidth size="small">
                  <Select
                    labelId="demo-simple-select-label"
                    id="demo-simple-select"
                    value={params?.row?.statusPay ?? "pending"}
                    disabled={!can("orders.update_status_pay")}
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
                    <MenuItem value="payment_pending">Pendiente</MenuItem>
                    <MenuItem value="pending">Pendiente</MenuItem>
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
    [rows, can, openCancelOrderModal, handleChangeStatusPay, rowsVentas, setRowsVentas, setDataModal, formatCurrency],
  );

  return {
    columns,
  };
};

export default GridDashboard;
