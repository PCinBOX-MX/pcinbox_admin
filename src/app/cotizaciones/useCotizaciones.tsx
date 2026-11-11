"use client";

import { AxiosError } from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTheContext } from "../hooks/global.hook";
import { useQueryParams } from "../hooks/useQueryParams";
import {
  Cotizacion,
  CotizacionesAdminResponse,
  CotizacionesPagination,
} from "../interfaces/cotizaciones/cotizaciones.interface";
import UtilsService from "../services/utils";
import QuoteCostPanel from "./QuoteCostPanel";
import type { PosCostSummary } from "../interfaces/pos/pos.interface";
import {
  resolvePageParam,
  readWindowSearchParam,
} from "../utils/adminPagination";

const PAGE_SIZE = 25;

const emptyPagination: CotizacionesPagination = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 0,
};

function positivePage(value: string | null): number {
  return resolvePageParam(value, 1);
}

function errorMessage(error: unknown, fallback: string): string {
  const status = (error as AxiosError)?.response?.status;
  if (status === 401) return "Tu sesión expiró. Inicia sesión nuevamente.";
  if (status === 403) return "No tienes permiso para administrar cotizaciones.";
  if (status === 404) return "La cotización solicitada ya no existe.";
  return fallback;
}

function safeFileName(name: string): string {
  const normalized = name.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_");
  return normalized.toLowerCase().endsWith(".pdf")
    ? normalized
    : `${normalized || "cotizacion"}.pdf`;
}

export default function useCotizaciones(enabled = true) {
  const { searchParams, setQueryParams } = useQueryParams();
  const { setDataModal } = useTheContext();
  const { requestGet, requestBlob, requestDelete } = UtilsService();
  const [records, setRecords] = useState<Cotizacion[]>([]);
  const [pagination, setPagination] =
    useState<CotizacionesPagination>(emptyPagination);
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [from, setFromState] = useState(() => searchParams.get("from") ?? "");
  const [to, setToState] = useState(() => searchParams.get("to") ?? "");
  const [page, setPageState] = useState(() =>
    positivePage(searchParams.get("page") || readWindowSearchParam("page")),
  );
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  const [documentLoadingId, setDocumentLoadingId] = useState<
    Cotizacion["idCotizacion"] | null
  >(null);
  const [costLoadingId, setCostLoadingId] = useState<
    Cotizacion["idCotizacion"] | null
  >(null);
  const objectUrlRef = useRef<string | null>(null);
  const requestSequence = useRef(0);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const closeModal = useCallback(() => {
    revokeObjectUrl();
    setDataModal((previous) => ({ ...previous, isOpen: false }));
  }, [revokeObjectUrl, setDataModal]);

  const showErrorModal = useCallback(
    (message: string) => {
      setDataModal({
        isOpen: true,
        type: "error",
        title: "No fue posible completar la acción",
        content: message,
        showActions: true,
        onClose: closeModal,
        onConfirm: closeModal,
      });
    },
    [closeModal, setDataModal],
  );

  useEffect(() => revokeObjectUrl, [revokeObjectUrl]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmedSearch = search.trim();
      setDebouncedSearch(trimmedSearch);
      if (trimmedSearch !== (searchParams.get("search") ?? "")) {
        setPageState(1);
        setQueryParams({ search: trimmedSearch, page: 1 });
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [search, searchParams, setQueryParams]);

  // Back/forward del navegador: rehidratar filtros desde la URL.
  useEffect(() => {
    const urlSearch = searchParams.get("search") ?? "";
    const urlFrom = searchParams.get("from") ?? "";
    const urlTo = searchParams.get("to") ?? "";
    const urlPage = positivePage(
      searchParams.get("page") || readWindowSearchParam("page"),
    );

    if (urlSearch !== debouncedSearch) {
      setSearch(urlSearch);
      setDebouncedSearch(urlSearch);
    }
    if (urlFrom !== from) setFromState(urlFrom);
    if (urlTo !== to) setToState(urlTo);
    if (urlPage !== page) setPageState(urlPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const loadCotizaciones = useCallback(async () => {
    if (!enabled) return;

    const sequence = ++requestSequence.current;
    setLoading(true);
    setError("");

    const query = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      search: debouncedSearch,
    });
    if (from) query.set("from", from);
    if (to) query.set("to", to);

    try {
      const response = await requestGet(
        `/cotizaciones/admin?${query.toString()}`,
        { silent: true },
      );
      if (sequence !== requestSequence.current) return;

      const payload = response.data as CotizacionesAdminResponse;
      setRecords(payload.data ?? []);
      setPagination({
        page: payload.pagination?.page ?? page,
        limit: PAGE_SIZE,
        total: payload.pagination?.total ?? 0,
        totalPages: payload.pagination?.totalPages ?? 0,
      });
    } catch (requestError) {
      if (sequence !== requestSequence.current) return;
      setRecords([]);
      setPagination({ ...emptyPagination, page });
      setError(
        errorMessage(
          requestError,
          "No se pudieron cargar las cotizaciones. Intenta nuevamente.",
        ),
      );
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [debouncedSearch, enabled, from, page, requestGet, to]);

  useEffect(() => {
    if (enabled) {
      void loadCotizaciones();
    } else {
      setLoading(false);
      setRecords([]);
    }
  }, [enabled, loadCotizaciones]);

  const setPage = useCallback(
    (nextPage: number) => {
      setPageState(nextPage);
      setQueryParams({ page: nextPage });
    },
    [setQueryParams],
  );

  const setFrom = useCallback(
    (value: string) => {
      setFromState(value);
      setPageState(1);
      setQueryParams({ from: value, page: 1 });
    },
    [setQueryParams],
  );

  const setTo = useCallback(
    (value: string) => {
      setToState(value);
      setPageState(1);
      setQueryParams({ to: value, page: 1 });
    },
    [setQueryParams],
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    setFromState("");
    setToState("");
    setPageState(1);
    setQueryParams({ search: null, from: null, to: null, page: 1 });
  }, [setQueryParams]);

  const getDocument = useCallback(
    async (record: Cotizacion, disposition: "inline" | "attachment") => {
      setDocumentLoadingId(record.idCotizacion);
      try {
        return await requestBlob(
          `/cotizaciones/admin/${encodeURIComponent(
            String(record.idCotizacion),
          )}/content?disposition=${disposition}`,
          { silent: true },
        );
      } catch (requestError) {
        showErrorModal(
          errorMessage(
            requestError,
            "No se pudo obtener el PDF de la cotización.",
          ),
        );
        return null;
      } finally {
        setDocumentLoadingId(null);
      }
    },
    [requestBlob, showErrorModal],
  );

  const preview = useCallback(
    async (record: Cotizacion) => {
      const response = await getDocument(record, "inline");
      if (!response) return;

      revokeObjectUrl();
      const url = URL.createObjectURL(
        new Blob([response.data], { type: response.data.type || "application/pdf" }),
      );
      objectUrlRef.current = url;
      setDataModal({
        isOpen: true,
        type: "info",
        title: `Cotización ${record.quoteNumber}`,
        content: (
          <iframe
            data-testid="cotizacion-preview-frame"
            src={url}
            title={`Vista previa de ${record.quoteNumber}`}
            style={{ width: "min(78vw, 980px)", height: "68vh", border: 0 }}
          />
        ),
        maxWidth: "min(94vw, 1080px)",
        showActions: false,
        onClose: closeModal,
        onConfirm: closeModal,
      });
    },
    [closeModal, getDocument, revokeObjectUrl, setDataModal],
  );

  const download = useCallback(
    async (record: Cotizacion) => {
      const response = await getDocument(record, "attachment");
      if (!response) return;

      const url = URL.createObjectURL(
        new Blob([response.data], { type: response.data.type || "application/pdf" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = safeFileName(
        record.originalFileName || record.quoteNumber,
      );
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    },
    [getDocument],
  );

  const openCost = useCallback(
    async (record: Cotizacion) => {
      setCostLoadingId(record.idCotizacion);
      try {
        const response = await requestGet(
          `/cotizaciones/admin/${encodeURIComponent(
            String(record.idCotizacion),
          )}/cost-summary`,
          { silent: true },
        );
        const data = (
          response.data as {
            data?: {
              summary?: PosCostSummary | null;
              missingCount?: number;
              equipmentCount?: number;
            };
          }
        )?.data;
        setDataModal({
          isOpen: true,
          type: "info",
          title: `Inversión · ${record.quoteNumber}`,
          content: (
            <QuoteCostPanel
              summary={data?.summary ?? null}
              missingCount={data?.missingCount ?? 0}
              equipmentCount={data?.equipmentCount ?? 1}
              compact
              message="Esta cotización no tiene productos de TechSmart o DicoTech."
            />
          ),
          showActions: true,
          showCancel: false,
          confirmLabel: "Cerrar",
          onClose: closeModal,
          onConfirm: closeModal,
        });
      } catch (requestError) {
        showErrorModal(
          errorMessage(
            requestError,
            "No se pudo calcular la inversión de la cotización.",
          ),
        );
      } finally {
        setCostLoadingId(null);
      }
    },
    [closeModal, requestGet, setDataModal, showErrorModal],
  );

  const confirmArchive = useCallback(
    (record: Cotizacion) => {
      const archiveRecord = async () => {
        setDataModal((previous) => ({ ...previous, loading: true }));
        try {
          await requestDelete(
            `/cotizaciones/admin/${encodeURIComponent(
              String(record.idCotizacion),
            )}`,
            { silent: true },
          );
          setDataModal((previous) => ({
            ...previous,
            isOpen: false,
            loading: false,
          }));

          if (records.length === 1 && page > 1) {
            setPage(page - 1);
          } else {
            await loadCotizaciones();
          }

          setDataModal({
            isOpen: true,
            type: "success",
            title: "Cotización archivada",
            content:
              "El registro se archivó y su archivo PDF se eliminó permanentemente.",
            showActions: true,
            loading: false,
            onClose: closeModal,
            onConfirm: closeModal,
          });
        } catch (requestError) {
          setDataModal((previous) => ({ ...previous, loading: false }));
          showErrorModal(
            errorMessage(
              requestError,
              "No se pudo archivar la cotización ni eliminar su PDF. Intenta nuevamente.",
            ),
          );
        }
      };

      setDataModal({
        isOpen: true,
        type: "warning",
        title: "Archivar cotización",
        content: `¿Seguro que deseas archivar la cotización ${record.quoteNumber}? Dejará de aparecer en este listado y su archivo PDF se eliminará permanentemente.`,
        showActions: true,
        loading: false,
        onClose: closeModal,
        onConfirm: archiveRecord,
      });
    },
    [
      closeModal,
      loadCotizaciones,
      page,
      records.length,
      requestDelete,
      setDataModal,
      setPage,
      showErrorModal,
    ],
  );

  return {
    records,
    pagination,
    page,
    pageSize: PAGE_SIZE,
    search,
    from,
    to,
    loading,
    error,
    documentLoadingId,
    costLoadingId,
    setSearch,
    setFrom,
    setTo,
    setPage,
    clearFilters,
    reload: loadCotizaciones,
    preview,
    download,
    openCost,
    confirmArchive,
  };
}
