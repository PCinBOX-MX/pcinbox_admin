"use client";

import { Loader2, type LucideIcon } from "lucide-react";
import { cx } from "../useBannerDrafts";
import styles from "../settings.module.css";

export type NavSection<T extends string> = {
  id: T;
  label: string;
  description: string;
  icon: LucideIcon;
  status: string;
  pending: number;
  busy?: boolean;
};

type SettingsNavProps<T extends string> = {
  sections: NavSection<T>[];
  active: T;
  onSelect: (id: T) => void;
};

const STEPS = [
  "Elige el banner que quieres cambiar.",
  "Sube o arrastra la imagen y revisa la vista previa.",
  "Publica. La tienda lo muestra al abrir o recargar la página.",
];

export default function SettingsNav<T extends string>({
  sections,
  active,
  onSelect,
}: SettingsNavProps<T>) {
  return (
    <aside className={styles.nav}>
      <p className={styles.navLabel}>Banners de la tienda</p>
      <div className={styles.navList} role="tablist" aria-orientation="vertical" aria-label="Secciones">
        {sections.map(({ id, label, description, icon: Icon, status, pending, busy }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`settings-tab-${id}`}
            aria-selected={active === id}
            aria-controls="settings-panel"
            aria-busy={busy || undefined}
            className={cx(styles.navItem, active === id && styles.navItemActive)}
            onClick={() => onSelect(id)}
          >
            <span className={styles.navIcon} aria-hidden>
              <Icon />
            </span>
            <span className={styles.navText}>
              <strong>{label}</strong>
              <small>{description}</small>
              <em
                className={cx(
                  styles.navStatus,
                  (pending > 0 || busy) && styles.navStatusPending,
                  busy && styles.navStatusBusy,
                )}
              >
                {busy ? <Loader2 className={styles.spin} aria-hidden /> : null}
                {busy ? "Publicando…" : status}
              </em>
            </span>
          </button>
        ))}
      </div>

      <div className={styles.navGuide}>
        <p>Cómo funciona</p>
        <ol>
          {STEPS.map((step, index) => (
            <li key={step}>
              <span aria-hidden>{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
