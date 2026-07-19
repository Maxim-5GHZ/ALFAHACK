"use client";

import { useEffect, useState, useRef } from "react";
import {
  MessageSquare, Plus, Sparkles, Send, Bot, User, History, 
  Loader2, FileText, TrendingUp, Clock, CheckCircle, MapPin, X, Trash2
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getProjects, getChatHistory, sendMessage, generatePlan,
  updatePlan, getPlan, deleteProject, getDraftReply, createProjectFromDraft,
  type Project, type ChatMessage, type BusinessPlan
} from "@/lib/projects";

export default function WorkspacePage() {
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [plan, setPlan] = useState<BusinessPlan | null>(null);
  
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [started, setStarted] = useState(false);
  
  const skipFetchRef = useRef(false);
  
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [mobilePlanOpen, setMobilePlanOpen] = useState(false);

  const selectedProject = projects.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get("id");
    const shouldOpenPlan = params.get("openPlan") === "true";

    getProjects().then((list) => {
      setProjects(list);
      if (list.length > 0) {
        const targetId = idFromUrl ? parseInt(idFromUrl) : list[0].id;
        setSelectedId(targetId);
        setStarted(true);
        if (shouldOpenPlan) setMobilePlanOpen(true);
      } else {
        setStarted(false);
      }
      setLoadingProjects(false);
    }).catch(() => setLoadingProjects(false));
  }, [mounted]);

  useEffect(() => {
    if (!selectedId || !mounted) return;
    
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return;
    }

    setLoadingMessages(true);
    setPlan(null);

    Promise.all([
      getChatHistory(selectedId).catch(() => []),
      getPlan(selectedId).catch(() => null)
    ]).then(([msgs, planData]) => {
      setMessages(msgs);
      setPlan(planData);
      setLoadingMessages(false);
    });
  }, [selectedId, mounted]);

  const handleNewProject = () => {
    setSelectedId(null);
    setStarted(true);
    setLocalMessages([]);
    setMessages([]);
    setPlan(null);
    setMobileHistoryOpen(false);
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!confirm("Удалить проект? Все данные будут удалены.")) return;
    try {
      await deleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (selectedId === projectId) {
        setSelectedId(null);
        setStarted(false);
      }
    } catch (e) { console.error(e); }
  };

  const handleUpgradeToProject = async (title: string, fullHistory: {role: string, content: string}[]) => {
    setSending(true);
    try {
      const newProject = await createProjectFromDraft(title, fullHistory);
      
      skipFetchRef.current = true;
      
      setMessages(localMessages);
      
      setProjects(prev => [newProject, ...prev]);
      setSelectedId(newProject.id);
      
      setMobilePlanOpen(true);
      setGenerating(true);
      
      const newPlan = await generatePlan(newProject.id);
      setPlan(newPlan);
    } catch (e) {
      console.error("Upgrade failed", e);
      alert("Не удалось создать проект. Попробуйте еще раз.");
    } finally {
      setGenerating(false);
      setSending(false);
    }
  };

  if (!mounted || loadingProjects) {
    return <div className="flex h-[calc(100dvh-4rem)] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] w-full overflow-hidden bg-white relative">
      
      <SidebarLeft 
        projects={projects}
        selectedId={selectedId}
        onSelect={(id: number) => { setSelectedId(id); setStarted(true); setMobileHistoryOpen(false); }}
        onNew={handleNewProject}
        onDelete={handleDeleteProject}
        isOpen={mobileHistoryOpen}
        setIsOpen={setMobileHistoryOpen}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full relative z-10 bg-white">
        {started && (
          <div className="md:hidden flex items-center justify-between px-3 py-3 border-b border-gray-100 bg-white/95 backdrop-blur z-20 shadow-sm shrink-0">
            <button onClick={() => setMobileHistoryOpen(true)} className="flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full active:bg-gray-200">
              <History size={14} className="text-primary"/> Идеи
            </button>
            <span className="text-xs font-extrabold text-text-primary truncate px-2">{selectedProject?.title || "Скрининг ИИ"}</span>
            <button onClick={() => setMobilePlanOpen(true)} className="flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full active:bg-gray-200">
               План <FileText size={14} className="text-accent-green"/>
            </button>
          </div>
        )}

        {!started ? (
          <EmptyState onStart={handleNewProject} />
        ) : (
          <ChatArea 
            selectedId={selectedId}
            messages={selectedId ? messages : localMessages}
            setMessages={selectedId ? setMessages : setLocalMessages}
            sending={sending}
            setSending={setSending}
            loadingMessages={loadingMessages}
            plan={plan}
            onOpenPlan={() => setMobilePlanOpen(true)}
            onUpgradeToProject={handleUpgradeToProject}
          />
        )}
      </div>

      {started && (
        <SidebarRight 
          plan={plan}
          selectedId={selectedId}
          setPlan={setPlan}
          generating={generating}
          setGenerating={setGenerating}
          isOpen={mobilePlanOpen}
          setIsOpen={setMobilePlanOpen}
        />
      )}
    </div>
  );
}

function SidebarLeft({ projects, selectedId, onSelect, onNew, onDelete, isOpen, setIsOpen }: any) {
  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setIsOpen(false)} />}
      <aside className={cn(
        "fixed md:relative inset-y-0 left-0 z-50 flex flex-col w-[80%] max-w-[300px] md:w-64 bg-gray-50/50 border-r border-gray-200 transition-transform duration-300 md:translate-x-0 shrink-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3.5 bg-white md:bg-transparent shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-primary/70">
            <History size={14} className="text-primary" /> Мои идеи
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={onNew}><Plus size={15} /></Button>
            <button className="md:hidden p-1 text-gray-500" onClick={() => setIsOpen(false)}><X size={18} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {projects.map((project: any) => (
            <div key={project.id} className="group relative flex items-center">
              <button
                onClick={() => onSelect(project.id)}
                className={cn(
                  "flex-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs transition-all",
                  selectedId === project.id ? "bg-primary/5 text-primary font-semibold border-l-2 border-primary pl-2.5" : "text-text-primary/70 hover:bg-white hover:shadow-sm"
                )}
              >
                <MessageSquare size={14} className="shrink-0" />
                <span className="truncate w-full">{project.title}</span>
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(project.id); }} className="absolute right-2 opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-opacity">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}

function ChatArea({ selectedId, messages, setMessages, sending, setSending, loadingMessages, plan, onOpenPlan, onUpgradeToProject }: any) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    try {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "auto" });
      }
    } catch (err) {
      console.warn("Scroll failed", err);
    }
  };
  useEffect(() => { scrollToBottom(); }, [messages, sending]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    try {
      if (!selectedId) {
        const userMsg = { id: Date.now(), role: "user", content: text, thread_id: "workspace" };
        setMessages((prev: any) => [...prev, userMsg]);
        
        const history = [...messages, userMsg].map((m: any) => ({ role: m.role, content: m.content }));
        const res = await getDraftReply(history, text);
        let replyText = res.reply;
        
        const planReadyMatch = replyText.match(/\[PLAN_READY:\s*(.*?)\]/i);
        
        if (planReadyMatch) {
          const title = planReadyMatch[1].trim();
          replyText = replyText.replace(planReadyMatch[0], "").trim();
          
          const aiMsg = { id: Date.now() + 1, role: "ai", content: replyText, thread_id: "workspace" };
          setMessages((prev: any) => [...prev, aiMsg]);
          
          onUpgradeToProject(title, [...history, { role: "ai", content: replyText }]);
        } else {
          setMessages((prev: any) => [...prev, { id: Date.now() + 1, role: "ai", content: replyText, thread_id: "workspace" }]);
        }
      } else {
        setMessages((prev: any) => [...prev, { id: Date.now(), role: "user", content: text }]);
        const reply = await sendMessage(selectedId, text);
        setMessages((prev: any) => [...prev, reply]);
      }
    } catch (e) { console.error(e); } 
    finally { setSending(false); }
  };

  const userMsgCount = messages.filter((m: any) => m.role === "user").length;

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
        {loadingMessages ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center h-full">
            <Bot size={40} className="text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">Опишите вашу идею, бюджет или город.<br/>Ассистент будет задавать вопросы, чтобы составить план.</p>
          </div>
        ) : (
          <div className="space-y-6 max-w-3xl mx-auto pb-4">
            {messages && messages.map((msg: any, i: number) => (
              <div key={msg.id || i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "ai" && <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10"><Bot size={16} className="text-primary"/></div>}
                <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm", msg.role === "ai" ? "bg-gray-50 text-text-primary border border-gray-100" : "bg-primary text-white font-medium")}>
                  {msg.role === "ai" ? (
                    <div className="prose prose-sm leading-relaxed [&_ul]:pl-4 [&_ol]:pl-4 [&_p]:mb-2 [&_p:last-child]:mb-0"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                  ) : msg.content}
                </div>
                {msg.role === "user" && <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10"><User size={16} className="text-primary"/></div>}
              </div>
            ))}
            
            {selectedId && userMsgCount >= 1 && !plan && !loadingMessages && (
              <div className="flex flex-col items-center justify-center p-6 mt-6 mb-4 bg-white rounded-2xl border border-gray-200 shadow-sm mx-auto w-full max-w-sm">
                <div className="bg-primary/10 p-3 rounded-full mb-3"><Sparkles className="text-primary h-6 w-6 animate-pulse"/></div>
                <p className="text-sm font-bold text-text-primary mb-1">Идея сформирована?</p>
                <p className="text-xs text-gray-500 mb-4 text-center">ИИ готов рассчитать смету и конкурентов.</p>
                <Button onClick={onOpenPlan} className="w-full bg-primary hover:bg-primary-dark shadow-md">
                  <FileText className="mr-2 h-4 w-4" /> Открыть панель бизнес-плана
                </Button>
              </div>
            )}



            {sending && <div className="flex items-center gap-2 text-xs text-gray-400 font-medium pl-11"><Loader2 size={14} className="animate-spin text-primary" /> Ассистент анализирует...</div>}
            <div ref={messagesEndRef} className="h-1" />
          </div>
        )}
      </div>

      <div className="shrink-0 p-3 md:p-4 bg-white border-t border-gray-100">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 max-w-3xl mx-auto relative">
          <input
            value={input} onChange={(e) => setInput(e.target.value)} placeholder="Напишите ответ..."
            className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-3.5 text-sm outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || sending} className="absolute right-1.5 top-1.5 h-9 w-9 rounded-xl bg-primary hover:bg-primary-dark">
            <Send size={16} />
          </Button>
        </form>
      </div>
    </div>
  );
}

function SidebarRight({ plan, selectedId, setPlan, generating, setGenerating, isOpen, setIsOpen }: any) {
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const newPlan = plan ? await updatePlan(selectedId) : await generatePlan(selectedId);
      setPlan(newPlan);
    } catch (e) { alert("Необходим контекст диалога!"); } 
    finally { setGenerating(false); }
  };

  const progressPercent = Math.round(((plan?.action_plan?.filter((s: string) => plan.completed_steps_json?.includes(s)).length || 0) / (plan?.action_plan?.length || 1)) * 100);

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setIsOpen(false)} />}
      <aside className={cn(
        "fixed md:relative inset-y-0 right-0 z-50 flex flex-col w-[85%] sm:w-[380px] md:w-[380px] bg-gray-50/30 border-l border-gray-200 transition-transform duration-300 md:translate-x-0 shrink-0",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3.5 bg-white shrink-0">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2"><FileText size={16} className="text-primary" /> Бизнес-план</h3>
          <button className="md:hidden p-1 text-gray-500" onClick={() => setIsOpen(false)}><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!plan ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <div className="bg-gray-100 p-4 rounded-full mb-4"><FileText size={24} className="text-gray-400" /></div>
              <p className="text-sm font-semibold text-text-primary mb-2">План не рассчитан</p>
              <p className="text-xs text-gray-500 mb-6 max-w-[200px]">Обсудите детали в чате, чтобы ИИ мог составить смету.</p>
              <Button onClick={handleGenerate} disabled={generating || !selectedId} className="w-full bg-primary hover:bg-primary-dark shadow-sm">
                {generating ? <Loader2 size={16} className="animate-spin mr-2" /> : <Sparkles size={16} className="mr-2" />} Сгенерировать план
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pb-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                  <span className="text-[10px] text-gray-500 font-medium flex items-center gap-1 mb-1"><TrendingUp size={12} className="text-accent-green" /> Выручка</span>
                  <span className="text-sm font-extrabold text-accent-green">{(plan.monthly_revenue || 0).toLocaleString()} ₽</span>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                  <span className="text-[10px] text-gray-500 font-medium flex items-center gap-1 mb-1"><Clock size={12} className="text-blue-500" /> Окупаемость</span>
                  <span className="text-sm font-extrabold text-text-primary">~ {plan.payback_months || 0} мес.</span>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Конкуренты рядом</span><MapPin size={14} className="text-primary" /></div>
                <div className="text-2xl font-black text-text-primary mb-1">{plan.competitors_count || 0}</div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-yellow-400 rounded-full" style={{ width: `${Math.min((plan.competitors_count || 0) * 2, 100)}%` }} /></div>
              </div>

              {plan.expenses && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Смета расходов</h4>
                  <div className="space-y-2.5">
                    {plan.expenses.map((ex: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-xs"><span className="text-gray-600 truncate mr-2">{ex.name}</span><span className="font-bold text-text-primary whitespace-nowrap">{(ex.amount || 0).toLocaleString()} ₽</span></div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between font-bold text-sm"><span>Итого</span><span className="text-primary">{(plan.monthly_expenses || 0).toLocaleString()} ₽</span></div>
                </div>
              )}

              {plan.action_plan && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-3"><h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">План запуска</h4><span className="text-xs font-bold text-accent-green">{progressPercent}%</span></div>
                  <div className="space-y-2">
                    {plan.action_plan.map((step: string, i: number) => {
                    const isDone = plan.completed_steps_json?.includes(step);
                    return (
                      <div key={i} className={cn("flex items-start gap-2.5 p-2 rounded-lg border text-xs", isDone ? "bg-accent-green/5 border-accent-green/20 text-gray-400" : "bg-gray-50 border-gray-100 text-text-primary font-medium")}>
                         <div className={cn("mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0", isDone ? "bg-accent-green border-accent-green text-white" : "bg-white border-gray-300")}>{isDone && <CheckCircle size={10} />}</div>
                         <span className={cn(isDone && "line-through")}>{step}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              )}

              <div className="space-y-2 mt-4 pt-3 border-t border-gray-100">
                <Link href={`/dashboard?id=${selectedId}`} className="block w-full">
                  <Button className="w-full bg-primary hover:bg-primary-dark shadow-md text-white font-bold h-11 text-xs">
                    Управлять бизнесом (Кабинет) 🚀
                  </Button>
                </Link>
                <Button 
                  onClick={handleGenerate} 
                  disabled={generating} 
                  className="w-full text-[11px] text-gray-400 hover:text-primary transition-colors h-8" 
                  variant="ghost"
                >
                  {generating ? <Loader2 size={12} className="animate-spin mr-1.5" /> : null} Пересчитать параметры
                </Button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 shadow-sm"><Sparkles className="h-10 w-10 text-primary animate-pulse" /></div>
      <h2 className="text-2xl font-bold text-text-primary">ИИ-Навигатор бизнеса</h2>
      <p className="mt-3 text-sm text-gray-500 max-w-sm leading-relaxed">Задайте вопрос, расскажите о бюджете или страхах. Я оценю рынок и составлю пошаговый план открытия.</p>
      <Button size="lg" className="mt-8 px-8" onClick={onStart}><Plus className="mr-2 h-4 w-4" /> Начать скрининг идеи</Button>
    </div>
  );
}
