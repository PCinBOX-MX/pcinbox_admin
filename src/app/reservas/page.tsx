"use client";

import { useState } from "react";
import useReservas, { Reservation } from "./useReservas";
import TablePaginationBar from "../shared/components/especific/table/TablePaginationBar";
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
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
} from "lucide-react";
import styles from "./reservas.module.css";

const ReservasAdminPage = () => {
  const {
    reservations,
    totalReservations,
    loading,
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
    setPageSize,
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

  const showReservasPagination =
    totalReservations > 0 || reservations.length > 0;

  const handleReservasPageChange = (nextPage: number) => {
    setPage(nextPage + 1);
  };

  const handleReservasPageSizeChange = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPage(1);
  };

  const reservasPaginationProps = {
    page: page - 1,
    pageSize,
    rowCount: totalReservations,
    pageSizeOptions: [10, 25, 50],
    onPageChange: handleReservasPageChange,
    onPageSizeChange: handleReservasPageSizeChange,
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

  return (
    <section className="admin-page admin-page--flush-top">
      <div className="admin-panel">
        <div className={`admin-panel__header ${styles.panelHeader}`}>
          <div>
            <h2 className="admin-panel__title">Reservas de mantenimiento</h2>
            <p className="admin-panel__subtitle">
              Consulta, filtra y actualiza el estatus de las citas de mantenimiento técnico.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchReservations()}
            className={`admin-btn admin-btn--secondary admin-btn-row ${styles.headerBtn}`}
            style={{ padding: "8px 16px", margin: 0 }}
          >
            <RefreshCw size={16} className={loading ? styles.spin : ""} />
            Sincronizar
          </button>
        </div>

        <div className="admin-panel__body">
          <div className={styles.filters}>
            <h2 className={styles.filtersTitle}>
              <Filter size={16} className={styles.filtersIcon} />
              Filtros de búsqueda
            </h2>
            <div className={styles.filterGrid}>
              <div className={filterType === "single" ? styles.col3 : styles.col2}>
                <TextField
                  fullWidth
                  label="Buscar folio, cliente, equipo..."
                  variant="outlined"
                  size="small"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  InputProps={{
                    startAdornment: <Search size={18} style={{ marginRight: "0.5rem", color: "#9ca3af" }} />,
                  }}
                />
              </div>

              {/* Selector de Estado */}
              <div className={styles.col2}>
                <FormControl fullWidth size="small">
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
              <div className={styles.col2}>
                <FormControl fullWidth size="small">
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
                <div className={styles.col3}>
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
                  />
                </div>
              ) : (
                <>
                  <div className={styles.col2}>
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
                    />
                  </div>
                  <div className={styles.col2}>
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
                    />
                  </div>
                </>
              )}

              <div className={`${styles.col2} ${styles.filterActions}`}>
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!search && status === "all" && !date && !startDate && !endDate && filterType === "single"}
                  className={`admin-btn admin-btn--secondary admin-btn-row ${styles.filterBtn}`}
                  style={{ padding: "8px 16px", margin: 0 }}
                >
                  <X size={16} />
                  Limpiar Filtros
                </button>
              </div>
            </div>
          </div>

          {/* Tabla de Reservas */}
          <div className={`admin-reservas-table-panel ${styles.tablePanel}`}>
            {showReservasPagination && !loading ? (
              <TablePaginationBar
                {...reservasPaginationProps}
                className="admin-table-pagination--top"
              />
            ) : null}

            {loading ? (
              <div className={styles.loading}>
                <CircularProgress style={{ color: "#bb3d4b" }} />
                <span className={styles.loadingText}>
                  Obteniendo reservaciones...
                </span>
              </div>
            ) : reservations.length === 0 ? (
              <div className={styles.emptyWrap}>
                <Alert severity="info" className={styles.emptyAlert}>
                  No se encontraron reservaciones que coincidan con los
                  criterios de búsqueda.
                </Alert>
              </div>
            ) : (
              <div className="admin-reservas-table-wrap">
                <table className={`admin-reservas-table ${styles.tbody}`}>
                  <thead>
                    <tr className={styles.thead}>
                      <th style={{ padding: "14px 16px" }}>Folio / Ref</th>
                      <th style={{ padding: "14px 16px" }}>Cliente</th>
                      <th style={{ padding: "14px 16px" }}>Equipo / Servicio</th>
                      <th style={{ padding: "14px 16px" }}>Fecha y Hora</th>
                      <th style={{ padding: "14px 16px" }}>Estatus</th>
                      <th style={{ padding: "14px 16px", textAlign: "center" }}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((res) => (
                      <tr key={res.reference} className={styles.row}>
                        <td className={styles.cellTitle} style={{ padding: "16px 24px", fontFamily: "ui-monospace, monospace" }}>
                          {res.reference}
                        </td>
                        <td style={{ padding: "16px 24px" }}>
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
                        <td style={{ padding: "16px 24px" }}>
                          <div className={styles.cellStack}>
                            <span className={styles.cellMedium}>
                              {res.deviceType === "pc" ? "PC de Escritorio" : res.deviceType}
                            </span>
                            <span className={styles.cellSub}>{res.brand} - {res.model}</span>
                            <span className={styles.serviceTag}>{res.service}</span>
                          </div>
                        </td>
                        <td style={{ padding: "16px 24px" }}>
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
                        <td style={{ padding: "16px 24px" }}>
                          <div className={styles.statusRow}>
                            {res.status === "cancelled" ? (
                              <Tooltip title="No se puede cambiar el estatus de una reserva cancelada" arrow>
                                <span className="admin-inline-block">
                                  <select
                                    value={res.status}
                                    onChange={(e) => updateReservationStatus(res.reference, e.target.value)}
                                    disabled
                                    className={`${styles.statusSelect} ${getStatusBadgeClass(res.status)} ${styles.statusDisabled}`}
                                  >
                                    <option value="cancelled">Cancelada</option>
                                  </select>
                                </span>
                              </Tooltip>
                            ) : (
                              <select
                                value={res.status}
                                onChange={(e) => updateReservationStatus(res.reference, e.target.value)}
                                className={`${styles.statusSelect} ${getStatusBadgeClass(res.status)}`}
                              >
                                <option value="pending">Pendiente</option>
                                <option value="in_process">En Proceso</option>
                                <option value="completed">Completada</option>
                                <option value="cancelled">Cancelada</option>
                              </select>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "16px 24px", textAlign: "center" }}>
                          <Tooltip title="Ver detalles completos" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDetails(res)}
                              className={styles.detailBtn}
                            >
                              <Eye size={18} />
                            </IconButton>
                          </Tooltip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {showReservasPagination && !loading ? (
              <div className="admin-table-pagination admin-table-pagination--bottom">
                <TablePaginationBar {...reservasPaginationProps} />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {isModalOpen && selectedRes && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>
                  <FileText size={20} />
                  Detalles de la Reserva
                </h3>
                <span className={styles.modalRef}>
                  Referencia Folio: {selectedRes.reference}
                </span>
              </div>
              <button type="button" onClick={handleCloseModal} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.statusBanner}>
                <span className={styles.statusBannerLabel}>Estado de la Cita:</span>
                <span className={`${styles.statusSelect} ${getStatusBadgeClass(selectedRes.status)}`}>
                  {getStatusText(selectedRes.status)}
                </span>
              </div>

              <div className={styles.detailGrid}>
                <div className={styles.detailSection}>
                  <h4 className={styles.sectionHeading}>
                    <User size={14} className={styles.sectionHeadingIcon} />
                    Datos del Cliente
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
                      <span className={styles.fieldLabel}>Teléfono de contacto</span>
                      <span className={styles.fieldValueBold}>{selectedRes.contactPhone}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.detailSection}>
                  <h4 className={styles.sectionHeading}>
                    <Cpu size={14} className={styles.sectionHeadingIcon} />
                    Especificación del Equipo
                  </h4>
                  <div className={styles.fieldStack}>
                    <div>
                      <span className={styles.fieldLabel}>Tipo de Dispositivo</span>
                      <span className={styles.fieldValueBold} style={{ textTransform: "capitalize" }}>
                        {selectedRes.deviceType === "pc" ? "PC de Escritorio" : selectedRes.deviceType}
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
                  <h4 className={styles.sectionHeading} style={{ marginBottom: "0.75rem" }}>
                    <FileText size={14} className={styles.sectionHeadingIcon} />
                    Servicio Solicitado
                  </h4>
                  <span className={styles.servicePill}>{selectedRes.service}</span>
                </div>
                <div>
                  <h4 className={styles.sectionHeading} style={{ marginBottom: "0.75rem" }}>
                    <Clock size={14} className={styles.sectionHeadingIcon} />
                    Fecha y Hora Programadas
                  </h4>
                  <div className={styles.dateRow}>
                    <div>
                      <span className={styles.fieldLabel}>Fecha</span>
                      <span className={styles.fieldValueBold}>
                        {selectedRes.date
                          ? new Date(selectedRes.date).toLocaleDateString("es-MX", { timeZone: "UTC" })
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

              <div className={styles.detailSection} style={{ gap: "0.5rem" }}>
                <h4 className={styles.sectionHeading}>
                  <AlertCircle size={14} className={styles.sectionHeadingIcon} />
                  Descripción del Fallo / Motivo
                </h4>
                <div className={styles.descriptionBox}>
                  {selectedRes.description || "Sin descripción proporcionada."}
                </div>
              </div>

              {selectedRes.status === "cancelled" && (
                <div className={styles.detailSection} style={{ gap: "0.5rem" }}>
                  <h4 className={styles.cancelHeading}>
                    <AlertCircle size={14} className={styles.cancelHeadingIcon} />
                    Motivo de Cancelación
                  </h4>
                  <div className={styles.cancelBox}>
                    {selectedRes.cancelReason || "Sin motivo de cancelación registrado."}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={handleCloseModal}
                className="admin-btn admin-btn--secondary admin-text-sm"
                style={{ padding: "10px 20px", margin: 0 }}
              >
                Cerrar detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ReservasAdminPage;
