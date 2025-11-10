"use client";

import { SnackbarProvider } from "notistack";
import AppContent from "./shared/components/especific/appcontent/AppContent";

export default function AppWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      preventDuplicate
      autoHideDuration={null} // manual close
    >
      <AppContent>{children}</AppContent>
    </SnackbarProvider>
  );
}
