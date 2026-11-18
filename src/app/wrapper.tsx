"use client";

import { Suspense } from "react";
import DisableNumberInputWheel from "./shared/components/common/DisableNumberInputWheel";
import AppContent from "./shared/components/especific/appcontent/AppContent";
import AppThemeProvider from "./providers/AppThemeProvider";
import PwaInstall from "./components/pwa/PwaInstall";

export default function AppWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppThemeProvider>
      <PwaInstall />
      <DisableNumberInputWheel />
      <Suspense fallback={null}>
        <AppContent>{children}</AppContent>
      </Suspense>
    </AppThemeProvider>
  );
}
