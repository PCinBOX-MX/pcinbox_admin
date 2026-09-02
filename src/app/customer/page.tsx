"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryParams } from "../hooks/useQueryParams";
import TableComponent from "../shared/components/especific/table/TableComponent";
import GridCustomer from "./gridCustomer";
import ProveedoresUtils from "../services/utils/proveedores.utils";
import AdminPageShell from "../shared/components/layout/AdminPageShell";
import ModernPagination from "../shared/components/common/paginator/ModernPagination";
import AdminRefreshButton from "../shared/components/common/buttons/AdminRefreshButton";
import EmptyState from "../shared/components/common/emptyState/EmptyState";
import { TextField, Alert } from "@mui/material";
import { Filter, RefreshCw, Search, X } from "lucide-react";
import { useRequestSequence } from "../hooks/useRequestSequence";

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    "&:hover fieldset": { borderColor: "#bb3d4b" },
    "&.Mui-focused fieldset": { borderColor: "#bb3d4b" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#bb3d4b" },
};

const Customer = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { requestGetProveedores } = ProveedoresUtils();
  const { nextSequence, isCurrent } = useRequestSequence();
  const [dataRows, setDataRows] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const { searchParams, setQueryParams } = useQueryParams();
  const searchParam = searchParams.get("search") || "";
  const pageParam = parseInt(searchParams.get("page") || "0", 10);
  const pageSizeParam = parseInt(searchParams.get("pageSize") || "25", 10);

  const [search, setSearch] = useState(searchParam);
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam);
  const [paginationModel, setPaginationModel] = useState({
    page: pageParam,
    pageSize: pageSizeParam,
  });
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");

  useEffect(() => {
    if (searchParam !== debouncedSearch) {
      setSearch(searchParam);
      setDebouncedSearch(searchParam);
    }
    if (pageParam !== paginationModel.page || pageSizeParam !== paginationModel.pageSize) {
      setPaginationModel({ page: pageParam, pageSize: pageSizeParam });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    setQueryParams({
      search: debouncedSearch,
      page: paginationModel.page,
      pageSize: paginationModel.pageSize,
    });
  }, [debouncedSearch, paginationModel, setQueryParams]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
      if (search.trim() !== debouncedSearch) {
        setPaginationModel((prev) => ({ ...prev, page: 0 }));
      }
    }, 450);
    return () => clearTimeout(handler);
  }, [search, debouncedSearch]);

  const loadCustomers = useCallback(async () => {
    const sequence = nextSequence();
    setLoading(true);
    setListError("");
    try {
      const page = paginationModel.page + 1;
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(paginationModel.pageSize),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);

      const resp = await requestGetProveedores(`/listUsers?${params.toString()}`);
      if (!isCurrent(sequence)) return;
      if (resp.status === 200) {
        setDataRows(resp.data.users);
        setTotalRows(resp.data.totalUsers);
      } else {
        setDataRows([]);
        setTotalRows(0);
        setListError("No pudimos cargar los clientes. Intenta de nuevo.");
      }
    } catch {
      if (!isCurrent(sequence)) return;
      setDataRows([]);
      setTotalRows(0);
      setListError("No pudimos cargar los clientes. Intenta de nuevo.");
    } finally {
      if (isCurrent(sequence)) setLoading(false);
    }
  }, [
    paginationModel.page,
    paginationModel.pageSize,
    debouncedSearch,
    requestGetProveedores,
    nextSequence,
    isCurrent,
  ]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const { columns } = GridCustomer({
    rows: { data: dataRows, totalRows },
  });

  const pageCount = Math.ceil(totalRows / paginationModel.pageSize);

  const paginationBlock = (
    <ModernPagination
      page={paginationModel.page + 1}
      pageCount={pageCount}
      totalItems={totalRows}
      pageSize={paginationModel.pageSize}
      onPageChange={(p) =>
        setPaginationModel((prev) => ({ ...prev, page: p - 1 }))
      }
      onPageSizeChange={(size) =>
        setPaginationModel({ page: 0, pageSize: size })
      }
      label="clientes"
    />
  );

  const rowsWithId = useMemo(
    () => dataRows.map((row, i) => ({ ...row, id: row.idUser ?? i })),
    [dataRows],
  );

  const reloadCustomers = () => {
    void loadCustomers();
  };

  if (!mounted) return null;

  return (
    <AdminPageShell
      title="Clientes"
      subtitle="Usuarios registrados en la plataforma"
      actions={
        <AdminRefreshButton onClick={reloadCustomers} loading={loading} />
      }
      filters={
        <>
          <div className="admin-filters-header">
            <Filter size={16} />
            <span>Búsqueda</span>
          </div>
          <div className="admin-filters-grid">
            <TextField
              size="small"
              label="Nombre, apellido o email"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              sx={fieldSx}
              InputProps={{
                startAdornment: <Search size={18} className="admin-filter-icon" />,
              }}
            />
            <button
              type="button"
              className="admin-btn-ghost"
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
                setPaginationModel((prev) => ({ ...prev, page: 0 }));
                setQueryParams({ search: "", page: 0 });
              }}
              disabled={!search && !debouncedSearch}
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
      {listError ? (
        <div className="admin-empty-state" style={{ display: "grid", gap: 12 }}>
          <Alert severity="error">{listError}</Alert>
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={reloadCustomers}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Reintentar
          </button>
        </div>
      ) : rowsWithId.length > 0 ? (
        <TableComponent
          loading={loading}
          hideFooter
          paginationModel={paginationModel}
          handlePaginationChange={() => {}}
          totalRows={totalRows}
          columnsDataGrid={columns}
          rowsDataGrid={rowsWithId}
        />
      ) : (
        <div className="admin-empty-state">
          <EmptyState
            title={loading ? "Cargando clientes..." : "Sin clientes"}
            description={
              loading
                ? "Estamos obteniendo la lista de clientes."
                : "No se encontraron clientes con los filtros actuales."
            }
            icon="customers"
          />
        </div>
      )}
    </AdminPageShell>
  );
};

export default Customer;
