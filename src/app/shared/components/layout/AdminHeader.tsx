"use client";

import { Bell, Sun, User } from "lucide-react";
import styles from "./admin-header.module.css";

/**
 * Header admin: sin buscador global falso (los filtros viven por pantalla).
 * Evita confusión en uso rudo / móvil.
 */
const AdminHeader = () => {
  return (
    <header className={styles.header}>
      <div className={styles.headerContainer}>
        <div className={styles.headerLead}>
          <span className={styles.headerLeadText}>Panel administrativo</span>
        </div>

        <div className={styles.actionsContainer}>
          <button type="button" className={styles.actionBtn} aria-label="Tema">
            <Sun size={20} />
          </button>

          <button type="button" className={styles.actionBtn} aria-label="Notificaciones">
            <div className={styles.notificationBadge} />
            <Bell size={20} />
          </button>

          <div className={styles.userProfile}>
            <div className={styles.userInfo}>
              <span className={styles.userName}>Administrador</span>
            </div>
            <div className={styles.avatar}>
              <User size={20} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
