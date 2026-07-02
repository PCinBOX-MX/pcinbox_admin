"use client";

import { DataGrid, GridColDef, GridRowsProp } from "@mui/x-data-grid";

const tableSx = {
  border: "none",
  "& .MuiDataGrid-columnHeaders": {
    backgroundColor: "#f8fafc",
    borderBottom: "1px solid #e8ecf4",
    minHeight: "52px !important",
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  "& .MuiDataGrid-cell": {
    borderBottom: "1px solid #f1f5f9",
    fontSize: "0.9rem",
    color: "#334155",
  },
  "& .MuiDataGrid-row:hover": {
    backgroundColor: "#fafbfd",
  },
  "& .MuiDataGrid-footerContainer": {
    borderTop: "1px solid #e8ecf4",
  },
};

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

  return (
    <div className="admin-table-scroll">
      <DataGrid
        loading={loading}
        paginationMode={hideFooter ? "client" : "server"}
        rowCount={hideFooter ? undefined : totalRows || 0}
        rows={rowsDataGrid}
        columns={columnsDataGrid}
        paginationModel={paginationModel}
        onPaginationModelChange={handlePaginationChange}
        hideFooter={hideFooter}
        pageSizeOptions={pageSizeOptions}
        disableRowSelectionOnClick
        localeText={{
          noRowsLabel: "Sin datos para mostrar",
          paginationRowsPerPage: "Filas por página",
        }}
        rowHeight={72}
        sx={{
          ...tableSx,
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
