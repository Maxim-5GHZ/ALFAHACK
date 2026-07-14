"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const agreed = localStorage.getItem("cookie_consent");
    if (!agreed) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("cookie_consent", "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur shadow-lg">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 md:py-2.5">
        <Cookie size={18} className="shrink-0 text-primary hidden sm:block" />
        <p className="text-xs text-gray-500 leading-relaxed flex-1">
          Мы используем файлы cookie, чтобы улучшить работу сервиса. Продолжая пользоваться сайтом, вы соглашаетесь с обработкой данных.
        </p>
        <Button
          onClick={accept}
          size="default"
          className="shrink-0 h-8 text-xs font-semibold bg-primary hover:bg-primary-dark px-4"
        >
            Принять
        </Button>
      </div>
    </div>
  );
}
