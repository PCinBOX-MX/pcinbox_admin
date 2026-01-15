"use client";

import TableComponent from "../shared/components/especific/table/TableComponent";
import GridDashboard from "./gridDashboard";
import useDashboard from "./useDashboard";
import { LucideStepBack, LucideStepForward } from "lucide-react";

import { useTheContext } from "../hooks/global.hook";
import { Alert, Pagination, PaginationItem } from "@mui/material";
import { useEffect, useState } from "react";

const DashBoard = () => {
  const [page, setPage] = useState<number>(1);

  const { rowsVentas, tableKey } = useTheContext();
  const { handleChangeStatusShip, handleChangeStatusPay, handleGetAllSales } =
    useDashboard();

  const { columns } = GridDashboard({
    handleChangeStatusShip,
    rows: rowsVentas,
    handleChangeStatusPay,
  });

  const handleOnPaginationModelChange = async (newPage: number) => {
    setPage(newPage); // Actualiza el estado para re-render
    if (typeof window !== "undefined") {
      localStorage.setItem("pageSales", newPage.toString());
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPage = localStorage.getItem("pageSales");
      if (savedPage) {
        setPage(Number(savedPage));
      }
    }
  }, []);

  useEffect(() => {
    handleGetAllSales(page);
  }, [page]);

  return (
    <section className="w-full">
      <div className="w-full flex justify-center items-center flex-col">
        <div className="w-[95%]">
          {rowsVentas && rowsVentas.data?.length > 0 ? (
            <TableComponent
              key={tableKey}
              columnsDataGrid={columns}
              rowCount={rowsVentas?.totalSales}
              rowsDataGrid={rowsVentas?.data}
              handleOnPaginationModelChange={handleOnPaginationModelChange}
            />
          ) : (
            <Alert severity="info">Sin contenido disponible</Alert>
          )}
        </div>

        <div
          className="w-full flex justify-end items-center"
          style={{
            marginTop: "15px",
          }}
        >
          <Pagination
            page={page}
            count={
              rowsVentas?.totalSales
                ? Math.ceil(rowsVentas?.totalSales / 25)
                : 0
            }
            onChange={(_, page) => {
              handleOnPaginationModelChange(page);
            }}
            renderItem={(item) => (
              <PaginationItem
                slots={{ previous: LucideStepBack, next: LucideStepForward }}
                {...item}
              />
            )}
          />
        </div>
      </div>
    </section>
  );
};

export default DashBoard;
