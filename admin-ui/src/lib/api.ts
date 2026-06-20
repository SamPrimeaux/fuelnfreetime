export async function adminFetch<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...opts,
    headers: { "content-type": "application/json", ...(opts.headers as Record<string, string>) },
  });
  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Unauthorized");
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export async function requireSession() {
  return adminFetch<{ email: string }>("/api/admin/me");
}

export async function fetchFinanceAnalytics(range: string) {
  return adminFetch<import("./types").FinanceAnalyticsResponse>(
    `/api/admin/analytics/finance?range=${encodeURIComponent(range)}`
  );
}
