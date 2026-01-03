"use client";

import { Alert } from "@mui/material";
import { useTheContext } from "../hooks/global.hook";
import TableComponent from "../shared/components/especific/table/TableComponent";
import GridVentasInvitados from "./gridVentasInvitados";

const VentasInvitados = () => {
  const { rowsVentasInvitados } = useTheContext();

  const rowsWithId = rowsVentasInvitados.map((item, index) => ({
    email: item.email,
    monto: item.monto,
    description: item.description,
    referencia: item.referencia,
    name: item.name,
    lastname: item.lastname,
    chargeId: item.chargeId,
    products: item.products,

    // 🔐 ID ROBUSTO
    id:
      item.idLinkPago ??
      item.id ??
      item.idOrder ??
      item.referencia ??
      `row-${index}`,

    pay_method: item.pay_method,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    dataUser: item.dataUser,
    statusPay: item.statusPay ?? item.status,
    statusShip: item.statusShip,
  }));

  //   const rowsWithId = rowsVentasInvitados.map((item, index) => ({
  //     ...item,
  //     id: item.idLinkPago ?? `venta-${index}`, // Asegura un id único
  //   }));

  const { columns } = GridVentasInvitados({
    rows: rowsWithId,
  });

  return (
    <section className="w-full">
      <div className="w-full flex justify-center items-center">
        <div className="w-[95%]">
          {rowsVentasInvitados.length > 0 ? (
            <TableComponent
              columnsDataGrid={columns}
              rowsDataGrid={rowsWithId} // ✅ AQUÍ
            />
          ) : (
            <Alert severity="info">Sin contenido disponible</Alert>
          )}
        </div>
      </div>
    </section>
  );
};

export default VentasInvitados;
