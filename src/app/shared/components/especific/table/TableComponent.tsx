"use client";

import { DataGrid, GridColDef, GridRowsProp } from "@mui/x-data-grid";
import { dataGridSx } from "@/app/theme/adminTheme";

const TableComponent = ({
  rowsDataGrid,
  columnsDataGrid,
  totalRows,
  paginationModel,
  handlePaginationChange,
  hideFooter = false,
  loading = false,
  pageSizeOptions = [10, 25, 50],
}: {
  rowsDataGrid: GridRowsProp;
  columnsDataGrid: GridColDef[];
  totalRows?: number;
  paginationModel?: { page: number; pageSize: number };
  handlePaginationChange?: (model: { page: number; pageSize: number }) => void;
  hideFooter?: boolean;
  loading?: boolean;
  pageSizeOptions?: number[];
}) => {
  if (!rowsDataGrid?.length || !columnsDataGrid?.length) return null;

  // Con footer externo (ModernPagination), las filas ya vienen paginadas por el API.
  // "client" + page>0 re-corta esas filas y la UI muestra otra página / vacío.
  const externalPagination = hideFooter;

  return (
    <div className="admin-table-scroll">
      <DataGrid
        loading={loading}
        paginationMode="server"
        rowCount={totalRows || rowsDataGrid.length || 0}
        rows={rowsDataGrid}
        columns={columnsDataGrid}
        paginationModel={
          externalPagination
            ? {
                page: 0,
                pageSize: paginationModel?.pageSize ?? rowsDataGrid.length,
              }
            : paginationModel
        }
        onPaginationModelChange={handlePaginationChange}
        hideFooter={hideFooter}
        pageSizeOptions={pageSizeOptions}
        disableRowSelectionOnClick
        localeText={{
          noRowsLabel: "Sin datos para mostrar",
          paginationRowsPerPage: "Filas por página",
        }}
        autoHeight
        rowHeight={72}
        sx={{
          ...dataGridSx,
          width: "100%",
          minWidth: 0,
          border: "none",
        }}
        getRowHeight={() => "auto"}
        getRowId={(row) => row.idOrder ?? row.idUser ?? row.id ?? row.referencia}
      />
    </div>
  );
};

export default TableComponent;
