"use client";

import { DataGrid, GridColDef, GridRowsProp } from "@mui/x-data-grid";

const TableComponent = ({
  rowsDataGrid,
  columnsDataGrid,
}: {
  rowsDataGrid: GridRowsProp;
  columnsDataGrid: GridColDef[];
}) => {
  return (
    rowsDataGrid.length > 0 &&
    columnsDataGrid.length > 0 && (
      <DataGrid
        loading={false}
        rows={rowsDataGrid || []}
        columns={columnsDataGrid || []}
        localeText={{
          noRowsLabel: "Sin datos para mostrar",
          paginationRowsPerPage: "Número de pagina",
        }}
        initialState={{
          pagination: {
            paginationModel: {
              pageSize: 10,
              page: 0,
            },
          },
        }}
        rowHeight={80}
        sx={{
          "& .MuiDataGrid-cell": {
            borderRight: "1px solid #e5e7eb",
          },
          "& .MuiDataGrid-columnHeaders": {
            borderBottom: "1px solid #e5e7eb",
          },
          "& .MuiDataGrid-columnHeaderTitle": {
            fontSize: "18px",
            fontWeight: "500",
            color: "#808080",
            display: "block",
            margin: "auto",
          },
        }}
        getRowHeight={() => "auto"}
        getRowId={(row) => row.idOrder || row.idUser || row.id}
      />
    )
  );
};

export default TableComponent;
