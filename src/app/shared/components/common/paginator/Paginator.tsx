"use client";

import { Pagination } from "@mui/material";
import { useState } from "react";

interface Props {
  totalItems: number; // total de ítems
  itemsPerPage?: number; // por defecto 8
  onPageChange: (page: number) => void;
}

const PaginatorComponent = ({
  totalItems,
  itemsPerPage = 8,
  onPageChange,
}: Props) => {
  const pageCount = Math.ceil(totalItems / itemsPerPage);

  return (
    <Pagination count={pageCount} onChange={(_, page) => onPageChange(page)} />
  );
};

export default PaginatorComponent;
