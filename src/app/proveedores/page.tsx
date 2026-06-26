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
import { useEffect, useMemo, useState } from "react";
import { MdAdd, MdAutorenew } from "react-icons/md";
import { useTheContext } from "../hooks/global.hook";
import PaginatorComponent from "../shared/components/common/paginator/Paginator";
import { productMatchesSearch } from "../utils/search.util";

const Proveedores = () => {
  const { dataProveedores, dataProductProveedor } = useTheContext();
  const {
    slcProveedor,
    handleGetProductsByProveedor,
    handleOnChange,
    showModalRegisterProveedor,
    handleAddProduct,
  } = useProveedores();

  const [search, setSearch] = useState<string>("");

  const itemsPerPage = 8;
  const [page, setPage] = useState(1);

  const filteredProducts = useMemo(() => {
    const products = dataProductProveedor.data ?? [];
    if (!search.trim()) return products;
    return products.filter((item) => productMatchesSearch(item, search));
  }, [search, dataProductProveedor.data]);

  useEffect(() => {
    setPage(1);
  }, [search, dataProductProveedor.data]);

  const startIndex = (page - 1) * itemsPerPage;
  const visibleDataProveedores = filteredProducts.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  return (
    <section className="admin-page admin-page--flush-top">
      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2 className="admin-panel__title">Catálogo por proveedor</h2>
          <p className="admin-panel__subtitle">
            Consulta, registra y edita productos de PCInbox, TechSmart y Dicotech
          </p>
        </div>
        <div className="admin-panel__body">
          {!dataProveedores.loading ? (
            <div className="admin-proveedores-toolbar">
              <FormControl fullWidth>
                <InputLabel id="demo-simple-select-label">
                  Selecciona un proveedor
                </InputLabel>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={slcProveedor}
                  label="Selecciona un proveedor"
                  onChange={handleOnChange}
                >
                  {dataProveedores && dataProveedores.data.length > 0 ? (
                    dataProveedores.data.map((p) => {
                      return (
                        <MenuItem
                          key={p.idProvider}
                          value={p.idProvider.toString()}
                        >
                          {p.companyName}
                        </MenuItem>
                      );
                    })
                  ) : (
                    <MenuItem key={0} value={String(0)}>
                      Sin proveedores disponibles
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
              <button
                type="button"
                disabled={!slcProveedor}
                className="admin-btn admin-btn--primary admin-shrink-0 admin-proveedores-btn-min"
                onClick={() => {
                  if (slcProveedor) {
                    handleGetProductsByProveedor(slcProveedor);
                  }
                }}
              >
                Consultar
              </button>
            </div>
          ) : (
            <>
              <MdAutorenew size={20} className="admin-m-auto the-spinner" />
              <span>Cargando...</span>
            </>
          )}

          <div className="admin-proveedores-actions">
            <div className="admin-row admin-row--wrap">
              <button
                type="button"
                className="admin-btn admin-btn--primary admin-btn--inline"
                onClick={showModalRegisterProveedor}
              >
                <MdAdd size={22} />
                Agregar proveedor
              </button>

              <button
                type="button"
                onClick={handleAddProduct}
                className="admin-btn admin-btn--secondary admin-btn--inline"
              >
                <MdAdd size={22} />
                Agregar Producto
              </button>
            </div>

            <TextField
              id="proveedores-search"
              label="Buscar producto"
              placeholder="Nombre, UPC, SKU o ID externo"
              variant="outlined"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ width: { xs: "100%", lg: 320 } }}
            />
          </div>

          <div
            className="admin-product-grid admin-w-full"
            style={{
              marginTop: "24px",
              marginBottom: "24px",
              padding: "20px 16px",
            }}
          >
            {!dataProductProveedor.loading &&
            filteredProducts.length > itemsPerPage ? (
              <div className="admin-toolbar-row__actions admin-w-full admin-table-pagination admin-table-pagination--top">
                <PaginatorComponent
                  totalItems={filteredProducts.length}
                  itemsPerPage={itemsPerPage}
                  currentPage={page}
                  onPageChange={setPage}
                />
              </div>
            ) : null}

            {!dataProductProveedor.loading ? (
              visibleDataProveedores && visibleDataProveedores.length > 0 ? (
                visibleDataProveedores.map((product, index) => {
                  return <CardComponent key={index} dataProduct={product} />;
                })
              ) : (
                <Alert severity="info">
                  {search.trim()
                    ? "Sin productos que coincidan con la búsqueda"
                    : "Sin contenido disponible"}
                </Alert>
              )
            ) : (
              <>
                <MdAutorenew size={20} className="admin-m-auto the-spinner" />
                <span>Cargando...</span>
              </>
            )}
            <div className="admin-toolbar-row__actions admin-w-full">
              <PaginatorComponent
                totalItems={filteredProducts.length}
                itemsPerPage={itemsPerPage}
                currentPage={page}
                onPageChange={setPage}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Proveedores;
