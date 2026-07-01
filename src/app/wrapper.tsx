"use client";

import AppContent from "./shared/components/especific/appcontent/AppContent";

export default function AppWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppContent>{children}</AppContent>;
}
