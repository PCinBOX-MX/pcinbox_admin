"use client";

import { useState } from "react";
import ProveedoresUtils from "../services/utils/proveedores.utils";
import { SalesI } from "../interfaces/sales/sales.interface";
import { GridRowsProp } from "@mui/x-data-grid";
import PagosUtils from "../services/utils/pagos.utils";

const useDashboard = () => {
  const [rows, setRows] = useState<GridRowsProp<SalesI>>([]);
  const { requestGetProveedores } = ProveedoresUtils();
  const [tableKey, setTableKey] = useState(0);

  const { requestPostPagos } = PagosUtils();

  const handleGetAllSales = async () => {
    try {
      const resp = await requestGetProveedores("/getAllSales");

      if (resp.status == 200) {
        const data = resp.data;
        setRows(() => {
          const grouped = new Map<number, SalesI>();

          data.data.data.forEach((item: SalesI) => {
            const existing = grouped.get(item.idOrder);

            if (existing) {
              // Sumar totalAmount
              existing.totalAmount = (
                parseFloat(existing.totalAmount) + parseFloat(item.totalAmount)
              ).toFixed(2);

              // Unir productos
              item.products.forEach((product) => {
                const existingProduct = existing.products.find(
                  (p) => p.productName === product.productName
                );

                if (existingProduct) {
                  existingProduct.quantity += product.quantity;
                } else {
                  existing.products.push({ ...product });
                }
              });
            } else {
              // Nuevo idOrder
              grouped.set(item.idOrder, {
                ...item,
                products: [...item.products],
              });
            }
          });

          return Array.from(grouped.values()).map((item, index) => ({
            ...item,
            id: index,
          }));
        });
      }
    } catch (error) {}
  };

  const handleChangeStatusShip = async (
    event: any,
    idShipment: number,
    idUser: any
  ) => {
    try {
      const resp = await requestPostPagos(
        { idShipment, status: event.target.value, idUser },
        "/stripe/updateStatusShipByOrden"
      );

      if (resp.status == 200) {
        // const data = await resp.data;
        setRows((prev) => {
          return prev.map((item) => {
            if (item.idShipment == idShipment) {
              return { ...item, statusShip: event.target.value };
            }
            return item;
          });
        });

        setTableKey((prev) => prev + 1); // Forzar re-render
      }
    } catch (error) {}
  };

  const handleChangeStatusPay = async (
    event: any,
    idOrder: number,
    idUser: any
  ) => {
    try {
      const resp = await requestPostPagos(
        { status: event.target.value, idUser, idOrder },
        "/stripe/updateStatusPayByOrden"
      );
      if (resp.status == 200) {
        setRows((prev) => {
          return prev.map((item) => {
            if (item.idOrder == idOrder) {
              return { ...item, statusPay: event.target.value };
            }
            return item;
          });
        });

        setTableKey((prev) => prev + 1); // Forzar re-render
      }
    } catch (error) {}
  };

  return {
    rows,
    tableKey,
    setRows,
    handleGetAllSales,
    handleChangeStatusShip,
    handleChangeStatusPay,
  };
};

export default useDashboard;
