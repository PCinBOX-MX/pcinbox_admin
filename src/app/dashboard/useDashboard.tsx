"use client";

import { useState } from "react";
import ProveedoresUtils from "../services/utils/proveedores.utils";
import { SalesI } from "../interfaces/sales/sales.interface";
import PagosUtils from "../services/utils/pagos.utils";
import { useTheContext } from "../hooks/global.hook";

const useDashboard = () => {
  const { requestGetProveedores } = ProveedoresUtils();
  const { setRowsVentas } = useTheContext();
  const [tableKey, setTableKey] = useState(0);

  const { requestPostPagos } = PagosUtils();

  const handleGetAllSales = async () => {
    try {
      const resp = await requestGetProveedores("/getAllSales");

      if (resp.status == 200) {
        const data = resp.data;
        setRowsVentas(() => {
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
        setRowsVentas((prev) => {
          return prev.map((item) => {
            if (item.idShipment == idShipment) {
              return { ...item, statusShip: event.target.value };
            }
            return item;
          });
        });

        // setTableKey((prev) => prev + 1); // Forzar re-render
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
        setRowsVentas((prev) => {
          return prev.map((item) => {
            if (item.idOrder == idOrder) {
              return { ...item, statusPay: event.target.value };
            }
            return item;
          });
        });

        // setTableKey((prev) => prev + 1); // Forzar re-render
      }
    } catch (error) {}
  };

  return {
    tableKey,
    handleGetAllSales,
    handleChangeStatusShip,
    handleChangeStatusPay,
  };
};

export default useDashboard;
