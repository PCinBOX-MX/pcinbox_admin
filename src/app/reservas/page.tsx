"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useReservas, { Reservation } from "./useReservas";
import ModernPagination from "../shared/components/common/paginator/ModernPagination";
import AdminPageShell from "../shared/components/layout/AdminPageShell";
import AdminRefreshButton from "../shared/components/common/buttons/AdminRefreshButton";
import AdminRefreshablePanel from "../shared/components/common/layout/AdminRefreshablePanel";
import EmptyState from "../shared/components/common/emptyState/EmptyState";
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  IconButton,
  Tooltip,
  Alert,
} from "@mui/material";
import {
  Search,
  Filter,
  X,
  Eye,
  RefreshCw,
  User,
  Mail,
  Phone,
  Cpu,
  Clock,
  FileText,
  AlertCircle,
  Download,
} from "lucide-react";
import styles from "./reservas.module.css";
import { adminFieldSx } from "../theme/adminFieldSx";

const hasReservationSession = (res: Reservation) =>
  res.userId != null && Number(res.userId) > 0;

const ReservasAdminPage = () => {
  const router = useRouter();
  const {
    reservations,
    totalReservations,
    loading,
    listError,
    search,
    setSearch,
    status,
    setStatus,
    date,
    setDate,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    filterType,
    setFilterType,
    page,
    setPage,
    pageSize,
    fetchReservations,
    updateReservationStatus,
  } = useReservas();

  // Estado del modal de detalles
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenDetails = (res: Reservation) => {
    setSelectedRes(res);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedRes(null);
    setIsModalOpen(false);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setDate("");
    setStartDate("");
    setEndDate("");
    setFilterType("single");
    setPage(1);
  };

  // Helper para pintar badges de estatus
  const getStatusBadgeClass = (statusStr: string) => {
    switch (statusStr) {
      case "pending":
        return styles.statusPending;
      case "in_process":
        return styles.statusInProcess;
      case "completed":
        return styles.statusCompleted;
      case "cancelled":
        return styles.statusCancelled;
      default:
        return styles.statusPending;
    }
  };

  const getStatusText = (statusStr: string) => {
    switch (statusStr) {
      case "pending":
        return "Pendiente";
      case "in_process":
        return "En Proceso";
      case "completed":
        return "Completada";
      case "cancelled":
        return "Cancelada";
      default:
        return statusStr;
    }
  };

  const pageCount = Math.max(1, Math.ceil(totalReservations / pageSize));

  const paginationBlock = (
    <ModernPagination
      page={page}
      pageCount={pageCount}
      totalItems={totalReservations}
      pageSize={pageSize}
      onPageChange={setPage}
      label="reservaciones"
    />
  );

  return (
    <>
    <AdminPageShell
      title="Reservas de mantenimiento"
      subtitle="Consulta, filtra y actualiza el estatus de las citas técnicas"
      actions={
        <AdminRefreshButton
          onClick={() => fetchReservations()}
          loading={loading}
        />
      }
      filters={
        <>
          <div className="admin-filters-header">
            <Filter size={16} />
            <span>Filtros de búsqueda</span>
          </div>
          <div className="admin-filters-grid admin-filters-grid-reservas">
              {/* Buscador */}
              <div className={filterType === "single" ? "md:col-span-3" : "md:col-span-2"}>
                  <TextField
                  fullWidth
                  label="Buscar folio, cliente, equipo..."
                  variant="outlined"
                  size="small"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                  }}
                  sx={adminFieldSx}
                  InputProps={{
                    startAdornment: <Search size={18} className="admin-filter-icon" />,
                  }}
                />
              </div>

              {/* Selector de Estado */}
              <div className="md:col-span-2">
                <FormControl fullWidth size="small" sx={adminFieldSx}>
                  <InputLabel id="status-filter-label">Estatus</InputLabel>
                  <Select
                    labelId="status-filter-label"
                    id="status-filter"
                    value={status}
                    label="Estatus"
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setPage(1);
                    }}
                  >
                    <MenuItem value="all">Todos los estatus</MenuItem>
                    <MenuItem value="pending">Pendiente</MenuItem>
                    <MenuItem value="in_process">En Proceso</MenuItem>
                    <MenuItem value="completed">Completada</MenuItem>
                    <MenuItem value="cancelled">Cancelada</MenuItem>
                  </Select>
                </FormControl>
              </div>

              {/* Tipo de Fecha */}
              <div className="md:col-span-2">
                <FormControl fullWidth size="small" sx={adminFieldSx}>
                  <InputLabel id="date-type-filter-label">Tipo de Fecha</InputLabel>
                  <Select
                    labelId="date-type-filter-label"
                    id="date-type-filter"
                    value={filterType}
                    label="Tipo de Fecha"
                    onChange={(e) => {
                      setFilterType(e.target.value as "single" | "range");
                      setPage(1);
                    }}
                  >
                    <MenuItem value="single">Fecha específica</MenuItem>
                    <MenuItem value="range">Rango de fechas</MenuItem>
                  </Select>
                </FormControl>
              </div>

              {/* Selector de Fecha */}
              {filterType === "single" ? (
                <div className="md:col-span-3">
                  <TextField
                    fullWidth
                    label="Fecha de la cita"
                    type="date"
                    size="small"
                    variant="outlined"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setPage(1);
                    }}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    sx={adminFieldSx}
                  />
                </div>
              ) : (
                <>
                  <div className="md:col-span-2">
                    <TextField
                      fullWidth
                      label="Fecha inicial"
                      type="date"
                      size="small"
                      variant="outlined"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setPage(1);
                      }}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      sx={adminFieldSx}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <TextField
                      fullWidth
                      label="Fecha final"
                      type="date"
                      size="small"
                      variant="outlined"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setPage(1);
                      }}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      sx={adminFieldSx}
                    />
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={clearFilters}
                disabled={!search && status === "all" && !date && !startDate && !endDate && filterType === "single"}
                className="admin-btn-ghost"
              >
                <X size={16} />
                Limpiar filtros
              </button>
          </div>
        </>
      }
      paginationTop={reservations.length > 0 ? paginationBlock : undefined}
      paginationBottom={reservations.length > 0 ? paginationBlock : undefined}
    >
          {listError ? (
              <div className="admin-empty-state" style={{ display: "grid", gap: 12 }}>
                <Alert severity="error">{listError}</Alert>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => fetchReservations()}
                  disabled={loading}
                >
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                  Reintentar
                </button>
              </div>
            ) : (
              <AdminRefreshablePanel
                loading={loading}
                hasContent={reservations.length > 0}
                emptyState={
                  loading ? (
                    <div className={styles.loading}>
                      <CircularProgress style={{ color: "#bb3d4b" }} />
                      <span className={styles.loadingText}>
                        Obteniendo reservaciones...
                      </span>
                    </div>
                  ) : (
                    <div className={styles.emptyWrap}>
                      <EmptyState
                        title="Sin reservaciones"
                        description="No se encontraron reservaciones que coincidan con los criterios de búsqueda."
                        icon="search"
                      />
                    </div>
                  )
                }
              >
              <div className={`admin-table-scroll ${styles.tableWrap}`}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Folio / Ref</th>
                      <th>Cliente</th>
                      <th>Equipo / Servicio</th>
                      <th>Fecha y Hora</th>
                      <th>Estatus</th>
                      <th className={styles.thCenter}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((res) => (
                      <tr key={res.reference}>
                        <td>
                          <div className={styles.cellStack}>
                            <span className={styles.folio}>{res.reference}</span>
                            <span
                              className={`${styles.sessionBadge} ${
                                hasReservationSession(res)
                                  ? styles.sessionOn
                                  : styles.sessionOff
                              }`}
                            >
                              {hasReservationSession(res)
                                ? "Con sesión"
                                : "Sin sesión"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.cellStack}>
                            <span className={styles.cellTitle}>{res.contactName}</span>
                            <span className={styles.cellSub}>
                              <Mail size={12} className={styles.cellIcon} />
                              {res.contactEmail}
                            </span>
                            <span className={styles.cellSub}>
                              <Phone size={12} className={styles.cellIcon} />
                              {res.contactPhone}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.cellStack}>
                            <span className={styles.cellMedium}>
                              {res.deviceType === "pc" ? "PC de Escritorio" : res.deviceType}
                            </span>
                            <span className={styles.cellSub}>
                              {res.brand} - {res.model}
                            </span>
                            <span className={styles.serviceTag}>{res.service}</span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.cellStack}>
                            <span className={styles.cellTitle}>
                              {res.date
                                ? new Date(res.date).toLocaleDateString("es-MX", { timeZone: "UTC" })
                                : "N/A"}
                            </span>
                            <span className={styles.cellSub}>
                              <Clock size={12} className={styles.cellIcon} />
                              {res.time}
                            </span>
                          </div>
                        </td>
                        <td>
                          {res.status === "cancelled" || res.status === "completed" ? (
                            <Tooltip
                              title={
                                res.status === "cancelled"
                                  ? "Al tener estatus Cancelada ya no se puede cambiar el estatus"
                                  : "Al tener estatus Completada ya no se puede cambiar el estatus"
                              }
                              arrow
                            >
                              <span>
                                <select
                                  value={res.status}
                                  disabled
                                  className={`${styles.statusSelect} ${getStatusBadgeClass(
                                    res.status,
                                  )} ${styles.statusDisabled}`}
                                >
                                  {res.status === "cancelled" ? (
                                    <option value="cancelled">Cancelada</option>
                                  ) : (
                                    <option value="completed">Completada</option>
                                  )}
                                </select>
                              </span>
                            </Tooltip>
                          ) : (
                            <select
                              value={res.status}
                              onChange={(e) =>
                                updateReservationStatus(res.reference, e.target.value)
                              }
                              className={`${styles.statusSelect} ${getStatusBadgeClass(
                                res.status,
                              )}`}
                            >
                              <option value="pending">Pendiente</option>
                              <option value="in_process">En Proceso</option>
                              <option value="completed">Completada</option>
                              <option value="cancelled">Cancelada</option>
                            </select>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <Tooltip title="Ver detalles completos" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDetails(res)}
                              className={styles.detailBtn}
                            >
                              <Eye size={18} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Importar folio al punto de venta" arrow>
                            <IconButton
                              size="small"
                              onClick={() =>
                                router.push(
                                  `/punto-de-venta?tab=cobrar&reserva=${encodeURIComponent(res.reference)}`,
                                )
                              }
                              className={styles.detailBtn}
                            >
                              <Download size={18} />
                            </IconButton>
                          </Tooltip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </AdminRefreshablePanel>
            )}

    </AdminPageShell>

      {isModalOpen && selectedRes && (
        <div className={styles.overlay}>
          <div className={styles.modal} role="dialog" aria-modal="true">
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>
                  <FileText size={20} />
                  Detalles de la Reserva
                </h3>
                <span className={styles.modalRef}>
                  Folio: {selectedRes.reference}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className={styles.closeBtn}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.statusBanner}>
                <span className={styles.statusBannerLabel}>Estado de la cita</span>
                <span
                  className={`${styles.statusSelect} ${getStatusBadgeClass(
                    selectedRes.status,
                  )}`}
                >
                  {getStatusText(selectedRes.status)}
                </span>
              </div>

              <div className={styles.detailGrid}>
                <div className={styles.detailSection}>
                  <h4 className={styles.sectionHeading}>
                    <User size={14} className={styles.sectionHeadingIcon} />
                    Datos del cliente
                  </h4>
                  <div className={styles.fieldStack}>
                    <div>
                      <span className={styles.fieldLabel}>Nombre completo</span>
                      <span className={styles.fieldValueBold}>{selectedRes.contactName}</span>
                    </div>
                    <div>
                      <span className={styles.fieldLabel}>Correo electrónico</span>
                      <span className={styles.fieldValueBreak}>{selectedRes.contactEmail}</span>
                    </div>
                    <div>
                      <span className={styles.fieldLabel}>Teléfono</span>
                      <span className={styles.fieldValueBold}>{selectedRes.contactPhone}</span>
                    </div>
                    <div>
                      <span className={styles.fieldLabel}>Origen</span>
                      <span className={styles.fieldValueBold}>
                        {hasReservationSession(selectedRes)
                          ? "Cliente con sesión iniciada"
                          : "Reserva sin iniciar sesión"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.detailSection}>
                  <h4 className={styles.sectionHeading}>
                    <Cpu size={14} className={styles.sectionHeadingIcon} />
                    Equipo
                  </h4>
                  <div className={styles.fieldStack}>
                    <div>
                      <span className={styles.fieldLabel}>Dispositivo</span>
                      <span className={styles.fieldValueBold}>
                        {selectedRes.deviceType === "pc"
                          ? "PC de Escritorio"
                          : selectedRes.deviceType}
                      </span>
                    </div>
                    <div>
                      <span className={styles.fieldLabel}>Marca</span>
                      <span className={styles.fieldValueBold}>{selectedRes.brand}</span>
                    </div>
                    <div>
                      <span className={styles.fieldLabel}>Modelo</span>
                      <span className={styles.fieldValue}>{selectedRes.model}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.divider} />

              <div className={styles.detailGrid}>
                <div>
                  <h4 className={styles.sectionHeading}>
                    <FileText size={14} className={styles.sectionHeadingIcon} />
                    Servicio
                  </h4>
                  <span className={styles.servicePill}>{selectedRes.service}</span>
                </div>
                <div>
                  <h4 className={styles.sectionHeading}>
                    <Clock size={14} className={styles.sectionHeadingIcon} />
                    Fecha y hora
                  </h4>
                  <div className={styles.dateRow}>
                    <div>
                      <span className={styles.fieldLabel}>Fecha</span>
                      <span className={styles.fieldValueBold}>
                        {selectedRes.date
                          ? new Date(selectedRes.date).toLocaleDateString("es-MX", {
                              timeZone: "UTC",
                            })
                          : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className={styles.fieldLabel}>Hora</span>
                      <span className={styles.fieldValueBold}>{selectedRes.time}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.divider} />

              <div className={styles.detailSection}>
                <h4 className={styles.sectionHeading}>
                  <AlertCircle size={14} className={styles.sectionHeadingIcon} />
                  Descripción / motivo
                </h4>
                <div className={styles.descriptionBox}>
                  {selectedRes.description || "Sin descripción proporcionada."}
                </div>
              </div>

              {selectedRes.status === "cancelled" && (
                <div className={styles.cancelBox}>
                  <h4 className={styles.cancelHeading}>
                    <AlertCircle size={14} className={styles.cancelHeadingIcon} />
                    Motivo de cancelación
                  </h4>
                  {selectedRes.cancelReason || "Sin motivo de cancelación registrado."}
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/punto-de-venta?tab=cobrar&reserva=${encodeURIComponent(selectedRes.reference)}`,
                  )
                }
                className="admin-btn-secondary"
              >
                Importar al POS
              </button>
              <button
                type="button"
                onClick={handleCloseModal}
                className="admin-btn-secondary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default ReservasAdminPage;
