"use client";

import { Alert } from "@mui/material";
import { useMemo, useState, useEffect } from "react";
import { useQueryParams } from "../hooks/useQueryParams";
import { useTheContext } from "../hooks/global.hook";
import TableComponent from "../shared/components/especific/table/TableComponent";
import GridVentasInvitados from "./gridVentasInvitados";
import AdminPageShell from "../shared/components/layout/AdminPageShell";
import ModernPagination from "../shared/components/common/paginator/ModernPagination";
import { Filter, Search, X } from "lucide-react";
import { TextField, FormControl, InputLabel, Select, MenuItem } from "@mui/material";

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    "&:hover fieldset": { borderColor: "#bb3d4b" },
    "&.Mui-focused fieldset": { borderColor: "#bb3d4b" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#bb3d4b" },
};

const VentasInvitados = () => {
  const { rowsVentasInvitados } = useTheContext();
  const { searchParams, setQueryParams } = useQueryParams();

  const searchParam = searchParams.get("search") || "";
  const statusFilter = searchParams.get("status") || "all";
  const page = parseInt(searchParams.get("page") || "1", 10);
  
  const [search, setSearch] = useState(searchParam);
  const pageSize = 10;

  useEffect(() => {
    if (searchParam !== search) {
      setSearch(searchParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParam]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchParam !== search) {
        setQueryParams({ search, page: 1 });
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [search, searchParam, setQueryParams]);

  const filtered = useMemo(() => {
    return rowsVentasInvitados.filter((item) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        String(item.referencia ?? "").toLowerCase().includes(q) ||
        String(item.email ?? "").toLowerCase().includes(q) ||
        String(item.name ?? "").toLowerCase().includes(q) ||
        String(item.lastname ?? "").toLowerCase().includes(q);

      const payStatus = item.statusPay ?? item.status ?? "";
      const matchesStatus =
        statusFilter === "all" || payStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rowsVentasInvitados, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const rowsWithId = paginated.map((item, index) => ({
    email: item.email,
    monto: item.monto,
    description: item.description,
    referencia: item.referencia,
    name: item.name,
    lastname: item.lastname,
    chargeId: item.chargeId,
    products: item.products,
    id:
      item.idLinkPago ??
      item.id ??
      item.idOrder ??
      item.referencia ??
      `row-${index}`,
    pay_method: item.pay_method,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    dataUser: item.dataUser,
    statusPay: item.statusPay ?? item.status,
    statusShip: item.statusShip,
  }));

  const { columns } = GridVentasInvitados({ rows: rowsWithId });

  const paginationBlock = (
    <ModernPagination
      page={page}
      pageCount={pageCount}
      totalItems={filtered.length}
      pageSize={pageSize}
      onPageChange={(newPage) => setQueryParams({ page: newPage })}
      label="ventas invitado"
    />
  );

  return (
    <AdminPageShell
      title="Ventas (Invitados)"
      subtitle="Órdenes generadas por links de pago para invitados"
      filters={
        <>
          <div className="admin-filters-header">
            <Filter size={16} />
            <span>Filtros</span>
          </div>
          <div className="admin-filters-grid">
            <TextField
              size="small"
              label="Referencia, nombre o email"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              sx={fieldSx}
              InputProps={{
                startAdornment: <Search size={18} className="admin-filter-icon" />,
              }}
            />
            <FormControl size="small" sx={fieldSx}>
              <InputLabel>Estatus pago</InputLabel>
              <Select
                label="Estatus pago"
                value={statusFilter}
                onChange={(e) => {
                  setQueryParams({ status: e.target.value, page: 1 });
                }}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="paid">Pagado</MenuItem>
                <MenuItem value="payment_pending">Pendiente</MenuItem>
                <MenuItem value="cancelled">Cancelado</MenuItem>
              </Select>
            </FormControl>
            <button
              type="button"
              className="admin-btn-ghost"
              onClick={() => {
                setSearch("");
                setQueryParams({ search: "", status: "all", page: 1 });
              }}
              disabled={!search && statusFilter === "all"}
            >
              <X size={16} />
              Limpiar
            </button>
          </div>
        </>
      }
      paginationTop={rowsWithId.length ? paginationBlock : undefined}
      paginationBottom={rowsWithId.length ? paginationBlock : undefined}
    >
      {rowsWithId.length > 0 ? (
        <TableComponent columnsDataGrid={columns} rowsDataGrid={rowsWithId} hideFooter />
      ) : (
        <div className="admin-empty-state">
          <Alert severity="info">Sin ventas de invitados que mostrar</Alert>
        </div>
      )}
    </AdminPageShell>
  );
};

export default VentasInvitados;
