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

const j = (body: unknown) => ({
  method: "POST",
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
};
