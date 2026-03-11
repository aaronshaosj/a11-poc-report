import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import {
  verifyStaffToken,
  verifySessionToken,
  createSessionToken,
  upsertUser,
  setSessionCookie,
  clearSessionCookie,
  authMiddleware,
} from "./auth.js";
import { handleWorkbenchCommand, reportEvent } from "./webhook.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKBENCH_URL =
  process.env.WORKBENCH_URL || "http://120.24.232.253:5000";

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());
  app.use(cookieParser());

  // ═══════════════════════════════════════════════════════════════════════════
  // Auth Endpoints (registered BEFORE auth middleware)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── GET /api/auth/staff-callback — Forward SSO from Workbench ──────────
  app.get("/api/auth/staff-callback", async (req, res) => {
    const staffToken = req.query.staff_token as string;
    const rawReturnPath = (req.query.returnPath as string) || "/";

    // Step 1: returnPath safety check (prevent open redirect)
    let returnPath = "/";
    if (rawReturnPath.startsWith("/") && !rawReturnPath.startsWith("//")) {
      returnPath = rawReturnPath;
    }

    // Step 2: Parameter validation
    if (!staffToken) {
      return res.status(400).json({ error: "Missing staff_token" });
    }

    // Step 3: Verify staff_token
    const payload = await verifyStaffToken(staffToken);
    if (!payload) {
      return res.status(401).json({ error: "Invalid or expired staff_token" });
    }

    // Step 4: Upsert user (using openId as unique key)
    upsertUser({
      openId: payload.openId,
      name: payload.name,
      loginMethod: "staff",
      staffId: payload.staffId,
    });

    // Step 5: Create session token
    const sessionToken = await createSessionToken({
      openId: payload.openId,
      name: payload.name,
      staffId: payload.staffId,
      appId: "a11-poc-report",
    });

    // Step 6: Set session cookie
    setSessionCookie(req, res, sessionToken);

    // Step 7: Redirect (preserve returnPath which may include projectId)
    res.redirect(302, returnPath);
  });

  // ── POST /api/auth/verify-staff-token — Reverse SSO (frontend → backend) ─
  app.post("/api/auth/verify-staff-token", async (req, res) => {
    const { staffToken } = req.body;
    if (!staffToken) {
      return res.status(400).json({ error: "Missing staffToken" });
    }

    const payload = await verifyStaffToken(staffToken);
    if (!payload) {
      return res.status(401).json({ error: "Invalid or expired staff_token" });
    }

    upsertUser({
      openId: payload.openId,
      name: payload.name,
      loginMethod: "staff",
      staffId: payload.staffId,
    });

    const sessionToken = await createSessionToken({
      openId: payload.openId,
      name: payload.name,
      staffId: payload.staffId,
      appId: "a11-poc-report",
    });

    setSessionCookie(req, res, sessionToken);

    res.json({
      success: true,
      user: {
        openId: payload.openId,
        name: payload.name,
        staffId: payload.staffId,
      },
    });
  });

  // ── GET /api/auth/me — Check current session ──────────────────────────
  app.get("/api/auth/me", async (req, res) => {
    const token = req.cookies?.app_session_id;
    if (!token) {
      return res.json({ authenticated: false });
    }
    const session = await verifySessionToken(token);
    if (!session) {
      return res.json({ authenticated: false });
    }
    res.json({
      authenticated: true,
      user: {
        openId: session.openId,
        name: session.name,
        staffId: session.staffId,
      },
    });
  });

  // ── POST /api/auth/logout — Clear session ─────────────────────────────
  app.post("/api/auth/logout", (req, res) => {
    clearSessionCookie(req, res);
    res.json({ success: true });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Webhook Endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  // ── POST /api/webhook/workbench-command — Receive commands from Workbench
  app.post("/api/webhook/workbench-command", handleWorkbenchCommand);

  // ═══════════════════════════════════════════════════════════════════════════
  // Project API Proxy (protected — requires valid session)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── GET /api/projects — List projects from Workbench ───────────────────
  app.get("/api/projects", authMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      const staffId = user?.staffId;

      const params = new URLSearchParams();
      params.set("status", "active");
      if (staffId) {
        params.set("accountId", String(staffId));
      }

      const resp = await fetch(
        `${WORKBENCH_URL}/api/ext/projects?${params.toString()}`,
        {
          headers: {
            "X-API-Key": process.env.WEBHOOK_API_KEY || "dev-webhook-api-key",
            ...(staffId
              ? { "X-Staff-Account-Id": String(staffId) }
              : {}),
          },
        }
      );

      if (!resp.ok) {
        return res
          .status(resp.status)
          .json({ error: "Failed to fetch projects from Workbench" });
      }

      const data = await resp.json();
      res.json(data);
    } catch (err) {
      console.error("[Projects] Failed to fetch:", err);
      res.status(502).json({ error: "Cannot connect to Workbench" });
    }
  });

  // ── GET /api/projects/:id — Get project details from Workbench ────────
  app.get("/api/projects/:id", authMiddleware, async (req, res) => {
    try {
      const resp = await fetch(
        `${WORKBENCH_URL}/api/ext/projects/${req.params.id}`,
        {
          headers: {
            "X-API-Key": process.env.WEBHOOK_API_KEY || "dev-webhook-api-key",
          },
        }
      );

      if (!resp.ok) {
        return res
          .status(resp.status)
          .json({ error: "Failed to fetch project from Workbench" });
      }

      const data = await resp.json();
      res.json(data);
    } catch (err) {
      console.error("[Projects] Failed to fetch project:", err);
      res.status(502).json({ error: "Cannot connect to Workbench" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Report webhook notification API (protected)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── POST /api/report-events — Frontend reports lifecycle events ────────
  app.post("/api/report-events", authMiddleware, async (req, res) => {
    const { eventType, message, progress, projectId, detail } = req.body;

    const success = await reportEvent({
      agentCode: "A11",
      agentName: "POC报告生成器",
      eventType: eventType || "progress",
      message,
      progress,
      projectId,
      detail,
    });

    res.json({ success });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Static files & SPA fallback
  // ═══════════════════════════════════════════════════════════════════════════

  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all non-API routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`Workbench URL: ${WORKBENCH_URL}`);
  });
}

startServer().catch(console.error);
