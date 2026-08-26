import type { Metadata } from "next";
import "./globals.css";
import { GlobalProvider } from "./hooks/global.hook";
import AppWrapper from "./wrapper";
import AppEmotionCacheProvider from "./providers/AppEmotionCacheProvider";

export const metadata: Metadata = {
  title: "PCInbox Admin",
  icons: {
    icon: [{ url: "/logo.png?v=2", type: "image/png", sizes: "32x32" }],
    apple: [{ url: "/logo.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <GlobalProvider>
      <html lang="es">
        <body>
          <AppEmotionCacheProvider>
            <AppWrapper>{children}</AppWrapper>
          </AppEmotionCacheProvider>
        </body>
      </html>
    </GlobalProvider>
  );
}
