"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Save, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiGet, apiPatch } from "@/lib/api";

type UserInfo = { id: number; email: string; username: string };

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/login");
    apiGet<UserInfo>("/api/v1/auth/me", token)
      .then((u) => {
        setUser(u);
        setUsername(u.username);
      })
      .catch(() => {
        localStorage.removeItem("token");
        router.push("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const body: Record<string, string> = {};
      if (username !== user?.username) body.username = username;
      if (password) body.password = password;
      if (Object.keys(body).length === 0) return;
      const updated = await apiPatch<UserInfo>("/api/v1/auth/me", body, token);
      setUser(updated);
      setPassword("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Назад
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
          {user?.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">Профиль</h1>
          <p className="text-xs text-gray-400 mt-0.5">Управление данными аккаунта</p>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-text-primary/70 mb-1.5">
            <Mail size={13} className="text-primary" />
            Email
          </label>
          <input
            value={user?.email ?? ""}
            disabled
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs text-gray-400 outline-none"
          />
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-text-primary/70 mb-1.5">
            <User size={13} className="text-primary" />
            Имя пользователя
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-text-primary/70 mb-1.5">
            <Lock size={13} className="text-primary" />
            Новый пароль
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Оставьте пустым, чтобы не менять"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </div>

        {error && (
          <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary-dark text-xs font-semibold h-9"
          >
            {saving ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <Save size={13} className="mr-1.5" />}
            Сохранить
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-xs text-accent-green font-medium">
              <CheckCircle size={13} />
              Сохранено
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
