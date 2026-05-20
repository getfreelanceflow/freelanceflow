async function customFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let detail: unknown = null;
    try {
      detail = await res.json();
    } catch {
      /* ignore */
    }
    const msg =
      (detail && typeof detail === "object" && "error" in detail
        ? String((detail as { error: unknown }).error)
        : null) ?? `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  if (res.status === 204) return null as T;
  return (await res.json()) as T;
}

export type Client = {
  id: number;
  name: string;
  email: string | null;
  company: string | null;
  status: string;
  notes: string | null;
  hourlyRate: number | null;
  totalEarned: number;
  createdAt: string;
};

export type InvoiceLineItem = { description: string; quantity: number; rate: number };

export type Invoice = {
  id: number;
  clientId: number | null;
  clientName: string;
  invoiceNumber: string;
  amount: number;
  status: "draft" | "sent" | "paid" | "overdue";
  dueDate: string | null;
  items: InvoiceLineItem[];
  notes: string | null;
  sentAt: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type Followup = {
  id: number;
  clientId: number | null;
  proposalId: number | null;
  title: string;
  notes: string | null;
  dueDate: string;
  completed: boolean;
  createdAt: string;
};

export type Template = {
  id: number;
  name: string;
  category: string;
  content: string;
  createdAt: string;
};

export type PortfolioItem = { title: string; description: string; url?: string; imageUrl?: string };
export type SocialLinks = { website?: string; linkedin?: string; github?: string; twitter?: string };

export type Profile = {
  id: number;
  displayName: string;
  headline: string;
  bio: string;
  skills: string[];
  hourlyRate: number | null;
  yearsExperience: number | null;
  location: string | null;
  portfolioItems: PortfolioItem[];
  socialLinks: SocialLinks;
  updatedAt: string;
};

export type EarningsSummary = {
  totalEarned: number;
  totalOutstanding: number;
  paidCount: number;
  outstandingCount: number;
  monthly: { month: string; amount: number }[];
};

const j = (body: unknown, method: "POST" | "PATCH" | "PUT" = "POST") => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

const put = (body: unknown) => ({
  method: "PUT",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

const base = "/api";

export const api = {
  // Clients
  listClients: () => customFetch<Client[]>(`${base}/clients`),
  getClient: (id: number) =>
    customFetch<Client & { invoices: Invoice[] }>(`${base}/clients/${id}`),
  createClient: (b: Partial<Client>) => customFetch<Client>(`${base}/clients`, j(b)),
  updateClient: (id: number, b: Partial<Client>) =>
    customFetch<Client>(`${base}/clients/${id}`, put(b)),
  deleteClient: (id: number) =>
    customFetch<void>(`${base}/clients/${id}`, { method: "DELETE" }),

  // Invoices
  listInvoices: () => customFetch<Invoice[]>(`${base}/invoices`),
  getInvoice: (id: number) => customFetch<Invoice>(`${base}/invoices/${id}`),
  createInvoice: (b: Partial<Invoice>) => customFetch<Invoice>(`${base}/invoices`, j(b)),
  updateInvoice: (id: number, b: Partial<Invoice>) =>
    customFetch<Invoice>(`${base}/invoices/${id}`, put(b)),
  deleteInvoice: (id: number) =>
    customFetch<void>(`${base}/invoices/${id}`, { method: "DELETE" }),
  earningsSummary: () => customFetch<EarningsSummary>(`${base}/earnings/summary`),

  // Followups
  listFollowups: () => customFetch<Followup[]>(`${base}/followups`),
  createFollowup: (b: Partial<Followup>) =>
    customFetch<Followup>(`${base}/followups`, j(b)),
  updateFollowup: (id: number, b: Partial<Followup>) =>
    customFetch<Followup>(`${base}/followups/${id}`, put(b)),
  deleteFollowup: (id: number) =>
    customFetch<void>(`${base}/followups/${id}`, { method: "DELETE" }),

  // Templates
  listTemplates: () => customFetch<Template[]>(`${base}/templates`),
  createTemplate: (b: Partial<Template>) =>
    customFetch<Template>(`${base}/templates`, j(b)),
  updateTemplate: (id: number, b: Partial<Template>) =>
    customFetch<Template>(`${base}/templates/${id}`, put(b)),
  deleteTemplate: (id: number) =>
    customFetch<void>(`${base}/templates/${id}`, { method: "DELETE" }),

  // Profile
  getProfile: () => customFetch<Profile>(`${base}/profile`),
  updateProfile: (b: Partial<Profile>) => customFetch<Profile>(`${base}/profile`, put(b)),

  // AI
  generateBio: (b: {
    name?: string;
    role: string;
    skills: string;
    experience?: string;
    tone?: string;
    platform?: "upwork" | "fiverr" | "linkedin" | "general";
  }) => customFetch<{ bio: string }>(`${base}/ai/bio`, j(b)),

  generateCoverLetter: (b: {
    jobTitle: string;
    jobDescription: string;
    mySkills: string;
    myName?: string;
    tone?: string;
  }) => customFetch<{ coverLetter: string }>(`${base}/ai/cover-letter`, j(b)),

  calculateRate: (b: {
    role: string;
    yearsExperience: number;
    skills: string;
    location?: string;
    targetIncome?: number;
    billableHoursPerWeek?: number;
  }) =>
    customFetch<{
      low: number;
      recommended: number;
      high: number;
      rationale: string;
      tips: string[];
      incomeBased: number | null;
    }>(`${base}/ai/rate-calculator`, j(b)),

  predictSuccess: (b: { proposalContent: string; jobDescription?: string }) =>
    customFetch<{
      score: number;
      verdict: string;
      strengths: string[];
      improvements: string[];
    }>(`${base}/ai/predict-success`, j(b)),

  resumeMatch: (b: {
    resumeText: string;
    age?: number;
    yearsExperience?: number;
    pastExperiences?: string;
    desiredRole?: string;
  }) =>
    customFetch<{
      profile: {
        summary: string;
        topSkills: string[];
        seniority: string;
        strengths: string[];
      } | null;
      matches: Array<{
        jobId: number;
        score: number;
        reason: string;
        highlights: string[];
        job?: {
          id: number;
          title: string;
          description: string;
          category: string;
          skills: string[];
          budgetMin: string;
          budgetMax: string;
          platform: string;
        };
      }>;
    }>(`${base}/ai/resume-match`, j(b)),

  generateContract: (b: {
    clientName: string;
    projectTitle: string;
    scope: string;
    fee: string;
    timeline?: string;
    paymentTerms?: string;
    freelancerName?: string;
  }) => customFetch<{ contract: string }>(`${base}/ai/contract`, j(b)),

  negotiate: (b: {
    situation: string;
    myDesiredOutcome: string;
    clientPosition?: string;
    tone?: string;
  }) => customFetch<{ reply: string }>(`${base}/ai/negotiate`, j(b)),

  skillGap: (b: {
    currentSkills: string;
    targetRole: string;
    yearsExperience?: number;
  }) =>
    customFetch<{
      readiness: number;
      verdict: string;
      missingSkills: Array<{ skill: string; priority: string; why: string }>;
      recommendedSteps: string[];
      rateProjection: string;
    }>(`${base}/ai/skill-gap`, j(b)),

  // Time entries
  listTimeEntries: () => customFetch<TimeEntry[]>(`${base}/time-entries`),
  createTimeEntry: (b: Partial<TimeEntry>) =>
    customFetch<TimeEntry>(`${base}/time-entries`, j(b)),
  updateTimeEntry: (id: number, b: Partial<TimeEntry>) =>
    customFetch<TimeEntry>(`${base}/time-entries/${id}`, j(b, "PATCH")),
  deleteTimeEntry: (id: number) =>
    customFetch<null>(`${base}/time-entries/${id}`, { method: "DELETE" }),
  timeSummary: () =>
    customFetch<{ totalHours: number; billableHours: number; entryCount: number }>(
      `${base}/time-entries/summary`,
    ),

  // Tasks
  listTasks: () => customFetch<Task[]>(`${base}/tasks`),
  createTask: (b: Partial<Task>) => customFetch<Task>(`${base}/tasks`, j(b)),
  updateTask: (id: number, b: Partial<Task>) =>
    customFetch<Task>(`${base}/tasks/${id}`, j(b, "PATCH")),
  deleteTask: (id: number) =>
    customFetch<null>(`${base}/tasks/${id}`, { method: "DELETE" }),

  // Expenses
  listExpenses: () => customFetch<Expense[]>(`${base}/expenses`),
  createExpense: (b: Partial<Expense>) =>
    customFetch<Expense>(`${base}/expenses`, j(b)),
  updateExpense: (id: number, b: Partial<Expense>) =>
    customFetch<Expense>(`${base}/expenses/${id}`, j(b, "PATCH")),
  deleteExpense: (id: number) =>
    customFetch<null>(`${base}/expenses/${id}`, { method: "DELETE" }),
  expensesSummary: () =>
    customFetch<{
      total: number;
      deductible: number;
      count: number;
      byCategory: Array<{ category: string; total: number }>;
    }>(`${base}/expenses/summary`),

  // Goals
  listGoals: () => customFetch<Goal[]>(`${base}/goals`),
  createGoal: (b: Partial<Goal>) => customFetch<Goal>(`${base}/goals`, j(b)),
  updateGoal: (id: number, b: Partial<Goal>) =>
    customFetch<Goal>(`${base}/goals/${id}`, j(b, "PATCH")),
  deleteGoal: (id: number) =>
    customFetch<null>(`${base}/goals/${id}`, { method: "DELETE" }),
};

export type TimeEntry = {
  id: number;
  clientId: number | null;
  description: string;
  startedAt: string;
  endedAt: string | null;
  hours: string;
  rate: string | null;
  billable: boolean;
  createdAt: string;
};

export type Task = {
  id: number;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  clientId: number | null;
  createdAt: string;
};

export type Expense = {
  id: number;
  description: string;
  amount: string;
  category: string;
  date: string;
  taxDeductible: boolean;
  notes: string | null;
  createdAt: string;
};

export type Goal = {
  id: number;
  title: string;
  type: "earnings" | "proposals" | "clients" | "hours" | "custom";
  target: string;
  currentValue: string;
  period: "week" | "month" | "quarter" | "year";
  startDate: string;
  endDate: string | null;
  createdAt: string;
};
