"use client";

import {
  Alert,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import CardComponent from "../shared/components/especific/card/CardComponent";
import useProveedores from "./useProveedores";
import { useEffect, useState } from "react";
import { MdAdd, MdAutorenew } from "react-icons/md";
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

const Proveedores = () => {
  const { dataProveedores, dataProductProveedor, setProductsProveedor } =
    useTheContext();
  const {
    slcProveedor,
    handleGetProductsByProveedor,
    handleOnChange,
    showModalRegisterProveedor,
    handleAddProduct,
  } = useProveedores();

  const { searchParams, setQueryParams } = useQueryParams();
  const searchParam = searchParams.get("search") || "";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);

  const [search, setSearch] = useState(searchParam);
  const itemsPerPage = 12;
  const [page, setPage] = useState(pageParam);

  // Sincronizar hacia atrás
  useEffect(() => {
    if (searchParam !== search) setSearch(searchParam);
    if (pageParam !== page) setPage(pageParam);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (slcProveedor && dataProductProveedor.data.length === 0) {
      handleGetProductsByProveedor(slcProveedor);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincronizar debounce al escribir
  useEffect(() => {
    const handler = setTimeout(() => {
      if (search !== searchParam) {
        setQueryParams({ search, page: 1 });
      }
    }, 450);
    return () => clearTimeout(handler);
  }, [search, searchParam, setQueryParams]);

  useEffect(() => {
    setProductsProveedor((prev) => {
      if (!search) {
        return { ...prev, copyData: prev.data };
      }

      const q = search.toLowerCase();
      const filtered = prev.data.filter((item) => {
        const name = item.name?.toLowerCase()?.trim() || "";
        const description = item.description?.toLowerCase()?.trim() || "";
        const upc = String((item as any).upc || "").toLowerCase()?.trim();
        const idProductExt = item?.idProductExt?.toLowerCase()?.trim() || "";

        return (
          name.includes(q) ||
          description.includes(q) ||
          upc.includes(q) ||
          idProductExt.includes(q)
        );
      });

      return { ...prev, copyData: filtered };
    });
  }, [search, setProductsProveedor]);

  const startIndex = (page - 1) * itemsPerPage;
  const visibleDataProveedores = dataProductProveedor.copyData!.slice(
    startIndex,
    startIndex + itemsPerPage,
  );
  const totalItems = dataProductProveedor.copyData?.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const paginationBlock = (
    <ModernPagination
      page={page}
      pageCount={pageCount}
      pageSize={itemsPerPage}
      totalItems={totalItems}
      onPageChange={(newPage) => setQueryParams({ page: newPage })}
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
          <button type="button" className="admin-btn-secondary" onClick={handleAddProduct}>
            <MdAdd size={20} />
            Agregar producto
          </button>
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
                  setQueryParams({ page: 1 });
                  handleGetProductsByProveedor(slcProveedor);
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
      paginationTop={visibleDataProveedores.length ? paginationBlock : undefined}
      paginationBottom={visibleDataProveedores.length ? paginationBlock : undefined}
    >
      <div className="admin-products-grid">
        {!dataProductProveedor.loading ? (
          visibleDataProveedores.length > 0 ? (
            visibleDataProveedores.map((product, index) => (
              <CardComponent
                key={`${product.idProduct}-${String(product.idProductExt ?? "")}-${product.sku ?? ""}-${index}`}
                dataProduct={product}
              />
            ))
          ) : (
            <div className="admin-empty-state w-full">
              <Alert severity="info">Sin productos para mostrar</Alert>
            </div>
          )
        ) : (
          <div className="admin-empty-state w-full flex items-center justify-center gap-2">
            <MdAutorenew size={20} className="the-spinner" />
            <span>Cargando productos...</span>
          </div>
        )}
      </div>
    </AdminPageShell>
  );
};

export default Proveedores;
