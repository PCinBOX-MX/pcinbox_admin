"use client";

import TableComponent from "../shared/components/especific/table/TableComponent";
import GridDashboard from "./gridDashboard";
import useDashboard from "./useDashboard";
import React, { useEffect, useMemo, useState } from "react";
import { useTheContext } from "../hooks/global.hook";
import { useQueryParams } from "../hooks/useQueryParams";
import { FormControl, InputLabel, MenuItem, Select, TextField, Alert } from "@mui/material";
import EmptyState from "../shared/components/common/emptyState/EmptyState";
import AdminPageShell from "../shared/components/layout/AdminPageShell";
import ModernPagination from "../shared/components/common/paginator/ModernPagination";
import AdminRefreshButton from "../shared/components/common/buttons/AdminRefreshButton";
import { Filter, RefreshCw, Search, X } from "lucide-react";

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    "&:hover fieldset": { borderColor: "#bb3d4b" },
    "&.Mui-focused fieldset": { borderColor: "#bb3d4b" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#bb3d4b" },
};

const DashBoard = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { rowsVentas } = useTheContext();
  const { searchParams, setQueryParams } = useQueryParams();
  
  const searchParam = searchParams.get("search") || "";
  const statusPayParam = searchParams.get("statusPay") || "all";
  const methodPayParam = searchParams.get("methodPay") || "all";
  const dateFromParam = searchParams.get("dateFrom") || "";
  const dateToParam = searchParams.get("dateTo") || "";
  const providerPendingParam = searchParams.get("providerPending") || "all";
  const pageParam = parseInt(searchParams.get("page") || "0", 10);
  const pageSizeParam = parseInt(searchParams.get("pageSize") || "25", 10);

  const [paginationModel, setPaginationModel] = useState({ page: pageParam, pageSize: pageSizeParam });
  const [search, setSearch] = useState(searchParam);
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam);
  const [statusPay, setStatusPay] = useState(statusPayParam);
  const [methodPay, setMethodPay] = useState(methodPayParam);
  const [dateFrom, setDateFrom] = useState(dateFromParam);
  const [dateTo, setDateTo] = useState(dateToParam);
  const [providerPending, setProviderPending] = useState(providerPendingParam);

  useEffect(() => {
    if (searchParam !== debouncedSearch) {
      setSearch(searchParam);
      setDebouncedSearch(searchParam);
    }
    if (statusPayParam !== statusPay) setStatusPay(statusPayParam);
    if (methodPayParam !== methodPay) setMethodPay(methodPayParam);
    if (dateFromParam !== dateFrom) setDateFrom(dateFromParam);
    if (dateToParam !== dateTo) setDateTo(dateToParam);
    if (providerPendingParam !== providerPending) {
      setProviderPending(providerPendingParam);
    }
    if (pageParam !== paginationModel.page || pageSizeParam !== paginationModel.pageSize) {
      setPaginationModel({ page: pageParam, pageSize: pageSizeParam });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    setQueryParams({
      search: debouncedSearch,
      statusPay,
      methodPay,
      dateFrom,
      dateTo,
      providerPending,
      page: paginationModel.page,
      pageSize: paginationModel.pageSize,
    });
  }, [
    debouncedSearch,
    statusPay,
    methodPay,
    dateFrom,
    dateTo,
    providerPending,
    paginationModel,
    setQueryParams,
  ]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
      if (search.trim() !== debouncedSearch) {
        setPaginationModel((prev) => ({ ...prev, page: 0 }));
      }
    }, 450);
    return () => clearTimeout(handler);
  }, [search, debouncedSearch]);

  const {
    handleChangeStatusShip,
    handleChangeStatusShipByShipment,
    handleGetAllSales,
    can,
    openCancelOrderModal,
    handleRetryDicotechPostPayment,
    loading,
    listError,
  } = useDashboard();

  const { columns } = GridDashboard({
    handleChangeStatusShip,
    handleChangeStatusShipByShipment,
    rows: rowsVentas,
    openCancelOrderModal,
    handleRetryDicotechPostPayment,
    can,
  });

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      statusPay: statusPay !== "all" ? statusPay : "",
      methodPay: methodPay !== "all" ? methodPay : "",
      dateFrom,
      dateTo,
      dicotechPending: providerPending === "dicotech",
      techsmartPending: providerPending === "techsmart",
    }),
    [debouncedSearch, statusPay, methodPay, dateFrom, dateTo, providerPending],
  );

  const loadSales = async () => {
    await handleGetAllSales(paginationModel.page + 1, paginationModel.pageSize, filters);
  };

  useEffect(() => {
    loadSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel.page, paginationModel.pageSize, filters]);

  const pageCount = Math.ceil((rowsVentas?.totalRows || 0) / paginationModel.pageSize);

  const paginationBlock = (
    <ModernPagination
      page={paginationModel.page + 1}
      pageCount={pageCount}
      totalItems={rowsVentas?.totalRows || 0}
      pageSize={paginationModel.pageSize}
      onPageChange={(p) =>
        setPaginationModel((prev) => ({ ...prev, page: p - 1 }))
      }
      onPageSizeChange={(size) =>
        setPaginationModel({ page: 0, pageSize: size })
      }
      label="ventas"
    />
  );

  const clearFilters = () => {
    setSearch("");
    setStatusPay("all");
    setMethodPay("all");
    setDateFrom("");
    setDateTo("");
    setProviderPending("all");
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    setQueryParams({
      search: "",
      statusPay: "all",
      methodPay: "all",
      dateFrom: "",
      dateTo: "",
      providerPending: "all",
      page: 0,
    });
  };

  const hasFilters =
    search ||
    statusPay !== "all" ||
    methodPay !== "all" ||
    dateFrom ||
    dateTo ||
    providerPending !== "all";

  if (!mounted) return null;

  return (
    <AdminPageShell
      title="Ventas"
      subtitle="Gestión de órdenes, pagos y envíos en tiempo real"
      actions={
        <AdminRefreshButton onClick={loadSales} loading={loading} />
      }
      filters={
        <>
          <div className="admin-filters-header">
            <Filter size={16} />
            <span>Filtros avanzados</span>
          </div>
          <div className="admin-filters-grid">
            <TextField
              size="small"
              label="Buscar orden, cliente o email"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPaginationModel((prev) => ({ ...prev, page: 0 }));
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
                value={statusPay}
                onChange={(e) => {
                  setStatusPay(e.target.value);
                  setPaginationModel((prev) => ({ ...prev, page: 0 }));
                }}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="paid">Pagado</MenuItem>
                <MenuItem value="pending">Pendiente</MenuItem>
                <MenuItem value="failed">Fallido</MenuItem>
                <MenuItem value="cancelled">Cancelado</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={fieldSx}>
              <InputLabel>Método de pago</InputLabel>
              <Select
                label="Método de pago"
                value={methodPay}
                onChange={(e) => {
                  setMethodPay(e.target.value);
                  setPaginationModel((prev) => ({ ...prev, page: 0 }));
                }}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="mercadopago">Mercado Pago</MenuItem>
                <MenuItem value="tarjeta_de_credito">Tarjeta crédito</MenuItem>
                <MenuItem value="tarjeta_de_debito">Tarjeta débito</MenuItem>
                <MenuItem value="oxxo">Efectivo en establecimiento</MenuItem>
                <MenuItem value="transferencia_bancaria">Transferencia bancaria</MenuItem>
              </Select>
            </FormControl>
            <FormControl
              size="small"
              sx={fieldSx}
              data-testid="ventas-provider-pending-filter"
            >
              <InputLabel>Pendientes proveedor</InputLabel>
              <Select
                label="Pendientes proveedor"
                value={providerPending}
                onChange={(e) => {
                  setProviderPending(e.target.value);
                  setPaginationModel((prev) => ({ ...prev, page: 0 }));
                }}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="dicotech">Dicotech sin purchaseId</MenuItem>
                <MenuItem value="techsmart">TechSmart pendiente</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Desde"
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPaginationModel((prev) => ({ ...prev, page: 0 }));
              }}
              InputLabelProps={{ shrink: true }}
              sx={fieldSx}
            />
            <TextField
              size="small"
              label="Hasta"
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPaginationModel((prev) => ({ ...prev, page: 0 }));
              }}
              InputLabelProps={{ shrink: true }}
              sx={fieldSx}
            />
            <button
              type="button"
              className="admin-btn-ghost"
              onClick={clearFilters}
              disabled={!hasFilters}
            >
              <X size={16} />
              Limpiar
            </button>
          </div>
        </>
      }
      paginationTop={rowsVentas?.data?.length ? paginationBlock : undefined}
      paginationBottom={rowsVentas?.data?.length ? paginationBlock : undefined}
    >
      {listError ? (
        <div className="admin-empty-state" style={{ display: "grid", gap: 12 }}>
          <Alert severity="error">{listError}</Alert>
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={loadSales}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Reintentar
          </button>
        </div>
      ) : rowsVentas?.data && rowsVentas.data.length > 0 ? (
        <TableComponent
          loading={loading}
          hideFooter
          paginationModel={paginationModel}
          handlePaginationChange={() => {}}
          totalRows={rowsVentas?.totalRows}
          columnsDataGrid={columns}
          rowsDataGrid={rowsVentas?.data}
        />
      ) : (
        <div className="admin-empty-state">
          <EmptyState
            title={loading ? "Cargando ventas..." : "Sin ventas"}
            description={
              loading
                ? "Estamos obteniendo la información del panel."
                : "Sin ventas que coincidan con los filtros seleccionados."
            }
            icon="orders"
          />
        </div>
      )}
    </AdminPageShell>
  );
};

export default DashBoard;
