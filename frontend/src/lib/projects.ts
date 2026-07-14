import { apiGet, apiPost } from "./api";

export type Project = {
  id: number;
  title: string;
  industry: string | null;
  created_at: string;
};

export type ChatMessage = {
  id: number;
  role: "user" | "ai";
  content: string;
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
): Promise<ChatMessage> {
  return apiPost(`/api/v1/projects/${projectId}/chat`, { text }, getToken());
}

export function generatePlan(projectId: number): Promise<BusinessPlan> {
  return apiPost(
    `/api/v1/projects/${projectId}/generate-plan`,
    {},
    getToken(),
  );
}

export function getPlan(projectId: number): Promise<BusinessPlan> {
  return apiGet(`/api/v1/projects/${projectId}/plan`, getToken());
}
