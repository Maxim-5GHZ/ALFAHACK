"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, TrendingUp, AlertCircle, ArrowRight, Gamepad2, CheckCircle, Bell, Send, ArrowLeft, Bot, User, MessageSquare, BarChart3, Megaphone, Calculator, Shield, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { getProjects, createProject, getPlan, getChatHistory, completePlanStep, sendMessage, updateProject, type Project, type BusinessPlan, type ChatMessage } from "@/lib/projects";
import { cn } from "@/lib/utils";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("id");

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [plan, setPlan] = useState<BusinessPlan | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [stepLoading, setStepLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"feed" | "threads" | "history">("feed");
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");

  const chatRef = useRef<HTMLDivElement>(null);
  const feedSectionRef = useRef<HTMLDivElement>(null);

  const handleSaveTitle = async (projectId: number) => {
    const trimmed = editTitleValue.trim();
    if (!trimmed) return;
    try {
      const updated = await updateProject(projectId, { title: trimmed });
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, title: updated.title } : p));
      setActiveProject(prev => prev && prev.id === projectId ? { ...prev, title: updated.title } : prev);
      setEditingTitle(false);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    getProjects()
      .then((data) => {
        setProjects(data);
        if (projectId) {
          const found = data.find(p => p.id === parseInt(projectId));
          if (found) {
            setActiveProject(found);
            loadProjectDetails(found.id);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  const loadProjectDetails = async (id: number) => {
    try {
      const pData = await getPlan(id);
      setPlan(pData);
      const stepsMap: Record<string, boolean> = {};
      pData.completed_steps_json?.forEach((step: string) => { stepsMap[step] = true; });
      setCompletedSteps(stepsMap);
      const mData = await getChatHistory(id);
      setMessages(mData);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, sending, stepLoading]);

  const handleCreate = () => {
    router.push(`/workspace`);
  };

  const toggleStep = async (stepText: string) => {
    if (!activeProject || stepLoading) return;
    const isNowCompleted = !completedSteps[stepText];

    setCompletedSteps(prev => ({ ...prev, [stepText]: isNowCompleted }));
    if (isNowCompleted) {
      setStepLoading(true);
      setActiveTab("feed");

      setTimeout(() => {
        if (window.innerWidth < 1024) {
          feedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 500);
    }

    try {
      const res = await completePlanStep(activeProject.id, stepText, isNowCompleted);
      if (res.ai_message) {
        setMessages(prev => [...prev, { ...res.ai_message!, thread_id: "dashboard_main" }]);
      }
    } catch (error) {
      setCompletedSteps(prev => ({ ...prev, [stepText]: !isNowCompleted }));
    } finally {
      setStepLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeProject) return;
    const text = input;
    setInput("");
    setSending(true);
    try {
      const reply = await sendMessage(activeProject.id, text);
      setMessages(prev => [...prev, { id: Date.now(), role: "user", content: text, created_at: new Date().toISOString(), thread_id: "workspace" }, reply]);
    } catch (e) {}
    finally { setSending(false); }
  };

  const handleSendThread = async () => {
    if (!input.trim() || !activeProject || !activeThread) return;
    const text = input;
    setInput("");
    setSending(true);
    try {
      const reply = await sendMessage(activeProject.id, text, activeThread);
      setMessages(prev => [...prev, { id: Date.now(), role: "user", content: text, created_at: new Date().toISOString(), thread_id: activeThread }, reply]);
    } catch (e) {}
    finally { setSending(false); }
  };

  if (loading) {
    return <div className="flex h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (projectId && activeProject) {
    const totalSteps = plan?.action_plan?.length || 0;
    const doneSteps = Object.keys(completedSteps).filter(k => completedSteps[k]).length;
    const progress = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

    let stageIcon = "🌱"; let bgColor = "bg-green-100"; let color = "text-accent-green"; let stageName = "Росток"; let fillColor = "bg-accent-green";
    if (progress >= 100) { stageIcon = "🦄"; bgColor = "bg-purple-100"; color = "text-purple-500"; stageName = "Единорог"; fillColor = "bg-purple-500"; }
    else if (progress >= 70) { stageIcon = "🚀"; bgColor = "bg-red-100"; color = "text-primary"; stageName = "Ракета"; fillColor = "bg-primary"; }
    else if (progress >= 30) { stageIcon = "🏪"; bgColor = "bg-blue-100"; color = "text-blue-500"; stageName = "Первые шаги"; fillColor = "bg-blue-500"; }

    return (
      <div className="mx-auto max-w-6xl px-3 md:px-4 py-4 md:py-6 min-h-[calc(100vh-4rem)] flex flex-col">
        <Link href="/dashboard" className="inline-flex w-fit items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors mb-4 bg-white py-1.5 px-3 rounded-full border border-gray-100 shadow-sm">
          <ArrowLeft size={14} /> Назад к списку бизнесов
        </Link>

        <div className="shrink-0 rounded-3xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm mb-4 md:mb-6 flex flex-col md:flex-row items-center gap-4 md:gap-6 relative overflow-hidden">
          <div className={cn("absolute right-0 top-0 h-64 w-64 -translate-y-20 translate-x-20 rounded-full opacity-20 blur-3xl", bgColor)} />

          <div className={cn("flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl text-6xl shadow-inner relative z-10", bgColor)}>
            {stageIcon}
          </div>

          <div className="flex-1 relative z-10 w-full text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-start gap-2 sm:gap-3 mb-2">
              <div className="flex items-center gap-2">
                {editingTitle ? (
                  <input
                    value={editTitleValue}
                    onChange={(e) => setEditTitleValue(e.target.value)}
                    onBlur={() => handleSaveTitle(activeProject.id)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } if (e.key === "Escape") setEditingTitle(false); }}
                    className="text-2xl font-bold text-text-primary bg-gray-50 border border-gray-300 rounded-lg px-2 py-1 w-64 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                ) : (
                  <h1
                    className="text-xl md:text-2xl font-bold text-text-primary cursor-pointer group/title"
                    onClick={() => { setEditTitleValue(activeProject.title); setEditingTitle(true); }}
                  >
                    {activeProject.title === "Новая идея" ? "Безымянный бизнес" : activeProject.title}
                    <span className="ml-2 inline-flex opacity-0 group-hover/title:opacity-100 transition-opacity text-gray-400 hover:text-primary" title="Редактировать название">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </span>
                  </h1>
                )}
                <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", bgColor, color)}>{stageName}</span>
              </div>
            </div>
            <p className="text-xs md:text-sm text-gray-500 mb-4">{plan?.niche || "Бизнес-план формируется..."}</p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-gray-500">Уровень прокачки бизнеса</span>
                  <span className={color}>{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className={cn("h-full transition-all duration-1000", fillColor)} style={{ width: `${progress}%` }} />
                </div>
              </div>
              <div className="flex gap-4 sm:pl-4 sm:border-l border-gray-100 pt-3 sm:pt-0 border-t sm:border-t-0">
                 <div>
                    <span className="block text-[10px] text-gray-400 font-medium">Потенциал выручки</span>
                    <span className="flex items-center gap-1 text-sm font-bold text-text-primary">
                      <TrendingUp size={14} className="text-accent-green" />
                      {plan ? (plan.monthly_revenue / 1000).toFixed(0) : 0}k ₽
                    </span>
                 </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col lg:flex-row gap-4 md:gap-6 min-h-0">
          <div className="w-full lg:flex-1 flex flex-col rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden h-[400px] lg:h-auto">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
               <Gamepad2 size={18} className="text-primary" />
               <h3 className="font-bold text-text-primary">Игровой чек-лист (План действий)</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!plan ? (
                 <div className="text-center py-10 text-sm text-gray-400">Сгенерируйте план в Бизнес-ассистенте</div>
              ) : (
                plan.action_plan.map((step, i) => {
                  const isDone = !!completedSteps[step];
                  return (
                    <div
                      key={i}
                      onClick={() => toggleStep(step)}
                      className={cn(
                        "group flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md",
                        isDone ? "border-accent-green/30 bg-accent-green/5" : "border-gray-200 bg-white"
                      )}
                    >
                      <div className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors", isDone ? "bg-accent-green border-accent-green text-white" : "border-gray-300 group-hover:border-primary")}>
                         {isDone && <CheckCircle size={14} />}
                      </div>
                      <span className={cn("text-sm leading-snug", isDone ? "line-through text-gray-400" : "text-text-primary font-medium")}>{step}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div ref={feedSectionRef} className="w-full lg:w-[450px] flex flex-col rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden shrink-0 h-[500px] lg:h-auto">

            <div className="flex border-b border-gray-100">
              <button
                onClick={() => { setActiveTab("feed"); setActiveThread(null); }}
                className={cn("flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors", activeTab === "feed" ? "border-primary text-primary bg-primary/5" : "border-transparent text-gray-500 hover:bg-gray-50")}
              >
                <Bell size={16} /> Лента событий
              </button>
              <button
                onClick={() => { setActiveTab("threads"); setActiveThread(null); }}
                className={cn("flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors", activeTab === "threads" ? "border-primary text-primary bg-primary/5" : "border-transparent text-gray-500 hover:bg-gray-50")}
              >
                <MessageSquare size={16} /> Консультации
              </button>
              <button
                onClick={() => { setActiveTab("history"); setActiveThread(null); }}
                className={cn("flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors", activeTab === "history" ? "border-primary text-primary bg-primary/5" : "border-transparent text-gray-500 hover:bg-gray-50")}
              >
                <Clock size={16} /> История
              </button>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/30">

              {activeTab === "feed" && (
                <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.filter(m => m.thread_id === "dashboard_main").length === 0 ? (
                    <div className="text-center py-10 opacity-60">
                      <Bell className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                      <p className="text-xs text-gray-500">Здесь будут появляться подсказки от ИИ при выполнении задач из чек-листа.</p>
                    </div>
                  ) : (
                    messages.filter(m => m.thread_id === "dashboard_main").map((msg, i) => (
                      <div key={i} className="flex gap-3 justify-start">
                        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 shadow-sm"><Bot size={16} /></div>
                        <div className="relative max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-sm bg-white border border-gray-100 text-text-primary">
                          <div className="prose prose-sm max-w-none text-sm text-text-primary leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                        </div>
                      </div>
                    ))
                  )}
                  {stepLoading && <div className="flex items-center gap-2 py-2 text-xs text-gray-400"><Loader2 size={12} className="animate-spin text-primary" /> Ассистент печатает...</div>}
                </div>
              )}

              {activeTab === "threads" && !activeThread && (
                <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Выберите специалиста</p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { key: "financier", label: "Финансист", desc: "Бюджет, окупаемость", icon: BarChart3, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200 hover:border-emerald-400" },
                      { key: "marketer", label: "Маркетолог", desc: "Продвижение, УТП", icon: Megaphone, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200 hover:border-orange-400" },
                      { key: "accountant", label: "Бухгалтер", desc: "Налоги, отчётность", icon: Calculator, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200 hover:border-blue-400" },
                      { key: "lawyer", label: "Юрист", desc: "Договоры, ИП", icon: Shield, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200 hover:border-purple-400" },
                    ].map((agent) => (
                      <button
                        key={agent.key}
                        onClick={() => setActiveThread(`thread_${agent.key}_${Date.now()}`)}
                        className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-dashed transition-all", agent.border, agent.bg)}
                      >
                        <agent.icon size={20} className={agent.color} />
                        <span className="text-xs font-bold text-text-primary">{agent.label}</span>
                        <span className="text-[9px] text-gray-400">{agent.desc}</span>
                      </button>
                    ))}
                  </div>

                  {Array.from(new Set(messages.filter(m => m.thread_id.startsWith("thread_")).map(m => m.thread_id))).length > 0 && (
                    <>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">История консультаций</p>
                      <div className="space-y-2">
                        {Array.from(new Set(messages.filter(m => m.thread_id.startsWith("thread_")).map(m => m.thread_id))).map(tId => {
                          const threadMsgs = messages.filter(m => m.thread_id === tId);
                          const firstMsg = threadMsgs[0]?.content || "Диалог";
                          const agentKey = tId.includes("financier") ? "Финансист" : tId.includes("marketer") ? "Маркетолог" : tId.includes("accountant") ? "Бухгалтер" : tId.includes("lawyer") ? "Юрист" : "Диалог";
                          return (
                            <div key={tId} onClick={() => setActiveThread(tId)} className="p-3 rounded-xl bg-white border border-gray-200 cursor-pointer hover:border-primary hover:shadow-sm transition-all">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[9px] font-bold uppercase text-primary bg-primary/5 px-1.5 py-0.5 rounded">{agentKey}</span>
                              </div>
                              <div className="text-xs font-bold text-text-primary line-clamp-1">{firstMsg}</div>
                              <div className="text-[10px] text-gray-400 mt-1">{threadMsgs.length} сообщений</div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === "history" && (
                <div className="flex-1 overflow-y-auto p-4">
                  {(() => {
                    const allThreads = Array.from(new Set(messages.map(m => m.thread_id))).filter(t => t !== "dashboard_main");
                    if (allThreads.length === 0) {
                      return (
                        <div className="text-center py-10 opacity-60">
                          <Clock className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                          <p className="text-xs text-gray-500">История консультаций пока пуста.</p>
                        </div>
                      );
                    }
                    const sorted = allThreads.sort((a, b) => {
                      const aLast = Math.max(...messages.filter(m => m.thread_id === a).map(m => new Date(m.created_at).getTime()));
                      const bLast = Math.max(...messages.filter(m => m.thread_id === b).map(m => new Date(m.created_at).getTime()));
                      return bLast - aLast;
                    });
                    return sorted.map(tId => {
                      const threadMsgs = messages.filter(m => m.thread_id === tId);
                      const lastMsg = threadMsgs[threadMsgs.length - 1];
                      const agentTag = tId.includes("financier") ? "Финансист" : tId.includes("marketer") ? "Маркетолог" : tId.includes("accountant") ? "Бухгалтер" : tId.includes("lawyer") ? "Юрист" : "Общий";
                      const agentColor = tId.includes("financier") ? "text-emerald-600 bg-emerald-50" : tId.includes("marketer") ? "text-orange-600 bg-orange-50" : tId.includes("accountant") ? "text-blue-600 bg-blue-50" : tId.includes("lawyer") ? "text-purple-600 bg-purple-50" : "text-gray-600 bg-gray-50";
                      return (
                        <div key={tId} onClick={() => { setActiveTab("threads"); setActiveThread(tId); }} className="p-3 rounded-xl bg-white border border-gray-200 cursor-pointer hover:border-primary hover:shadow-sm transition-all mb-2">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={cn("text-[9px] font-bold uppercase px-1.5 py-0.5 rounded", agentColor)}>{agentTag}</span>
                            <span className="text-[9px] text-gray-400">{new Date(lastMsg?.created_at || Date.now()).toLocaleString("ru", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <div className="text-xs font-bold text-text-primary line-clamp-2 prose prose-sm max-w-none [&_p]:mb-0 [&_p:last-child]:mb-0"><ReactMarkdown>{threadMsgs[0]?.content || "Чат"}</ReactMarkdown></div>
                          <div className="text-[10px] text-gray-400 mt-1">{threadMsgs.length} сообщений</div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {activeTab === "threads" && activeThread && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-2">
                    <button onClick={() => setActiveThread(null)} className="text-gray-400 hover:text-primary"><ArrowLeft size={16} /></button>
                    <span className="text-xs font-bold text-text-primary">
                      {activeThread?.includes("financier") ? "Финансист" : activeThread?.includes("marketer") ? "Маркетолог" : activeThread?.includes("accountant") ? "Бухгалтер" : activeThread?.includes("lawyer") ? "Юрист" : "Консультация"}
                    </span>
                  </div>

                  <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.filter(m => m.thread_id === activeThread).map((msg, i) => (
                      <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                        {msg.role === "ai" && <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600"><Bot size={16} /></div>}
                        <div className={cn("relative max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm", msg.role === "ai" ? "bg-white border border-gray-100" : "bg-primary text-white")}>
                            {msg.role === "ai" ? <div className="prose prose-sm max-w-none text-sm leading-relaxed"><ReactMarkdown>{msg.content}</ReactMarkdown></div> : msg.content}
                        </div>
                      </div>
                    ))}
                    {sending && <div className="flex items-center gap-2 py-2 text-xs text-gray-400"><Loader2 size={12} className="animate-spin text-primary" /> Печатает...</div>}
                  </div>

                  <div className="p-3 border-t border-gray-100 bg-white">
                    <form onSubmit={(e) => { e.preventDefault(); handleSendThread(); }} className="flex gap-2">
                      <input
                        value={input} onChange={(e) => setInput(e.target.value)}
                        placeholder="Задать вопрос ИИ..."
                        className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm outline-none focus:border-primary"
                      />
                      <Button type="submit" size="icon" disabled={!input.trim() || sending} className="bg-primary hover:bg-primary-dark rounded-xl shrink-0"><Send size={16} /></Button>
                    </form>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col items-center px-4 py-6 md:py-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-text-primary flex items-center justify-center gap-2">
          <Gamepad2 className="text-primary" />
          Мой бизнес
        </h1>
        <p className="mt-1 text-sm text-gray-500">Выбирайте проект для управления и прокачки</p>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 py-24 w-full max-w-2xl">
          <div className="text-6xl mb-4 opacity-50">🥚</div>
          <h3 className="text-lg font-bold text-text-primary">Инкубатор пуст</h3>
          <p className="text-sm text-gray-400 mt-1 max-w-xs text-center">Создайте первый проект, чтобы начать выращивать свой бизнес</p>
          <Button onClick={handleCreate} className="mt-6 bg-primary hover:bg-primary-dark shadow-md">Заложить идею</Button>
        </div>
      ) : (
        <div className="flex w-full flex-col sm:flex-row sm:flex-wrap justify-center gap-4 md:gap-6">
          {projects.map((p) => {
            const plan = p.business_plan;
            const totalSteps = plan?.action_plan?.length || 0;
            const doneSteps = plan?.completed_steps_json?.length || 0;
            const progress = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

            let stageIcon = "🥚"; let stageName = "Зародыш (Идея)"; let color = "text-gray-400"; let bgColor = "bg-gray-100"; let fillColor = "bg-gray-400";
            if (plan) {
              if (progress >= 100) { stageIcon = "🦄"; stageName = "Единорог"; color = "text-purple-500"; bgColor = "bg-purple-100"; fillColor = "bg-purple-500"; }
              else if (progress >= 70) { stageIcon = "🚀"; stageName = "Ракета"; color = "text-primary"; bgColor = "bg-red-100"; fillColor = "bg-primary"; }
              else if (progress >= 30) { stageIcon = "🏪"; stageName = "Первые шаги"; color = "text-blue-500"; bgColor = "bg-blue-100"; fillColor = "bg-blue-500"; }
              else { stageIcon = "🌱"; stageName = "Росток"; color = "text-accent-green"; bgColor = "bg-green-100"; fillColor = "bg-accent-green"; }
            }

            return (
              <div key={p.id} className="group relative flex w-full sm:max-w-sm flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                <div className={cn("absolute right-0 top-0 h-32 w-32 -translate-y-10 translate-x-10 rounded-full opacity-20 blur-3xl", bgColor)} />
                <div className="p-6 pb-5 flex-1 relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl text-4xl shadow-inner", bgColor)}>{stageIcon}</div>
                    {plan ? (
                      <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", bgColor, color)}>{stageName}</span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><AlertCircle size={12} /> Нужен план</span>
                    )}
                  </div>
                  <CardTitleInline
                    project={p}
                    onSave={async (id, title) => {
                      try {
                        const updated = await updateProject(id, { title });
                        setProjects(prev => prev.map(pr => pr.id === id ? { ...pr, title: updated.title } : pr));
                      } catch (e) { console.error(e); }
                    }}
                  />
                  <p className="text-xs text-gray-500 mb-6 h-8 line-clamp-2">{plan ? plan.niche : "Сгенерируйте план в Бизнес-Ассистенте"}</p>

                  {plan && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1.5">
                          <span className="text-gray-500">Уровень прокачки</span>
                          <span className={color}>{progress}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className={cn("h-full transition-all duration-1000", fillColor)} style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-4">
                        <div>
                          <span className="block text-[10px] text-gray-400 font-medium">Потенциал</span>
                          <span className="flex items-center gap-1 text-sm font-bold text-text-primary">
                            <TrendingUp size={14} className="text-accent-green" />{(plan.monthly_revenue / 1000).toFixed(0)}k ₽
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-gray-400 font-medium">Окупаемость</span>
                          <span className="text-sm font-bold text-text-primary">{plan.payback_months} мес.</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="border-t border-gray-50 bg-gray-50/50 p-3 relative z-10">
                  <Link href={plan ? `/dashboard?id=${p.id}` : `/workspace?id=${p.id}&openPlan=true`} className="block w-full">
                    <Button variant="outline" className="w-full justify-between bg-white text-xs font-bold border-gray-200 hover:border-primary hover:text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      {plan ? "Перейти к управлению бизнесом" : "Перейти к созданию плана"}
                      <ArrowRight size={14} />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CardTitleInline({ project, onSave }: { project: Project; onSave: (id: number, title: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(project.title);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === project.title) { setEditing(false); return; }
    await onSave(project.id, trimmed);
    setEditing(false);
  };

  const displayTitle = project.title === "Новая идея" ? "Безымянный проект" : project.title;

  if (editing) {
    return (
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setValue(project.title); setEditing(false); } }}
        className="text-lg font-bold text-text-primary bg-gray-50 border border-gray-300 rounded-lg px-2 py-1 w-full outline-none focus:border-primary focus:ring-1 focus:ring-primary mb-1"
        autoFocus
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <h3
      className="text-lg font-bold text-text-primary mb-1 line-clamp-1 cursor-pointer group/title"
      onClick={(e) => { e.stopPropagation(); setValue(project.title); setEditing(true); }}
    >
      {displayTitle}
      <span className="ml-1.5 inline-flex opacity-0 group-hover/title:opacity-100 transition-opacity text-gray-400 hover:text-primary" title="Редактировать название">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
      </span>
    </h3>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
