"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  LayoutDashboard,
  LogIn,
  LogOut,
  User,
  Gamepad2,
  Menu,
  X,
  Home
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";

type UserInfo = { id: number; email: string; username: string };

const linkClass = "text-sm font-medium transition-colors hover:text-primary";
const linkActive = "text-primary";
const linkInactive = "text-text-primary/60";

export default function Header() {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const isWorkspace = pathname.startsWith("/workspace");
  const isDashboard = pathname.startsWith("/dashboard");

  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Стейт для мобильного меню
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Закрываем мобильное меню при переходе по ссылке
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Блокируем скролл страницы, когда открыто мобильное меню
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

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
    window.location.href = "/";
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 h-14 md:h-16 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
          
          {/* ЛОГОТИП */}
          <Link href="/" className="flex items-center gap-2 text-lg md:text-xl font-bold text-primary relative z-50">
            <span className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-md bg-primary text-[10px] md:text-xs font-bold text-white shadow-sm">
              AC
            </span>
            Альфа.Старт
          </Link>

          {isLoginPage ? (
            <Link href="/" className="group flex items-center gap-1.5 text-sm font-medium text-gray-400 transition-colors hover:text-primary">
              <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden sm:inline">На главную</span>
            </Link>
          ) : (
            <>
              {/* ДЕСКТОПНАЯ НАВИГАЦИЯ (Скрыта на мобилках) */}
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/" className={cn(linkClass, pathname === "/" ? linkActive : linkInactive)}>Главная</Link>
                
                {user && (
                  <>
                    <Link href="/dashboard" className={cn(linkClass, isDashboard ? linkActive : linkInactive, "flex items-center gap-1.5")}>
                      <Gamepad2 size={15} /> Мой бизнес
                    </Link>
                    <Link href="/workspace" className={cn(linkClass, isWorkspace ? linkActive : linkInactive, "flex items-center gap-1.5")}>
                      <LayoutDashboard size={15} /> Бизнес-ассистент
                    </Link>
                  </>
                )}

                {loading ? null : user ? (
                  <div className="flex items-center gap-3 border-l border-gray-200 pl-6">
                    <Link href="/profile" className="flex items-center gap-1.5 text-sm font-bold text-text-primary hover:text-primary transition-colors bg-gray-50 px-3 py-1.5 rounded-full">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                      {user.username}
                    </Link>
                    <button onClick={handleLogout} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Выйти">
                      <LogOut size={16} />
                    </button>
                  </div>
                ) : (
                  <Link href="/login">
                    <Button variant="default" className="shadow-md">
                      <LogIn size={15} className="mr-1.5" /> Войти
                    </Button>
                  </Link>
                )}
              </nav>

              {/* КНОПКА ГАМБУРГЕРА (Видна только на мобилках) */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden flex items-center justify-center p-2 -mr-2 text-text-primary hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Menu size={24} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* ========================================== */}
      {/* МОБИЛЬНОЕ МЕНЮ (ШТОРКА)                      */}
      {/* ========================================== */}
      
      {/* Оверлей (затемнение фона) */}
      <div 
        className={cn(
          "fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          mobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        )}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Сама панель меню */}
      <div 
        className={cn(
          "fixed top-0 right-0 bottom-0 z-[101] w-[85%] max-w-[320px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out md:hidden",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <span className="font-extrabold text-lg text-text-primary">Меню</span>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 bg-gray-50 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col flex-1 overflow-y-auto p-4 gap-2">
          <MobileLink href="/" icon={Home} label="Главная" active={pathname === "/"} />
          
          {user && (
            <>
              <MobileLink href="/dashboard" icon={Gamepad2} label="Мой бизнес" active={isDashboard} />
              <MobileLink href="/workspace" icon={LayoutDashboard} label="Бизнес-ассистент" active={isWorkspace} />
              <MobileLink href="/profile" icon={User} label="Профиль" active={pathname === "/profile"} />
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          {loading ? null : user ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 px-2">
                 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg shadow-sm">
                   {user.username.charAt(0).toUpperCase()}
                 </div>
                 <div className="flex flex-col">
                   <span className="text-sm font-bold text-text-primary">{user.username}</span>
                   <span className="text-xs text-gray-400">{user.email}</span>
                 </div>
              </div>
              <Button variant="outline" className="w-full mt-2 border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300" onClick={handleLogout}>
                <LogOut size={16} className="mr-2" /> Выйти из аккаунта
              </Button>
            </div>
          ) : (
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full bg-primary hover:bg-primary-dark shadow-md h-12 text-base">
                <LogIn size={18} className="mr-2" /> Войти в систему
              </Button>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

// Вспомогательный компонент для кнопок в мобильном меню
function MobileLink({ href, icon: Icon, label, active }: any) {
  return (
    <Link 
      href={href} 
      className={cn(
        "flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98]",
        active ? "bg-primary/10 text-primary" : "text-text-primary hover:bg-gray-50"
      )}
    >
      <Icon size={20} className={active ? "text-primary" : "text-gray-400"} />
      {label}
    </Link>
  );
}
