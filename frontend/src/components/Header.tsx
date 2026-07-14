"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, LogIn, LogOut, User, Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiGet } from "@/lib/api";

type UserInfo = { id: number; email: string; username: string };

export default function Header() {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    apiGet<UserInfo>("/api/v1/auth/me", token)
      .then(setUser)
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setMenuOpen(false);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-gray-200 bg-white/95 backdrop-blur md:h-16">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold text-primary md:text-xl"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-white md:h-8 md:w-8 md:text-xs">
            AC
          </span>
          Альфа.Старт
        </Link>

        {isLoginPage ? (
          <Link
            href="/"
            className="group flex items-center gap-1.5 text-sm font-medium text-gray-400 transition-colors hover:text-primary"
          >
            <ArrowLeft
              size={16}
              className="transition-transform group-hover:-translate-x-0.5"
            />
            <span className="hidden sm:inline">На главную</span>
          </Link>
        ) : (
          <>
            <nav className="hidden items-center gap-6 md:flex">
              <Link
                href="/"
                className="text-sm font-medium text-text-primary/60 transition-colors hover:text-primary"
              >
                Главная
              </Link>

              {loading ? null : user ? (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-sm text-text-primary/60">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                    {user.username}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-primary"
                    title="Выйти"
                  >
                    <LogOut size={15} />
                  </button>
                </div>
              ) : (
                <Link href="/login">
                  <Button variant="default">
                    <LogIn size={15} className="mr-1.5" />
                    Войти
                  </Button>
                </Link>
              )}
            </nav>

            <button
              className="md:hidden"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Меню"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </>
        )}
      </div>

      {menuOpen && !isLoginPage && (
        <div className="border-t border-gray-200 bg-white px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-2 pt-3">
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-sm font-medium text-text-primary/60 transition-colors hover:bg-gray-50 hover:text-primary"
              onClick={() => setMenuOpen(false)}
            >
              Главная
            </Link>

            {loading ? null : user ? (
              <div className="flex items-center justify-between rounded-lg px-3 py-2">
                <span className="flex items-center gap-2 text-sm text-text-primary/60">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                  {user.username}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-400 transition-colors hover:text-primary"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <Link href="/login" onClick={() => setMenuOpen(false)}>
                <Button variant="default" className="w-full">
                  <LogIn size={15} className="mr-1.5" />
                  Войти
                </Button>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
