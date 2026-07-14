import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Альфа.Старт — бизнес-план за 5 минут",
  description: "Интерактивный помощник для молодых предпринимателей",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <Header />
        <main className="pt-14 md:pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
