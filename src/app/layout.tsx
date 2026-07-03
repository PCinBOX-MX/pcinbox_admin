import "./globals.css";
import { GlobalProvider } from "./hooks/global.hook";
import AppWrapper from "./wrapper";
import AppEmotionCacheProvider from "./providers/AppEmotionCacheProvider";

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
