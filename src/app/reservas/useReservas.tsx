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
  date: string;
  time: string;
  status: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  createdAt?: string;
  updatedAt?: string;
}

const useReservas = () => {
  const { requestGet, requestPost } = UtilsService();
  const { setDataModal } = useTheContext();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [totalReservations, setTotalReservations] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");

  // Paginación
  const [page, setPage] = useState(1);
  const limit = 10;

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
      queryParams.append("limit", String(limit));
      if (status && status !== "all") {
        queryParams.append("status", status);
      }
      if (debouncedSearch.trim()) {
        queryParams.append("search", debouncedSearch.trim());
      }
      if (date) {
        queryParams.append("date", date);
      }

      const res = await requestGet(`/reservas/admin/getAll?${queryParams.toString()}`);
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
  }, [page, status, debouncedSearch, date]);

  // Actualizar el estatus de una reserva
  const updateReservationStatus = async (reference: string, newStatus: string) => {
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
    page,
    setPage,
    limit,
    fetchReservations,
    updateReservationStatus,
  };
};

export default useReservas;
