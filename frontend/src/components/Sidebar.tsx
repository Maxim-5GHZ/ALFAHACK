"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  User,
  ChevronRight,
} from "lucide-react";

import { apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";

type UserInfo = { id: number; email: string; username: string };

const navItems = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/workspace", label: "Цифровой консультант", icon: LayoutDashboard },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    apiGet<UserInfo>("/api/v1/auth/me", token)
      .then(setUser)
      .catch(() => localStorage.removeItem("token"));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const sidebar = (
    <aside
      className={cn(
        "flex h-full flex-col bg-card border-r border-gray-200 transition-all duration-200",
        open ? "w-60" : "w-14",
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-gray-200 px-3 md:h-16">
        {open && (
          <span className="text-sm font-semibold text-text-primary">Меню</span>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-text-primary"
          aria-label={open ? "Свернуть" : "Развернуть"}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-text-primary/60 hover:bg-gray-200 hover:text-text-primary",
              )}
              title={!open ? item.label : undefined}
            >
              <item.icon size={18} className="shrink-0" />
              {open && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-2">
        {user && open && (
          <div className="mb-2 flex items-center gap-2 px-3 py-2 text-sm text-text-primary/60">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              {user.username.charAt(0).toUpperCase()}
            </span>
            <span className="truncate">{user.username}</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-primary/60 transition-colors hover:bg-gray-200 hover:text-text-primary"
          title={!open ? "Выйти" : undefined}
        >
          <LogOut size={18} className="shrink-0" />
          {open && <span>Выйти</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden md:flex">{sidebar}</div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <div className={cn("fixed left-0 top-14 z-50 md:hidden", open ? "block" : "hidden")}>
        <div className="h-[calc(100dvh-3.5rem)]">{sidebar}</div>
      </div>
    </>
  );
}
