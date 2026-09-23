"use client";

import styles from "./customer.module.css";
import gridStyles from "@/app/shared/styles/grid-cells.module.css";
import { GridColDef } from "@mui/x-data-grid";
import { Mail, Phone, Trash2 } from "lucide-react";
import { useMemo } from "react";

function initialsFromName(name?: string, lastname?: string) {
  const first = (name || "").trim().charAt(0);
  const last = (lastname || "").trim().charAt(0);
  const value = `${first}${last}`.toUpperCase();
  return value || "?";
}

function fullName(name?: string, lastname?: string) {
  return [name, lastname].filter(Boolean).join(" ").trim() || "Sin nombre";
}

function formatDateParts(value: unknown) {
  if (!value) return { date: "—", time: "" };
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return { date: "—", time: "" };
  return {
    date: d.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function avatarTone(id: unknown) {
  const n = Number(id) || 0;
  const tones = [
    styles.avatarToneA,
    styles.avatarToneB,
    styles.avatarToneC,
    styles.avatarToneD,
  ];
  return tones[Math.abs(n) % tones.length];
}

export type CustomerRow = {
  idUser?: number | string;
  name?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  active?: number | boolean;
  createdAT?: string;
  role?: string;
};

type GridCustomerProps = {
  rows: {
    totalRows: number;
    data: CustomerRow[];
  };
  canDeactivate?: boolean;
  deactivatingId?: number | string | null;
  onDeleteAccount?: (row: CustomerRow) => void;
};

const GridCustomer = ({
  rows,
  canDeactivate = false,
  deactivatingId = null,
  onDeleteAccount,
}: GridCustomerProps) => {
  const columns: GridColDef[] = useMemo(
    () => {
      const base: GridColDef[] = [
        {
          field: "idUser",
          headerName: "ID",
          minWidth: 96,
          width: 110,
          align: "center",
          headerAlign: "center",
          renderCell: (params) => (
            <div className={`${styles.truncateCell} ${gridStyles.cell}`}>
              <span className={styles.idPill}>#{params.value}</span>
            </div>
          ),
        },
        {
          field: "name",
          headerName: "Cliente",
          minWidth: 240,
          flex: 1.35,
          renderCell: (params) => {
            const name = params.row?.name;
            const lastname = params.row?.lastname;
            const isActive =
              params.row?.active == 1 || params.row?.active === true;
            return (
              <div className={`${styles.truncateCell} ${styles.identity}`}>
                <span
                  className={`${styles.avatar} ${avatarTone(params.row?.idUser)} ${
                    !isActive ? styles.avatarMuted : ""
                  }`}
                  aria-hidden
                >
                  {initialsFromName(name, lastname)}
                </span>
                <div className={styles.identityText}>
                  <span className={styles.identityName}>
                    {fullName(name, lastname)}
                  </span>
                  <span className={styles.identityMeta}>
                    {params.row?.role === "admin"
                      ? "Administrador"
                      : params.row?.role === "provider"
                        ? "Proveedor"
                        : "Cliente registrado"}
                  </span>
                </div>
              </div>
            );
          },
        },
        {
          field: "email",
          headerName: "Contacto",
          minWidth: 240,
          flex: 1.25,
          renderCell: (params) => {
            const phone = String(params.row?.phone || "").trim();
            return (
              <div className={`${styles.truncateCell} ${styles.contactCell}`}>
                <span className={styles.contactLine} title={params.value || undefined}>
                  <Mail size={14} className={styles.contactIcon} aria-hidden />
                  <span className={styles.email}>
                    {params.value || "Sin correo"}
                  </span>
                </span>
                <span className={styles.contactLine}>
                  <Phone size={14} className={styles.contactIcon} aria-hidden />
                  {phone ? (
                    <span className={styles.phone}>{phone}</span>
                  ) : (
                    <span className={styles.phoneEmpty}>Sin teléfono</span>
                  )}
                </span>
              </div>
            );
          },
        },
        {
          field: "active",
          headerName: "Estado",
          minWidth: 130,
          width: 150,
          align: "center",
          headerAlign: "center",
          renderCell: (params) => {
            const isActive = params.value == 1 || params.value === true;
            return (
              <div className={`${styles.truncateCell} ${gridStyles.cell}`}>
                <span
                  className={`${styles.statusPill} ${
                    isActive ? styles.statusActive : styles.statusInactive
                  }`}
                >
                  <span className={styles.statusDot} aria-hidden />
                  {isActive ? "Activo" : "Inactivo"}
                </span>
              </div>
            );
          },
        },
        {
          field: "createdAT",
          headerName: "Registro",
          minWidth: 140,
          width: 160,
          align: "center",
          headerAlign: "center",
          renderCell: (params) => {
            const { date, time } = formatDateParts(params.value);
            return (
              <div className={`${styles.truncateCell} ${styles.dateCell}`}>
                <span className={styles.datePrimary}>{date}</span>
                {time ? (
                  <span className={styles.dateSecondary}>{time}</span>
                ) : null}
              </div>
            );
          },
        },
      ];

      if (canDeactivate) {
        base.push({
          field: "actions",
          headerName: "Acciones",
          minWidth: 120,
          width: 130,
          sortable: false,
          filterable: false,
          align: "center",
          headerAlign: "center",
          renderCell: (params) => {
            const isActive =
              params.row?.active == 1 || params.row?.active === true;
            const isAdmin = params.row?.role === "admin";
            const busy =
              deactivatingId != null &&
              String(deactivatingId) === String(params.row?.idUser);
            const disabled = !isActive || isAdmin || busy;

            return (
              <div className={`${styles.truncateCell} ${gridStyles.cell}`}>
                <button
                  type="button"
                  className={`${styles.actionDelete} ${
                    disabled ? styles.actionDeleteDisabled : ""
                  }`}
                  disabled={disabled}
                  title={
                    isAdmin
                      ? "No se puede eliminar una cuenta admin"
                      : !isActive
                        ? "Cuenta ya eliminada"
                        : "Eliminar cuenta"
                  }
                  aria-label={
                    isActive
                      ? `Eliminar cuenta de ${fullName(
                          params.row?.name,
                          params.row?.lastname,
                        )}`
                      : "Cuenta ya eliminada"
                  }
                  onClick={() => {
                    if (disabled || !onDeleteAccount) return;
                    onDeleteAccount(params.row as CustomerRow);
                  }}
                >
                  <Trash2 size={16} strokeWidth={2.25} />
                </button>
              </div>
            );
          },
        });
      }

      return base;
    },
    [rows, canDeactivate, deactivatingId, onDeleteAccount],
  );

  return {
    columns,
  };
};

export default GridCustomer;
