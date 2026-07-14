"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, TrendingUp, AlertCircle, ArrowRight, Gamepad2, CheckCircle, Bell, Send, ArrowLeft, Bot, User, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { getProjects, createProject, getPlan, getChatHistory, completePlanStep, sendMessage, type Project, type BusinessPlan, type ChatMessage } from "@/lib/projects";
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
  const [activeTab, setActiveTab] = useState<"feed" | "threads">("feed");
  const [activeThread, setActiveThread] = useState<string | null>(null);

  const chatRef = useRef<HTMLDivElement>(null);

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

  const handleCreate = async () => {
    try {
      const p = await createProject();
      router.push(`/workspace?id=${p.id}`);
    } catch (e) {}
  };

  const toggleStep = async (stepText: string) => {
    if (!activeProject || stepLoading) return;
    const isNowCompleted = !completedSteps[stepText];

    setCompletedSteps(prev => ({ ...prev, [stepText]: isNowCompleted }));
    if (isNowCompleted) setStepLoading(true);

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
      <div className="mx-auto max-w-6xl px-4 py-6 h-[calc(100vh-4rem)] flex flex-col">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors mb-4">
          <ArrowLeft size={14} /> Назад к списку бизнесов
        </Link>

        <div className="shrink-0 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm mb-6 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
          <div className={cn("absolute right-0 top-0 h-64 w-64 -translate-y-20 translate-x-20 rounded-full opacity-20 blur-3xl", bgColor)} />

          <div className={cn("flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl text-6xl shadow-inner relative z-10", bgColor)}>
            {stageIcon}
          </div>

          <div className="flex-1 relative z-10 w-full text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
              <h1 className="text-2xl font-bold text-text-primary">{activeProject.title === "Новая идея" ? "Безымянный бизнес" : activeProject.title}</h1>
              <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", bgColor, color)}>{stageName}</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">{plan?.niche || "Бизнес-план формируется..."}</p>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-gray-500">Уровень прокачки бизнеса</span>
                  <span className={color}>{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className={cn("h-full transition-all duration-1000", fillColor)} style={{ width: `${progress}%` }} />
                </div>
              </div>
              <div className="hidden md:flex gap-4 pl-4 border-l border-gray-100">
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

        <div className="flex flex-1 gap-6 min-h-0 flex-col md:flex-row">
          <div className="flex-1 flex flex-col rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
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

          <div className="w-full md:w-[450px] flex flex-col rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden shrink-0">

            <div className="flex border-b border-gray-100">
              <button
                onClick={() => { setActiveTab("feed"); setActiveThread(null); }}
                className={cn("flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors", activeTab === "feed" ? "border-primary text-primary bg-primary/5" : "border-transparent text-gray-500 hover:bg-gray-50")}
              >
                <Bell size={16} /> Лента событий
              </button>
              <button
                onClick={() => setActiveTab("threads")}
                className={cn("flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors", activeTab === "threads" ? "border-primary text-primary bg-primary/5" : "border-transparent text-gray-500 hover:bg-gray-50")}
              >
                <MessageSquare size={16} /> Консультации
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
                  <Button
                    onClick={() => setActiveThread(`thread_${Date.now()}`)}
                    className="w-full bg-white border-2 border-dashed border-gray-200 text-primary hover:border-primary hover:bg-primary/5 mb-4 shadow-none"
                  >
                    + Задать новый вопрос
                  </Button>

                  <div className="space-y-2">
                    {Array.from(new Set(messages.filter(m => m.thread_id.startsWith("thread_")).map(m => m.thread_id))).map(tId => {
                      const threadMsgs = messages.filter(m => m.thread_id === tId);
                      const firstMsg = threadMsgs[0]?.content || "Диалог";
                      return (
                        <div key={tId} onClick={() => setActiveThread(tId)} className="p-3 rounded-xl bg-white border border-gray-200 cursor-pointer hover:border-primary hover:shadow-sm transition-all">
                          <div className="text-xs font-bold text-text-primary line-clamp-1">{firstMsg}</div>
                          <div className="text-[10px] text-gray-400 mt-1">{threadMsgs.length} сообщений</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === "threads" && activeThread && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-2">
                    <button onClick={() => setActiveThread(null)} className="text-gray-400 hover:text-primary"><ArrowLeft size={16} /></button>
                    <span className="text-xs font-bold text-text-primary">Консультация</span>
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
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col items-center px-4 py-8">
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
        <div className="flex w-full flex-wrap justify-center gap-6">
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
              <div key={p.id} className="group relative flex w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
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
                  <h3 className="text-lg font-bold text-text-primary mb-1 line-clamp-1">{p.title === "Новая идея" ? "Безымянный проект" : p.title}</h3>
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
                  <Link href={plan ? `/dashboard?id=${p.id}` : `/workspace?id=${p.id}`} className="block w-full">
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

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
