"use client";

import { Suspense } from "react";
import AppContent from "./shared/components/especific/appcontent/AppContent";
import AppThemeProvider from "./providers/AppThemeProvider";

export default function AppWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppThemeProvider>
      <Suspense fallback={null}>
        <AppContent>{children}</AppContent>
      </Suspense>
    </AppThemeProvider>
  );
}
