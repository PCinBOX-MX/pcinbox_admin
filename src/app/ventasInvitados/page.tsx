"use client";

import EmptyState from "../shared/components/common/emptyState/EmptyState";
import { useEffect, useState } from "react";
import { useQueryParams } from "../hooks/useQueryParams";
import { useTheContext } from "../hooks/global.hook";
import TableComponent from "../shared/components/especific/table/TableComponent";
import GridVentasInvitados from "./gridVentasInvitados";
import AdminPageShell from "../shared/components/layout/AdminPageShell";
import ModernPagination from "../shared/components/common/paginator/ModernPagination";
import AdminRefreshButton from "../shared/components/common/buttons/AdminRefreshButton";
import AdminRefreshablePanel from "../shared/components/common/layout/AdminRefreshablePanel";
import { Filter, RefreshCw, Search, X } from "lucide-react";
import { TextField, FormControl, InputLabel, Select, MenuItem, Alert } from "@mui/material";
import useVentasInvitados from "./useVentasInvitados";
import { adminFieldSx } from "../theme/adminFieldSx";
import { resolvePageParam } from "../utils/adminPagination";

const PAGE_SIZE = 10;

const VentasInvitados = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { rowsVentasInvitados } = useTheContext();
  const { handleGetAllSalesInvitados, loading, listError } = useVentasInvitados();
  const { searchParams, setQueryParams } = useQueryParams();

  const searchParam = searchParams.get("search") || "";
  const statusFilter = searchParams.get("status") || "all";
  const page = resolvePageParam(searchParams.get("page"), 1);

  const [search, setSearch] = useState(searchParam);
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam);

  useEffect(() => {
    if (searchParam !== search) setSearch(searchParam);
    if (searchParam !== debouncedSearch) setDebouncedSearch(searchParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParam]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const trimmed = search.trim();
      setDebouncedSearch(trimmed);
      if (trimmed !== searchParam) {
        setQueryParams({ search: trimmed, page: 1 });
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [search, searchParam, setQueryParams]);

  useEffect(() => {
    void handleGetAllSalesInvitados(
      { page: Math.max(0, page - 1), pageSize: PAGE_SIZE },
      { search: debouncedSearch, status: statusFilter },
    );
  }, [page, debouncedSearch, statusFilter, handleGetAllSalesInvitados]);

  const rows = Array.isArray(rowsVentasInvitados.data)
    ? rowsVentasInvitados.data
    : [];
  const totalRows = rowsVentasInvitados.totalRows ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  const rowsWithId = rows.map((item, index) => ({
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
      pageSize={PAGE_SIZE}
      totalItems={totalRows}
      onPageChange={(p) => setQueryParams({ page: p })}
      label="órdenes"
    />
  );

  const reloadGuestSales = () => {
    void handleGetAllSalesInvitados(
      { page: Math.max(0, page - 1), pageSize: PAGE_SIZE },
      { search: debouncedSearch, status: statusFilter },
    );
  };

  if (!mounted) return null;

  return (
    <AdminPageShell
      title="Ventas (Invitados)"
      subtitle="Órdenes generadas por links de pago para invitados"
      actions={
        <AdminRefreshButton onClick={reloadGuestSales} loading={loading} />
      }
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
              sx={adminFieldSx}
              InputProps={{
                startAdornment: <Search size={18} className="admin-filter-icon" />,
              }}
            />
            <FormControl size="small" sx={adminFieldSx}>
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
                setDebouncedSearch("");
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
      paginationTop={totalRows > 0 ? paginationBlock : undefined}
      paginationBottom={totalRows > 0 ? paginationBlock : undefined}
    >
      {listError ? (
        <div className="admin-empty-state" style={{ display: "grid", gap: 12 }}>
          <Alert severity="error">{listError}</Alert>
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={reloadGuestSales}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Reintentar
          </button>
        </div>
      ) : (
        <AdminRefreshablePanel
          loading={loading}
          hasContent={rowsWithId.length > 0}
          emptyState={
            <div className="admin-empty-state">
              <EmptyState
                title={loading ? "Cargando órdenes..." : "Sin ventas de invitados"}
                description={
                  loading
                    ? "Estamos obteniendo la información del panel."
                    : "No hay ventas de invitados que mostrar con los filtros actuales."
                }
                icon="orders"
              />
            </div>
          }
        >
          <TableComponent
            loading={loading}
            columnsDataGrid={columns}
            rowsDataGrid={rowsWithId}
            hideFooter
          />
        </AdminRefreshablePanel>
      )}
    </AdminPageShell>
  );
};

export default VentasInvitados;
