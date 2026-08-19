"use client";

import type { ReactNode } from "react";
import {
  FileText,
  Heart,
  Inbox,
  MapPin,
  Package,
  Search,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";
import styles from "./emptyState.module.css";

export type EmptyStateIcon =
  | "default"
  | "search"
  | "products"
  | "orders"
  | "address"
  | "favorites"
  | "quotes"
  | "customers";

const ICONS: Record<EmptyStateIcon, LucideIcon> = {
  default: Inbox,
  search: Search,
  products: Package,
  orders: ShoppingBag,
  address: MapPin,
  favorites: Heart,
  quotes: FileText,
  customers: Users,
};

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: EmptyStateIcon | ReactNode;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
  testId?: string;
};

export default function EmptyState({
  title,
  description,
  icon = "default",
  action,
  compact = false,
  className,
  testId,
}: EmptyStateProps) {
  const IconComponent =
    typeof icon === "string" ? ICONS[icon as EmptyStateIcon] : null;
  const iconSize = compact ? 24 : 30;

  return (
    <div
      className={`${styles.root} ${compact ? styles.compact : ""} ${className || ""}`.trim()}
      data-testid={testId}
      role="status"
      aria-live="polite"
    >
      <div className={styles.iconWrap} aria-hidden="true">
        {IconComponent ? <IconComponent size={iconSize} strokeWidth={1.75} /> : icon}
      </div>
      <h3 className={styles.title}>{title}</h3>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
