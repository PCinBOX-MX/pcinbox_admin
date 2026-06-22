"use client";

import { DataGrid, GridColDef, GridRowsProp } from "@mui/x-data-grid";
import { Box } from "@mui/material";
import { useMemo } from "react";
import { dataGridSx } from "@/app/theme/adminTheme";
import TablePaginationBar from "./TablePaginationBar";

function normalizeColumns(
  columns: GridColDef[],
  fitColumns: boolean,
): GridColDef[] {
  return columns.map((column) => {
    const normalized: GridColDef = {
      ...column,
      headerAlign: column.headerAlign ?? "center",
      align: column.align ?? "center",
    };

    if (fitColumns) {
      const { width: _width, maxWidth: _maxWidth, ...rest } = normalized;
      return {
        ...rest,
        flex: column.flex ?? 1,
        minWidth: column.minWidth ?? 80,
      };
    }

    return {
      ...normalized,
      minWidth: column.minWidth ?? 110,
    };
  });
}

const fitGridSx = {
  border: "none",
  minHeight: 440,
  width: "100%",
  fontFamily: dataGridSx.fontFamily ?? undefined,
  "& .MuiDataGrid-columnHeaders": {
    backgroundColor: "#f9fafb",
    borderBottom: "1px solid #e8e8ec",
    minHeight: "56px !important",
    maxWidth: "100%",
  },
  "& .MuiDataGrid-columnHeader": {
    px: 1,
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    fontSize: "0.68rem",
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    whiteSpace: "normal",
    lineHeight: 1.3,
    textAlign: "center",
  },
  "& .MuiDataGrid-cell": {
    borderBottom: "1px solid #f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    px: 1,
    py: 1.25,
    fontSize: "0.8125rem",
    color: "#374151",
    lineHeight: 1.4,
  },
  "& .MuiDataGrid-row": {
    transition: "background-color 0.15s ease",
    maxWidth: "100%",
  },
  "& .MuiDataGrid-row:hover": {
    backgroundColor: "#fdf2f3",
  },
  "& .MuiDataGrid-main": {
    width: "100%",
    overflow: "hidden",
  },
  "& .MuiDataGrid-virtualScroller": {
    minHeight: 360,
    overflowX: "hidden !important",
  },
  "& .MuiCircularProgress-root": {
    color: "#bb3d4b",
  },
};

const TableComponent = ({
  rowsDataGrid,
  columnsDataGrid,
  totalRows,
  paginationModel,
  handlePaginationChange,
  loading = false,
  pageSizeOptions = [10, 25, 50],
  fitColumns = false,
}: {
  rowsDataGrid: GridRowsProp;
  columnsDataGrid: GridColDef[];
  totalRows?: number;
  paginationModel?: { page: number; pageSize: number };
  handlePaginationChange?: (model: {
    page: number;
    pageSize: number;
  }) => void;
  loading?: boolean;
  pageSizeOptions?: number[];
  fitColumns?: boolean;
}) => {
  const columns = useMemo(
    () => normalizeColumns(columnsDataGrid, fitColumns),
    [columnsDataGrid, fitColumns],
  );

  const rowCount = totalRows ?? rowsDataGrid.length;
  const hasPagination =
    paginationModel != null && handlePaginationChange != null;

  if (!columns.length) {
    return null;
  }

  const handlePageChange = (page: number) => {
    if (!paginationModel || !handlePaginationChange) return;
    handlePaginationChange({ ...paginationModel, page });
  };

  const handlePageSizeChange = (pageSize: number) => {
    if (!paginationModel || !handlePaginationChange) return;
    handlePaginationChange({ page: 0, pageSize });
  };

  const paginationProps =
    hasPagination && paginationModel
      ? {
          page: paginationModel.page,
          pageSize: paginationModel.pageSize,
          rowCount,
          pageSizeOptions,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }
      : null;

  return (
    <Box className="admin-data-grid-wrapper">
      {paginationProps ? (
        <TablePaginationBar
          {...paginationProps}
          className="admin-table-pagination--top"
        />
      ) : null}

      <Box
        className={`admin-data-grid-surface${fitColumns ? " admin-data-grid-surface--fit" : ""}`}
      >
        <DataGrid
          loading={loading}
          paginationMode={hasPagination ? "server" : "client"}
          rowCount={rowCount}
          rows={rowsDataGrid}
          columns={columns}
          paginationModel={paginationModel}
          onPaginationModelChange={() => {}}
          pageSizeOptions={pageSizeOptions}
          disableRowSelectionOnClick
          hideFooter
          disableColumnMenu
          columnHeaderHeight={56}
          rowHeight={76}
          getRowHeight={() => "auto"}
          getRowId={(row) => row.idOrder ?? row.idUser ?? row.id}
          localeText={{
            noRowsLabel: "Sin datos para mostrar",
          }}
          sx={fitColumns ? fitGridSx : dataGridSx}
        />
      </Box>

      {paginationProps ? (
        <Box className="admin-table-pagination admin-table-pagination--bottom">
          <TablePaginationBar {...paginationProps} />
        </Box>
      ) : null}
    </Box>
  );
};

export default TableComponent;
