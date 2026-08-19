"use client";

import styles from "./dashboard.module.css";
import { GridColDef, GridRowsProp } from "@mui/x-data-grid";
import UtilsService from "../services/utils";
import {
  Alert,
  Chip,
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
import { Mail } from "lucide-react";
import { useTheContext } from "../hooks/global.hook";
import { SalesI } from "../interfaces/sales/sales.interface";
import DataProducts from "../shared/components/especific/dashboard/DataProducts";
// TechSmart WS bloqueado: no montar panel (generar pedido / vincular guía / facturar).
// Quedan los selects de "Estado de envío" en DataProducts.
// import TechsmartOrderPanel from "../shared/components/especific/dashboard/TechsmartOrderPanel";
import {
  formatOrderMoney,
  getAdminOrderCostBreakdown,
} from "../utils/orderCostBreakdown";
import OrderCancelSection from "../components/admin/OrderCancelSection";
import {
  getPaymentStatusChipColor,
  getPaymentStatusLabel,
  isOrderPaid,
} from "../utils/paymentStatus.util";
import {
  BillingDetailsContent,
  CustomerDetailsContent,
  modalCloseOnly,
} from "../shared/components/especific/modal/ModalContentHelpers";

const GridDashboard = ({
  handleChangeStatusShip,
  openCancelOrderModal,
  can,
  rows,
}: {
  handleChangeStatusShip: any;
  openCancelOrderModal: (idOrder: number) => void;
  can: (permission: import("../constants/permissions").AdminPermission) => boolean;
  rows: {
    totalRows: number;
    data: SalesI[];
  };
}) => {
  const { formatCurrency } = UtilsService();
  const { setDataModal, rowsVentas, setRowsVentas } = useTheContext();

  const centeredColumn = {
    align: "center" as const,
    headerAlign: "center" as const,
  };

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "idOrder",
        headerName: "No. Orden",
        flex: 0.55,
        minWidth: 82,
        ...centeredColumn,
        renderCell: (params) => {
          return (
            <div
              className={`${styles.cell} ${styles.cellCol} ${styles.truncateCell}`}
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
        ...centeredColumn,
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
        flex: 1.15,
        minWidth: 140,
        ...centeredColumn,

        renderCell: (params) => {
          const user = params.value;
          const accountPhone = String(user?.phone ?? "").trim();
          const deliveryPhones = Array.from(
            new Set(
              [
                ...(Array.isArray(user?.addressPhones) ? user.addressPhones : []),
                user?.phone1,
                user?.phone2,
              ]
                .map((phone) => String(phone ?? "").trim())
                .filter(Boolean),
            ),
          ).filter(
            (phone) =>
              phone.replace(/\s+/g, "") !== accountPhone.replace(/\s+/g, ""),
          );

          return (
            <div
              className={`${styles.cell} ${styles.cellCol}`}
              style={{
                padding: "10px",
              }}
              onClick={() => {
                setDataModal({
                  isOpen: true,
                  type: "info",
                  title: "Datos del cliente",

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
                {user?.name}
              </span>
              {accountPhone ? (
                <span className={styles.cellPhone}>{accountPhone}</span>
              ) : null}
              {deliveryPhones.map((phone) => (
                <span key={phone} className={styles.cellPhone}>
                  {phone}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        field: "products",
        flex: 0.85,
        minWidth: 95,
        headerName: "Productos",
        ...centeredColumn,
        renderCell: (params) => {
          return (
            <div
              className={`${styles.cell} ${styles.cellCol} ${styles.truncateCell}`}
              style={{ padding: "10px" }}
              onClick={() => {
                const orderRow = rowsVentas.data.find(
                  (o) => o.idOrder === params.row.idOrder,
                );

                setDataModal({
                  isOpen: true,
                  type: "info",
                  title: "Productos de la orden",

                  showActions: true,

                  confirmLabel: "Cerrar",
                  onClose: () =>
                    setDataModal((prev) => ({ ...prev, isOpen: false })),
                  onConfirm: () =>
                    setDataModal((prev) => ({ ...prev, isOpen: false })),
                  content: (
                    <div className="admin-order-products-modal">
                      {orderRow ? (
                        <section className="admin-order-products-modal__summary">
                          {(() => {
                            const costs = getAdminOrderCostBreakdown(orderRow);
                            if (
                              costs.shippingTotal <= 0 &&
                              costs.insuranceTotal <= 0
                            ) {
                              return null;
                            }

                            return (
                              <div className="admin-order-cost-summary">
                                {costs.shippingTotal > 0 ? (
                                  <span>
                                    Envío:{" "}
                                    {formatOrderMoney(costs.shippingTotal)}
                                  </span>
                                ) : null}
                                {costs.insuranceTotal > 0 ? (
                                  <span>
                                    Seguro:{" "}
                                    {formatOrderMoney(costs.insuranceTotal)}
                                  </span>
                                ) : null}
                                <span className="admin-order-cost-summary__total">
                                  Total orden:{" "}
                                  {formatOrderMoney(costs.grandTotal)}
                                </span>
                              </div>
                            );
                          })()}
                        </section>
                      ) : null}
                      {/* TechSmart WS bloqueado: deshabilitado generar pedido / vincular guía / facturar.
                          El estatus de entrega se sigue manejando abajo en DataProducts. */}
                      {/* {orderRow?.hasTechsmartProducts && can("techsmart.manage") && (
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
                      )} */}
                      <section className="admin-order-products-modal__list">
                        <h3 className="admin-order-products-modal__section-title">
                          {orderRow?.products?.length === 1
                            ? "1 producto en la orden"
                            : `${orderRow?.products?.length ?? 0} productos en la orden`}
                        </h3>
                        {(() => {
                          const digitalProducts = (
                            orderRow?.products || []
                          ).filter((p: any) => {
                            const method = String(
                              p?.address?.shipping_method ||
                                p?.shipping_method ||
                                "",
                            ).toLowerCase();
                            const licenseType = String(
                              p?.licenseType || "",
                            ).toLowerCase();
                            return (
                              method === "digital" ||
                              licenseType === "windows" ||
                              licenseType === "antivirus" ||
                              licenseType === "office"
                            );
                          });
                          if (!digitalProducts.length) return null;
                          const email =
                            orderRow?.dataUser?.email ||
                            params.row?.dataUser?.email;
                          const payStatus =
                            orderRow?.statusPay ?? params.row?.statusPay;
                          const paid = isOrderPaid(payStatus);
                          return (
                            <Alert
                              severity={paid ? "warning" : "info"}
                              icon={<Mail size={18} />}
                              sx={{ mb: 1.5, borderRadius: "12px" }}
                            >
                              Esta orden incluye{" "}
                              <strong>
                                {digitalProducts.length} licencia
                                {digitalProducts.length === 1 ? "" : "s"} digital
                                {digitalProducts.length === 1 ? "" : "es"}
                              </strong>
                              .{" "}
                              {paid ? (
                                <>
                                  Con pago confirmado, envía la información de
                                  activación desde el panel de cada producto al
                                  correo{" "}
                                  <strong>{email || "del cliente"}</strong>
                                  {email ? (
                                    <>
                                      {" "}
                                      (<a href={`mailto:${email}`}>{email}</a>)
                                    </>
                                  ) : null}
                                  .
                                </>
                              ) : (
                                <>
                                  El envío desde Admin se habilita cuando el
                                  pago esté confirmado (estado:{" "}
                                  <strong>
                                    {getPaymentStatusLabel(payStatus)}
                                  </strong>
                                  ).
                                </>
                              )}
                            </Alert>
                          );
                        })()}
                        <DataProducts
                          params={{
                            value: orderRow?.products,
                            row: orderRow || params.row,
                          }}
                          handleChangeStatusShip={handleChangeStatusShip}
                          onSaleLicenseDelivered={(idSale: number, idOrder: number) => {
                            setRowsVentas((prev) => ({
                              ...prev,
                              data: prev.data.map((order) =>
                                order.idOrder === idOrder
                                  ? {
                                      ...order,
                                      products: order.products.map((product) =>
                                        Number(product.idSale) === Number(idSale)
                                          ? {
                                              ...product,
                                              statusShip: "entregado",
                                              licenseDeliveredAt:
                                                new Date().toISOString(),
                                            }
                                          : product,
                                      ),
                                    }
                                  : order,
                              ),
                            }));
                          }}
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
                  `${params.value.length == 1
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
        ...centeredColumn,
        renderCell: (params) => {
          const costs = getAdminOrderCostBreakdown(params.row);
          const hasShippingCosts =
            costs.shippingTotal > 0 || costs.insuranceTotal > 0;

          return (
            <div
              className={`${styles.cell} ${styles.cellCol} ${styles.truncateCell}`}
            >
              <span className={styles.cellTextMuted}>
                {formatCurrency(Number(params.value))}
              </span>
              {hasShippingCosts ? (
                <span className={styles.orderCostHint}>
                  {costs.shippingTotal > 0
                    ? `Envío ${formatOrderMoney(costs.shippingTotal)}`
                    : null}
                  {costs.shippingTotal > 0 && costs.insuranceTotal > 0
                    ? " · "
                    : null}
                  {costs.insuranceTotal > 0
                    ? `Seguro ${formatOrderMoney(costs.insuranceTotal)}`
                    : null}
                </span>
              ) : null}
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
        ...centeredColumn,
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
        ...centeredColumn,
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
        ...centeredColumn,
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
                <Chip
                  size="small"
                  label={getPaymentStatusLabel(params?.row?.statusPay)}
                  color={getPaymentStatusChipColor(params?.row?.statusPay)}
                  variant="outlined"
                  sx={{ fontWeight: 600, minWidth: 96 }}
                />
              </div>
            </div>
          );
        },
      },
    ],
    [rows, can, openCancelOrderModal, rowsVentas, setRowsVentas, setDataModal, formatCurrency],
  );

  return {
    columns,
  };
};

export default GridDashboard;
