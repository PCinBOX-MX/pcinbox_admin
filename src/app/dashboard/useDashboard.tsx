"use client";

import ProveedoresUtils from "../services/utils/proveedores.utils";
import { SalesI } from "../interfaces/sales/sales.interface";
import PagosUtils from "../services/utils/pagos.utils";
import { useTheContext } from "../hooks/global.hook";

const useDashboard = () => {
  const { requestGetProveedores } = ProveedoresUtils();
  const { setRowsVentas } = useTheContext();

  const { requestPostPagos } = PagosUtils();

  const handleGetAllSales = async (page = 1) => {
    try {
      const resp = await requestGetProveedores(`/getAllSales?page=${page}`);

      if (resp.status == 200) {
        const data = resp.data;
        setRowsVentas(() => {
          const grouped = new Map<number, SalesI>();

          data.data.data.forEach((item: any) => {
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

          return {
            totalRows: data?.data?.totalSales,
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
    idShipment: number,
    idUser: any,
  ) => {
    try {
      const resp = await requestPostPagos(
        { idShipment: Number(idShipment), status: event.target.value, idUser },
        "/openpay/updateStatusShipByOrden",
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
                // Actualizamos el status
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
      );
      if (resp.status == 200) {
        // setRowsVentas((prev) => {
        //   return prev.map((item) => {
        //     if (item.idOrder == idOrder) {
        //       return { ...item, statusPay: event.target.value };
        //     }
        //     return item;
        //   });
        // });
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
