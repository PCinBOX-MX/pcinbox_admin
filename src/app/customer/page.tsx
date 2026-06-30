"use client";

import React, { useEffect, useMemo, useState } from "react";
import TableComponent from "../shared/components/especific/table/TableComponent";
import GridCustomer from "./gridCustomer";
import ProveedoresUtils from "../services/utils/proveedores.utils";
import AdminPageShell from "../shared/components/layout/AdminPageShell";
import ModernPagination from "../shared/components/common/paginator/ModernPagination";
import { Alert, TextField } from "@mui/material";
import { Filter, Search, X } from "lucide-react";

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    "&:hover fieldset": { borderColor: "#bb3d4b" },
    "&.Mui-focused fieldset": { borderColor: "#bb3d4b" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#bb3d4b" },
};

const Customer = () => {
  const { requestGetProveedores } = ProveedoresUtils();
  const [dataRows, setDataRows] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25,
  });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    async function getListUsers() {
      setLoading(true);
      try {
        const page = paginationModel.page + 1;
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(paginationModel.pageSize),
        });
        if (debouncedSearch) params.set("search", debouncedSearch);

        const resp = await requestGetProveedores(`/listUsers?${params.toString()}`);
        if (resp.status === 200) {
          setDataRows(resp.data.users);
          setTotalRows(resp.data.totalUsers);
        }
      } catch {
        setDataRows([]);
        setTotalRows(0);
      } finally {
        setLoading(false);
      }
    }

    getListUsers();
  }, [paginationModel.page, paginationModel.pageSize, debouncedSearch]);

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

  return (
    <AdminPageShell
      title="Clientes"
      subtitle="Usuarios registrados en la plataforma"
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
                setPaginationModel((prev) => ({ ...prev, page: 0 }));
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
                setPaginationModel((prev) => ({ ...prev, page: 0 }));
              }}
              disabled={!search}
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
          <Alert severity="info">
            {loading ? "Cargando clientes..." : "No se encontraron clientes"}
          </Alert>
        </div>
      )}
    </AdminPageShell>
  );
};

export default Customer;
