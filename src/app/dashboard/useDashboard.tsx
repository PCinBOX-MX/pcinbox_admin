"use client";

import ProveedoresUtils from "../services/utils/proveedores.utils";
import { SalesI } from "../interfaces/sales/sales.interface";
import PagosUtils from "../services/utils/pagos.utils";
import { useTheContext } from "../hooks/global.hook";
import {
  buildPaginatedUrl,
  PaginationModel,
  parsePaginatedResponse,
} from "../utils/pagination.util";
import { useCallback, useState } from "react";

const useDashboard = () => {
  const { requestGetProveedores } = ProveedoresUtils();
  const { setRowsVentas } = useTheContext();
  const { requestPostPagos } = PagosUtils();
  const [loading, setLoading] = useState(false);

  const handleGetAllSales = useCallback(
    async (pagination: PaginationModel) => {
      setLoading(true);
      try {
        const resp = await requestGetProveedores(
          buildPaginatedUrl("/getAllSales", pagination),
          { silent: true },
        );

        if (resp.status == 200) {
          const { rows, totalRows } = parsePaginatedResponse<SalesI>(
            resp.data,
          );

          const grouped = new Map<number, SalesI>();

          rows.forEach((item: any) => {
            const products =
              typeof item.products === "string"
                ? JSON.parse(item.products)
                : (item.products ?? []);

            const existing = grouped.get(item.idOrder);

            if (existing) {
              existing.totalAmount = (
                parseFloat(existing.totalAmount) + parseFloat(item.totalAmount)
              ).toFixed(2);

              products.forEach((product: any) => {
                const existingProduct = existing.products.find(
                  (p) => p.productName === product.productName,
                );

                if (existingProduct) {
                  existingProduct.quantity += product.quantity;
                } else {
                  existing.products.push({ ...product });
                }
              });
            } else {
              grouped.set(item.idOrder, {
                ...item,
                products: [...products],
              });
            }
          });

          setRowsVentas({
            totalRows,
            data: Array.from(grouped.values()).map((item, index) => ({
              ...item,
              id: index,
            })),
          });
        }
      } catch (error) {
        setRowsVentas({ totalRows: 0, data: [] });
      } finally {
        setLoading(false);
      }
    },
    [requestGetProveedores, setRowsVentas],
  );

  const handleChangeStatusShip = async (
    event: any,
    idShipment: number,
    idUser: any,
  ) => {
    try {
      const resp = await requestPostPagos(
        { idShipment: Number(idShipment), status: event.target.value, idUser },
        "/openpay/updateStatusShipByOrden",
        { silent: true },
      );

      if (resp.status == 200) {
        setRowsVentas((prev) => ({
          ...prev,
          data: prev.data.map((order) => ({
            ...order,
            products: order.products.map((product) => {
              if (
                Number(product.idShipment) ===
                Number(resp.data.data.data.idShipment)
              ) {
                return { ...product, statusShip: resp.data.data.data.status };
              }
              return product;
            }),
          })),
        }));
      }
    } catch (error) {}
  };

  const handleChangeStatusPay = async (
    event: any,
    idOrder: number,
    idUser: any,
  ) => {
    try {
      const resp = await requestPostPagos(
        { status: event.target.value, idUser, idOrder },
        "/stripe/updateStatusPayByOrden",
        { silent: true },
      );
      if (resp.status == 200) {
        setRowsVentas((prev) => ({
          ...prev,
          data: prev.data.map((order) =>
            order.idOrder === idOrder
              ? { ...order, statusPay: event.target.value }
              : order,
          ),
        }));
      }
    } catch (error) {}
  };

  return {
    handleGetAllSales,
    handleChangeStatusShip,
    handleChangeStatusPay,
    loading,
  };
};

export default useDashboard;
