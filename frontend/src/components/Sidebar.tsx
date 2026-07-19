"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutDashboard, LogOut, Menu, X, Gamepad2 } from "lucide-react";
import { apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";

type UserInfo = { id: number; email: string; username: string };

const navItems = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/dashboard", label: "Мой бизнес", icon: Gamepad2 },
  { href: "/workspace", label: "Ассистент", icon: LayoutDashboard },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreen = () => setIsMobile(window.innerWidth < 768);
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/workspace") || pathname.startsWith("/profile") || pathname.startsWith("/dashboard")) return;
    let token = null;
    try {
      token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    } catch (e) {}
    if (!token) return;
    apiGet<UserInfo>("/api/v1/auth/me", token)
      .then(setUser)
      .catch(() => {
        try { localStorage.removeItem("token"); } catch (e) {}
      });
  }, [pathname]);

  const handleLogout = () => {
    try { localStorage.removeItem("token"); } catch (e) {}
    window.location.href = "/";
  };

  if (pathname.startsWith("/workspace") || pathname.startsWith("/profile") || pathname.startsWith("/dashboard")) return null;

  return (
    <>
      {isMobile && open && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "flex h-[calc(100dvh-4rem)] flex-col bg-card border-r border-gray-200 transition-all duration-300 z-50",
          isMobile ? "fixed left-0 top-16 shadow-2xl" : "relative",
          open || isMobile ? "w-64" : "w-14",
          isMobile && !open ? "-translate-x-full" : "translate-x-0"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-gray-200 px-3">
          {(open || isMobile) && <span className="text-sm font-bold text-text-primary uppercase tracking-wider">Меню</span>}
          {!isMobile && (
            <button
              onClick={() => setOpen((o) => !o)}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-200 hover:text-text-primary"
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => isMobile && setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all active:scale-[0.98]",
                  active ? "bg-primary/10 text-primary" : "text-text-primary/60 hover:bg-white hover:shadow-sm"
                )}
                title={!open && !isMobile ? item.label : undefined}
              >
                <item.icon size={18} className={active ? "text-primary" : "text-gray-400"} />
                {(open || isMobile) && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-3 bg-gray-50/50">
          {user && (open || isMobile) && (
            <div className="mb-3 flex items-center gap-3 px-2 py-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shadow-sm">
                {user.username.charAt(0).toUpperCase()}
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-text-primary leading-none truncate max-w-[140px]">{user.username}</span>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500/80 transition-colors hover:bg-red-50 hover:text-red-600"
            title={!open && !isMobile ? "Выйти" : undefined}
          >
            <LogOut size={18} />
            {(open || isMobile) && <span>Выйти</span>}
          </button>
        </div>
      </aside>

      {isMobile && !open && (
        <button 
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 h-12 w-12 bg-primary text-white rounded-full flex items-center justify-center shadow-lg z-30"
        >
          <Menu size={20} />
        </button>
      )}
    </>
  );
}
