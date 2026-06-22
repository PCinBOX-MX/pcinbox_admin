"use client";

import { Pagination, Stack, Typography } from "@mui/material";

interface Props {
  totalItems: number;
  itemsPerPage?: number;
  currentPage?: number;
  onPageChange: (page: number) => void;
}

const PaginatorComponent = ({
  totalItems,
  itemsPerPage = 8,
  currentPage = 1,
  onPageChange,
}: Props) => {
  const pageCount = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  if (totalItems <= itemsPerPage) {
    return null;
  }

  return (
    <Stack
      className="admin-paginator"
      direction={{ xs: "column", sm: "row" }}
      alignItems="center"
      justifyContent="space-between"
      spacing={1.5}
      sx={{ px: { xs: 0, sm: 1 } }}
    >
      <Typography variant="body2" color="text.secondary" fontWeight={500}>
        Página {currentPage} de {pageCount} · {totalItems} elementos
      </Typography>

      <Pagination
        count={pageCount}
        page={currentPage}
        onChange={(_, page) => onPageChange(page)}
        color="primary"
        shape="rounded"
        showFirstButton
        showLastButton
        siblingCount={1}
        boundaryCount={1}
      />
    </Stack>
  );
};

export default PaginatorComponent;
