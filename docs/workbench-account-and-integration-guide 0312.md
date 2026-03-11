# C-ROS Workbench 账号体系与智能体接入规范

> **目标读者：** 各子智能体（A1–A11）开发团队
> **发布方：** Workbench 团队
> **版本：** 2026-03-12 v1.2（阿里云迁移修订）

---

## 目录

- [1. 概述](#1-概述)
- [2. Workbench 账号管理体系](#2-workbench-账号管理体系)
  - [2.1 用户数据模型](#21-用户数据模型)
  - [2.2 账号类别与角色](#22-账号类别与角色)
  - [2.3 各角色权限矩阵](#23-各角色权限矩阵)
  - [2.4 账号创建与维护逻辑](#24-账号创建与维护逻辑)
- [3. 认证机制与 Token 设计](#3-认证机制与-token-设计)
  - [3.1 双 Token 架构](#31-双-token-架构)
  - [3.2 Staff Token 详细规格](#32-staff-token-详细规格)
  - [3.3 Session Token 详细规格](#33-session-token-详细规格)
  - [3.4 认证流程全景图](#34-认证流程全景图)
- [4. 智能体接入 SSO 认证](#4-智能体接入-sso-认证)
  - [4.1 正向 SSO 跳转链路](#41-正向-sso-跳转链路)
  - [4.2 反向 SSO 流程](#42-反向-sso-流程)
  - [4.3 可信域名白名单](#43-可信域名白名单)
  - [4.4 子应用必须实现的端点](#44-子应用必须实现的端点)
  - [4.5 Staff Token 验证函数](#45-staff-token-验证函数)
  - [4.6 用户 Upsert 规范](#46-用户-upsert-规范)
  - [4.7 安全检查清单](#47-安全检查清单)
- [5. 项目管理机制](#5-项目管理机制)
  - [5.1 项目数据模型](#51-项目数据模型)
  - [5.2 项目成员与 RBAC](#52-项目成员与-rbac)
  - [5.3 项目生命周期与状态流转](#53-项目生命周期与状态流转)
  - [5.4 多租户数据隔离](#54-多租户数据隔离)
- [6. 智能体查询项目信息](#6-智能体查询项目信息)
  - [6.1 核心原则](#61-核心原则)
  - [6.2 项目查询 REST API](#62-项目查询-rest-api)
  - [6.3 围栏数据代理查询（规划中）](#63-围栏数据代理查询规划中)
  - [6.4 跳转时携带项目信息](#64-跳转时携带项目信息)
- [7. Webhook 双向通信协议](#7-webhook-双向通信协议)
  - [7.1 通信架构全景](#71-通信架构全景)
  - [7.2 上行通道：Agent → Workbench](#72-上行通道agent--workbench)
  - [7.3 下行通道：Workbench → Agent](#73-下行通道workbench--agent)
  - [7.4 指令生命周期与状态流转](#74-指令生命周期与状态流转)
  - [7.5 超时监控机制](#75-超时监控机制)
  - [7.6 数据资产评估上报](#76-数据资产评估上报)
  - [7.7 skill_executions 桥接机制](#77-skill_executions-桥接机制)
- [8. 各智能体协议适配器规格](#8-各智能体协议适配器规格)
- [9. 环境变量配置清单](#9-环境变量配置清单)
- [10. 接入自查与联调指南](#10-接入自查与联调指南)

---

## 1. 概述

C-ROS Workbench 是城市配送路线优化系统的中央控制台，承担数据展示、智能体调度、Copilot 对话和文件管理职责。本文档面向各子智能体（A1–A11）的开发团队，完整说明 Workbench 的账号体系、项目管理机制和双向通信协议，为智能体接入提供明确的规范指导。

### 关键术语

| 术语 | 含义 |
|------|------|
| **Workbench** | 本项目——C-ROS 多 Agent 系统的中央控制台 |
| **子应用 / 子智能体** | A1–A11 各独立部署的智能体服务 |
| **Staff 账号** | 实施顾问账号，通过用户名密码登录 |
| **Staff Token** | 用于跨应用身份传递的 JWT（`STAFF_JWT_SECRET` 签名） |
| **Session Token** | 各应用本地的会话 Cookie（各应用自己的 `JWT_SECRET` 签名） |
| **projectId** | 项目唯一标识符（数字 ID 的字符串形式） |
| **openId** | 用户全局唯一标识，格式为 `staff_{staffAccountId}`（如 `staff_1`） |

---

## 2. Workbench 账号管理体系

### 2.1 用户数据模型

Workbench 的 `users` 表是所有身份的统一归属：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INT (PK) | 自增主键，用于内部关联 |
| `openId` | VARCHAR(64) UNIQUE | **全局唯一标识符**。Staff 账号格式：`staff_{staffAccountId}`；OAuth 账号格式：随机字符串 |
| `name` | TEXT | 用户显示名称 |
| `email` | VARCHAR(320) | 邮箱地址（可选） |
| `loginMethod` | VARCHAR(64) | 登录方式：`'staff'`（Staff 账号）或 `'oauth'`（Manus OAuth） |
| `role` | ENUM('user','admin') | 全局角色，默认 `'user'` |
| `lastSignedIn` | TIMESTAMP | 最后登录时间 |
| `createdAt` | TIMESTAMP | 首次登录（账号创建）时间 |
| `updatedAt` | TIMESTAMP | 最后更新时间 |

**隔离保证：** Staff 用户的 openId 格式为 `staff_{id}`（如 `staff_1`），与 OAuth 用户的 openId（如 `b4uNucHGrDHSXv4TAf99Li`）格式完全不同，按 openId 匹配天然隔离，不会混淆。

### 2.2 账号类别与角色

Workbench 采用 **双层角色模型**：全局角色 + 项目角色。

#### 全局角色（Global Role）

| 角色 | 值 | 说明 |
|------|-----|------|
| 系统管理员 | `admin` | 可执行系统级管理操作（如 Staff 账号管理、全局通知） |
| 普通用户 | `user` | 普通实施顾问，只能操作自己参与的项目 |

全局角色存储在 `users.role` 字段。Staff 账号中 `role = 'admin'` 的人员在 `users` 表中映射为 `admin`，`role = 'consultant'` 的映射为 `user`。

#### 项目角色（Project Member Role）

| 角色 | 值 | 说明 |
|------|-----|------|
| 项目所有者 | `owner` | 创建项目时自动分配。可管理项目所有配置和成员 |
| 项目管理员 | `admin` | 可添加/移除成员、更新项目信息 |
| 项目成员 | `member` | 仅可访问和查询项目数据 |

项目角色存储在 `project_members` 表中，同一用户在不同项目中可拥有不同角色。

### 2.3 各角色权限矩阵

#### 全局权限

| 操作 | admin | user |
|------|:-----:|:----:|
| Staff 账号管理（增删改） | ✅ | ❌ |
| 全局通知推送 | ✅ | ❌ |
| 创建项目 | ✅ | ✅ |
| 查看自己参与的项目 | ✅ | ✅ |

#### 项目内权限

| 操作 | owner | admin | member |
|------|:-----:|:-----:|:------:|
| 查询项目数据（C-ROS 站点/订单/车辆等） | ✅ | ✅ | ✅ |
| 使用 Copilot 对话 | ✅ | ✅ | ✅ |
| 查看智能体状态 | ✅ | ✅ | ✅ |
| 下发智能体指令 | ✅ | ✅ | ✅ |
| 上传/管理文件 | ✅ | ✅ | ✅ |
| 更新项目基本信息 | ✅ | ✅ | ❌ |
| 更新 C-ROS 凭证 | ✅ | ✅ | ❌ |
| 添加项目成员 | ✅ | ✅ | ❌ |
| 移除项目成员 | ✅ | ❌ | ❌ |

### 2.4 账号创建与维护逻辑

Workbench **不提供独立的注册页面**，账号通过以下两种方式自动创建：

#### 方式一：Staff 账号登录（主要方式）

```
管理员在后台创建 Staff 账号
  → staff_accounts 表插入记录（username, passwordHash, displayName, role）
  → 顾问使用用户名密码登录 staffAuth.login
  → Workbench 自动在 users 表中 upsert 记录
     openId = "staff_{staffAccountId}"
     role = staff.role === "admin" ? "admin" : "user"
  → 签发 staff_token（STAFF_JWT_SECRET, HS256, 30天）存入 localStorage
  → 签发 session_token（JWT_SECRET, HS256, 30天）写入 Cookie
```

**Staff 账号表（`staff_accounts`）字段：**

| 字段 | 类型 | 数据库列名 | 说明 |
|------|------|-----------|------|
| `id` | INT (PK) | `id` | 自增主键 |
| `username` | VARCHAR(64) | `username` | 登录用户名（唯一） |
| `passwordHash` | VARCHAR(255) | `passwordHash` | bcrypt 哈希密码 |
| `displayName` | VARCHAR(100) | `displayName` | 显示名称 |
| `role` | ENUM('admin','consultant') | **`staffRole`** | 账号角色。注意：ORM 属性名为 `role`，但数据库实际列名为 `staffRole` |
| `status` | ENUM('active','disabled') | `status` | 账号状态 |
| `lastLoginAt` | TIMESTAMP | `lastLoginAt` | 最后登录时间 |

> **注意：** 如果子应用直接写 SQL 查询 `staff_accounts` 表，`role` 字段在数据库中的实际列名是 `staffRole`（如 `SELECT staffRole FROM staff_accounts`）。通过 Drizzle ORM 访问时使用 `staff.role`。

#### 方式二：Manus OAuth 登录（平台用户）

通过 Manus 平台 OAuth 回调自动创建用户记录。openId 直接使用 OAuth 返回的值。

#### 账号维护

- **登录状态维护：** 每次登录自动更新 `lastSignedIn`
- **角色同步：** Staff 账号角色变更时，下次登录自动同步到 `users.role`
- **账号禁用：** 管理员将 `staff_accounts.status` 设为 `disabled` 后，该账号无法登录

---

## 3. 认证机制与 Token 设计

### 3.1 双 Token 架构

Workbench 使用 **双 Token 架构** 来区分跨应用身份传递和本地会话管理：

```
┌──────────────────────┐   ┌──────────────────────┐
│     Staff Token      │   │    Session Token      │
├──────────────────────┤   ├──────────────────────┤
│ 签名密钥：           │   │ 签名密钥：            │
│   STAFF_JWT_SECRET   │   │   JWT_SECRET          │
│                      │   │                       │
│ 存储位置：           │   │ 存储位置：            │
│   localStorage       │   │   httpOnly Cookie     │
│                      │   │                       │
│ 用途：               │   │ 用途：                │
│   跨应用身份传递     │   │   本应用会话维持      │
│   （Workbench→Agent）│   │   （API 请求鉴权）    │
│                      │   │                       │
│ 有效期：30天         │   │ 有效期：30天          │
└──────────────────────┘   └──────────────────────┘
```

**为什么需要两个 Token？**

- **Staff Token** 使用 `STAFF_JWT_SECRET` 签名，所有子应用共享同一个密钥，因此任意子应用都可以验证。用于从 Workbench 跳转到子应用时传递身份。
- **Session Token** 使用各应用自己的 `JWT_SECRET` 签名，仅在该应用内有效。写入 httpOnly Cookie 防止 XSS 窃取。

### 3.2 Staff Token 详细规格

**签发方：** Workbench `staffAuth.login` 端点

**签名算法：** HS256

**签名密钥：** `STAFF_JWT_SECRET` 环境变量

**有效期：** 30 天

**Payload 结构：**

```json
{
  "openId": "staff_1",           // 用户全局唯一 ID，格式 "staff_{staffAccountId}"
  "appId": "cros-workbench",     // 签发方应用标识
  "name": "张三",                // 用户显示名称
  "role": "staff",               // 固定为 "staff"
  "staffId": 1,                  // staff_accounts 表的主键 ID
  "exp": 1741564800              // JWT 过期时间（Unix 秒）
}
```

**子应用读取与使用方式：**

| 字段 | 子应用应如何使用 |
|------|-----------------|
| `openId` | **最关键字段**，必须用此值作为用户 upsert 的唯一匹配键 |
| `name` | 显示在页面上的用户名称 |
| `staffId` | 查询 Workbench 项目 API 时作为 `accountId` 参数传递 |
| `appId` | 可选校验，确认 Token 来自 Workbench |
| `role` | 可选，当前固定为 `"staff"` |

### 3.3 Session Token 详细规格

**存储位置：** HTTP Cookie，名称为 `app_session_id`

**Cookie 属性：**

```
httpOnly: true                          // 防止 JavaScript 访问（防 XSS）
secure:   HTTPS → true, HTTP → false    // 与 sameSite 联动
sameSite: HTTPS → "none", HTTP → "lax"  // 动态决定，见下方说明
path:     "/"                           // 全站可用
maxAge:   30天                          // 2592000000ms
domain:   （不设置）                     // Cookie 仅对签发域名有效，不含子域名
```

> **重要说明：**
> - `sameSite` 和 `secure` 是**动态决定**的：HTTPS 请求下为 `sameSite: "none", secure: true`；HTTP 请求下（本地开发）为 `sameSite: "lax", secure: false`。子应用在本地 HTTP 开发环境中如果设置 `sameSite: "none"` 但不设置 `secure: true`，Cookie 会被浏览器拒绝。
> - `domain` 属性**当前不设置**（代码中相关逻辑已注释掉），意味着 Cookie 仅对签发域名有效。Workbench 的 session Cookie 不会自动发送到子应用域名，**子应用必须建立自己独立的 session Cookie**，不能依赖 Workbench 的 Cookie。

**Payload 结构：**

```json
{
  "openId": "staff_1",           // 用户 ID
  "appId": "cros-workbench",     // 应用标识
  "name": "张三",                // 用户名称
  "exp": 1741564800              // 过期时间
}
```

### 3.4 认证流程全景图

```
Staff 顾问
    │
    ├── 1. 用户名密码登录 Workbench
    │      POST /api/trpc/staffAuth.login
    │      { username: "tester", password: "xxx" }
    │
    ├── 2. Workbench 处理：
    │      ├── 查询 staff_accounts 表
    │      ├── bcrypt 验证密码
    │      ├── 检查账号状态（disabled 则拒绝）
    │      ├── upsert users 表（openId = "staff_1"）
    │      ├── 签发 staff_token → 返回给前端存 localStorage
    │      └── 签发 session_token → 写入 Cookie
    │
    ├── 3. 前端存储：
    │      ├── staff_token → localStorage.setItem("staff_token", token)
    │      └── session_token → 自动由浏览器管理（httpOnly Cookie）
    │
    └── 4. 后续请求：
           ├── Workbench 内部 → Cookie 自动携带 session_token
           └── 跳转子应用 → URL 参数携带 staff_token
```

---

## 4. 智能体接入 SSO 认证

### 4.1 正向 SSO 跳转链路

当用户在 Workbench 中点击某个智能体卡片时，触发以下完整链路：

```
Workbench 前端
    │
    │  1. 构建跳转 URL：
    │     buildAgentUrl(agent.url, projectId)
    │     → http://120.24.232.253:13001/api/auth/staff-callback
    │         ?staff_token=eyJhbGc...
    │         &returnPath=/?projectId=42
    │
    │  2. window.open(targetUrl, "_blank")
    │
    ▼
子应用后端 GET /api/auth/staff-callback
    │
    ├── 3. 从 query 参数提取 staff_token
    ├── 4. 用 STAFF_JWT_SECRET (HS256) 验证签名和有效期
    ├── 5. 提取 payload → { openId, name, staffId, ... }
    ├── 6. 用 openId 作为唯一键 upsert 本地 users 表
    ├── 7. 签发本应用的 session_token → 写入 Cookie
    ├── 8. 校验 returnPath 安全性（防开放重定向）
    │
    └── 9. 302 重定向到 /?projectId=42
           │
           ▼
    子应用前端
    ├── 10. 读取 Cookie → 确认已登录
    ├── 11. 读取 projectId → 调用 Workbench API 获取项目详情
    └── 12. 渲染项目工作空间
```

### 4.2 反向 SSO 流程（子应用 → Workbench → 子应用）

除了正向跳转（Workbench → 子应用），还存在一条**反向 SSO** 路径：用户直接访问子应用时，子应用发现未登录，将用户重定向到 Workbench 登录页，登录成功后回跳到子应用。

```
用户直接访问子应用
    │
    ├── 1. 子应用检测到未登录
    │      → 302 重定向到 Workbench 登录页：
    │        {WORKBENCH_URL}/login?redirect=http://120.24.232.253:13001
    │
    ├── 2. 用户在 Workbench 登录页完成登录
    │      → staffAuth.login 签发 staff_token → 存入 localStorage
    │      → StaffLogin.tsx 检测 redirect 参数
    │
    ├── 3. Workbench 前端回跳：
    │      → isValidRedirect(redirect) 校验域名白名单（见 4.3 节）
    │      → 通过校验后：window.location.href = "{redirect}?staff_token=xxx"
    │
    └── 4. 子应用前端接收 staff_token：
           → 从 URL query 参数中提取 staff_token
           → 调用后端验证 → 建立会话
```

**重要差异：** 这条路径**不经过** `/api/auth/staff-callback` 端点，而是直接将 `staff_token` 拼接到子应用 URL 的 query 参数中。子应用必须在前端额外处理 `?staff_token=xxx` 的场景。

**子应用前端处理示例：**

```typescript
// 入口处检测 URL 中的 staff_token 参数（反向 SSO 场景）
const params = new URLSearchParams(window.location.search);
const staffToken = params.get("staff_token");

if (staffToken) {
  // 将 staff_token 发送到后端验证 → 建立本应用会话
  await fetch("/api/auth/verify-staff-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staffToken }),
  });
  // 清理 URL 参数
  const url = new URL(window.location.href);
  url.searchParams.delete("staff_token");
  window.history.replaceState({}, "", url.toString());
}
```

> **小结：** 子应用需要同时支持两种 SSO 路径：
> 1. **正向 SSO**（第 4.1 节）：通过 `GET /api/auth/staff-callback?staff_token=xxx&returnPath=...` 接收
> 2. **反向 SSO**（本节）：通过 URL query 参数 `?staff_token=xxx` 接收

### 4.3 可信域名白名单（TRUSTED_DOMAINS）

Workbench 在反向 SSO 回跳时会校验目标域名是否在可信白名单内。当前白名单定义于 `url-utils.ts`：

```typescript
const TRUSTED_DOMAINS = ["120.24.232.253"];
```

**含义：** 只有部署在 `120.24.232.253`（阿里云服务器）上的子应用才能通过 `isValidRedirect()` 校验，享受反向 SSO 回跳能力。同源重定向（与 Workbench 同域名/IP）始终允许。

**如果子应用部署在非白名单域名/IP 上：**

1. 反向 SSO 回跳将被拦截（`isValidRedirect` 返回 `false`）
2. 正向 SSO（通过 `/api/auth/staff-callback`）不受影响，因为它由 Workbench 前端主动构建 URL
3. 如需支持新域名/IP 的反向 SSO，需联系 Workbench 团队修改 `client/src/lib/url-utils.ts` 中的白名单

### 4.4 子应用必须实现的端点

#### `GET /api/auth/staff-callback`

**要求：**
- 必须是 **GET** 端点（浏览器跳转使用 GET）
- 必须注册在认证中间件**之前**（该端点本身无需认证）

**完整参考实现（TypeScript + Express）：**

```typescript
app.get("/api/auth/staff-callback", async (req, res) => {
  const staffToken = req.query.staff_token as string;
  const projectId = req.query.projectId as string;
  const rawReturnPath = (req.query.returnPath as string) || "/";

  // ── Step 1: returnPath 安全校验（防止开放重定向）──
  let returnPath = "/";
  if (rawReturnPath.startsWith("/") && !rawReturnPath.startsWith("//")) {
    returnPath = rawReturnPath;
  }

  // ── Step 2: 参数校验 ──
  if (!staffToken) {
    return res.status(400).json({ error: "Missing staff_token" });
  }

  // ── Step 3: 验证 staff_token ──
  const payload = await verifyStaffToken(staffToken);
  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired staff_token" });
  }

  // ── Step 4: upsert 用户（⚠️ 必须用 openId 作为唯一键）──
  await upsertUser({
    openId: payload.openId,       // "staff_1" — 唯一匹配键
    name: payload.name,           // "张三"
    loginMethod: "staff",
    lastSignedIn: new Date(),
  });

  // ── Step 5: 签发本应用 session token ──
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const sessionToken = await createSessionToken(payload.openId, {
    name: payload.name,
    expiresInMs: THIRTY_DAYS_MS,
  });

  // ── Step 6: 设置 Cookie ──
  const secure = req.protocol === "https";
  res.cookie("app_session_id", sessionToken, {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    path: "/",
    maxAge: THIRTY_DAYS_MS,
  });

  // ── Step 7: 重定向（拼接 projectId）──
  let redirectUrl = returnPath;
  if (projectId) {
    redirectUrl +=
      (redirectUrl.includes("?") ? "&" : "?") +
      `projectId=${encodeURIComponent(projectId)}`;
  }
  res.redirect(302, redirectUrl);
});
```

### 4.5 Staff Token 验证函数

推荐使用 `jose` 库（与 Workbench 一致）：

```typescript
import { jwtVerify } from "jose";

interface StaffTokenPayload {
  openId: string;    // "staff_{staffAccountId}"
  appId: string;     // "cros-workbench"
  name: string;      // 显示名称
  role: string;      // "staff"
  staffId: number;   // staff_accounts.id
}

async function verifyStaffToken(
  token: string
): Promise<StaffTokenPayload | null> {
  try {
    if (!token) return null;
    // ⚠️ 此密钥必须与 Workbench 配置完全一致
    const secret = new TextEncoder().encode(process.env.STAFF_JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    const { openId, appId, name, role, staffId } = payload as Record<string, unknown>;
    if (!openId || !name || !role) return null;
    return { openId, appId, name, role, staffId } as StaffTokenPayload;
  } catch {
    return null;  // 签名错误、过期、格式错误均返回 null
  }
}
```

### 4.6 用户 Upsert 规范

**这是最容易出问题的环节。** 必须遵循以下规则：

| 规则 | 说明 |
|------|------|
| ✅ 用 `openId` 作为匹配键 | `WHERE openId = 'staff_1'` — 唯一正确的做法 |
| ❌ 不要用 `name` 匹配 | 可能匹配到同名的 OAuth 用户 |
| ❌ 不要用 `email` 匹配 | Staff 用户通常没有 email，可能匹配到 null |

**子应用 users 表最低要求：**

```sql
CREATE TABLE users (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  openId      VARCHAR(64) NOT NULL UNIQUE,  -- ← UNIQUE 约束是关键
  name        TEXT,
  email       VARCHAR(320),
  loginMethod VARCHAR(64),                  -- 'staff' | 'oauth'
  role        ENUM('user','admin') DEFAULT 'user',
  lastSignedIn TIMESTAMP,
  createdAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Upsert 示例（Drizzle ORM）：**

```typescript
await db
  .insert(users)
  .values({
    openId: payload.openId,    // "staff_1"
    name: payload.name,
    loginMethod: "staff",
    lastSignedIn: new Date(),
  })
  .onDuplicateKeyUpdate({
    set: {
      name: payload.name,
      loginMethod: "staff",
      lastSignedIn: new Date(),
    },
  });
```

### 4.7 安全检查清单

| # | 检查项 | 要求 |
|---|--------|------|
| 1 | **staff_token 验签** | 必须使用 `STAFF_JWT_SECRET` (HS256) 验证签名和过期时间 |
| 2 | **returnPath 校验** | 必须以 `/` 开头且不以 `//` 开头，否则回退到 `/` |
| 3 | **openId upsert** | 必须用 `openId`（非 name、非 email）作为唯一匹配键 |
| 4 | **Cookie 安全** | `httpOnly=true`；`secure` 和 `sameSite` 根据 HTTPS/HTTP 动态设置（见第 3.3 节） |
| 5 | **端点位置** | `/api/auth/staff-callback` 必须注册在认证中间件**之前** |
| 6 | **环境变量** | `STAFF_JWT_SECRET` 必须与 Workbench 完全一致 |
| 7 | **项目列表来源** | 必须从 Workbench API 获取，禁止本地硬编码或本地数据库查询 |
| 8 | **反向 SSO** | 前端需处理 URL query 中的 `?staff_token=xxx` 参数（见第 4.2 节） |

---

## 5. 项目管理机制

### 5.1 项目数据模型

**`projects` 表核心字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INT (PK) | 自增主键，也是对外暴露的 projectId |
| `name` | VARCHAR(100) | 项目名称 |
| `clientName` | VARCHAR(100) | 客户名称（可选） |
| `description` | TEXT | 项目描述（可选） |
| `ownerUserId` | INT | 项目创建者的 users.id |
| `crosUsername` | VARCHAR(255) | 该项目的 C-ROS 登录用户名 |
| `crosPasswordEncrypted` | TEXT | AES-256-GCM 加密的 C-ROS 密码 |
| `crosApiBase` | VARCHAR(500) | 该项目的 C-ROS API 地址（可选，有默认值） |
| `status` | VARCHAR(20) | 项目状态，默认 `"active"` |
| `playbookId` | VARCHAR(30) | 关联的 Playbook ID（可选） |
| `lastSyncAt` | TIMESTAMP | 最后一次数据同步时间 |
| `isStarred` | BOOLEAN | 是否标星，默认 `false` |
| `starredAt` | TIMESTAMP | 标星时间（可选） |
| `createdAt` | TIMESTAMP | 创建时间 |
| `updatedAt` | TIMESTAMP | 最后更新时间 |

### 5.2 项目成员与 RBAC

**`project_members` 表：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INT (PK) | 自增主键 |
| `projectId` | VARCHAR(64) | 项目 ID（字符串形式） |
| `userId` | INT | 用户 ID（FK → users.id） |
| `role` | VARCHAR(20) | 角色：`owner` / `admin` / `member` |
| `joinedAt` | TIMESTAMP | 加入时间 |

**唯一约束：** `UNIQUE(projectId, userId)` — 同一用户不能重复加入同一项目。

**关系模型：**

```
users (1) ──────> (M) project_members <────── (1) projects
       一个用户可属于多个项目         一个项目可有多个成员
```

**成员管理规则：**

| 操作 | 执行者要求 |
|------|-----------|
| 添加成员 | 当前用户必须是该项目的 `owner` 或 `admin` |
| 移除成员 | 当前用户必须是该项目的 `owner` |
| 修改角色 | 当前用户必须是该项目的 `owner` |

### 5.3 项目生命周期与状态流转

#### 项目创建流程

```
1. 用户填写项目信息（名称、客户名、C-ROS 凭证）
   │
2. Workbench 验证 C-ROS 凭证（尝试获取 Token，15秒超时）
   │   └── 失败 → 拒绝创建，提示"C-ROS 凭证验证失败"
   │
3. 密码加密存储（AES-256-GCM）
   │
4. 创建项目记录（status = "active"）
   │
5. 自动添加创建者为 owner 成员
   │
6. 返回 { id, name }
```

#### 状态流转

项目支持以下状态：

- `active` — 活跃项目（默认）
- `archived` — 已归档（软删除，可通过 `project.restore` 恢复）

项目所有者可通过 `project.delete` 将项目归档（`active → archived`），也可通过 `project.restore` 恢复。`project.hardDelete` 会级联删除所有关联数据（不可恢复）。

#### C-ROS 凭证管理

每个项目独立绑定 C-ROS 凭证，通过 Token 池管理：

```
项目创建
  → C-ROS 凭证验证
  → 密码 AES-256-GCM 加密存入 DB

项目使用
  → 首次 API 调用时从 DB 读取凭证
  → 解密密码 → 创建 CrosAuthManager 实例
  → 缓存到内存 Token Pool
  → 后续请求复用缓存（Token 过期前 5 分钟自动刷新）

凭证更新
  → 验证新凭证 → 加密存储
  → 清除 Token Pool 缓存 → 下次使用新凭证
```

### 5.4 多租户数据隔离

**核心机制：** 所有数据表通过 `projectId` 字段实现项目级隔离。

**涉及的表：**

| 表名 | 隔离说明 |
|------|---------|
| `operation_logs` | 按项目记录操作日志 |
| `agent_events` | 按项目记录智能体事件 |
| `dispatch_commands` | 按项目隔离指令 |
| `copilot_sessions` / `copilot_messages` | 按项目隔离对话 |
| `uploaded_files` | 按项目隔离上传文件 |
| `data_asset_assessments` | 按项目隔离数据资产评估 |
| `cros_sites` / `cros_orders` / ... | 7 张 C-ROS 镜像表按项目缓存 |

**权限验证层级（三层中间件）：**

```
publicProcedure
  └── 无需认证，任何人可调用（如 auth.me、health 检查）

protectedProcedure
  └── 需要登录（验证 Cookie 中的 session_token）
  └── 用于项目无关操作（如创建项目、列出项目）

projectProcedure
  └── 需要登录 + 需要 projectId + 需要项目成员权限
  └── 验证流程：
      1. 认证检查（session_token 有效）
      2. projectId 存在性检查（来自 x-project-id 请求头）
      3. projectId 格式验证（≤64字符，仅字母数字下划线连字符）
      4. 项目成员权限验证（查询 project_members 表）
  └── 用于所有 C-ROS 数据操作、智能体管理等
```

**前端自动注入 projectId：**

```typescript
// main.tsx — tRPC 客户端统一配置
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      headers() {
        // 从 URL 路径自动提取 projectId
        const match = window.location.pathname.match(
          /^\/projects\/([a-zA-Z0-9_-]+)/
        );
        const projectId = match?.[1];
        return projectId ? { "x-project-id": projectId } : {};
      },
    }),
  ],
});
```

---

## 6. 智能体查询项目信息

### 6.1 核心原则

> **不要在本地数据库维护项目表。** 项目的唯一真实数据源是 Workbench。

子应用只需：
1. 通过 Workbench REST API 查询项目列表和详情
2. 在本地业务表中使用 `projectId` 字段做数据隔离

### 6.2 项目查询 REST API

Workbench 提供了专门供子应用调用的外部项目查询接口：

#### 获取项目列表

```
GET {WORKBENCH_URL}/api/ext/projects?status=active&accountId={staffId}
```

**请求头：**

| 头部 | 必需 | 说明 |
|------|:----:|------|
| `X-API-Key` | 是 | 值为 Workbench 的 `WEBHOOK_API_KEY` |
| `X-Staff-Account-Id` | 否 | 双通道兼容，与 `accountId` 参数同义 |

**查询参数：**

| 参数 | 必需 | 说明 |
|------|:----:|------|
| `status` | 否 | 过滤项目状态（如 `active`），不传返回全部 |
| `accountId` | 否 | Staff 账号 ID（纯数字，从 `openId` 提取）。传入时仅返回该用户参与的项目 |

**从 openId 提取 staffId：**

```typescript
function extractStaffId(openId: string): string | null {
  const match = openId.match(/^staff_(\d+)$/);
  return match ? match[1] : null;
}

// 示例：extractStaffId("staff_1") → "1"
```

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
      "id": 42,
      "name": "华东物流优化项目",
      "clientName": "某物流公司",
      "description": "2026年Q1华东区域优化",
      "status": "active",
      "crosUsername": "admin",
      "createdAt": "2026-02-15T08:00:00.000Z"
    }
  ]
}
```

#### 获取项目详情

```
GET {WORKBENCH_URL}/api/ext/projects/{projectId}
```

**请求头：** `X-API-Key: {WEBHOOK_API_KEY}`

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": 42,
    "name": "华东物流优化项目",
    "clientName": "某物流公司",
    "description": "2026年Q1华东区域优化",
    "status": "active",
    "crosUsername": "admin",
    "crosApiBase": "http://47.112.28.68:9009",
    "createdAt": "2026-02-15T08:00:00.000Z"
  }
}
```

> **安全说明：** 响应中**不包含** `crosPasswordEncrypted` 字段，子应用无法获取 C-ROS 密码。

### 6.3 围栏数据代理查询（规划中）

> **⚠️ 规划中（未实现）**
>
> 以下端点尚未在 Workbench 代码中实现，当前调用将返回 404。子应用如需围栏数据，请暂时通过其他渠道获取（如直接调用 C-ROS API 或使用 A3 `inject_fence` 命令同步围栏）。待功能实现后本节将更新。

~~`GET {WORKBENCH_URL}/api/ext/projects/{projectId}/fences?limit=10000`~~

### 6.4 跳转时携带项目信息

Workbench 在跳转到子应用时，通过 URL 参数携带 `projectId`：

**有 Staff Token 时（SSO 跳转）：**

```
http://120.24.232.253:13001/api/auth/staff-callback
  ?staff_token=eyJhbGc...
  &returnPath=/?projectId=42
```

经过 `/api/auth/staff-callback` 处理后，302 重定向到：

```
/?projectId=42
```

**子应用前端处理 projectId：**

```typescript
// 入口处检测 projectId 参数
const params = new URLSearchParams(window.location.search);
const projectId = params.get("projectId");

if (projectId) {
  // 清理 URL 参数
  const url = new URL(window.location.href);
  url.searchParams.delete("projectId");
  window.history.replaceState({}, "", url.toString());

  // 路由到项目工作空间 & 调用 Workbench API 获取项目详情
  navigate(`/projects/${projectId}`);
}
```

**多租户请求头注入：**

子应用在每次 API 请求中都应携带当前 projectId：

```typescript
// 全局 fetch 拦截或 axios interceptor
const projectId = getCurrentProjectId();
if (projectId) {
  headers["x-project-id"] = projectId;
}
```

---

## 7. Webhook 双向通信协议

### 7.1 通信架构全景

```
┌─────────────────────────┐
│      Workbench          │
│                         │
│  tRPC dispatch.send()   │ ──── 下行 ────→ HTTP POST 到 Agent
│                         │                   (指令下发)
│  POST /api/webhook/*    │ ◄─── 上行 ────  Agent HTTP POST
│                         │                   (事件上报/指令回调)
└─────────────────────────┘
```

### 7.2 上行通道：Agent → Workbench

#### 7.2.1 事件上报

```
POST {WORKBENCH_URL}/api/webhook/agent-event
```

**认证：** `X-API-Key: {WEBHOOK_API_KEY}`

**请求体：**

```json
{
  "agentCode": "A1",                    // 必填，智能体编号
  "agentName": "数据探针",               // 必填，智能体名称
  "eventType": "progress",              // 必填，见下表
  "message": "正在处理站点数据",          // 可选，≤200字符
  "detail": "{\"processed\": 487}",     // 可选，≤2000字符
  "progress": 65,                       // 可选，0-100
  "timestamp": 1710000000000,           // 可选，UTC 毫秒
  "projectId": "42",                    // 推荐传递，多租户隔离
  "commandId": "wb-xxx",               // 可选，关联的 dispatch 指令 ID（用于 skill_executions 桥接）
  "data": {}                            // 可选，事件附加数据
}
```

**事件类型（eventType）：**

| eventType | 含义 | 写入操作日志 | 自动生成待办 |
|-----------|------|:----------:|:----------:|
| `start` | 开始执行 | ✅ | ❌ |
| `progress` | 执行中（可多次上报） | ✅ | ❌ |
| `complete` | 执行完成 | ✅ | ✅（如 detail 存在，type=confirm，中优先级） |
| `error` | 执行异常 | ✅ | ✅（type=review，高优先级） |
| `heartbeat` | 心跳存活探测 | ❌ | ❌ |
| `asset_assessment` | 数据资产评估结果 | ❌ | ❌ |

**成功响应（200）：**

```json
{
  "success": true,
  "received": {
    "agentCode": "A1",
    "eventType": "progress",
    "timestamp": "2026-03-10T08:00:00.000Z"
  }
}
```

**错误响应：**

| 状态码 | 原因 |
|--------|------|
| 400 | 缺少必填字段 |
| 401 | `X-API-Key` 无效或缺失 |
| 500 | 服务端错误 |

#### 7.2.2 查询智能体状态

```
GET {WORKBENCH_URL}/api/webhook/agent-status
```

**认证：** 无需（公开读权限）

**响应：**

```json
{
  "success": true,
  "agents": {
    "A1": {
      "agentCode": "A1",
      "agentName": "数据探针",
      "eventType": "complete",
      "message": "数据处理完成",
      "progress": 100,
      "receivedAt": "2026-03-10T08:00:00.000Z"
    }
  }
}
```

#### 7.2.3 查询单个智能体事件历史

```
GET {WORKBENCH_URL}/api/webhook/agent-events/{agentCode}?limit=50
```

**认证：** 无需

**参数：** `limit` — 返回数量上限，默认 50，最大 200

#### 7.2.4 指令执行回调

```
POST {WORKBENCH_URL}/api/webhook/dispatch-callback
```

**认证：** `X-API-Key: {WEBHOOK_API_KEY}`

**请求体：**

```json
{
  "commandId": "wb-1710000000-abc12345",  // 必填，Workbench 下发的指令 ID
  "status": "completed",                   // 必填，见下表
  "message": "数据同步完成",                // 可选，结果描述
  "detail": "{\"sitesProcessed\": 487}",   // 可选，详细结果（JSON 字符串或纯文本）
  "agentCode": "A1",                       // 可选，用于验证
  "timestamp": 1710000000000               // 可选
}
```

**回调状态：**

| status | 含义 | 何时调用 |
|--------|------|---------|
| `acknowledged` | 已确认接收 | Agent 收到指令后立即调用 |
| `executing` | 正在执行 | Agent 开始执行（可选） |
| `completed` | 执行完成 | 任务成功完成 |
| `failed` | 执行失败 | 任务执行失败 |

**兼容性说明：**

| Agent | 字段差异 | Workbench 自动适配 |
|-------|---------|-------------------|
| A3 | 使用 `stage` 替代 `status` | `raw.status ?? raw.stage` |
| A3 | 使用 `data` 替代 `detail` | `raw.detail \|\| JSON.stringify(raw.data)` |
| A2 | 使用 `result` 替代 `detail` | `raw.detail \|\| (raw.result ? JSON.stringify(raw.result) : undefined)` |

**成功响应（200）：**

```json
{
  "success": true,
  "commandId": "wb-1710000000-abc12345",
  "status": "completed",
  "timestamp": "2026-03-10T08:00:00.000Z"
}
```

#### 7.2.5 文件注册

```
POST {WORKBENCH_URL}/api/webhook/agent-file
```

**认证：** `X-API-Key: {WEBHOOK_API_KEY}`

**请求体：**

```json
{
  "agentCode": "A1",
  "agentName": "数据探针",
  "projectId": "42",
  "fileName": "report.xlsx",
  "fileUrl": "https://s3.example.com/...",
  "fileSize": 102400,
  "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "fileCategory": "analysis-report",
  "skillId": "skill-123",
  "s3Key": "uploads/42/report.xlsx"
}
```

### 7.3 下行通道：Workbench → Agent

Workbench 通过 `tRPC dispatch.send()` 端点下发指令到 Agent。

#### 指令下发请求

各 Agent 需要在以下端点接收指令：

| Agent | 接收端点 | 认证头 |
|-------|---------|--------|
| A1 | `{A1_BASE_URL}/api/webhook/workbench-command` | `X-API-Key: {WEBHOOK_API_KEY}` |
| A2 | `{A2_BASE_URL}/api/webhook/workbench-command` | `X-API-Key: {A2_API_KEY}` |
| A3 | `{A3_BASE_URL}/api/webhook/callback` | `X-API-Key: {A3_API_KEY}` |
| A4 | `{A4_BASE_URL}/api/webhook/workbench-command` | `X-API-Key: {A4_API_KEY}` |
| A6 | `{A6_BASE_URL}/api/webhook/workbench-command` | `X-API-Key: {A6_API_KEY}` |
| A8 | `{A8_BASE_URL}/api/webhook/workbench-command` | `X-API-Key: {A8_API_KEY}` |

**通用请求体格式：**

```json
{
  "commandId": "wb-1710000000-abc12345",  // Workbench 生成的唯一指令 ID
  "commandType": "trigger_sync",           // 命令类型
  "payload": { ... },                      // 命令参数（JSON 对象）
  "timestamp": 1710000000000               // 下发时间戳
}
```

> **注意：** 不同 Agent 的请求体字段名略有差异（如 A2/A4/A6/A8 使用 `params` 替代 `payload`，A3 使用 `command` + `data`）。详见第 8 节。

**Agent 收到指令后应立即：**

1. 返回 HTTP `202 Accepted`
2. 通过 `POST /api/webhook/dispatch-callback` 回报 `status: "acknowledged"`
3. 异步执行指令
4. 执行完成后回报 `status: "completed"` 或 `status: "failed"`

#### 支持的命令类型

| 命令类型 | 适用 Agent | 说明 |
|---------|-----------|------|
| `execute_task` | 通用 | 执行任务 |
| `update_config` | 通用 | 更新配置 |
| `query_status` | 通用 | 查询状态 |
| `stop_task` | 通用 | 停止任务 |
| `custom` | 通用 | 自定义命令 |
| `trigger_sync` | A1 | 触发数据同步 |
| `trigger_extract` | A1 | 触发文件解析 |
| `trigger_injection` | A1 | 触发数据注入 |
| `generate_report` | A1, A3 | 生成报告 |
| `generate_batch_json` | A1 | 生成批处理 JSON |
| `health_check` | A1, A4, A6, A8 | 健康检查 |
| `trigger_stability_analysis` | A2 | 触发稳定性分析 |
| `get_stability_result` | A2 | 获取分析结果 |
| `update_stability_config` | A2 | 更新分析配置 |
| `sync_data` | A3 | 商业分析数据同步 |
| `inject_fence` | A3 | 围栏注入 |
| `ping` | A3 | 健康探测 |
| `validate_address` | A4 | 验证单个地址 |
| `batch_validate` | A4 | 批量验证 |
| `get_validation_result` | A4 | 获取验证结果 |
| `trigger_district_validation` | A4 | 行政区划校验 |
| `get_district_validation_result` | A4 | 获取区划校验结果 |
| `tuning_initialize` | A6 | 约束提取 |
| `inject_strategy` | A6 | 初始策略注入 |
| `full_optimization` | A6 | 完整优化闭环 |
| `strategy_compare` | A8 | 策略博弈对比 |

### 7.4 指令生命周期与状态流转

```
pending (创建)
  │
  ├── sent (HTTP POST 成功送达 Agent)
  │     │
  │     ├── acknowledged (Agent 确认接收)
  │     │     │
  │     │     ├── executing (Agent 开始执行)
  │     │     │     │
  │     │     │     ├── completed ✅ (执行成功)
  │     │     │     └── failed ❌ (执行失败)
  │     │     │
  │     │     └── timeout ⏰ (超过 15 分钟未进入 executing)
  │     │
  │     └── timeout ⏰ (超过 10 分钟未确认)
  │
  └── cancelled 🚫 (用户手动取消，仅 pending/sent 状态可取消)
```

**`dispatch_commands` 表关键字段：**

| 字段 | 说明 |
|------|------|
| `projectId` | 项目标识符（多租户隔离） |
| `commandId` | 格式 `wb-{timestamp}-{uuid}`，全局唯一 |
| `status` | 8 种状态之一 |
| `sentAt` | 送达时间 |
| `acknowledgedAt` | Agent 确认时间 |
| `completedAt` | 完成/失败/超时时间 |
| `resultMessage` | Agent 回报的结果摘要 |
| `resultDetail` | Agent 回报的详细结果（最大 60KB） |

### 7.5 超时监控机制

Workbench 内置超时扫描器，每 **2 分钟** 检查一次未完成指令：

| 指令状态 | 超时阈值 | 超时后动作 |
|---------|---------|-----------|
| `sent` | 10 分钟 | 标记为 `timeout` |
| `acknowledged` | 15 分钟 | 标记为 `timeout` |
| `executing` | 30 分钟 | 标记为 `timeout` |

**特殊超时配置：**

| 命令类型 | executing 超时 | 说明 |
|---------|---------------|------|
| `full_optimization` | 72 小时 | 完整优化闭环耗时较长 |
| `tuning_initialize` | 10 分钟 | 约束提取相对快速 |

超时后自动创建高优先级待办（type=review），提醒人工介入。

### 7.6 数据资产评估上报

Agent 可通过两种方式上报数据资产评估结果：

#### 方式一：事件推送

```json
{
  "agentCode": "A1",
  "agentName": "数据探针",
  "eventType": "asset_assessment",
  "projectId": "42",
  "detail": {
    "assetId": "stations",
    "level": 2,
    "totalCount": 487,
    "completenessScore": 85,
    "qualityScore": 78,
    "description": "站点数据已录入 487 个，完整度 85%"
  }
}
```

#### 方式二：指令回调中包含

在 `dispatch-callback` 的 `detail` 中包含 `assetAssessments` 数组：

```json
{
  "commandId": "wb-xxx",
  "status": "completed",
  "detail": {
    "message": "数据同步完成",
    "assetAssessments": [
      {
        "assetId": "stations",
        "level": 2,
        "totalCount": 487,
        "completenessScore": 85,
        "qualityScore": 78
      }
    ]
  }
}
```

**资产 ID 枚举：**

| assetId | 含义 | 评估方 |
|---------|------|--------|
| `raw-data` | 原始数据 | A1 |
| `stations` | 站点数据 | A1, A4 |
| `vehicle-types` | 车型数据 | A1 |
| `orders` | 订单数据 | A1 |
| `waybills` | 运单数据 | A3 |
| `order-batch` | 订单批次 | A3 |
| `road-network` | 路网数据 | A3 |
| `case-data` | 案例数据 | A2 |

**资产等级：** 0–3（自动 clamp），数值越高代表数据质量越好。

### 7.7 skill_executions 桥接机制

Workbench 内部维护了 `skill_executions` 表，用于追踪技能执行（如 A6 约束提取、A8 策略对比等）的完整生命周期。该机制**对子应用透明**——子应用只需按正常协议回调即可，Workbench 会自动桥接以下行为：

- **dispatch-callback** 桥接：当 `commandId` 关联了 `skill_execution` 记录时，Workbench 在更新 `dispatch_commands` 状态的同时，自动同步更新关联的 `skill_execution` 记录状态。
- **agent-event** 桥接：A6/A7 的迭代进度事件（`eventType: "progress"`）会自动累积到关联的 `skill_execution` 结果中，用于前端展示迭代历史。

> **子应用无需为此做任何特殊处理。** 提及此机制是为了帮助子应用开发者在调试时理解系统行为——例如，当你通过 dispatch-callback 回报 `completed` 时，Workbench 日志中可能出现 `Skill execution xxx → done` 的日志，这是正常的桥接行为。

---

## 8. 各智能体协议适配器规格

### A1 DataProbe（数据探针）

| 项 | 值 |
|----|-----|
| 接收端点 | `POST {A1_BASE_URL}/api/webhook/workbench-command` |
| 认证 | `X-API-Key: {WEBHOOK_API_KEY}` |
| 多租户 | `X-Project-Id` 请求头（推荐） |
| HTTP 请求超时 | 10 秒 |
| 幂等 | 支持（409 Conflict 表示重复） |

**请求体：**

```json
{
  "commandId": "wb-xxx",
  "commandType": "trigger_extract",
  "payload": { ... },
  "data": { ... },          // 向前兼容别名
  "timestamp": 1710000000000
}
```

**支持命令：** `trigger_sync`, `trigger_extract`, `trigger_injection`, `generate_report`, `generate_batch_json`, `health_check`, `update_config`

### A2 StabilityAnalyzer（调度特征分析）

| 项 | 值 |
|----|-----|
| 接收端点 | `POST {A2_BASE_URL}/api/webhook/workbench-command` |
| 认证 | `X-API-Key: {A2_API_KEY}` |
| HTTP 请求超时 | 10 秒 |

**请求体：**

```json
{
  "commandId": "wb-xxx",
  "commandType": "trigger_stability_analysis",
  "params": { ... },         // 注意：用 params 而非 payload
  "timestamp": 1710000000000
}
```

**支持命令：** `trigger_stability_analysis`, `get_stability_result`, `update_stability_config`

### A3 BizAnalyzer（商业分析）

| 项 | 值 |
|----|-----|
| 接收端点 | `POST {A3_BASE_URL}/api/webhook/callback` |
| 认证 | `X-API-Key: {A3_API_KEY}` |
| HTTP 请求超时 | 10 秒 |

**请求体：**

```json
{
  "command": "sync_data",         // 命令名称
  "commandId": "wb-xxx",
  "requestId": "wb-xxx",          // 向后兼容别名
  "data": { ... },                // 当前协议
  "params": { ... },              // 向后兼容
  "timestamp": 1710000000000
}
```

**支持命令：** `inject_fence`, `sync_data`, `generate_report`, `ping`

**执行顺序要求：** `inject_fence` → `sync_data` → `generate_report`

### A4 AddressValidator（经纬度核查）

| 项 | 值 |
|----|-----|
| 接收端点 | `POST {A4_BASE_URL}/api/webhook/workbench-command` |
| 认证 | `X-API-Key: {A4_API_KEY}` |
| HTTP 请求超时 | 10 秒 |

**请求体：**

```json
{
  "commandId": "wb-xxx",
  "commandType": "validate_address",
  "params": { ... },
  "timestamp": 1710000000000
}
```

**支持命令：** `validate_address`, `batch_validate`, `get_validation_result`, `health_check`, `trigger_district_validation`, `get_district_validation_result`

### A6 Parameter Mirror / Tuning（参数镜像 / 策略探索）

| 项 | 值 |
|----|-----|
| 接收端点 | `POST {A6_BASE_URL}/api/webhook/workbench-command` |
| 认证 | `X-API-Key: {A6_API_KEY}` |
| 幂等 | 支持（409 Conflict 表示重复） |

**超时配置（两种超时类型）：**

| 超时类型 | 普通命令 | `full_optimization` |
|---------|---------|---------------------|
| HTTP 请求超时（等待 Agent 返回 HTTP 响应） | 15 秒 | 30 秒 |
| 执行生命周期超时（由超时扫描器管理） | 30 分钟（默认） | 72 小时 |

> `tuning_initialize` 的执行生命周期超时为 10 分钟。`full_optimization` 在执行期间应每 2 分钟发送心跳事件。

**请求体：**

```json
{
  "commandId": "wb-xxx",
  "commandType": "tuning_initialize",
  "params": { ... },         // 注意：用 params 而非 payload
  "timestamp": 1710000000000
}
```

**支持命令：** `tuning_initialize`（约束提取）, `inject_strategy`（初始策略注入）, `full_optimization`（完整优化闭环）, `health_check`

### A8 StrategyGame（策略博弈台）

| 项 | 值 |
|----|-----|
| 接收端点 | `POST {A8_BASE_URL}/api/webhook/workbench-command` |
| 认证 | `X-API-Key: {A8_API_KEY}` |
| HTTP 请求超时 | 15 秒 |
| 后端 | 与 A6 共享 ros-agent-00 后端（地址相同） |

**请求体：**

```json
{
  "commandId": "wb-xxx",
  "commandType": "strategy_compare",
  "params": { ... },         // 与 A6 协议一致
  "timestamp": 1710000000000
}
```

**支持命令：** `strategy_compare`（策略博弈对比，基于既有任务产物构建 A/B/C 方案对比矩阵）, `health_check`

**环境变量回退：** `A8_BASE_URL` 回退到 `A6_BASE_URL`；`A8_API_KEY` 回退到 `A6_API_KEY`。如果 A8 与 A6 共享同一后端，只需配置 A6 的环境变量即可。

---

## 9. 环境变量配置清单

### 子应用必须配置的环境变量

| 变量名 | 说明 | 来源 |
|--------|------|------|
| `STAFF_JWT_SECRET` | Staff Token 验证密钥（**必须与 Workbench 一致**） | Workbench 团队提供 |
| `JWT_SECRET` | 本应用 Session Token 签名密钥 | 各应用自行生成 |
| `WEBHOOK_API_KEY` | Webhook 认证密钥（上报事件/回调时使用） | Workbench 团队提供 |
| `WORKBENCH_URL` | Workbench 服务地址 | `http://120.24.232.253:5000` |

### 各 Agent 特有的环境变量（Workbench 侧配置）

| Agent | API Key 变量 | 基础 URL 变量 | 其他变量 |
|-------|-------------|--------------|---------|
| A1 | 共用 `WEBHOOK_API_KEY` | `A1_BASE_URL` | — |
| A2 | `A2_API_KEY` | `A2_BASE_URL` | — |
| A3 | `A3_API_KEY` | `A3_BASE_URL` | — |
| A4 | `A4_API_KEY` | `A4_BASE_URL` | — |
| A6 | `A6_API_KEY` | `A6_BASE_URL` | `A6_FRONTEND_URL`（A6 React 前端地址，用于 Workbench 跳转到 A6 详情页） |
| A8 | `A8_API_KEY`（回退 `A6_API_KEY`） | `A8_BASE_URL`（回退 `A6_BASE_URL`） | — |

> **`A6_FRONTEND_URL` 说明：** A6 有独立的 React 前端部署（默认 `http://120.24.232.253:13000`），与 A6 LangGraph 后端地址（`A6_BASE_URL`，默认 `http://120.24.232.253:18010`）不同。Workbench 使用此变量构建跳转到 A6 TuningAgent / StrategyGenerator 详情页面的链接。

---

## 10. 接入自查与联调指南

### 自查清单

请各智能体团队逐项检查：

| # | 检查项 | 验收标准 |
|---|--------|---------|
| 1 | `/api/auth/staff-callback` 端点 | GET 端点，注册在认证中间件之前，能正确处理 staff_token |
| 2 | Staff Token 验证 | 使用 `STAFF_JWT_SECRET` (HS256) 验证，过期/伪造/缺失均返回错误 |
| 3 | 用户 upsert | 用 `openId` 作为唯一匹配键，不用 name/email |
| 4 | Cookie 安全 | `httpOnly=true`；`secure` 和 `sameSite` 根据协议动态设置 |
| 5 | 项目列表来源 | 通过 Workbench `/api/ext/projects` API 获取，非本地数据库 |
| 6 | Webhook 认证 | 上报事件时携带 `X-API-Key` 请求头 |
| 7 | 指令接收 | 实现了 `/api/webhook/workbench-command` 端点 |
| 8 | 指令回调 | 收到指令后通过 dispatch-callback 上报状态变更 |
| 9 | 多租户 | 业务数据按 `projectId` 隔离 |
| 10 | returnPath 安全 | 校验必须以 `/` 开头且不以 `//` 开头 |
| 11 | 反向 SSO | 前端能处理 URL query 中的 `?staff_token=xxx` 参数 |

### 联调流程

1. **环境准备** — 配置环境变量，确保 `STAFF_JWT_SECRET` 与 Workbench 一致
2. **SSO 验证** — 从 Workbench 跳转到子应用（正向 SSO），确认用户身份和项目正确传递
3. **反向 SSO 验证** — 直接访问子应用 → 跳转 Workbench 登录 → 回跳子应用，确认 `staff_token` 正确接收
4. **项目查询** — 调用 Workbench `/api/ext/projects` API，确认返回正确的项目列表
5. **事件上报** — 发送测试事件到 Workbench，确认 Dashboard 显示正确
6. **指令接收** — 从 Workbench 下发测试指令，确认子应用正确接收和回调
7. **超时测试** — 验证超时场景下 Workbench 正确标记指令状态

### 联调完成后回报

请提供以下信息：

- [x] staff-callback 端点 URL 及注册位置
- [x] 环境变量 `STAFF_JWT_SECRET`、`WORKBENCH_URL`、`WEBHOOK_API_KEY` 已配置
- [x] 项目列表数据来源为 Workbench API
- [x] 测试通过情况（列出通过/失败的测试用例数）
- [x] 指令接收端点 URL
- [x] 支持的命令类型列表

---

## 附录：各智能体部署信息

| 编号 | 名称 | GitLab 仓库 | 部署 URL |
|------|------|------------|---------|
| 核心 | Workbench | [ros_agent/ros-agent-00](https://git.smartcomma.com/ros_agent/ros-agent-00)（dev 分支，workbench 目录） | http://120.24.232.253:5000 |
| A1 | 数据探针 | [ros_agent/data-probe-app](https://git.smartcomma.com/ros_agent/data-probe-app) | http://120.24.232.253:13001 |
| A2 | 调度特征分析 | [ros_agent/stability-analyzer](https://git.smartcomma.com/ros_agent/stability-analyzer) | http://120.24.232.253:13002 |
| A3 | 商业分析 | [ros_agent/business-analyzer](https://git.smartcomma.com/ros_agent/business-analyzer) | http://120.24.232.253:13003 |
| A4 | 经纬度核查 | [ros_agent/address-validator](https://git.smartcomma.com/ros_agent/address-validator) | http://120.24.232.253:13004 |
| A6 | 参数镜像（LangGraph 后端） | — | http://120.24.232.253:18010 |
| A6 | 参数镜像（React 前端） | — | http://120.24.232.253:13000 |
| A8 | 策略博弈台 | — | 与 A6 共享后端（http://120.24.232.253:18010） |
