import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "./api";

export type Project = {
  id: number;
  title: string;
  industry: string | null;
  created_at: string;
  business_plan?: BusinessPlan | null;
};

export type ChatMessage = {
  id: number;
  role: "user" | "ai";
  content: string;
  thread_id: string;
  created_at: string;
};

export type ExpenseItem = {
  name: string;
  amount: number;
};

export type BusinessPlan = {
  niche: string;
  summary: string;
  monthly_revenue: number;
  monthly_expenses: number;
  payback_months: number;
  expenses: ExpenseItem[];
  action_plan: string[];
  alfa_products: string[];
  completed_steps_json: string[];
  competitors_count: number | null;
};

function getToken(): string {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");
  return token;
}

export function getProjects(): Promise<Project[]> {
  return apiGet("/api/v1/projects", getToken());
}

export function createProject(): Promise<Project> {
  return apiPost("/api/v1/projects", {}, getToken());
}

export function getChatHistory(projectId: number): Promise<ChatMessage[]> {
  return apiGet(`/api/v1/projects/${projectId}/messages`, getToken());
}

export function sendMessage(
  projectId: number,
  text: string,
  threadId: string = "workspace"
): Promise<ChatMessage> {
  return apiPost(`/api/v1/projects/${projectId}/chat`, { text, thread_id: threadId }, getToken());
}

export function generatePlan(projectId: number): Promise<BusinessPlan> {
  return apiPost(
    `/api/v1/projects/${projectId}/generate-plan`,
    {},
    getToken(),
  );
}

export function updatePlan(projectId: number): Promise<BusinessPlan> {
  return apiPut(
    `/api/v1/projects/${projectId}/plan`,
    {},
    getToken(),
  );
}

export function getPlan(projectId: number): Promise<BusinessPlan> {
  return apiGet(`/api/v1/projects/${projectId}/plan`, getToken());
}

export function getDraftReply(messages: { role: string; content: string }[], text: string): Promise<{ reply: string }> {
  return apiPost("/api/v1/projects/chat/draft", { messages, text }, getToken());
}

export function updateProject(projectId: number, data: { title?: string; industry?: string }): Promise<Project> {
  return apiPatch(`/api/v1/projects/${projectId}`, data, getToken());
}

export function deleteProject(projectId: number): Promise<{ detail: string }> {
  return apiDelete(`/api/v1/projects/${projectId}`, getToken());
}

export function createProjectFromDraft(title: string, messages: {role: string, content: string}[]): Promise<Project> {
  return apiPost("/api/v1/projects/from-draft", { title, messages }, getToken());
}

export function deleteChatMessage(projectId: number, messageId: number): Promise<{ detail: string }> {
  return apiDelete(`/api/v1/projects/${projectId}/messages/${messageId}`, getToken());
}

export function completePlanStep(
  projectId: number,
  stepText: string,
  isCompleted: boolean
): Promise<{ completed_steps: string[]; ai_message?: ChatMessage }> {
  return apiPost(
    `/api/v1/projects/${projectId}/complete-step`,
    { step_text: stepText, is_completed: isCompleted },
    getToken()
  );
}
