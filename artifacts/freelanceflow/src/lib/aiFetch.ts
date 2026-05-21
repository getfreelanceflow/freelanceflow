type ClerkGlobal = {
  loaded?: boolean;
  session?: { getToken: () => Promise<string | null> };
};

async function waitForClerk(timeoutMs = 5000): Promise<ClerkGlobal | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const w = window as unknown as { Clerk?: ClerkGlobal };
    if (w.Clerk?.loaded) return w.Clerk;
    await new Promise((r) => setTimeout(r, 50));
  }
  return (window as unknown as { Clerk?: ClerkGlobal }).Clerk ?? null;
}

export async function aiPost<T>(path: string, body: unknown): Promise<T> {
  const clerk = await waitForClerk();
  const token = await clerk?.session?.getToken?.();
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.error ?? `${res.status} ${res.statusText}`);
  }
  return res.json();
}
