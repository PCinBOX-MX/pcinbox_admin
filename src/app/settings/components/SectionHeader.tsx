"use client";

import type { LucideIcon } from "lucide-react";
import styles from "../settings.module.css";

type SectionHeaderProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  meta: string[];
};

export default function SectionHeader({ icon: Icon, title, description, meta }: SectionHeaderProps) {
  return (
    <header className={styles.cardHead}>
      <span className={styles.cardIcon} aria-hidden>
        <Icon />
      </span>
      <div className={styles.cardTitle}>
        <h2>{title}</h2>
        <p>{description}</p>
        <ul className={styles.meta}>
          {meta.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </header>
  );
}
