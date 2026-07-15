"use client";

import { Bell, Moon, Search, Sun, User } from "lucide-react";
import styles from "./admin-header.module.css";
import useNavbar from "../common/navbar/useNavbar";

const AdminHeader = () => {
  const { handleLogout } = useNavbar();

  return (
    <header className={styles.header}>
      <div className={styles.headerContainer}>
        {/* Search Bar */}
        <div className={styles.searchContainer}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar..."
            className={styles.searchInput}
          />
        </div>

        {/* Right side actions */}
        <div className={styles.actionsContainer}>
          <button type="button" className={styles.actionBtn}>
            <Sun size={20} />
          </button>
          
          <button type="button" className={styles.actionBtn}>
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
