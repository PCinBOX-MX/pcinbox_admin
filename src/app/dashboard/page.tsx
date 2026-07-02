"use client";

import TableComponent from "../shared/components/especific/table/TableComponent";
import GridDashboard from "./gridDashboard";
import useDashboard from "./useDashboard";
import React, { useEffect, useMemo, useState } from "react";
import { useTheContext } from "../hooks/global.hook";
import { Alert, FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import AdminPageShell from "../shared/components/layout/AdminPageShell";
import ModernPagination from "../shared/components/common/paginator/ModernPagination";
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
  const { rowsVentas } = useTheContext();
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [search, setSearch] = useState("");
  const [statusPay, setStatusPay] = useState("all");
  const [methodPay, setMethodPay] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);

  const { handleChangeStatusShip, handleChangeStatusPay, handleGetAllSales } =
    useDashboard();

  const { columns } = GridDashboard({
    handleChangeStatusShip,
    rows: rowsVentas,
    handleChangeStatusPay,
  });

  const filters = useMemo(
    () => ({
      search: search.trim(),
      statusPay: statusPay !== "all" ? statusPay : "",
      methodPay: methodPay !== "all" ? methodPay : "",
      dateFrom,
      dateTo,
    }),
    [search, statusPay, methodPay, dateFrom, dateTo],
  );

  const loadSales = async () => {
    setLoading(true);
    await handleGetAllSales(paginationModel.page + 1, paginationModel.pageSize, filters);
    setLoading(false);
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
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const hasFilters =
    search || statusPay !== "all" || methodPay !== "all" || dateFrom || dateTo;

  return (
    <AdminPageShell
      title="Ventas"
      subtitle="Gestión de órdenes, pagos y envíos en tiempo real"
      actions={
        <button
          type="button"
          onClick={loadSales}
          className="admin-btn-secondary"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Actualizar
        </button>
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
      {rowsVentas?.data && rowsVentas.data.length > 0 ? (
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
          <Alert severity="info">
            {loading
              ? "Cargando ventas..."
              : "Sin ventas que coincidan con los filtros seleccionados"}
          </Alert>
        </div>
      )}
    </AdminPageShell>
  );
};

export default DashBoard;
