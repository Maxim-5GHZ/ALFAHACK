"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, LogIn, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiPost, apiGet } from "@/lib/api";

const loginSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Минимум 6 символов"),
});

const registerSchema = z.object({
  email: z.string().email("Введите корректный email"),
  username: z.string().min(2, "Минимум 2 символа"),
  password: z.string().min(6, "Минимум 6 символов"),
});

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [schema, setSchema] = useState(loginSchema);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<z.infer<typeof loginSchema | typeof registerSchema>>({
    resolver: zodResolver(schema),
  });

  const switchMode = (m: Mode) => {
    setMode(m);
    setSchema(m === "login" ? loginSchema : registerSchema);
    setError("");
    reset();
  };

  const onSubmit = async (data: z.infer<typeof loginSchema | typeof registerSchema>) => {
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/register";
      const body = mode === "login"
        ? { email: data.email, password: data.password }
        : { email: data.email, username: (data as z.infer<typeof registerSchema>).username, password: data.password };

      const res = await apiPost<{ access_token: string }>(endpoint, body);
      localStorage.setItem("token", res.access_token);

      try {
        const projects = await apiGet<any[]>("/api/v1/projects", res.access_token);
        if (projects.length > 0) {
          window.location.href = "/dashboard";
        } else {
          window.location.href = "/workspace";
        }
      } catch (err) {
        window.location.href = "/workspace";
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-text-primary">Альфа.Старт</h1>
          <p className="mt-1 text-sm text-gray-500">
            {mode === "login" ? "Войдите в аккаунт" : "Создайте аккаунт"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === "login"
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LogIn size={16} />
              Вход
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === "register"
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <UserPlus size={16} />
              Регистрация
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Email
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {mode === "register" && (
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  Имя
                </label>
                <Input
                  type="text"
                  placeholder="Иван Иванов"
                  {...register("username")}
                />
                {"username" in errors && errors.username && (
                  <p className="mt-1 text-xs text-red-500">
                    {(errors.username as { message?: string }).message}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Пароль
              </label>
              <Input
                type="password"
                showToggle
                placeholder="••••••••"
                {...register("password")}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : mode === "login" ? (
                <LogIn className="mr-2 h-4 w-4" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              {mode === "login" ? "Войти" : "Зарегистрироваться"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
