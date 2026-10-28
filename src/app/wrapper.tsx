"use client";

import { Suspense } from "react";
import DisableNumberInputWheel from "./shared/components/common/DisableNumberInputWheel";
import AppContent from "./shared/components/especific/appcontent/AppContent";
import AppThemeProvider from "./providers/AppThemeProvider";

export default function AppWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppThemeProvider>
      <DisableNumberInputWheel />
      <Suspense fallback={null}>
        <AppContent>{children}</AppContent>
      </Suspense>
    </AppThemeProvider>
  );
}
