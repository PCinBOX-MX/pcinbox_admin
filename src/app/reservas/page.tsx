"use client";

import { useState } from "react";
import useReservas, { Reservation } from "./useReservas";
import PaginatorComponent from "../shared/components/common/paginator/Paginator";
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
  Calendar,
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
    limit,
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
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "in_process":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
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
    <section className="w-full">
      <div
        className="w-full flex justify-center items-center"
        style={{ paddingBottom: "48px" }}
      >
        <div className="w-[95%]">
          {/* Header */}
          <div
            className="flex flex-col md:flex-row justify-between items-start md:items-center"
            style={{ gap: "16px", marginBottom: "24px" }}
          >
            <div>
              <h1
                className="text-2xl font-bold text-gray-800 flex items-center"
                style={{ gap: "8px" }}
              >
                <Calendar className="text-[#bb3d4b]" />
                Gestión de Reservas de Mantenimiento
              </h1>
              <p className="text-sm text-gray-500">
                Consulta, filtra y actualiza el estatus de las citas de mantenimiento técnico.
              </p>
            </div>

            <button
              onClick={() => fetchReservations()}
              className="flex items-center bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
              style={{
                padding: "8px 16px",
                gap: "8px",
              }}
            >
              <RefreshCw size={16} className={`${loading ? "animate-spin" : ""}`} />
              Sincronizar
            </button>
          </div>

          {/* Filtros */}
          <div
            className="bg-white rounded-xl border border-gray-100 shadow-sm"
            style={{ padding: "24px", marginBottom: "24px" }}
          >
            <h2
              className="text-sm font-semibold text-gray-700 flex items-center"
              style={{ gap: "8px", marginBottom: "16px" }}
            >
              <Filter size={16} className="text-gray-400" />
              Filtros de búsqueda
            </h2>
            <div
              className="grid grid-cols-1 md:grid-cols-12 items-center"
              style={{ gap: "16px" }}
            >
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
                    setPage(1);
                  }}
                  InputProps={{
                    startAdornment: <Search size={18} className="text-gray-400 mr-2" />,
                  }}
                />
              </div>

              {/* Selector de Estado */}
              <div className="md:col-span-2">
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
              <div className="md:col-span-2">
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
                    />
                  </div>
                </>
              )}

              {/* Botón limpiar */}
              <div className="md:col-span-2 flex" style={{ gap: "8px" }}>
                <button
                  onClick={clearFilters}
                  disabled={!search && status === "all" && !date && !startDate && !endDate && filterType === "single"}
                  className="w-full flex items-center justify-center border border-gray-200 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 font-medium rounded-lg transition-all duration-200 cursor-pointer"
                  style={{
                    padding: "8px 16px",
                    gap: "8px",
                  }}
                >
                  <X size={16} />
                  Limpiar Filtros
                </button>
              </div>
            </div>
          </div>

          {/* Tabla de Reservas */}
          <div
            className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            style={{ marginBottom: "24px" }}
          >
            {loading ? (
              <div
                className="flex flex-col justify-center items-center"
                style={{ padding: "80px 0", gap: "12px" }}
              >
                <CircularProgress style={{ color: "#bb3d4b" }} />
                <span className="text-sm text-gray-500 font-medium">Obteniendo reservaciones...</span>
              </div>
            ) : reservations.length === 0 ? (
              <div style={{ padding: "32px" }}>
                <Alert severity="info" className="flex items-center">
                  No se encontraron reservaciones que coincidan con los criterios de búsqueda.
                </Alert>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                      <th style={{ padding: "16px 24px" }}>Folio / Ref</th>
                      <th style={{ padding: "16px 24px" }}>Cliente</th>
                      <th style={{ padding: "16px 24px" }}>Equipo / Servicio</th>
                      <th style={{ padding: "16px 24px" }}>Fecha y Hora</th>
                      <th style={{ padding: "16px 24px" }}>Estatus</th>
                      <th style={{ padding: "16px 24px", textAlign: "center" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {reservations.map((res) => (
                      <tr
                        key={res.reference}
                        className="hover:bg-gray-50/50 transition-colors duration-150"
                      >
                        {/* Folio */}
                        <td
                          className="font-mono font-bold text-gray-900"
                          style={{ padding: "16px 24px" }}
                        >
                          {res.reference}
                        </td>

                        {/* Cliente */}
                        <td style={{ padding: "16px 24px" }}>
                          <div className="flex flex-col" style={{ gap: "4px" }}>
                            <span className="font-semibold text-gray-900">{res.contactName}</span>
                            <span
                              className="text-xs text-gray-500 flex items-center mt-0.5"
                              style={{ gap: "4px" }}
                            >
                              <Mail size={12} className="text-gray-400" />
                              {res.contactEmail}
                            </span>
                            <span
                              className="text-xs text-gray-500 flex items-center mt-0.5"
                              style={{ gap: "4px" }}
                            >
                              <Phone size={12} className="text-gray-400" />
                              {res.contactPhone}
                            </span>
                          </div>
                        </td>

                        {/* Equipo */}
                        <td style={{ padding: "16px 24px" }}>
                          <div className="flex flex-col" style={{ gap: "4px" }}>
                            <span className="font-medium text-gray-800 capitalize">
                              {res.deviceType === "pc" ? "PC de Escritorio" : res.deviceType}
                            </span>
                            <span className="text-xs text-gray-500 mt-0.5">
                              {res.brand} - {res.model}
                            </span>
                            <span
                              className="text-xs text-[#bb3d4b] font-semibold"
                              style={{ marginTop: "4px" }}
                            >
                              {res.service}
                            </span>
                          </div>
                        </td>

                        {/* Fecha y Hora */}
                        <td style={{ padding: "16px 24px" }}>
                          <div className="flex flex-col" style={{ gap: "4px" }}>
                            <span className="font-semibold text-gray-900">
                              {res.date
                                ? new Date(res.date).toLocaleDateString("es-MX", { timeZone: "UTC" })
                                : "N/A"}
                            </span>
                            <span
                              className="text-xs text-gray-500 flex items-center mt-0.5"
                              style={{ gap: "4px" }}
                            >
                              <Clock size={12} className="text-gray-400" />
                              {res.time}
                            </span>
                          </div>
                        </td>

                        {/* Estatus */}
                        <td style={{ padding: "16px 24px" }}>
                          <div className="flex items-center" style={{ gap: "8px" }}>
                            <select
                              value={res.status}
                              onChange={(e) => updateReservationStatus(res.reference, e.target.value)}
                              className={`text-xs font-semibold rounded-full border cursor-pointer outline-none transition-all duration-200 ${getStatusBadgeClass(
                                res.status
                              )}`}
                              style={{
                                padding: "6px 12px",
                              }}
                            >
                              <option value="pending" className="text-amber-800 bg-white">Pendiente</option>
                              <option value="in_process" className="text-blue-800 bg-white">En Proceso</option>
                              <option value="completed" className="text-green-800 bg-white">Completada</option>
                              <option value="cancelled" className="text-red-800 bg-white">Cancelada</option>
                            </select>
                          </div>
                        </td>

                        {/* Acciones */}
                        <td style={{ padding: "16px 24px", textAlign: "center" }}>
                          <Tooltip title="Ver detalles completos" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDetails(res)}
                              className="text-gray-500 hover:text-[#bb3d4b] hover:bg-[#bb3d4b]/5 transition-colors"
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

            {/* Paginador */}
            {!loading && reservations.length > 0 && (
              <div
                className="flex justify-between items-center border-t border-gray-100 bg-gray-50/50"
                style={{ padding: "16px 24px" }}
              >
                <span className="text-xs font-medium text-gray-500">
                  Mostrando {reservations.length} de {totalReservations} reservaciones
                </span>
                <PaginatorComponent
                  totalItems={totalReservations}
                  itemsPerPage={limit}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Detalles Premium */}
      {isModalOpen && selectedRes && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm transition-all duration-300"
          style={{ padding: "16px" }}
        >
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-300 scale-100 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div
              className="bg-gradient-to-r from-gray-900 to-slate-800 text-white flex justify-between items-center"
              style={{ padding: "16px 24px" }}
            >
              <div>
                <h3
                  className="text-lg font-bold flex items-center"
                  style={{ gap: "8px" }}
                >
                  <FileText size={20} className="text-[#bb3d4b]" />
                  Detalles de la Reserva
                </h3>
                <span className="text-xs text-gray-400 font-mono">
                  Referencia Folio: {selectedRes.reference}
                </span>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer rounded-full hover:bg-white/10"
                style={{ padding: "4px" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div
              className="max-h-[70vh] overflow-y-auto"
              style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}
            >
              {/* Estatus Actual */}
              <div
                className="flex items-center justify-between bg-gray-50 rounded-xl border border-gray-100"
                style={{ padding: "16px" }}
              >
                <span className="text-sm font-semibold text-gray-600">Estado de la Cita:</span>
                <span
                  className={`text-xs font-bold rounded-full border ${getStatusBadgeClass(
                    selectedRes.status
                  )}`}
                  style={{ padding: "4px 12px" }}
                >
                  {getStatusText(selectedRes.status)}
                </span>
              </div>

              {/* Grid 2 Columnas */}
              <div
                className="grid grid-cols-1 md:grid-cols-2"
                style={{ gap: "24px" }}
              >
                {/* Columna Cliente */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h4
                    className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center"
                    style={{ gap: "4px" }}
                  >
                    <User size={14} className="text-[#bb3d4b]" />
                    Datos del Cliente
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div>
                      <span className="block text-xs text-gray-500 font-medium">Nombre completo</span>
                      <span className="text-sm font-semibold text-gray-900">{selectedRes.contactName}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500 font-medium">Correo electrónico</span>
                      <span className="text-sm text-gray-900 break-all">{selectedRes.contactEmail}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500 font-medium">Teléfono de contacto</span>
                      <span className="text-sm text-gray-900 font-semibold">{selectedRes.contactPhone}</span>
                    </div>
                  </div>
                </div>

                {/* Columna Equipo */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h4
                    className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center"
                    style={{ gap: "4px" }}
                  >
                    <Cpu size={14} className="text-[#bb3d4b]" />
                    Especificación del Equipo
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div>
                      <span className="block text-xs text-gray-500 font-medium">Tipo de Dispositivo</span>
                      <span className="text-sm font-semibold text-gray-900 capitalize">
                        {selectedRes.deviceType === "pc" ? "PC de Escritorio" : selectedRes.deviceType}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500 font-medium">Marca</span>
                      <span className="text-sm text-gray-900 font-semibold">{selectedRes.brand}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500 font-medium">Modelo</span>
                      <span className="text-sm text-gray-900">{selectedRes.model}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Separador */}
              <div className="border-t border-gray-100"></div>

              {/* Servicio y Cita */}
              <div
                className="grid grid-cols-1 md:grid-cols-2"
                style={{ gap: "24px" }}
              >
                <div>
                  <h4
                    className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center"
                    style={{ gap: "4px", marginBottom: "12px" }}
                  >
                    <FileText size={14} className="text-[#bb3d4b]" />
                    Servicio Solicitado
                  </h4>
                  <span
                    className="inline-block bg-red-50 text-[#bb3d4b] text-sm font-bold rounded-lg border border-red-100"
                    style={{ padding: "4px 12px" }}
                  >
                    {selectedRes.service}
                  </span>
                </div>

                <div>
                  <h4
                    className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center"
                    style={{ gap: "4px", marginBottom: "12px" }}
                  >
                    <Clock size={14} className="text-[#bb3d4b]" />
                    Fecha y Hora Programadas
                  </h4>
                  <div
                    className="flex items-center"
                    style={{ gap: "16px" }}
                  >
                    <div>
                      <span className="block text-xs text-gray-500 font-medium">Fecha</span>
                      <span className="text-sm font-bold text-gray-900">
                        {selectedRes.date
                          ? new Date(selectedRes.date).toLocaleDateString("es-MX", { timeZone: "UTC" })
                          : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500 font-medium">Hora</span>
                      <span className="text-sm font-bold text-gray-900">{selectedRes.time}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Separador */}
              <div className="border-t border-gray-100"></div>

              {/* Descripción del Fallo */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <h4
                  className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center"
                  style={{ gap: "4px" }}
                >
                  <AlertCircle size={14} className="text-[#bb3d4b]" />
                  Descripción del Fallo / Motivo
                </h4>
                <div
                  className="bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-700 whitespace-pre-line leading-relaxed"
                  style={{ padding: "16px" }}
                >
                  {selectedRes.description || "Sin descripción proporcionada."}
                </div>
              </div>

              {/* Motivo de Cancelación */}
              {selectedRes.status === "cancelled" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <h4
                    className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center"
                    style={{ gap: "4px" }}
                  >
                    <AlertCircle size={14} className="text-red-500" />
                    Motivo de Cancelación
                  </h4>
                  <div
                    className="bg-red-50 rounded-xl border border-red-100 text-sm text-red-800 whitespace-pre-line leading-relaxed"
                    style={{ padding: "16px" }}
                  >
                    {selectedRes.cancelReason || "Sin motivo de cancelación registrado."}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              className="bg-gray-50 flex justify-end border-t border-gray-100"
              style={{ padding: "16px 24px", gap: "12px" }}
            >
              <button
                onClick={handleCloseModal}
                className="bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold rounded-xl transition-colors cursor-pointer text-sm shadow-sm"
                style={{ padding: "10px 20px" }}
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ReservasAdminPage;
