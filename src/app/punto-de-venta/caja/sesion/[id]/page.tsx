"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { CircularProgress } from "@mui/material";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import AdminPageShell from "../../../../shared/components/layout/AdminPageShell";
import EmptyState from "../../../../shared/components/common/emptyState/EmptyState";
import ModernPagination from "../../../../shared/components/common/paginator/ModernPagination";
import usePermissions from "../../../../hooks/usePermissions";
import { useQueryParams } from "../../../../hooks/useQueryParams";
import { readQuerySession } from "../../../../utils/querySession";
import UtilsService from "../../../../services/utils";
import {
  POS_CASH_MOVEMENT_LABELS,
  PosCashMovement,
  PosCashMovementType,
  PosCashSession,
} from "../../../../interfaces/pos/pos.interface";
import { formatPosBranchUiLabel } from "../../../../interfaces/pos/posBranchDisplay";
import { formatMoney, formatQty } from "../../../posFormat";
import styles from "./sesion-movimientos.module.css";

const PAGE_SIZE = 30;
const POS_PATH = "/punto-de-venta";
const POS_CAJA_FALLBACK = `${POS_PATH}?tab=caja`;

const money = formatMoney;
const qty = formatQty;

function posCajaBackHref(): string {
  const saved = readQuerySession(POS_PATH);
  if (!saved) return POS_CAJA_FALLBACK;
  const params = new URLSearchParams(
    saved.startsWith("?") ? saved.slice(1) : saved,
  );
  if (!params.get("tab")) params.set("tab", "caja");
  const q = params.toString();
  return q ? `${POS_PATH}?${q}` : POS_CAJA_FALLBACK;
}

export default function CashSessionMovementsPage() {
  const params = useParams();
  const sessionId = Number(params?.id);
  const { hydrated, can } = usePermissions();
  const { requestGet } = UtilsService();
  const { searchParams, setQueryParams } = useQueryParams();

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  const [session, setSession] = useState<PosCashSession | null>(null);
  const [movements, setMovements] = useState<PosCashMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backHref, setBackHref] = useState(POS_CAJA_FALLBACK);
  const movementsTableRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setBackHref(posCajaBackHref());
  }, []);

  const load = useCallback(async () => {
    if (!Number.isSafeInteger(sessionId) || sessionId <= 0) {
      setError("ID de sesión inválido");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await requestGet(
        `/pos/cash/sessions/${sessionId}/movements?page=${page}&limit=${PAGE_SIZE}`,
        { silent: true },
      );
      const payload = res?.data;
      if (!payload?.ok) {
        throw new Error(payload?.message || "No se pudo cargar");
      }
      setSession(payload.session || null);
      setMovements(payload.data || []);
      setTotal(payload.pagination?.total || 0);
      setTotalPages(payload.pagination?.totalPages || 0);
    } catch (e: unknown) {
      setSession(null);
      setMovements([]);
      setTotal(0);
      setTotalPages(0);
      setError(
        e instanceof Error ? e.message : "No se pudieron cargar los movimientos",
      );
    } finally {
      setLoading(false);
    }
  }, [sessionId, page, requestGet]);

  useEffect(() => {
    if (!hydrated) return;
    if (!can("pos.manage")) {
      setLoading(false);
      return;
    }
    void load();
  }, [hydrated, can, load]);

  if (hydrated && !can("pos.manage")) {
    return (
      <AdminPageShell title="Movimientos de caja" subtitle="Acceso restringido">
        <EmptyState
          title="Sin permiso"
          description="Tu rol no puede consultar el Punto de Venta."
        />
      </AdminPageShell>
    );
  }

  const branchLabel = session
    ? formatPosBranchUiLabel({
        name: session.branchName,
        city: session.branchCity,
        fallback: "Bodega PCinBOX",
      })
    : "—";

  const goMovementsPage = (p: number) => {
    setQueryParams({ page: p <= 1 ? null : p });
  };

  return (
    <AdminPageShell
      title={
        session
          ? `Movimientos · Sesión #${session.idCashSession}`
          : "Movimientos de caja"
      }
      subtitle={
        session
          ? `${branchLabel} · ${
              session.status === "open" ? "Abierta" : "Cerrada"
            } · ${qty(total)} movimiento${total === 1 ? "" : "s"}`
          : "Consulta paginada del ledger de la sesión"
      }
      actions={
        <div className={styles.actions}>
          <Link href={backHref} className={styles.backLink}>
            <ArrowLeft size={15} strokeWidth={2.25} />
            Volver a Caja
          </Link>
        </div>
      }
    >
      {loading ? (
        <div className={styles.loading}>
          <CircularProgress size={22} sx={{ color: "#bb3d4b" }} />
          Cargando movimientos…
        </div>
      ) : error ? (
        <EmptyState title="No disponible" description={error} />
      ) : !session ? (
        <EmptyState
          title="Sesión no encontrada"
          description="Revisa el enlace o vuelve al historial de caja."
        />
      ) : (
        <div className={styles.page}>
          <section className={styles.summary}>
            <div className={styles.summaryGrid}>
              <div className={styles.tile}>
                <span>Estado</span>
                <strong>
                  {session.status === "open" ? "Abierta" : "Cerrada"}
                </strong>
              </div>
              <div className={styles.tile}>
                <span>Abierta por</span>
                <strong>{session.openedByName || "—"}</strong>
                <em>
                  {new Date(session.openedAt).toLocaleString("es-MX")}
                </em>
              </div>
              <div className={styles.tile}>
                <span>Cierre</span>
                <strong>{session.closedByName || "—"}</strong>
                <em>
                  {session.closedAt
                    ? new Date(session.closedAt).toLocaleString("es-MX")
                    : "Aún abierta"}
                </em>
              </div>
              <div className={styles.tile}>
                <span>Fondo</span>
                <strong>{money(session.openingFloat)}</strong>
              </div>
              <div className={styles.tile}>
                <span>Esperado</span>
                <strong>
                  {session.expectedCash != null
                    ? money(session.expectedCash)
                    : "—"}
                </strong>
              </div>
              <div className={styles.tile}>
                <span>Contado</span>
                <strong>
                  {session.closingCounted != null
                    ? money(session.closingCounted)
                    : "—"}
                </strong>
              </div>
              <div className={`${styles.tile} ${styles.tileAccent}`}>
                <span>Diferencia</span>
                <strong>
                  {session.difference != null
                    ? money(session.difference)
                    : "—"}
                </strong>
              </div>
            </div>
            {session.differenceReason ? (
              <p className={styles.note}>
                <strong>Motivo descuadre:</strong> {session.differenceReason}
              </p>
            ) : null}
            {session.notes ? (
              <p className={styles.note}>
                <strong>Notas:</strong> {session.notes}
              </p>
            ) : null}
          </section>

          <section ref={movementsTableRef} className={styles.tableCard}>
            <div className={styles.tableHead}>
              <div>
                <h2>Historial de movimientos</h2>
                <p>
                  Ordenados del más reciente al más antiguo · página {page} de{" "}
                  {Math.max(totalPages, 1)}
                </p>
              </div>
            </div>

            {totalPages > 0 ? (
              <div style={{ marginBottom: 12 }}>
                <ModernPagination
                  page={page}
                  pageCount={Math.max(totalPages, 1)}
                  totalItems={total}
                  pageSize={PAGE_SIZE}
                  scrollOnChange={false}
                  onPageChange={goMovementsPage}
                />
              </div>
            ) : null}

            {movements.length === 0 ? (
              <EmptyState
                title="Sin movimientos"
                description="Esta sesión aún no tiene entradas, salidas ni ventas en efectivo."
              />
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th>Tipo</th>
                      <th>Monto</th>
                      <th>Motivo</th>
                      <th>Venta</th>
                      <th>Usuario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr key={m.idCashMovement}>
                        <td>
                          {new Date(m.createdAt).toLocaleString("es-MX")}
                        </td>
                        <td>
                          <span className={styles.typeChip}>
                            {POS_CASH_MOVEMENT_LABELS[
                              m.type as PosCashMovementType
                            ] || m.type}
                          </span>
                        </td>
                        <td className={styles.amount}>{money(m.amount)}</td>
                        <td>{m.reason || "—"}</td>
                        <td>
                          {m.posSaleId != null ? `#${m.posSaleId}` : "—"}
                        </td>
                        <td>{m.userName || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 0 ? (
              <div style={{ marginTop: 16 }}>
                <ModernPagination
                  page={page}
                  pageCount={Math.max(totalPages, 1)}
                  totalItems={total}
                  pageSize={PAGE_SIZE}
                  scrollTargetRef={movementsTableRef}
                  onPageChange={goMovementsPage}
                />
              </div>
            ) : null}
          </section>
        </div>
      )}
    </AdminPageShell>
  );
}
