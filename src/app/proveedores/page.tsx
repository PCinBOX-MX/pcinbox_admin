"use client";

import EmptyState from "../shared/components/common/emptyState/EmptyState";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import CardComponent from "../shared/components/especific/card/CardComponent";
import useProveedores from "./useProveedores";
import { useEffect, useState } from "react";
import { MdAdd, MdAutorenew, MdFileUpload } from "react-icons/md";
import { useTheContext } from "../hooks/global.hook";
import { useQueryParams } from "../hooks/useQueryParams";
import AdminPageShell from "../shared/components/layout/AdminPageShell";
import ModernPagination from "../shared/components/common/paginator/ModernPagination";
import { Filter, Search, X } from "lucide-react";

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    "&:hover fieldset": { borderColor: "#bb3d4b" },
    "&.Mui-focused fieldset": { borderColor: "#bb3d4b" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#bb3d4b" },
};

const ITEMS_PER_PAGE = 12;

const Proveedores = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { dataProveedores, dataProductProveedor } = useTheContext();
  const {
    slcProveedor,
    handleGetProductsByProveedor,
    handleOnChange,
    showModalRegisterProveedor,
    handleAddProduct,
    handleBulkUpload,
  } = useProveedores();

  const { searchParams, setQueryParams } = useQueryParams();
  const searchParam = searchParams.get("search") || "";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);

  const [search, setSearch] = useState(searchParam);
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam);
  const [page, setPage] = useState(pageParam);

  useEffect(() => {
    if (searchParam !== search) setSearch(searchParam);
    if (searchParam !== debouncedSearch) setDebouncedSearch(searchParam);
    if (pageParam !== page) setPage(pageParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const trimmed = search.trim();
      setDebouncedSearch(trimmed);
      if (trimmed !== searchParam) {
        setPage(1);
        setQueryParams({ search: trimmed, page: 1 });
      }
    }, 450);
    return () => clearTimeout(handler);
  }, [search, searchParam, setQueryParams]);

  useEffect(() => {
    if (!slcProveedor) return;
    void handleGetProductsByProveedor(slcProveedor, {
      page: pageParam,
      pageSize: ITEMS_PER_PAGE,
      search: debouncedSearch,
    });
  }, [slcProveedor, pageParam, debouncedSearch, handleGetProductsByProveedor]);

  const catalogProducts = Array.isArray(dataProductProveedor.data)
    ? dataProductProveedor.data
    : [];
  const totalItems = dataProductProveedor.totalRows ?? catalogProducts.length;
  const pageCount = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  if (!mounted) {
    return (
      <AdminPageShell
        title="Proveedores"
        subtitle="Catálogo de productos por proveedor"
      >
        <div className="admin-empty-state">Cargando catálogo…</div>
      </AdminPageShell>
    );
  }

  const paginationBlock = (
    <ModernPagination
      page={pageParam}
      pageCount={pageCount}
      pageSize={ITEMS_PER_PAGE}
      totalItems={totalItems}
      onPageChange={(newPage) => {
        setPage(newPage);
        setQueryParams({ page: newPage });
      }}
      label="productos"
    />
  );

  return (
    <AdminPageShell
      title="Proveedores"
      subtitle="Catálogo de productos por proveedor"
      actions={
        <div className="admin-proveedores-actions">
          <button type="button" className="admin-btn-primary" onClick={showModalRegisterProveedor}>
            <MdAdd size={20} />
            Agregar proveedor
          </button>
          <button
            type="button"
            className="admin-btn-secondary"
            data-testid="btn-agregar-producto"
            onClick={handleAddProduct}
          >
            <MdAdd size={20} />
            Agregar producto
          </button>
          {String(slcProveedor) === "3" && (
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={handleBulkUpload}
            >
              <MdFileUpload size={20} />
              Importar Excel
            </button>
          )}
        </div>
      }
      filters={
        <>
          <div className="admin-filters-header">
            <Filter size={16} />
            <span>Consulta y búsqueda</span>
          </div>
          <div className="admin-filters-grid admin-filters-grid-proveedores">
            {!dataProveedores.loading ? (
              <FormControl fullWidth size="small" sx={fieldSx}>
                <InputLabel>Proveedor</InputLabel>
                <Select
                  value={slcProveedor}
                  label="Proveedor"
                  onChange={handleOnChange}
                >
                  {dataProveedores?.data?.length > 0 ? (
                    dataProveedores.data.map((p) => (
                      <MenuItem key={p.idProvider} value={p.idProvider.toString()}>
                        {p.companyName}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem value="0">Sin proveedores</MenuItem>
                  )}
                </Select>
              </FormControl>
            ) : (
              <span className="text-sm text-slate-500 flex items-center gap-2">
                <MdAutorenew className="the-spinner" size={18} />
                Cargando proveedores...
              </span>
            )}
            <TextField
              size="small"
              label="Buscar producto"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={fieldSx}
              InputProps={{
                startAdornment: <Search size={18} className="admin-filter-icon" />,
              }}
            />
            {!dataProveedores.loading ? (
              <button
                type="button"
                className="admin-btn-primary"
                onClick={() => {
                  if (!slcProveedor) return;
                  setPage(1);
                  setQueryParams({ page: 1 });
                  void handleGetProductsByProveedor(slcProveedor, {
                    page: 1,
                    pageSize: ITEMS_PER_PAGE,
                    search: debouncedSearch,
                  });
                }}
              >
                Consultar
              </button>
            ) : null}
            <button
              type="button"
              className="admin-btn-ghost"
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
                setPage(1);
                setQueryParams({ search: "", page: 1 });
              }}
              disabled={!search}
            >
              <X size={16} />
              Limpiar
            </button>
          </div>
        </>
      }
      paginationTop={totalItems > 0 ? paginationBlock : undefined}
      paginationBottom={totalItems > 0 ? paginationBlock : undefined}
    >
      {!dataProductProveedor.loading ? (
        catalogProducts.length > 0 ? (
          <div className="admin-products-grid">
            {catalogProducts.map((product, index) => (
              <CardComponent
                key={`${product.idProduct}-${String(product.idProductExt ?? "")}-${product.sku ?? ""}-${index}`}
                dataProduct={product}
              />
            ))}
          </div>
        ) : (
          <div className="admin-empty-state w-full">
          <EmptyState
            title="Sin productos para mostrar"
            description="No hay productos que coincidan con los filtros actuales."
            icon="products"
          />
          </div>
        )
      ) : (
        <div className="admin-empty-state w-full flex items-center justify-center gap-2">
          <MdAutorenew size={20} className="the-spinner" />
          <span>Cargando productos...</span>
        </div>
      )}
    </AdminPageShell>
  );
};

export default Proveedores;
