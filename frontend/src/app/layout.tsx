import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";

export const metadata: Metadata = {
  title: "Альфа.Старт — бизнес-план за 5 минут",
  description: "Интерактивный помощник для молодых предпринимателей",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 pt-14 md:pt-16">{children}</main>
        <Footer />
        <CookieConsent />
      </body>
    </html>
  );
}
