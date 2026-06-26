"use client";

import { useState, useEffect } from "react";
import UtilsService from "@/app/services/utils";
import { useTheContext } from "@/app/hooks/global.hook";

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

  // Filtros
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");
  const [filterType, setFilterType] = useState<"single" | "range">("single");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Debounce para el término de búsqueda (evita saturar el servidor con peticiones innecesarias)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reiniciar a página 1 al cambiar el filtro de búsqueda
    }, 450);

    return () => {
      clearTimeout(handler);
    };
  }, [search]);

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

  // Ejecutar carga al cambiar dependencias de filtro estables
  useEffect(() => {
    fetchReservations();
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
