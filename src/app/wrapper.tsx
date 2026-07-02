"use client";

import AppContent from "./shared/components/especific/appcontent/AppContent";
import AppThemeProvider from "./providers/AppThemeProvider";

export default function AppWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppThemeProvider>
      <AppContent>{children}</AppContent>
    </AppThemeProvider>
  );
}
