import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GlobalProvider } from "./hooks/global.hook";
import AppWrapper from "./wrapper";
import AppEmotionCacheProvider from "./providers/AppEmotionCacheProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PCInbox Admin",
  applicationName: "PCInbox Admin",
  appleWebApp: {
    capable: true,
    title: "PCInbox Admin",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/logo.png?v=3", type: "image/png", sizes: "32x32" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: [{ url: "/favicon.ico?v=3" }],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#bb3d4b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <GlobalProvider>
      <html lang="es" className={inter.variable}>
        <body className={inter.className}>
          <AppEmotionCacheProvider>
            <AppWrapper>{children}</AppWrapper>
          </AppEmotionCacheProvider>
        </body>
      </html>
    </GlobalProvider>
  );
}
