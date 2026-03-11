import type { Request, Response } from "express";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WebhookEvent {
  agentCode: string;
  agentName: string;
  eventType:
    | "start"
    | "progress"
    | "complete"
    | "error"
    | "heartbeat"
    | "asset_assessment";
  message?: string;
  detail?: string | Record<string, unknown>;
  progress?: number;
  timestamp?: number;
  projectId?: string;
  commandId?: string;
  data?: Record<string, unknown>;
}

export interface DispatchCallback {
  commandId: string;
  status: "acknowledged" | "executing" | "completed" | "failed";
  message?: string;
  detail?: string | Record<string, unknown>;
  agentCode?: string;
  timestamp?: number;
}

export interface WorkbenchCommand {
  commandId: string;
  commandType: string;
  params?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  timestamp?: number;
}

// ─── Workbench URL and API Key ───────────────────────────────────────────────

function getWorkbenchUrl(): string {
  return (
    process.env.WORKBENCH_URL || "http://120.24.232.253:5000"
  );
}

function getWebhookApiKey(): string {
  return process.env.WEBHOOK_API_KEY || "dev-webhook-api-key";
}

// ─── Upward channel: Agent → Workbench ───────────────────────────────────────

export async function reportEvent(event: WebhookEvent): Promise<boolean> {
  try {
    const resp = await fetch(
      `${getWorkbenchUrl()}/api/webhook/agent-event`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": getWebhookApiKey(),
        },
        body: JSON.stringify({
          agentCode: event.agentCode || "A11",
          agentName: event.agentName || "POC报告生成器",
          eventType: event.eventType,
          message: event.message,
          detail:
            typeof event.detail === "object"
              ? JSON.stringify(event.detail)
              : event.detail,
          progress: event.progress,
          timestamp: event.timestamp || Date.now(),
          projectId: event.projectId,
          commandId: event.commandId,
          data: event.data,
        }),
      }
    );
    return resp.ok;
  } catch (err) {
    console.error("[Webhook] Failed to report event:", err);
    return false;
  }
}

export async function reportDispatchCallback(
  callback: DispatchCallback
): Promise<boolean> {
  try {
    const resp = await fetch(
      `${getWorkbenchUrl()}/api/webhook/dispatch-callback`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": getWebhookApiKey(),
        },
        body: JSON.stringify({
          commandId: callback.commandId,
          status: callback.status,
          message: callback.message,
          detail:
            typeof callback.detail === "object"
              ? JSON.stringify(callback.detail)
              : callback.detail,
          agentCode: callback.agentCode || "A11",
          timestamp: callback.timestamp || Date.now(),
        }),
      }
    );
    return resp.ok;
  } catch (err) {
    console.error("[Webhook] Failed to report dispatch callback:", err);
    return false;
  }
}

// ─── Downward channel: Workbench → Agent ─────────────────────────────────────

// Validate the API key from incoming Workbench commands
export function validateWebhookApiKey(req: Request): boolean {
  const apiKey = req.headers["x-api-key"] as string;
  return apiKey === getWebhookApiKey();
}

// Handler for incoming workbench commands
export function handleWorkbenchCommand(req: Request, res: Response) {
  if (!validateWebhookApiKey(req)) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  const command = req.body as WorkbenchCommand;
  if (!command.commandId || !command.commandType) {
    return res
      .status(400)
      .json({ error: "Missing commandId or commandType" });
  }

  // Immediately acknowledge
  res.status(202).json({
    success: true,
    commandId: command.commandId,
    message: "Command accepted",
  });

  // Async: report acknowledged status back to Workbench
  reportDispatchCallback({
    commandId: command.commandId,
    status: "acknowledged",
    agentCode: "A11",
    message: `Command ${command.commandType} acknowledged`,
  }).catch(() => {});

  // Process command asynchronously
  processCommand(command).catch((err) => {
    console.error("[Webhook] Command processing error:", err);
    reportDispatchCallback({
      commandId: command.commandId,
      status: "failed",
      agentCode: "A11",
      message: `Command failed: ${err.message}`,
    }).catch(() => {});
  });
}

async function processCommand(command: WorkbenchCommand) {
  const params = command.params || command.payload || {};

  switch (command.commandType) {
    case "generate_report": {
      // Report start
      await reportEvent({
        agentCode: "A11",
        agentName: "POC报告生成器",
        eventType: "start",
        message: "开始生成POC对比报告",
        projectId: params.projectId as string,
        commandId: command.commandId,
      });

      // Report progress
      await reportEvent({
        agentCode: "A11",
        agentName: "POC报告生成器",
        eventType: "progress",
        message: "正在生成图表和分析数据",
        progress: 50,
        projectId: params.projectId as string,
        commandId: command.commandId,
      });

      // Report complete
      await reportDispatchCallback({
        commandId: command.commandId,
        status: "completed",
        agentCode: "A11",
        message: "POC报告生成完成",
      });
      break;
    }

    case "health_check": {
      await reportDispatchCallback({
        commandId: command.commandId,
        status: "completed",
        agentCode: "A11",
        message: "A11 POC Report Generator is healthy",
        detail: { status: "ok", version: "1.0.0" },
      });
      break;
    }

    default: {
      await reportDispatchCallback({
        commandId: command.commandId,
        status: "failed",
        agentCode: "A11",
        message: `Unsupported command type: ${command.commandType}`,
      });
    }
  }
}

// ─── File registration helper ────────────────────────────────────────────────

export async function registerFile(data: {
  projectId: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  fileCategory?: string;
}): Promise<boolean> {
  try {
    const resp = await fetch(
      `${getWorkbenchUrl()}/api/webhook/agent-file`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": getWebhookApiKey(),
        },
        body: JSON.stringify({
          agentCode: "A11",
          agentName: "POC报告生成器",
          projectId: data.projectId,
          fileName: data.fileName,
          fileUrl: data.fileUrl,
          fileSize: data.fileSize,
          mimeType: data.mimeType || "text/html",
          fileCategory: data.fileCategory || "poc-report",
        }),
      }
    );
    return resp.ok;
  } catch (err) {
    console.error("[Webhook] Failed to register file:", err);
    return false;
  }
}
