"use client";

import ProveedoresUtils from "../services/utils/proveedores.utils";
import { SalesI } from "../interfaces/sales/sales.interface";
import PagosUtils from "../services/utils/pagos.utils";
import { useTheContext } from "../hooks/global.hook";

const useDashboard = () => {
  const { requestGetProveedores } = ProveedoresUtils();
  const { setRowsVentas } = useTheContext();

  const { requestPostPagos } = PagosUtils();

  const handleGetAllSales = async (page?: number) => {
    try {
      const resp = await requestGetProveedores(`/getAllSales?page=${page}`);

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

          return {
            totalSales: data.data.totalSales,
            data: Array.from(grouped.values()).map((item, index) => ({
              ...item,
              id: index,
            })),
          };
        });
      }
    } catch (error) {}
  };

  const handleChangeStatusShip = async (
    event: any,
    idOrder: number,
    idUser: any
  ) => {
    try {
      const resp = await requestPostPagos(
        { idOrder, status: event.target.value, idUser },
        "/stripe/updateStatusShipByOrden"
      );

      if (resp.status == 200) {
        // const data = await resp.data;
        setRowsVentas((prev) => {
          return {
            ...prev,
            data: prev.data.map((item) => {
              if (Number(item.idOrder) == Number(idOrder)) {
                return { ...item, statusShip: event.target.value };
              }
              return item;
            }),
          };
        });
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
          return {
            ...prev,
            data: prev.data.map((item) => {
              if (item.idOrder == idOrder) {
                return { ...item, statusPay: event.target.value };
              }
              return item;
            }),
          };
        });

        // setTableKey((prev) => prev + 1); // Forzar re-render
      }
    } catch (error) {}
  };

  return {
    handleGetAllSales,
    handleChangeStatusShip,
    handleChangeStatusPay,
  };
};

export default useDashboard;
