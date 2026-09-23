"use client";

import type { RefObject } from "react";
import { Pagination, Select, MenuItem, FormControl } from "@mui/material";

type ModernPaginationProps = {
  page: number;
  pageCount: number;
  totalItems: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  label?: string;
  /** Default true. Usar false en el paginado superior (dual). */
  scrollOnChange?: boolean;
  /** Si se define, el scroll va a este nodo en lugar del header de página. */
  scrollTargetRef?: RefObject<HTMLElement | null>;
};

const ModernPagination = ({
  page,
  pageCount,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 25, 50],
  onPageChange,
  onPageSizeChange,
  label = "registros",
  scrollOnChange = true,
  scrollTargetRef,
}: ModernPaginationProps) => {
  if (pageCount <= 0 && totalItems <= 0) return null;

  const from = totalItems === 0 ? 0 : (page - 1) * (pageSize ?? 10) + 1;
  const to = Math.min(page * (pageSize ?? 10), totalItems);

  return (
    <div className="modern-pagination">
      <span className="modern-pagination-info">
        {totalItems > 0
          ? `${from}–${to} de ${totalItems} ${label}`
          : `0 ${label}`}
      </span>

      <div className="modern-pagination-controls">
        {onPageSizeChange && pageSize != null && (
          <FormControl size="small" sx={{ minWidth: 88 }}>
            <Select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              sx={{
                borderRadius: "10px",
                fontSize: "0.875rem",
                ".MuiOutlinedInput-notchedOutline": { borderColor: "#e5e7eb" },
              }}
            >
              {pageSizeOptions.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt} / pág.
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Pagination
          count={Math.max(pageCount, 1)}
          page={page}
          onChange={(_, value) => {
            if (value === page) return;
            onPageChange(value);
            if (!scrollOnChange) return;
            window.setTimeout(() => {
              const target =
                scrollTargetRef?.current ??
                document.querySelector(".admin-page-header");
              if (target) {
                target.scrollIntoView({ behavior: "smooth", block: "start" });
              } else {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }, 150);
          }}
          shape="rounded"
          color="primary"
          sx={{
            "& .MuiPaginationItem-root": {
              fontWeight: 500,
              borderRadius: "10px",
            },
            "& .Mui-selected": {
              backgroundColor: "#bb3d4b !important",
              color: "#fff",
            },
          }}
        />
      </div>
    </div>
  );
};

export default ModernPagination;
