"use client";

import EmptyState from "../shared/components/common/emptyState/EmptyState";
import { Alert, CircularProgress, TextField } from "@mui/material";
import {
  CalendarDays,
  Download,
  Eye,
  FileText,
  Filter,
  RefreshCw,
  Search,
  Archive,
  X,
} from "lucide-react";
import usePermissions from "../hooks/usePermissions";
import { Cotizacion } from "../interfaces/cotizaciones/cotizaciones.interface";
import ModernPagination from "../shared/components/common/paginator/ModernPagination";
import AdminRefreshButton from "../shared/components/common/buttons/AdminRefreshButton";
import AdminRefreshablePanel from "../shared/components/common/layout/AdminRefreshablePanel";
import AdminPageShell from "../shared/components/layout/AdminPageShell";
import styles from "./cotizaciones.module.css";
import useCotizaciones from "./useCotizaciones";
import { adminFieldSx } from "../theme/adminFieldSx";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), 3);
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

type ActionsProps = {
  record: Cotizacion;
  loading: boolean;
  onPreview: () => void;
  onDownload: () => void;
  onArchive: () => void;
};

function QuoteActions({
  record,
  loading,
  onPreview,
  onDownload,
  onArchive,
}: ActionsProps) {
  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={styles.iconButton}
        onClick={onPreview}
        disabled={loading}
        aria-label={`Vista previa de ${record.quoteNumber}`}
        title="Vista previa"
        data-testid={`preview-cotizacion-${record.idCotizacion}`}
      >
        {loading ? <CircularProgress size={17} /> : <Eye size={18} />}
      </button>
      <button
        type="button"
        className={styles.iconButton}
        onClick={onDownload}
        disabled={loading}
        aria-label={`Descargar ${record.quoteNumber}`}
        title="Descargar PDF"
        data-testid={`download-cotizacion-${record.idCotizacion}`}
      >
        <Download size={18} />
      </button>
      <button
        type="button"
        className={`${styles.iconButton} ${styles.dangerButton}`}
        onClick={onArchive}
        disabled={loading}
        aria-label={`Archivar ${record.quoteNumber}`}
        title="Archivar"
        data-testid={`archive-cotizacion-${record.idCotizacion}`}
      >
        <Archive size={18} />
      </button>
    </div>
  );
}

export default function CotizacionesPage() {
  const { can, hydrated } = usePermissions();
  const hasPermission = hydrated && can("quotes.manage");
  const {
    records,
    pagination,
    page,
    pageSize,
    search,
    from,
    to,
    loading,
    error,
    documentLoadingId,
    setSearch,
    setFrom,
    setTo,
    setPage,
    clearFilters,
    reload,
    preview,
    download,
    confirmArchive,
  } = useCotizaciones(hasPermission);

  if (!hydrated) {
    return (
      <div className={styles.centerState}>
        <CircularProgress size={28} />
        <span>Validando permisos...</span>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <AdminPageShell
        title="Cotizaciones"
        subtitle="Administración de cotizaciones generadas"
      >
        <div className={styles.state}>
          <Alert severity="error">
            No tienes permiso para administrar cotizaciones.
          </Alert>
        </div>
      </AdminPageShell>
    );
  }

  const paginationBlock = (
    <ModernPagination
      page={page}
      pageCount={pagination.totalPages}
      totalItems={pagination.total}
      pageSize={pageSize}
      onPageChange={setPage}
      label="cotizaciones"
    />
  );

  return (
    <AdminPageShell
      title="Cotizaciones"
      subtitle="Consulta, descarga y administra los PDF generados por clientes"
      actions={<AdminRefreshButton onClick={() => void reload()} loading={loading} />}
      filters={
        <>
          <div className="admin-filters-header">
            <Filter size={16} />
            <span>Búsqueda y periodo</span>
          </div>
          <div className={styles.filters}>
            <TextField
              size="small"
              label="Folio, archivo, cliente o email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={adminFieldSx}
              slotProps={{
                input: {
                  startAdornment: (
                    <Search size={18} className="admin-filter-icon" />
                  ),
                },
              }}
              inputProps={{ "data-testid": "cotizaciones-search" }}
            />
            <TextField
              size="small"
              label="Desde"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              sx={adminFieldSx}
              slotProps={{ inputLabel: { shrink: true } }}
              inputProps={{
                max: to || undefined,
                "data-testid": "cotizaciones-from",
              }}
            />
            <TextField
              size="small"
              label="Hasta"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              sx={adminFieldSx}
              slotProps={{ inputLabel: { shrink: true } }}
              inputProps={{
                min: from || undefined,
                "data-testid": "cotizaciones-to",
              }}
            />
            <button
              type="button"
              className="admin-btn-ghost"
              onClick={clearFilters}
              disabled={!search && !from && !to}
              data-testid="clear-cotizaciones-filters"
            >
              <X size={16} />
              Limpiar
            </button>
          </div>
        </>
      }
      paginationTop={records.length > 0 ? paginationBlock : undefined}
      paginationBottom={records.length > 0 ? paginationBlock : undefined}
    >
      {error ? (
        <div className={styles.state} data-testid="cotizaciones-error">
          <Alert
            severity="error"
            action={
              <button
                type="button"
                className={styles.alertAction}
                onClick={() => void reload()}
              >
                Reintentar
              </button>
            }
          >
            {error}
          </Alert>
        </div>
      ) : (
        <AdminRefreshablePanel
          loading={loading}
          hasContent={records.length > 0}
          emptyState={
            loading ? (
              <div className={styles.centerState} data-testid="cotizaciones-loading">
                <CircularProgress size={30} />
                <span>Cargando cotizaciones...</span>
              </div>
            ) : (
              <EmptyState
                testId="cotizaciones-empty"
                title="No se encontraron cotizaciones"
                description="Prueba con otros términos o cambia el periodo."
                icon="quotes"
              />
            )
          }
        >
          <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Cotización</th>
                  <th>Cliente</th>
                  <th>Detalle</th>
                  <th>Importe</th>
                  <th>Fechas</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr
                    key={record.idCotizacion}
                    data-testid={`cotizacion-row-${record.idCotizacion}`}
                  >
                    <td>
                      <strong>{record.quoteNumber}</strong>
                      <span className={styles.secondary}>
                        {record.originalFileName}
                      </span>
                      <span className={styles.tertiary}>
                        PDF · {formatBytes(record.sizeBytes)}
                      </span>
                    </td>
                    <td>
                      <strong>
                        {record.customer?.name || "Sin nombre"}
                      </strong>
                      <span className={styles.secondary}>
                        {record.customer?.email || "Sin email"}
                      </span>
                    </td>
                    <td>
                      <span>{record.itemCount} artículos</span>
                      <span className={styles.secondary}>
                        {record.includeAssemblyService
                          ? "Incluye armado"
                          : "Sin servicio de armado"}
                      </span>
                    </td>
                    <td className={styles.amount}>
                      {currencyFormatter.format(Number(record.totalAmount) || 0)}
                    </td>
                    <td>
                      <span>{formatDate(record.createdAt)}</span>
                      <span className={styles.secondary}>
                        Vence: {formatDate(record.expiresAt)}
                      </span>
                    </td>
                    <td>
                      <QuoteActions
                        record={record}
                        loading={documentLoadingId === record.idCotizacion}
                        onPreview={() => void preview(record)}
                        onDownload={() => void download(record)}
                          onArchive={() => confirmArchive(record)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.cards} data-testid="cotizaciones-cards">
            {records.map((record) => (
              <article
                className={styles.card}
                key={record.idCotizacion}
                data-testid={`cotizacion-card-${record.idCotizacion}`}
              >
                <div className={styles.cardHeader}>
                  <div>
                    <strong>{record.quoteNumber}</strong>
                    <span>{record.originalFileName}</span>
                  </div>
                  <FileText size={22} />
                </div>
                <div className={styles.cardCustomer}>
                  <strong>{record.customer?.name || "Sin nombre"}</strong>
                  <span>
                    {record.customer?.email || "Sin email"}
                  </span>
                </div>
                <dl className={styles.cardGrid}>
                  <div>
                    <dt>Total</dt>
                    <dd>
                      {currencyFormatter.format(
                        Number(record.totalAmount) || 0,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Artículos</dt>
                    <dd>{record.itemCount}</dd>
                  </div>
                  <div>
                    <dt>Creada</dt>
                    <dd>{formatDate(record.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Vence</dt>
                    <dd>{formatDate(record.expiresAt)}</dd>
                  </div>
                </dl>
                <div className={styles.assembly}>
                  <CalendarDays size={15} />
                  {record.includeAssemblyService
                    ? "Incluye servicio de armado"
                    : "Sin servicio de armado"}
                </div>
                <QuoteActions
                  record={record}
                  loading={documentLoadingId === record.idCotizacion}
                  onPreview={() => void preview(record)}
                  onDownload={() => void download(record)}
                    onArchive={() => confirmArchive(record)}
                />
              </article>
            ))}
          </div>
          </>
        </AdminRefreshablePanel>
      )}
    </AdminPageShell>
  );
}
