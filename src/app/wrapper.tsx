"use client";

import { SnackbarProvider } from "notistack";
import AppContent from "./shared/components/especific/appcontent/AppContent";
import AppThemeProvider from "./providers/AppThemeProvider";

export default function AppWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppThemeProvider>
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        preventDuplicate
        autoHideDuration={null}
      >
        <AppContent>{children}</AppContent>
      </SnackbarProvider>
    </AppThemeProvider>
  );
}
