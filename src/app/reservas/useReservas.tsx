"use client";

import { useState, useEffect, useRef } from "react";
import UtilsService from "@/app/services/utils";
import { useTheContext } from "@/app/hooks/global.hook";
import { useQueryParams } from "../hooks/useQueryParams";

export interface Reservation {
  id: string;
  reference: string;
  service: string;
  deviceType: string;
  brand: string;
  model: string;
  description: string;
  cancelReason?: string;
  date: string;
  time: string;
  status: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  createdAt?: string;
  updatedAt?: string;
}

const CancelModalContent = ({
  reference,
  onConfirm,
  onCancel,
}: {
  reference: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!reason.trim()) {
      setError("El motivo de la cancelación es requerido.");
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <div className="order-cancel-modal">
      <p className="order-cancel-modal__intro">
        ¿Estás seguro de cambiar el estatus de la reserva{" "}
        <strong className="order-cancel-modal__order-id">{reference}</strong> a{" "}
        <strong className="order-cancel-modal__order-id">Cancelada</strong>? Se enviará
        una notificación por correo al cliente.
      </p>

      <div className="order-cancel-modal__field">
        <label className="order-cancel-modal__label">
          Motivo de la cancelación *
        </label>
        <textarea
          className={`order-cancel-modal__textarea${
            error ? " order-cancel-modal__textarea--error" : ""
          }`}
          placeholder="Por favor, describe detalladamente la razón de la cancelación..."
          rows={4}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (e.target.value.trim()) {
              setError("");
            }
          }}
        />
        {error ? (
          <span className="order-cancel-modal__error" role="alert">
            {error}
          </span>
        ) : null}
      </div>

      <div className="order-cancel-modal__actions">
        <button
          type="button"
          className="admin-btn admin-btn--secondary order-cancel-modal__btn"
          onClick={onCancel}
        >
          Cerrar
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--primary order-cancel-modal__btn order-cancel-modal__btn--confirm"
          onClick={handleSubmit}
        >
          Confirmar cancelación
        </button>
      </div>
    </div>
  );
};

const useReservas = () => {
  const { requestGet, requestPost } = UtilsService();
  const { setDataModal, socketServer } = useTheContext();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [totalReservations, setTotalReservations] = useState(0);
  const [loading, setLoading] = useState(false);

  const { searchParams, setQueryParams } = useQueryParams();

  const searchParam = searchParams.get("search") || "";
  const statusParam = searchParams.get("status") || "all";
  const dateParam = searchParams.get("date") || "";
  const filterTypeParam = (searchParams.get("filterType") as "single" | "range") || "single";
  const startDateParam = searchParams.get("startDate") || "";
  const endDateParam = searchParams.get("endDate") || "";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const pageSizeParam = parseInt(searchParams.get("pageSize") || "25", 10);

  // Filtros
  const [search, setSearch] = useState(searchParam);
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam);
  const [status, setStatus] = useState(statusParam);
  const [date, setDate] = useState(dateParam);
  const [filterType, setFilterType] = useState<"single" | "range">(filterTypeParam);
  const [startDate, setStartDate] = useState(startDateParam);
  const [endDate, setEndDate] = useState(endDateParam);

  // Paginación
  const [page, setPage] = useState(pageParam);
  const [pageSize, setPageSize] = useState(pageSizeParam);

  // Sincronizar de URL a estados locales (botón atrás del navegador)
  useEffect(() => {
    if (searchParam !== debouncedSearch) {
      setSearch(searchParam);
      setDebouncedSearch(searchParam);
    }
    if (statusParam !== status) setStatus(statusParam);
    if (dateParam !== date) setDate(dateParam);
    if (filterTypeParam !== filterType) setFilterType(filterTypeParam);
    if (startDateParam !== startDate) setStartDate(startDateParam);
    if (endDateParam !== endDate) setEndDate(endDateParam);
    if (pageParam !== page) setPage(pageParam);
    if (pageSizeParam !== pageSize) setPageSize(pageSizeParam);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Sincronizar estados locales a URL cuando cambien
  useEffect(() => {
    setQueryParams({
      search: debouncedSearch,
      status,
      date,
      filterType,
      startDate,
      endDate,
      page,
      pageSize
    });
  }, [debouncedSearch, status, date, filterType, startDate, endDate, page, pageSize, setQueryParams]);

  // Debounce para el término de búsqueda
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      if (search !== debouncedSearch) {
        setPage(1); // Reiniciar a página 1 solo si el debounced realmente cambió
      }
    }, 450);

    return () => clearTimeout(handler);
  }, [search, debouncedSearch]);

  // Carga de datos de reservas de administrador
  const fetchReservations = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("page", String(page));
      queryParams.append("limit", String(pageSize));
      if (status && status !== "all") {
        queryParams.append("status", status);
      }
      if (debouncedSearch.trim()) {
        queryParams.append("search", debouncedSearch.trim());
      }
      if (filterType === "single" && date) {
        queryParams.append("date", date);
      } else if (filterType === "range") {
        if (startDate) {
          queryParams.append("startDate", startDate);
        }
        if (endDate) {
          queryParams.append("endDate", endDate);
        }
      }

      const res = await requestGet(
        `/reservas/admin/getAll?${queryParams.toString()}`,
        { silent: true },
      );
      if (res && res.status === 200 && res.data) {
        setReservations(res.data.data || []);
        setTotalReservations(res.data.pagination?.total || 0);
      }
    } catch (error: any) {
      console.error("Error fetching reservations:", error);
      setReservations([]);
      setTotalReservations(0);
    } finally {
      setLoading(false);
    }
  };

  const isMountedRef = useRef(false);
  // Ejecutar carga al cambiar dependencias de filtro estables
  useEffect(() => {
    fetchReservations();
    if (isMountedRef.current) {
      import("../shared/utils/scrollUtils").then(mod => mod.scrollToTopRobust(0));
    }
    isMountedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, status, debouncedSearch, date, startDate, endDate, filterType]);

  // Actualizar el estatus de una reserva
  const updateReservationStatus = async (reference: string, newStatus: string) => {
    if (newStatus === "cancelled") {
      setDataModal({
        isOpen: true,
        type: "warning",
        title: "Cancelar Reserva",
        showActions: false,
        content: (
          <CancelModalContent
            reference={reference}
            onCancel={() => setDataModal((prev) => ({ ...prev, isOpen: false }))}
            onConfirm={async (reason) => {
              setDataModal((prev) => ({ ...prev, isOpen: false }));
              try {
                const res = await requestPost(
                  { reference, status: newStatus, cancelReason: reason },
                  "/reservas/admin/updateStatus"
                );

                if (res && res.status === 200) {
                  socketServer.current?.emit("updateReservationStatus", {
                    reference,
                    status: newStatus,
                    cancelReason: reason
                  });
                  setDataModal({
                    isOpen: true,
                    type: "info",
                    title: "Estatus Actualizado",
                    showActions: false,
                    content: `La reserva se canceló correctamente y se le notificó al cliente.`,
                    onConfirm: () => {
                      setDataModal((prev) => ({ ...prev, isOpen: false }));
                    },
                    onClose: () => {
                      setDataModal((prev) => ({ ...prev, isOpen: false }));
                    },
                  });
                  fetchReservations();
                }
              } catch (error: any) {
                console.error("Error updating reservation status:", error);
              }
            }}
          />
        ),
        onConfirm: () => {},
        onClose: () => {
          setDataModal((prev) => ({ ...prev, isOpen: false }));
        },
      });
      return;
    }

    setDataModal({
      isOpen: true,
      type: "info",
      title: "Confirmar Cambio de Estatus",
      showActions: true,
      content: `¿Estás seguro de cambiar el estatus de la reserva ${reference} a "${newStatus === "pending"
        ? "Pendiente"
        : newStatus === "in_process"
          ? "En Proceso"
          : newStatus === "completed"
            ? "Completada"
            : "Cancelada"
        }"? Se enviará una notificación por correo al cliente.`,
      onClose: () => {
        setDataModal((prev) => ({ ...prev, isOpen: false }));
      },
      onConfirm: async () => {
        setDataModal((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await requestPost(
            { reference, status: newStatus },
            "/reservas/admin/updateStatus"
          );

          if (res && res.status === 200) {
            socketServer.current?.emit("updateReservationStatus", {
              reference,
              status: newStatus
            });
            setDataModal({
              isOpen: true,
              type: "info",
              title: "Estatus Actualizado",
              showActions: false,
              content: `El estatus de la reserva se actualizó a "${newStatus === "pending"
                ? "Pendiente"
                : newStatus === "in_process"
                  ? "En Proceso"
                  : newStatus === "completed"
                    ? "Completada"
                    : "Cancelada"
                }" correctamente y se le notificó al cliente.`,
              onConfirm: () => {
                setDataModal((prev) => ({ ...prev, isOpen: false }));
              },
              onClose: () => {
                setDataModal((prev) => ({ ...prev, isOpen: false }));
              },
            });
            fetchReservations();
          }
        } catch (error: any) {
          console.error("Error updating reservation status:", error);
        }
      },
    });
  };

  return {
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
  };
};

export default useReservas;
