type ClerkGlobal = {
  loaded?: boolean;
  session?: { getToken: () => Promise<string | null> } | null;
};

async function getClerkToken(timeoutMs = 8000): Promise<string | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const w = window as unknown as { Clerk?: ClerkGlobal };
    if (w.Clerk?.loaded && w.Clerk.session) {
      try {
        const t = await w.Clerk.session.getToken();
        if (t) return t;
      } catch {
        /* retry */
      }
    }
    await new Promise((r) => setTimeout(r, 75));
  }
  return null;
}

export async function aiPost<T>(path: string, body: unknown): Promise<T> {
  const token = await getClerkToken();
  if (!token) {
    throw new Error("You're not signed in. Please refresh the page and sign in again.");
  }
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    throw new Error("Session expired. Please refresh the page and sign in again.");
  }
  if (res.status === 402) {
    const detail = await res.json().catch(() => null);
    window.dispatchEvent(new CustomEvent("ff:insufficient-credits", { detail }));
    throw new Error(detail?.message ?? "Out of AI credits.");
  }
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.error ?? `${res.status} ${res.statusText}`);
  }
  return res.json();
}
