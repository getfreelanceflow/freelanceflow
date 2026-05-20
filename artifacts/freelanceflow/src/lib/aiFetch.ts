export async function aiPost<T>(path: string, body: unknown): Promise<T> {
  const w = window as unknown as { Clerk?: { session?: { getToken: () => Promise<string | null> } } };
  const token = await w.Clerk?.session?.getToken?.();
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
