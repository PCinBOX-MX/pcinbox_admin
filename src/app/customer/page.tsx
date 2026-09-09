"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryParams } from "../hooks/useQueryParams";
import TableComponent from "../shared/components/especific/table/TableComponent";
import GridCustomer, { CustomerRow } from "./gridCustomer";
import DeleteAccountConfirmContent from "./DeleteAccountConfirmContent";
import ProveedoresUtils from "../services/utils/proveedores.utils";
import AdminPageShell from "../shared/components/layout/AdminPageShell";
import ModernPagination from "../shared/components/common/paginator/ModernPagination";
import AdminRefreshButton from "../shared/components/common/buttons/AdminRefreshButton";
import AdminRefreshablePanel from "../shared/components/common/layout/AdminRefreshablePanel";
import EmptyState from "../shared/components/common/emptyState/EmptyState";
import { TextField, Alert } from "@mui/material";
import {
  Filter,
  RefreshCw,
  Search,
  UserCheck,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { useRequestSequence } from "../hooks/useRequestSequence";
import { useTheContext } from "../hooks/global.hook";
import usePermissions from "../hooks/usePermissions";
import { resolveApiErrorMessage } from "../utils/apiErrorMessage";
import styles from "./customer.module.css";
import { adminFieldSx } from "../theme/adminFieldSx";
import {
  resolvePageParam,
  resolvePageSizeParam,
  useSkipInitialUrlWrite,
} from "../utils/adminPagination";

function displayName(row: CustomerRow) {
  return [row.name, row.lastname].filter(Boolean).join(" ").trim() || "este usuario";
}

const Customer = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { requestGetProveedores, requestPostProveedores } = ProveedoresUtils();
  const { setDataModal } = useTheContext();
  const { can } = usePermissions();
  const canDeactivate = can("users.deactivate");
  const { nextSequence, isCurrent } = useRequestSequence();
  const [dataRows, setDataRows] = useState<CustomerRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [deactivatingId, setDeactivatingId] = useState<number | string | null>(
    null,
  );
  const { searchParams, setQueryParams } = useQueryParams();
  const shouldSkipInitialUrlWrite = useSkipInitialUrlWrite();
  const searchParam = searchParams.get("search") || "";
  const pageParam = resolvePageParam(searchParams.get("page"), 1);
  const pageSizeParam = resolvePageSizeParam(searchParams.get("pageSize"), 25);

  const [search, setSearch] = useState(searchParam);
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam);
  const [page, setPage] = useState(pageParam);
  const [pageSize, setPageSize] = useState(pageSizeParam);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");

  useEffect(() => {
    if (searchParam !== debouncedSearch) {
      setSearch(searchParam);
      setDebouncedSearch(searchParam);
    }
    if (pageParam !== page) setPage(pageParam);
    if (pageSizeParam !== pageSize) setPageSize(pageSizeParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (shouldSkipInitialUrlWrite()) return;
    setQueryParams({
      search: debouncedSearch,
      page,
      pageSize,
    });
  }, [debouncedSearch, page, pageSize, setQueryParams, shouldSkipInitialUrlWrite]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const trimmed = search.trim();
      if (trimmed === debouncedSearch) return;
      setDebouncedSearch(trimmed);
      setPage(1);
    }, 450);
    return () => clearTimeout(handler);
  }, [search, debouncedSearch]);

  const loadCustomers = useCallback(async () => {
    const sequence = nextSequence();
    setLoading(true);
    setListError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);

      const resp = await requestGetProveedores(
        `/listUsers?${params.toString()}`,
        { silent: true },
      );
      if (!isCurrent(sequence)) return;
      if (resp.status === 200) {
        const payload = resp.data;
        const users = payload?.users ?? payload?.data?.users ?? [];
        const total =
          payload?.totalUsers ??
          payload?.data?.totalUsers ??
          payload?.data?.totalRows ??
          0;
        setDataRows(Array.isArray(users) ? users : []);
        setTotalRows(Number(total) || 0);
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
    page,
    pageSize,
    debouncedSearch,
    requestGetProveedores,
    nextSequence,
    isCurrent,
  ]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const closeModal = useCallback(() => {
    setDataModal((prev) => {
      if (prev.loading) return prev;
      return { ...prev, isOpen: false, loading: false };
    });
  }, [setDataModal]);

  const promptDeleteAccount = useCallback(
    (row: CustomerRow) => {
      if (!canDeactivate) return;
      const idUser = row.idUser;
      if (idUser == null) return;

      const name = displayName(row);

      const runDeactivate = async () => {
        setDataModal((prev) => ({ ...prev, loading: true }));
        setDeactivatingId(idUser);
        try {
          await requestPostProveedores(
            {},
            `/deactivateUser/${encodeURIComponent(String(idUser))}`,
            { silent: true },
          );

          setDataRows((prev) =>
            prev.map((item) =>
              String(item.idUser) === String(idUser)
                ? { ...item, active: 0 }
                : item,
            ),
          );

          setDataModal({
            isOpen: true,
            type: "success",
            title: "Cuenta desactivada",
            content: `El acceso de ${name} se eliminó de forma permanente (cuenta inactiva).`,
            showActions: true,
            loading: false,
            onClose: closeModal,
            onConfirm: closeModal,
          });
        } catch (error) {
          setDataModal({
            isOpen: true,
            type: "error",
            title: "No se pudo eliminar",
            content: resolveApiErrorMessage(
              error,
              "No pudimos desactivar la cuenta. Intenta de nuevo.",
            ),
            showActions: true,
            loading: false,
            onClose: closeModal,
            onConfirm: closeModal,
          });
        } finally {
          setDeactivatingId(null);
        }
      };

      setDataModal({
        isOpen: true,
        type: "error",
        title: "Eliminar cuenta",
        content: (
          <DeleteAccountConfirmContent
            idUser={idUser}
            name={name}
            email={row.email}
            phone={row.phone}
          />
        ),
        showActions: true,
        loading: false,
        confirmLabel: "Eliminar cuenta",
        cancelLabel: "Conservar acceso",
        maxWidth: "min(92vw, 520px)",
        onClose: closeModal,
        onConfirm: () => {
          void runDeactivate();
        },
      });
    },
    [canDeactivate, closeModal, requestPostProveedores, setDataModal],
  );

  const { columns } = GridCustomer({
    rows: { data: dataRows, totalRows },
    canDeactivate,
    deactivatingId,
    onDeleteAccount: promptDeleteAccount,
  });

  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const paginationModel = { page: page - 1, pageSize };

  const paginationBlock = (
    <ModernPagination
      page={page}
      pageCount={pageCount}
      totalItems={totalRows}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPage(1);
        setPageSize(size);
      }}
      label="clientes"
    />
  );

  const rowsWithId = useMemo(
    () => dataRows.map((row, i) => ({ ...row, id: row.idUser ?? i })),
    [dataRows],
  );

  const pageStats = useMemo(() => {
    let active = 0;
    let inactive = 0;
    for (const row of rowsWithId) {
      if (row.active == 1 || row.active === true) active += 1;
      else inactive += 1;
    }
    return { active, inactive };
  }, [rowsWithId]);

  const reloadCustomers = () => {
    void loadCustomers();
  };

  if (!mounted) return null;

  return (
    <AdminPageShell
      title="Clientes"
      subtitle="Usuarios registrados en la plataforma"
      actions={
        <AdminRefreshButton
          onClick={reloadCustomers}
          loading={loading}
          label="Sincronizar"
        />
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
              sx={adminFieldSx}
              InputProps={{
                startAdornment: (
                  <Search size={18} className="admin-filter-icon" />
                ),
              }}
            />
            <button
              type="button"
              className="admin-btn-ghost"
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
                setPage(1);
                setQueryParams({ search: "", page: 1 });
              }}
              disabled={!search && !debouncedSearch}
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
            onClick={reloadCustomers}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <div className={styles.pageIntro}>
            <p className={styles.pageIntroText}>
              Gestiona el padrón de clientes: revisa contacto, estado de cuenta y
              desactiva accesos cuando sea necesario.{" "}
              <strong>Eliminar cuenta</strong> pone{" "}
              <strong>active = 0</strong> (soft-delete), sin borrar historial.
            </p>
          </div>

          {totalRows > 0 ? (
            <div className={styles.summaryStrip}>
              <div
                className={`${styles.summaryCard} ${styles.summaryCardAccent}`}
              >
                <span className={styles.summaryIcon} aria-hidden>
                  <Users size={18} />
                </span>
                <div>
                  <span className={styles.summaryLabel}>Total clientes</span>
                  <span className={styles.summaryValue}>
                    {totalRows.toLocaleString("es-MX")}
                  </span>
                </div>
              </div>
              <div
                className={`${styles.summaryCard} ${styles.summaryCardSuccess}`}
              >
                <span
                  className={`${styles.summaryIcon} ${styles.summaryIconSuccess}`}
                  aria-hidden
                >
                  <UserCheck size={18} />
                </span>
                <div>
                  <span className={styles.summaryLabel}>Activos (vista)</span>
                  <span className={styles.summaryValue}>
                    {pageStats.active.toLocaleString("es-MX")}
                  </span>
                </div>
              </div>
              <div
                className={`${styles.summaryCard} ${styles.summaryCardMuted}`}
              >
                <span
                  className={`${styles.summaryIcon} ${styles.summaryIconMuted}`}
                  aria-hidden
                >
                  <UserMinus size={18} />
                </span>
                <div>
                  <span className={styles.summaryLabel}>Inactivos (vista)</span>
                  <span className={styles.summaryValue}>
                    {pageStats.inactive.toLocaleString("es-MX")}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <AdminRefreshablePanel
            loading={loading}
            hasContent={rowsWithId.length > 0}
            emptyState={
              <div className="admin-empty-state">
                <EmptyState
                  title={loading ? "Cargando clientes..." : "Sin clientes"}
                  description={
                    loading
                      ? "Estamos sincronizando la lista de clientes."
                      : "No se encontraron clientes con los filtros actuales."
                  }
                  icon="customers"
                />
              </div>
            }
          >
            <TableComponent
              loading={loading}
              hideFooter
              paginationModel={paginationModel}
              handlePaginationChange={() => {}}
              totalRows={totalRows}
              columnsDataGrid={columns}
              rowsDataGrid={rowsWithId}
            />
          </AdminRefreshablePanel>
        </>
      )}
    </AdminPageShell>
  );
};

export default Customer;
