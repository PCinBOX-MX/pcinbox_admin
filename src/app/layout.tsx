import "./globals.css";
import { GlobalProvider } from "./hooks/global.hook";
import AppWrapper from "./wrapper";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <GlobalProvider>
      <html lang="es">
        <body>
          <AppWrapper>{children}</AppWrapper>
        </body>
      </html>
    </GlobalProvider>
  );
}
