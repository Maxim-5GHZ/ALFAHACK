"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  MapPin,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getProjects,
  createProject,
  getChatHistory,
  sendMessage,
  generatePlan,
  updatePlan,
  getPlan,
  deleteProject,
  deleteChatMessage,
  getDraftReply,
  type Project,
  type ChatMessage,
  type BusinessPlan,
  type ExpenseItem,
} from "@/lib/projects";

export default function WorkspacePage() {
  const [queryId, setQueryId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [plan, setPlan] = useState<BusinessPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollChatToBottom = useCallback(() => {
    const el = chatContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollChatToBottom();
  }, [messages, localMessages, scrollChatToBottom]);

  useEffect(() => {
    if (!loadingMessages) {
      scrollChatToBottom();
    }
  }, [loadingMessages, scrollChatToBottom]);

  const selectedProject = projects.find((p) => p.id === selectedId) ?? null;

  const loadProjects = useCallback(async () => {
    try {
      const list = await getProjects();
      setProjects(list);
      if (list.length > 0) {
        if (queryId) {
          setSelectedId(parseInt(queryId));
          setStarted(true);
        } else if (!selectedId) {
          setSelectedId(list[0].id);
          setStarted(true);
        }
      }
    } catch {
    } finally {
      setLoadingProjects(false);
    }
  }, [selectedId, queryId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) setQueryId(id);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const fetchMessages = useCallback(async (projectId: number) => {
    setLoadingMessages(true);
    setMessages([]);
    setPlan(null);
    setPlanError(null);
    setCompletedSteps({});
    try {
      const msgs = await getChatHistory(projectId);
      setMessages(msgs);
    } catch {
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
      .then((data) => {
        setPlan(data);
        const stepsMap: Record<string, boolean> = {};
        data.completed_steps_json?.forEach((step: string) => {
          stepsMap[step] = true;
        });
        setCompletedSteps(stepsMap);
      })
      .catch(() => setPlan(null));
  }, [selectedId]);

  const handleNewProject = async () => {
    setSelectedId(null);
    setStarted(true);
    setLocalMessages([]);
    setMessages([]);
    setPlan(null);
    setCompletedSteps({});
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: number) => {
    e.stopPropagation();
    if (!confirm("Удалить проект? Все сообщения и план будут безвозвратно удалены.")) return;
    try {
      await deleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (selectedId === projectId) {
        setSelectedId(null);
        setStarted(false);
        setMessages([]);
        setPlan(null);
      }
    } catch {
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput("");
    setSending(true);

    if (!selectedId) {
      const userMsg: ChatMessage = { id: Date.now(), role: "user", content: text, created_at: new Date().toISOString(), thread_id: "workspace" };
      setLocalMessages((prev) => [...prev, userMsg]);
      try {
        const history = localMessages.map((m) => ({ role: m.role, content: m.content }));
        const res = await getDraftReply(history, text);
        const aiMsg: ChatMessage = { id: Date.now() + 1, role: "ai", content: res.reply, created_at: new Date().toISOString(), thread_id: "workspace" };
        setLocalMessages((prev) => [...prev, aiMsg]);
      } catch {}
      finally { setSending(false); }
      return;
    }

    try {
      const reply = await sendMessage(selectedId, text);
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "user", content: text, created_at: new Date().toISOString(), thread_id: "workspace" },
        reply,
      ]);
    } catch {
    } finally {
      setSending(false);
    }
  };

  const handleGeneratePlan = async () => {
    setGenerating(true);
    setPlanError(null);

    try {
      if (!selectedId) {
        const project = await createProject();
        for (const msg of localMessages) {
          if (msg.role === "user") {
            await sendMessage(project.id, msg.content);
          }
        }
        const msgs = await getChatHistory(project.id);
        setMessages(msgs);
        setLocalMessages([]);
        setSelectedId(project.id);
        setProjects((prev) => [project, ...prev]);
        const businessPlan = await generatePlan(project.id);
        setPlan(businessPlan);
      } else {
        const businessPlan = plan
          ? await updatePlan(selectedId)
          : await generatePlan(selectedId);
        setPlan(businessPlan);
      }
    } catch (e) {
      setPlanError(e instanceof Error ? e.message : "Ошибка генерации плана");
    } finally {
      setGenerating(false);
    }
  };

  const getProgressPercentage = () => {
    if (!plan || plan.action_plan.length === 0) return 0;
    const doneCount = plan.action_plan.filter((step) => plan.completed_steps_json?.includes(step)).length;
    return Math.round((doneCount / plan.action_plan.length) * 100);
  };

  const displayMessages = selectedId ? messages : localMessages;
  const userMessagesCount = displayMessages.filter((m) => m.role === "user").length;
  const showPlanButton = userMessagesCount >= 2 && !plan && !generating;
  const progressPercent = getProgressPercentage();

  if (loadingProjects) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] items-center justify-center md:h-[calc(100dvh-4rem)] bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4rem)] overflow-hidden bg-white">

      <aside
        className={cn(
          "shrink-0 border-r border-gray-200 bg-gray-50/50 flex flex-col transition-all duration-300",
          sidebarOpen ? "w-64" : "w-0 overflow-hidden border-r-0"
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-primary/70">
            <History size={14} className="text-primary" />
            Мои идеи
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-gray-200" onClick={handleNewProject}>
            <Plus size={15} />
          </Button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-2.5">
          {projects.map((project) => (
            <div key={project.id} className="group relative">
              <button
                onClick={() => { setSelectedId(project.id); setLocalMessages([]); }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs transition-all duration-150 active:scale-[0.98]",
                  selectedId === project.id
                    ? "bg-primary/5 text-primary font-semibold border-l-2 border-primary pl-2.5"
                    : "text-text-primary/70 hover:bg-gray-100 hover:text-text-primary",
                )}
              >
                <MessageSquare size={14} className="shrink-0 opacity-80" />
                <span className="flex-1 truncate">{project.title}</span>
              </button>
              <button
                onClick={(e) => handleDeleteProject(e, project.id)}
                className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center justify-center h-5 w-5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Удалить проект"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          ))}
        </nav>
      </aside>

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="hidden md:flex items-center justify-center w-5 bg-gray-50 border-r border-gray-200 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        title="Переключить историю"
      >
        <ChevronRight size={14} className={cn("transform transition-transform", sidebarOpen && "rotate-180")} />
      </button>

      <div className="flex flex-1 overflow-hidden">
        {!started ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 bg-white">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 shadow-sm">
              <Sparkles className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">Интерактивный навигатор</h2>
            <p className="mt-2 max-w-sm text-center text-sm text-gray-500 leading-relaxed">
              Мы разработали сервис, помогающий молодым предпринимателям преодолеть страх старта. Задайте вопрос или расскажите о своей задумке.
            </p>
            <Button size="lg" className="mt-8 px-8 bg-primary hover:bg-primary-dark" onClick={handleNewProject}>
              <Sparkles className="mr-2 h-4 w-4" />
              Создать первый проект
            </Button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col md:flex-row overflow-hidden">

            <div className="flex flex-1 flex-col bg-white overflow-hidden">

              <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : displayMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Bot size={36} className="mb-2 text-gray-300" />
                    <p className="text-xs text-gray-400">Напишите «Привет», чтобы запустить диалог</p>
                  </div>
                ) : (
                  displayMessages.map((msg, i) => (
                    <div
                      key={msg.id || i}
                      className={cn("group flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
                    >
                      {msg.role === "ai" && (
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 shadow-sm">
                          <Bot size={15} className="text-primary" />
                        </div>
                      )}
                      <div className="relative">
                        <div
                          className={cn(
                            "max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed transition-all shadow-sm",
                            msg.role === "ai"
                              ? "bg-gray-100 text-text-primary"
                              : "bg-primary text-white font-medium",
                          )}
                        >
                          {msg.role === "ai" ? (
                            <div className="prose prose-sm max-w-none text-xs text-text-primary leading-relaxed [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-3.5 [&_ol]:list-decimal [&_ol]:pl-3.5">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            msg.content
                          )}
                        </div>
                        <button
                          onClick={async () => {
                            if (!selectedId) return;
                            try {
                              await deleteChatMessage(selectedId, msg.id);
                              setMessages((prev) => prev.filter((m) => m.id !== msg.id));
                            } catch {}
                          }}
                          className="absolute -top-2 -right-2 hidden group-hover:flex items-center justify-center h-5 w-5 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 shadow-sm transition-colors"
                          title="Удалить сообщение"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                      </div>
                      {msg.role === "user" && (
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 shadow-sm">
                          <User size={15} className="text-primary" />
                        </div>
                      )}
                    </div>
                  ))
                )}

                {sending && (
                  <div className="flex items-center gap-2 py-2 text-xs text-gray-400 font-semibold">
                    <Loader2 size={12} className="animate-spin text-primary" />
                    Бизнес-консультант формирует ответ...
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 p-4 bg-white">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2.5"
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Напишите, что вас беспокоит (бюджет, налоги, партнеры)..."
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-xs outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!input.trim() || sending}
                    className="h-10 w-10 shrink-0 rounded-xl bg-primary hover:bg-primary-dark transition-transform active:scale-[0.96]"
                  >
                    <Send size={14} />
                  </Button>
                </form>
              </div>

            </div>

            <div className="w-full md:w-[420px] shrink-0 border-l border-gray-200 flex flex-col bg-gray-50/30 overflow-y-auto">
              <div className="border-b border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <FileText size={16} className="text-primary" />
                    Панель управления проектом
                  </h3>
                  {plan && (
                    <span className="rounded-full bg-accent-green/10 px-2.5 py-0.5 text-[11px] font-bold text-accent-green border border-accent-green/20">
                      План готов
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-5 flex-1">
                {plan ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-gray-150 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-text-primary/80 uppercase">Оценка рынка (Яндекс.Карты)</span>
                        <MapPin size={15} className="text-primary" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-extrabold text-text-primary">
                          {plan.competitors_count}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">конкурентов в городе</span>
                      </div>
                      {(() => {
                        const c = plan.competitors_count ?? 0;
                        let level: string, color: string, pct: number;
                        if (c <= 5) { level = "Очень низкая"; color = "bg-accent-green"; pct = 15; }
                        else if (c <= 15) { level = "Низкая"; color = "bg-green-400"; pct = 30; }
                        else if (c <= 40) { level = "Средняя"; color = "bg-yellow-400"; pct = 55; }
                        else if (c <= 80) { level = "Высокая"; color = "bg-orange-400"; pct = 75; }
                        else { level = "Очень высокая"; color = "bg-red-400"; pct = 95; }
                        return (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="text-gray-500">Плотность конкуренции</span>
                              <span className={cn("font-bold", c <= 15 ? "text-accent-green" : c <= 40 ? "text-yellow-600" : "text-red-500")}>{level}</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                              <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-primary/70 mb-3">Смета расходов</h4>
                      <div className="space-y-2">
                        {plan.expenses.map((item, i) => {
                          const pct = plan.monthly_expenses > 0 ? ((item.amount / plan.monthly_expenses) * 100) : 0;
                          return (
                            <div key={i}>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 truncate flex-1">{item.name}</span>
                                <span className="font-semibold text-text-primary ml-2">{item.amount.toLocaleString()} ₽</span>
                              </div>
                              <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100 mt-0.5">
                                <div className="h-full rounded-full bg-primary/40" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 text-xs font-bold">
                        <span className="text-text-primary">Итого расходов</span>
                        <span className="text-primary">{plan.monthly_expenses.toLocaleString()} ₽/мес</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-gray-200 bg-white p-3">
                        <span className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                          <TrendingUp size={12} className="text-accent-green" /> Выручка
                        </span>
                        <span className="text-sm font-extrabold text-accent-green block mt-0.5">
                          {plan.monthly_revenue.toLocaleString()} ₽
                        </span>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white p-3">
                        <span className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                          <Clock size={12} className="text-blue-500" /> Окупаемость
                        </span>
                        <span className="text-sm font-extrabold text-text-primary block mt-0.5">
                          ~ {plan.payback_months} мес.
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-primary/70">Чек-лист по запуску</h4>
                        <span className="text-xs font-bold text-primary">{progressPercent}%</span>
                      </div>
                      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full bg-accent-green transition-all duration-500 rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {plan.action_plan.map((step, i) => {
                          const isDone = plan.completed_steps_json?.includes(step);
                          return (
                            <div
                              key={i}
                              className={cn(
                                "flex items-start gap-2.5 rounded-lg border p-2.5 text-xs",
                                isDone
                                  ? "border-accent-green/20 bg-accent-green/5 text-gray-400"
                                  : "border-gray-100 bg-gray-50 text-text-primary",
                              )}
                            >
                              <div className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border", isDone ? "bg-accent-green border-accent-green text-white" : "border-gray-300 bg-white")}>
                                {isDone && <CheckCircle size={10} />}
                              </div>
                              <span className={cn(isDone && "line-through text-gray-400")}>{step}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleGeneratePlan}
                        disabled={generating}
                        className="flex-1 h-8 text-[11px] font-semibold bg-primary hover:bg-primary-dark"
                      >
                        {generating ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
                        Скорректировать план
                      </Button>
                      <Button className="h-8 text-[11px] font-semibold bg-accent-green hover:bg-accent-green/90 text-white">
                        Открыть ИП
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-4 bg-white rounded-2xl border border-gray-150">
                    <div className="bg-gray-100 p-3 rounded-full mb-3">
                      <Bot size={24} className="text-gray-400 animate-pulse" />
                    </div>
                    <p className="text-xs font-semibold text-text-primary">Бизнес-план пока не сгенерирован</p>
                    <p className="text-[11px] text-gray-400 mt-1 max-w-[240px] leading-relaxed">
                      Обсудите с ассистентом в чате вашу идею, бюджет и город, а затем сгенерируйте интерактивный план сметы и конкурентов.
                    </p>

                    {showPlanButton && (
                      <Button
                        onClick={handleGeneratePlan}
                        className="mt-6 w-full bg-primary hover:bg-primary-dark text-xs py-2.5 h-auto font-bold rounded-xl animate-bounce"
                      >
                        <FileText className="mr-2 h-3.5 w-3.5" />
                        Сгенерировать бизнес-план
                      </Button>
                    )}

                    {generating && (
                      <div className="mt-6 flex items-center gap-2 text-xs text-gray-400 font-semibold">
                        <Loader2 size={14} className="animate-spin text-primary" />
                        Идет расчет сметы по Авито и Яндекс.Картам...
                      </div>
                    )}
                    {planError && (
                      <div className="mt-4 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
                        {planError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
