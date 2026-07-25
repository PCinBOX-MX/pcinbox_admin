"use client";

import {
  FormControl,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Typography,
} from "@mui/material";

type TablePaginationBarProps = {
  page: number;
  pageSize: number;
  rowCount: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
};

export default function TablePaginationBar({
  page,
  pageSize,
  rowCount,
  pageSizeOptions = [10, 25, 50],
  onPageChange,
  onPageSizeChange,
  className = "",
}: TablePaginationBarProps) {
  const pageCount = Math.max(1, Math.ceil(rowCount / pageSize));
  const from = rowCount === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(rowCount, (page + 1) * pageSize);

  return (
    <Stack
      className={`admin-table-pagination ${className}`.trim()}
      direction={{ xs: "column", md: "row" }}
      alignItems={{ xs: "stretch", md: "center" }}
      justifyContent="flex-end"
      spacing={{ xs: 1.25, md: 2 }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        fontWeight={500}
        sx={{ textAlign: { xs: "center", md: "right" }, whiteSpace: "nowrap" }}
      >
        {rowCount > 0
          ? `Mostrando ${from}–${to} de ${rowCount}`
          : "Sin registros"}
      </Typography>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="flex-end"
        spacing={1.5}
        flexWrap="wrap"
      >
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <Select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            displayEmpty
            sx={{
              borderRadius: "10px",
              fontSize: "0.875rem",
              fontWeight: 500,
              bgcolor: "#fff",
            }}
          >
            {pageSizeOptions.map((size) => (
              <MenuItem key={size} value={size}>
                {size} por página
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Pagination
          count={pageCount}
          page={Math.min(page + 1, pageCount)}
          onChange={(_, nextPage) => {
            onPageChange(nextPage - 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          color="primary"
          shape="rounded"
          siblingCount={1}
          boundaryCount={1}
          showFirstButton
          showLastButton
        />
      </Stack>
    </Stack>
  );
}
