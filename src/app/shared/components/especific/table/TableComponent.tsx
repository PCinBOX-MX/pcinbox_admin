"use client";

import { DataGrid, GridColDef, GridRowsProp } from "@mui/x-data-grid";
import { Box } from "@mui/material";

const TableComponent = ({
  rowsDataGrid,
  columnsDataGrid,
  totalRows,
  paginationModel,
  handlePaginationChange,
  loading = false,
}: {
  rowsDataGrid: GridRowsProp;
  columnsDataGrid: GridColDef[];
  totalRows?: number;
  paginationModel?: { page: number; pageSize: number };
  handlePaginationChange?: (model: any) => void;
  loading?: boolean;
}) => {
  if (!rowsDataGrid?.length || !columnsDataGrid?.length) {
    return null;
  }

  return (
    <Box className="admin-panel admin-data-grid">
      <DataGrid
        loading={loading}
        paginationMode="server"
        rowCount={totalRows ?? rowsDataGrid.length}
        rows={rowsDataGrid}
        columns={columnsDataGrid}
        paginationModel={paginationModel}
        onPaginationModelChange={handlePaginationChange}
        pageSizeOptions={[10, 25, 50]}
        disableRowSelectionOnClick
        localeText={{
          noRowsLabel: "Sin datos para mostrar",
          paginationRowsPerPage: "Filas por página:",
        }}
        rowHeight={72}
        getRowHeight={() => "auto"}
        getRowId={(row) => row.idOrder ?? row.idUser ?? row.id}
        sx={{
          border: "none",
          minHeight: 420,
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: "#fafafa",
            borderBottom: "1px solid #e8e8ec",
            minHeight: "52px !important",
          },
          "& .MuiDataGrid-columnHeaderTitle": {
            fontSize: "0.8rem",
            fontWeight: 700,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          },
          "& .MuiDataGrid-cell": {
            borderBottom: "1px solid #f0f0f3",
            display: "flex",
            alignItems: "center",
            py: 1,
          },
          "& .MuiDataGrid-row:hover": {
            backgroundColor: "#fdf2f3",
          },
          "& .MuiDataGrid-footerContainer": {
            borderTop: "1px solid #e8e8ec",
            backgroundColor: "#fafafa",
          },
          "& .MuiTablePagination-root": {
            color: "#4b5563",
          },
          "& .MuiDataGrid-overlay": {
            backgroundColor: "rgba(255,255,255,0.8)",
          },
          "& .MuiCircularProgress-root": {
            color: "#bb3d4b",
          },
        }}
      />
    </Box>
  );
};

export default TableComponent;
