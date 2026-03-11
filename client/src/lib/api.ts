// ─── Auth API ────────────────────────────────────────────────────────────────

export interface AuthUser {
  openId: string;
  name: string;
  staffId: number;
}

export interface AuthMeResponse {
  authenticated: boolean;
  user?: AuthUser;
}

export async function fetchAuthMe(): Promise<AuthMeResponse> {
  const resp = await fetch("/api/auth/me", { credentials: "include" });
  return resp.json();
}

export async function verifyStaffToken(
  staffToken: string
): Promise<{ success: boolean; user?: AuthUser }> {
  const resp = await fetch("/api/auth/verify-staff-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ staffToken }),
  });
  return resp.json();
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

// ─── Project API ─────────────────────────────────────────────────────────────

export interface Project {
  id: number;
  name: string;
  clientName?: string;
  description?: string;
  status: string;
  crosUsername?: string;
  createdAt: string;
}

export async function fetchProjects(): Promise<Project[]> {
  const resp = await fetch("/api/projects", { credentials: "include" });
  if (!resp.ok) {
    if (resp.status === 401) throw new Error("Unauthorized");
    throw new Error("Failed to fetch projects");
  }
  const data = await resp.json();
  return data.data || [];
}

export async function fetchProjectDetail(
  projectId: string
): Promise<Project | null> {
  const resp = await fetch(`/api/projects/${projectId}`, {
    credentials: "include",
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.data || null;
}

// ─── Report Event API (webhook integration) ──────────────────────────────────

export async function reportEvent(data: {
  eventType: "start" | "progress" | "complete" | "error";
  message?: string;
  progress?: number;
  projectId?: string;
  detail?: Record<string, unknown>;
}): Promise<boolean> {
  try {
    const resp = await fetch("/api/report-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const result = await resp.json();
    return result.success;
  } catch {
    return false;
  }
}

// ─── Workbench URL helper ────────────────────────────────────────────────────

export function getWorkbenchLoginUrl(currentUrl?: string): string {
  const workbenchUrl =
    (import.meta as any).env?.VITE_WORKBENCH_URL ||
    "http://120.24.232.253:5000";
  const redirect = currentUrl || window.location.origin;
  return `${workbenchUrl}/login?redirect=${encodeURIComponent(redirect)}`;
}
