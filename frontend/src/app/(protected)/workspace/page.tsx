"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MessageSquare,
  Plus,
  Sparkles,
  Send,
  Bot,
  User,
  History,
  Loader2,
  FileText,
  Banknote,
  TrendingUp,
  Clock,
  Target,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getProjects,
  createProject,
  getChatHistory,
  sendMessage,
  generatePlan,
  getPlan,
  type Project,
  type ChatMessage,
  type BusinessPlan,
  type ExpenseItem,
} from "@/lib/projects";

export default function WorkspacePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [plan, setPlan] = useState<BusinessPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [started, setStarted] = useState(false);

  const selectedProject = projects.find((p) => p.id === selectedId) ?? null;

  const loadProjects = useCallback(async () => {
    try {
      const list = await getProjects();
      setProjects(list);
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
        setStarted(true);
      }
    } catch {
      // not authenticated
    } finally {
      setLoadingProjects(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const fetchMessages = useCallback(async (projectId: number) => {
    setLoadingMessages(true);
    setMessages([]);
    setPlan(null);
    try {
      const msgs = await getChatHistory(projectId);
      setMessages(msgs);
    } catch {
      // ignore
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId);
    }
  }, [selectedId, fetchMessages]);

  useEffect(() => {
    if (!selectedId) return;
    getPlan(selectedId)
      .then(setPlan)
      .catch(() => setPlan(null));
  }, [selectedId]);

  const handleNewProject = async () => {
    try {
      const project = await createProject();
      setProjects((prev) => [project, ...prev]);
      setSelectedId(project.id);
      setStarted(true);
      setMessages([]);
      setPlan(null);
    } catch {
      // ignore
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedId) return;
    const text = input;
    setInput("");
    setSending(true);
    try {
      const reply = await sendMessage(selectedId, text);
      setMessages((prev) => [
        ...prev,
        { id: 0, role: "user", content: text, created_at: new Date().toISOString() },
        reply,
      ]);
      setProjects((prev) =>
        prev.map((p) => (p.id === selectedId ? { ...p, title: p.title === "Новая идея" ? text.slice(0, 50) : p.title } : p)),
      );
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!selectedId) return;
    setGenerating(true);
    try {
      const businessPlan = await generatePlan(selectedId);
      setPlan(businessPlan);
    } catch {
      // ignore
    } finally {
      setGenerating(false);
    }
  };

  const showPlanButton = messages.length >= 4 && !plan && !generating;

  if (loadingProjects) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] items-center justify-center md:h-[calc(100dvh-4rem)]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4rem)]">
      {/* Sidebar: Idea History */}
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-gray-50/50 md:flex md:flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <History size={16} className="text-primary" />
            История идей
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNewProject}>
            <Plus size={15} />
          </Button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedId(project.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                selectedId === project.id
                  ? "bg-primary/10 text-primary"
                  : "text-text-primary/70 hover:bg-gray-100 hover:text-text-primary",
              )}
            >
              <MessageSquare size={15} className="shrink-0" />
              <span className="flex-1 truncate">{project.title}</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-3">
          <p className="text-xs text-gray-400">
            Нажмите + чтобы начать новую идею
          </p>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {!started ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">
              Цифровой консультант
            </h2>
            <p className="mt-2 max-w-sm text-center text-sm text-gray-400">
              ИИ поможет выбрать нишу, рассчитать бюджет и составить план
              действий для вашего бизнеса
            </p>
            <Button size="lg" className="mt-8" onClick={handleNewProject}>
              <Sparkles className="mr-2 h-4 w-4" />
              Начать
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile: idea history toggle */}
            <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-2 md:hidden">
              <History size={15} className="text-primary" />
              <span className="text-xs font-medium text-text-primary">
                История идей
              </span>
              <div className="flex gap-1 overflow-x-auto">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedId(project.id)}
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs transition-colors",
                      selectedId === project.id
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                    )}
                  >
                    {project.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                  <Bot size={40} className="mb-3 text-gray-300" />
                  <p className="text-sm text-gray-400">
                    Напишите свою бизнес-идею, и я помогу её проработать
                  </p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={msg.id || i}
                    className={cn(
                      "flex gap-3",
                      msg.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    {msg.role === "ai" && (
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Bot size={16} className="text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                        msg.role === "ai"
                          ? "bg-gray-100 text-text-primary"
                          : "bg-primary text-white",
                      )}
                    >
                      {msg.content}
                    </div>
                    {msg.role === "user" && (
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <User size={16} className="text-primary" />
                      </div>
                    )}
                  </div>
                ))
              )}

              {sending && (
                <div className="flex items-center gap-2 py-2 text-sm text-gray-400">
                  <Loader2 size={14} className="animate-spin" />
                  ИИ-консультант печатает...
                </div>
              )}

              {showPlanButton && (
                <div className="flex justify-center pt-2">
                  <Button
                    onClick={handleGeneratePlan}
                    className="bg-primary text-white hover:bg-primary-dark"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Сгенерировать бизнес-план
                  </Button>
                </div>
              )}

              {generating && (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-400">
                  <Loader2 size={14} className="animate-spin" />
                  Генерируем бизнес-план...
                </div>
              )}

              {plan && (
                <div className="space-y-4 py-4">
                  <h3 className="text-lg font-bold text-text-primary">
                    {plan.niche}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {plan.summary}
                  </p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <TrendingUp size={16} />
                        Ежемесячная выручка
                      </div>
                      <p className="mt-1 text-xl font-bold text-accent-green">
                        {plan.monthly_revenue.toLocaleString()} ₽
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Banknote size={16} />
                        Ежемесячные расходы
                      </div>
                      <p className="mt-1 text-xl font-bold text-primary">
                        {plan.monthly_expenses.toLocaleString()} ₽
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Clock size={16} />
                        Срок окупаемости
                      </div>
                      <p className="mt-1 text-xl font-bold text-text-primary">
                        {plan.payback_months} мес.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-text-primary">
                      Смета расходов
                    </h4>
                    <div className="space-y-1">
                      {plan.expenses.map((item: ExpenseItem, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
                        >
                          <span className="text-gray-600">{item.name}</span>
                          <span className="font-medium text-text-primary">
                            {item.amount.toLocaleString()} ₽
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-text-primary">
                      План действий
                    </h4>
                    <div className="space-y-2">
                      {plan.action_plan.map((step: string, i: number) => (
                        <div key={i} className="flex gap-2 text-sm">
                          <CheckCircle
                            size={16}
                            className="mt-0.5 shrink-0 text-accent-green"
                          />
                          <span className="text-gray-600">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA Block */}
                  <div className="mt-6 rounded-xl bg-primary/5 p-6 text-center">
                    <Target size={32} className="mx-auto mb-3 text-primary" />
                    <h3 className="text-lg font-bold text-text-primary">
                      Воплоти идею с Альфа-Банком
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Мы поможем на каждом этапе — от открытия ИП до
                      подключения эквайринга
                    </p>
                    <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
                      <Button className="bg-primary text-white hover:bg-primary-dark">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Бесплатно открыть ИП
                      </Button>
                      <Button
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary/5"
                      >
                        Подключить эквайринг
                      </Button>
                    </div>
                    {plan.alfa_products.length > 0 && (
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {plan.alfa_products.map((product: string, i: number) => (
                          <span
                            key={i}
                            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-primary shadow-sm"
                          >
                            {product}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 px-4 py-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Напишите сообщение..."
                  className="flex-1 rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || sending}
                  className="h-10 w-10 shrink-0 rounded-xl"
                >
                  <Send size={16} />
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
