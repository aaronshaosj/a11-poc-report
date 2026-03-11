# A11 POC Report — 上游数据需求与接口缺口分析

> 生成日期：2026-03-11
> 分析范围：A11 POC Report 前端模块（22 个图表 + 5 个 KPI 卡片 + 策略评分系统）
> 参考文档：`docs/Process_Waybill_API_20260311.md`（人工运单接口，4 个 API）

---

## 目录

- [第一部分：A11 模块总体分析](#第一部分a11-模块总体分析)
  - [1. 模块功能概述](#1-模块功能概述)
  - [2. 前端数据模型总览](#2-前端数据模型总览)
  - [3. 数据来源架构](#3-数据来源架构)
- [第二部分：人工运单 API 缺口分析](#第二部分人工运单-api-缺口分析)
  - [4. 现有 API 能力摘要](#4-现有-api-能力摘要)
  - [5. 批次元数据（OrderBatch）映射](#5-批次元数据orderbatch映射)
  - [6. 车辆级明细（VehicleDetail）映射 — 人工策略部分](#6-车辆级明细vehicledetail映射--人工策略部分)
  - [7. 仿真聚合结果（SimulationResult）映射 — 人工策略部分](#7-仿真聚合结果simulationresult映射--人工策略部分)
  - [8. 人工运单 API 缺口汇总与增强建议](#8-人工运单-api-缺口汇总与增强建议)
- [第三部分：算法配载结果获取需求](#第三部分算法配载结果获取需求)
  - [9. 算法配载接口的定位与调用模式](#9-算法配载接口的定位与调用模式)
  - [10. 算法配载结果所需的完整数据结构](#10-算法配载结果所需的完整数据结构)
  - [11. 约束配置与车辆规格需求](#11-约束配置与车辆规格需求)
  - [12. 策略元数据需求](#12-策略元数据需求)
- [附录](#附录)
  - [A. 字段覆盖率统计](#a-字段覆盖率统计)
  - [B. 22 个图表与数据字段依赖矩阵](#b-22-个图表与数据字段依赖矩阵)

---

# 第一部分：A11 模块总体分析

## 1. 模块功能概述

A11 POC Report 是 C-ROS Agentic Workbench 的报告模块，用于生成**人工调度与算法调度策略的交互式对比报告**。

| 功能模块 | 说明 |
|---------|------|
| **报告列表页** (`/`) | 管理 POC 报告记录，支持创建、查看状态 |
| **报告详情页** (`/report/:id`) | 展示 22 个交互式 ECharts 图表 + 5 个 KPI 卡片 + AI 洞察文本 |
| **经济性分析 (E1-E8)** | 车次数、总里程、总工时、满载率、按车型分析、成本、节降趋势 |
| **约束合规分析 (C1-C5)** | 约束违反率、超限分布、热力图 |
| **可行性分析 (F1-F7)** | 路线跨度、跨区、绕路率、卸货点、TopK 邻近度、雷达评分 |
| **综合评分 (S1-S2)** | 策略雷达图 + 综合排名 |

**核心数据流**：批次(Batch) × 策略(Strategy) → 仿真结果(SimulationResult) → 车辆明细(VehicleDetail[]) → 图表渲染

支持最多 **8 种策略**（1 个人工 + 最多 7 个算法）和任意数量批次的对比。

---

## 2. 前端数据模型总览

前端定义了以下核心数据实体（源自 `src/types/index.ts`）：

| 数据实体 | 记录量级 | 用途 | 数据来源 |
|---------|---------|------|---------|
| `OrderBatch` | 每报告 1-7 个 | 批次元数据，X 轴标签 | 人工运单 API + 算法 API 共用 |
| `Strategy` | 每报告 1-8 个 | 策略定义，图例/系列区分 | 人工策略(固定1条) + 算法策略API |
| `SimulationResult` | batches × strategies 个 | 每个批次×策略的聚合指标 | 人工：Process Waybill API；算法：算法配载 API |
| `VehicleDetail` | 每 SimulationResult 15-50 条 | 车辆级明细，分布图/箱线图数据源 | 同上 |
| `ConstraintViolation` | 每 SimulationResult 0-7 条 | 约束违反聚合统计 | 算法 API 提供约束配置，前端可计算 |
| `ProjectConstraints` | 全局 1 份 | 约束阈值定义 | 算法配载 API（含约束条件） |
| `DataAvailability` | 每报告 1 份 | 控制图表条件渲染 | 前端根据数据完整度推导 |
| `PocReport` | 全部报告列表 | 报告元数据 | 前端/报告管理 API |

---

## 3. 数据来源架构

```
┌─────────────────────────────────────────────────────────────┐
│                    A11 POC Report 前端                        │
│                                                             │
│  OrderBatch ←── list_batches (人工 API) ──────────────────┐ │
│                                                           │ │
│  SimulationResult (人工) ←── process_waybill (人工 API) ──┤ │
│                                                           │ │
│  SimulationResult (算法) ←── 算法配载 API (待对接) ────────┤ │
│       └─ 含 约束配置 / 策略定义 / 可行性指标               │ │
│                                                           │ │
│  22 Charts + 5 KPIs + AI Insights ←── 聚合计算 ──────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**关键认知**：
- **人工运单 API**（Process Waybill API）→ 提供人工经验策略(s1)的基线数据
- **算法配载 API**（待提供文档）→ 提供算法策略(s2~s8)的仿真结果，**同时包含约束条件定义**
- 两类 API 的返回数据需要在前端**统一转换**为 `SimulationResult` + `VehicleDetail[]` 结构后供图表消费

---

# 第二部分：人工运单 API 缺口分析

> 本部分聚焦分析 `Process_Waybill_API_20260311.md` 对于 A11 模块中**人工策略(s1)数据需求**的满足程度。

## 4. 现有 API 能力摘要

| 接口 | 功能 | 关键返回字段 |
|------|------|-------------|
| `GET /vrp/list_batches` | 枚举批次列表 | `batch_code`, `transport_date`, `route_count`, `node_count`, `created_at` |
| `POST /vrp/process_waybill` | 处理单个批次 | `human_benchmark` + `waybill_routes.shipments[]` + `routes_detail[]` |
| `POST /vrp/process_waybill_batch` | 批量处理 | 同上，按 batch_code 分组 |
| `GET /vrp/session/status` | 轮询状态 | 异步任务状态 + 结果 |

---

## 5. 批次元数据（OrderBatch）映射

前端 `OrderBatch` 接口定义（`src/types/index.ts:1-9`）：

```typescript
interface OrderBatch {
  id: string;          // 批次标识
  name: string;        // 显示名称（如 "苏南18"）
  orderCount: number;  // 订单总数
  stopCount: number;   // 卸货点总数
  totalWeight: number; // 总重量 (kg)
  totalVolume: number; // 总体积 (m³)
  date: string;        // 日期 "YYYY-MM-DD"
}
```

### 映射表

| 前端字段 | API 来源 | 状态 | 说明 |
|---------|---------|------|------|
| `id` | `list_batches → batch_code` | ✅ 可直接映射 | — |
| `name` | `list_batches → batch_code` | ⚠️ **Gap** | API 无独立 `name`/`display_name` 字段。`batch_code` 为系统编码（如 `"1031"`），不适合直接展示。Mock 数据使用友好名称如 `"苏南18"` |
| `orderCount` | ❌ | ⚠️ **Gap** | `list_batches` 不返回订单数。`node_count` 含 DC 节点不等同于订单数。需调用 `process_waybill` 后从 `shipments[].node_list` 中统计 `type="customer"` 节点的去重 `order_number` 数量 |
| `stopCount` | `list_batches → node_count` | ⚠️ **Gap** | `node_count` 包含 DC 节点。实际卸货点数 = `node_count - route_count`（每条路线有 1 个 DC 节点） |
| `totalWeight` | ❌ | ⚠️ **Gap** | `list_batches` 不返回。需调用 `process_waybill` 后累加 `shipments[].weight` |
| `totalVolume` | ❌ | ⚠️ **Gap** | 同上，需累加 `shipments[].volume` |
| `date` | `list_batches → transport_date` | ⚠️ **Gap** | 格式匹配 `"YYYY-MM-DD"`，但 **可能为 null**（API 示例中 batch_code="1031" 的 transport_date 为 null） |

### 建议增强 `list_batches` 返回

目前前端需要先调 `list_batches` 获取批次列表，再逐个调 `process_waybill` 才能获得完整的批次元数据，增加了不必要的 API 调用。建议在 `list_batches` 中增加以下字段：

```json
{
  "batch_code": "1031",
  "transport_date": "2026-01-08",
  "route_count": 40,
  "node_count": 297,

  "order_count": 261,
  "stop_count": 257,
  "total_weight": 71557.0,
  "total_volume": 231.78,
  "batch_name": "苏南18"
}
```

| 新增字段 | 说明 | 优先级 |
|---------|------|--------|
| `order_count` | 去重订单数（排除 DC） | 🟡 P2（可从明细计算） |
| `stop_count` | 卸货点数（= node_count - route_count） | 🟡 P2（可前端计算） |
| `total_weight` | 所有运单重量之和 (kg) | 🟠 P1（避免额外调用） |
| `total_volume` | 所有运单体积之和 (m³) | 🟠 P1（同上） |
| `batch_name` | 批次友好名称 | 🟡 P2（可前端映射） |

> **transport_date 为 null 的处理**：前端需要日期字段用于 X 轴排序和标签显示。建议后端确保该字段有值，或增加 fallback 策略（如用 `created_at` 的日期部分）。

---

## 6. 车辆级明细（VehicleDetail）映射 — 人工策略部分

前端 `VehicleDetail` 接口定义（`src/types/index.ts:20-56`），每条记录代表一辆车的调度结果。

### 6.1 API 已覆盖的字段

通过 `waybill_routes.shipments[]` 可获取以下数据：

| 前端字段 | 类型 | API 来源 | 映射方式 | Gap |
|---------|------|---------|---------|-----|
| `vehicleId` | string | `shipment_order_code` | ✅ 直接映射 | — |
| `vehicleType` | string | `vehicle_type_name` | ⚠️ 需映射 | 见下方 Gap-1 |
| `orderCount` | number | `node_list` | ⚠️ 需计算 | `= new Set(node_list.filter(n => n.type==='customer').map(n => n.order_number)).size` |
| `stopCount` | number | `node_list` | ⚠️ 需计算 | `= node_list.filter(n => n.type==='customer').length` |
| `distance` | number (km) | `route_distance` | ⚠️ 需转换 | 见下方 Gap-2 |
| `duration` | number (min) | `total_time` | ⚠️ 需确认 | 见下方 Gap-3 |
| `loadRate` | number (%) | `volume_rate` | ⚠️ 需转换 | 见下方 Gap-4 |
| `weightLoad` | number (kg) | `weight` | ✅ 直接映射 | — |
| `volumeLoad` | number (m³) | `volume` | ✅ 直接映射 | — |
| `qtyLoad` | number | `box` | ✅ 直接映射 | — |
| `palletLoad` | number | `pallet` | ✅ 直接映射 | — |

### 6.2 需要前端转换/计算的 Gap 详情

#### Gap-1：车型命名不一致

| API 返回 | 前端 Mock 中使用 | 问题 |
|---------|-----------------|------|
| `"4.2厢车"` | `"4.2米厢式"` | 命名风格不同 |
| （未见冷藏示例） | `"4.2米冷藏"`, `"6.8米冷藏"`, `"9.6米冷藏"` | 不确定 API 是否区分冷藏/厢式 |

**影响**：前端按 `vehicleType` 分组统计（E5 按车型满载率、E6 按车型车次数、C4 按车型约束热力图）。车型名不一致会导致分组错误。

**建议**：
- 方案 A：后端返回统一规范的 `vehicle_type_name`，与前端约定枚举值
- 方案 B：后端增加 `vehicle_type_code`（如 `"4.2_COLD"`, `"6.8_COLD"`），前端维护映射表
- 方案 C（最小改动）：前端建立 `{"4.2厢车": "4.2米厢式", ...}` 映射表

#### Gap-2：距离单位 — 米 vs 公里

- API：`route_distance` 单位为**米**（如 `43000.0`）
- 前端：`distance` 单位为**公里**（如 `43.0`）
- **转换**：`distance = route_distance / 1000`
- **风险**：无。简单除法，前端可安全处理。

#### Gap-3：时长单位不明确 🔴

- API 文档原文：`total_time` — "该路线时长"，`human_benchmark.total_time` — "所有路线时长总和（数据库原值）"
- **文档未标注单位**，仅说"数据库原值"
- 示例中：单条路线 `total_time: 130.7`，全批次 `total_time: 14619.3`
- 前端期望单位为**分钟**
- 40 条路线总时长 14619.3，平均每条 365.5 → 如果单位是分钟 ≈ 6.1 小时/条，合理
- 如果单位是秒：14619.3 秒 ÷ 40 ≈ 6.1 分钟/条，偏短（物流配送不太可能）

**结论**：大概率为**分钟**，但 **必须由后端明确确认**。这是当前最关键的数据质量风险。

#### Gap-4：装载率格式

- API：`volume_rate` 范围 0~1（如 `0.0702`）
- 前端：`loadRate` 范围 0~100（如 `7.02`）
- **转换**：`loadRate = volume_rate * 100`
- **注意**：`volume_rate` 仅代表**体积装载率**，前端的 `loadRate` 在语义上也对应体积装载率，映射合理。

### 6.3 API 完全缺失的字段

以下字段在人工运单 API 中**没有直接返回**，部分可通过 API 返回的原始数据**衍生计算**：

| 前端字段 | 说明 | 能否从 API 数据衍生 | 衍生方式 | 影响的图表 |
|---------|------|-------------------|---------|-----------|
| `routeSpan` | 路线跨度 (km) | ⚠️ 可计算 | 遍历 `node_list` 经纬度，求最远两点 Haversine 距离 | F1, F7 |
| `crossRegionCount` | 跨区数 | ⚠️ 困难 | 需从 `address` 解析行政区（"上海市浦东新区..."），逻辑复杂 | F2, F7 |
| `topKAvg` | Top-3 近邻均距 (km) | ❌ 不可行 | 需要所有节点间距矩阵，`distances_between` 仅有相邻点距离 | F5, F7 |
| `maxStopInterval` | 最大相邻点间距 (km) | ⚠️ 依赖数据 | `Math.max(...distances_between) / 1000`，**但示例中该数组为空 `[]`** | F6, F7 |
| `weightUtil` | 重量装载率 (%) | ❌ 缺车辆容量 | `weight / 车辆最大载重 * 100`，需要车辆容量数据 | 装载分析 |
| `volumeUtil` | 体积装载率 (%) | ✅ 等价 | `= volume_rate * 100`（与 loadRate 相同来源） | 装载分析 |
| `palletUtil` | 托盘装载率 (%) | ❌ 缺车辆容量 | `pallet / 车辆最大托盘数 * 100` | 装载分析 |
| `qtyUtil` | 件数装载率 (%) | ❌ 缺车辆容量 | `box / 车辆最大件数 * 100` | 装载分析 |
| `detourRatio` | 绕路率 (%) | ⚠️ 可计算 | `route_distance / 直线距离(DC→最远点→DC) * 100`，需经纬度 | F3, F7 |

#### 关于 `distances_between` 的问题 🔴

API 文档定义了 `distances_between: array<float>` 为"相邻节点间驾驶距离（米）"，但 **示例数据中该数组为空 `[]`**。

这是一个关键数据缺口：
- 如果该字段能正常返回数据，前端可以计算 `maxStopInterval`（最大卸货点间距）
- 当前为空意味着 F6 (IntervalCDFChart) 对于人工策略将无数据

**建议**：确认此字段是否为已知 bug 还是数据确实缺失。如果后端能填充此数组，可大幅减少前端需要的可行性指标衍生计算量。

### 6.4 不属于人工运单 API 职责的字段

以下字段属于约束合规分析，其数据来源应为算法配载 API 提供的**约束配置**，人工运单 API 不需要提供：

| 字段 | 说明 | 数据来源 |
|------|------|---------|
| `durationOverLimit` | 超时分钟数 | 前端根据约束阈值计算：`max(0, duration - maxDurationLimit)` |
| `distanceOverLimit` | 超距公里数 | 前端根据约束阈值计算 |
| `weightOverLimit` | 超重公斤数 | 前端根据约束阈值 + 车辆容量计算 |
| `volumeOverLimit` | 超体积 m³ | 同上 |
| `qtyOverLimit` | 超件数 | 同上 |
| `crossRegionOverLimit` | 超跨区数 | 需 crossRegionCount + 约束阈值 |
| `stopOverLimit` | 超卸货点数 | 需 stopCount + 约束阈值 |

> 这些字段的计算依赖于约束阈值配置（`ProjectConstraints`），后者预计由算法配载 API 提供。

---

## 7. 仿真聚合结果（SimulationResult）映射 — 人工策略部分

前端 `SimulationResult` 接口定义（`src/types/index.ts:67-86`）：

### 7.1 API 已覆盖的聚合指标

| 前端字段 | API 来源 | 状态 | 转换 |
|---------|---------|------|------|
| `batchId` | `batch_code` | ✅ | — |
| `strategyId` | 固定为 `"s1"` / `"manual"` | ✅ | 前端硬编码 |
| `vehicleCount` | `human_benchmark.route_count` | ✅ | — |
| `totalDistance` | `human_benchmark.total_distance` | ⚠️ | ÷ 1000（米→公里） |
| `totalDuration` | `human_benchmark.total_time` | ⚠️ | 需确认单位 |
| `avgLoadRate` | `human_benchmark.avg_volume_rate` | ⚠️ | × 100（0~1 → 0~100） |

### 7.2 需要前端从明细聚合的字段

| 前端字段 | 聚合方式 | 数据来源 |
|---------|---------|---------|
| `maxDistance` | `Math.max(...shipments.map(s => s.route_distance)) / 1000` | `waybill_routes.shipments[]` |
| `maxDuration` | `Math.max(...shipments.map(s => s.total_time))` | `waybill_routes.shipments[]` |
| `maxStopInterval` | 需从 `distances_between` 全局取最大 | ⚠️ 依赖该数组非空 |
| `vehicleCountByType` | 按 `vehicle_type_name` 分组计数 | `waybill_routes.shipments[]` |
| `avgLoadRateByType` | 按 `vehicle_type_name` 分组求均 `volume_rate` × 100 | `waybill_routes.shipments[]` |
| `vehicleDetails` | 逐条转换 shipment → VehicleDetail | `waybill_routes.shipments[]` |

### 7.3 人工运单 API 不覆盖的字段

| 字段 | 说明 | 数据来源 |
|------|------|---------|
| `totalCost` | 成本数据 | 无（非人工运单 API 职责，属 P2 功能） |
| `costByType` | 按车型成本 | 同上 |
| `constraintViolations` | 约束违反统计 | 前端根据约束配置（来自算法 API）+ VehicleDetail 计算 |

---

## 8. 人工运单 API 缺口汇总与增强建议

### 8.1 必须确认的问题（Blockers）

| # | 问题 | 影响 | 建议 |
|---|------|------|------|
| 🔴 1 | **`total_time` 单位是什么？** | 影响 E3（总工时图）、KPI 卡片、所有时长相关图表 | 后端在文档中明确标注单位（分钟/秒/小时） |
| 🔴 2 | **`distances_between` 为何为空？** | 影响 F6（间距 CDF 图）、`maxStopInterval` 的计算 | 确认是 bug 还是数据确实缺失 |
| 🟠 3 | **`transport_date` 可以为 null 吗？** | 影响批次时间排序和 X 轴标签 | 确认是否所有批次都保证有日期 |

### 8.2 建议增强的字段

#### 增强 `list_batches` 返回（减少 API 调用次数）

```diff
 {
   "batch_code": "1031",
   "transport_date": "2026-01-08",
   "route_count": 40,
   "node_count": 297,
+  "order_count": 261,
+  "total_weight": 71557.0,
+  "total_volume": 231.78,
   "created_at": "2026-02-11T10:03:23.500213+08:00"
 }
```

理由：当前前端需要先 `list_batches` 再逐个 `process_waybill` 才能获得批次重量/体积，对于批次选择器场景增加了不必要的延迟。

#### 增强 `human_benchmark` 返回（减少前端聚合计算）

```diff
 "human_benchmark": {
   "route_count": 40,
   "total_distance": 3849400.0,
   "total_time": 14619.3,
-  "avg_volume_rate": 0.4113
+  "avg_volume_rate": 0.4113,
+  "max_distance": 165300.0,
+  "max_time": 520.0,
+  "total_weight": 71557.0,
+  "total_volume": 231.78,
+  "vehicle_count_by_type": {
+    "4.2厢车": 15,
+    "6.8冷藏": 18,
+    "9.6冷藏": 7
+  }
 }
```

#### 确保 `distances_between` 有数据

```diff
 {
   "shipment_order_code": "Sys20251029200706598",
-  "distances_between": []
+  "distances_between": [15200.0, 8300.0, 12500.0, 6800.0]
 }
```

数组长度应为 `node_list.length - 1`（DC→第一个客户 + 客户间距离），单位为米。

### 8.3 前端适配层转换逻辑

即使 API 不做任何改动，前端也可以通过数据适配层完成映射。以下是转换伪代码：

```typescript
// 将 Process Waybill API 响应转为前端 SimulationResult
function transformManualResult(
  batchCode: string,
  apiResult: ProcessWaybillResult
): SimulationResult {
  const { human_benchmark, waybill_routes } = apiResult;
  const shipments = waybill_routes.shipments;

  // 转换车辆明细
  const vehicleDetails: VehicleDetail[] = shipments.map(s => ({
    vehicleId: s.shipment_order_code,
    vehicleType: mapVehicleType(s.vehicle_type_name),  // "4.2厢车" → "4.2米厢式"
    orderCount: new Set(
      s.node_list.filter(n => n.type === 'customer').map(n => n.order_number)
    ).size,
    stopCount: s.node_list.filter(n => n.type === 'customer').length,
    distance: s.route_distance / 1000,                 // 米 → 公里
    duration: s.total_time,                             // 需确认单位为分钟
    loadRate: s.volume_rate * 100,                      // 0~1 → 0~100
    weightLoad: s.weight,
    volumeLoad: s.volume,
    qtyLoad: s.box,
    palletLoad: s.pallet || undefined,
    // 衍生字段（需计算）
    routeSpan: calcRouteSpan(s.node_list),              // 需经纬度
    maxStopInterval: s.distances_between.length > 0
      ? Math.max(...s.distances_between) / 1000 : 0,
    // 以下字段暂时无法从人工API获取
    crossRegionCount: 0,    // 需行政区数据
    topKAvg: 0,             // 需节点间距矩阵
    weightUtil: 0,          // 需车辆容量
    volumeUtil: s.volume_rate * 100,
    palletUtil: 0,          // 需车辆容量
    qtyUtil: 0,             // 需车辆容量
  }));

  // 按车型分组
  const vehicleCountByType: Record<string, number> = {};
  const avgLoadRateByType: Record<string, number> = {};
  // ... 聚合逻辑

  return {
    batchId: batchCode,
    strategyId: 'manual',
    vehicleCount: human_benchmark.route_count,
    totalDistance: human_benchmark.total_distance / 1000,
    totalDuration: human_benchmark.total_time,
    avgLoadRate: human_benchmark.avg_volume_rate * 100,
    maxDistance: Math.max(...shipments.map(s => s.route_distance)) / 1000,
    maxDuration: Math.max(...shipments.map(s => s.total_time)),
    maxStopInterval: /* 依赖 distances_between */ 0,
    vehicleDetails,
    vehicleCountByType,
    avgLoadRateByType,
    constraintViolations: [], // 后续根据约束配置计算
  };
}
```

### 8.4 人工运单 API 缺口总结

| 类别 | 现状 | 行动项 |
|------|------|--------|
| **基础映射** (vehicleId, weight, volume, box, pallet) | ✅ 可直接使用 | 无需改动 |
| **简单转换** (distance, loadRate) | ⚠️ 单位/格式差异 | 前端适配层处理 |
| **待确认** (total_time 单位, distances_between 空值) | 🔴 阻塞 | **需后端确认** |
| **可衍生** (orderCount, stopCount, routeSpan, detourRatio) | ⚠️ 可前端计算 | 建议后端提供以减轻前端负担 |
| **不可衍生** (topKAvg, weightUtil, crossRegionCount) | ❌ 数据不足 | 依赖算法 API 补充或专项增强 |

---

# 第三部分：算法配载结果获取需求

> 本部分描述 A11 模块对算法配载结果的数据需求规格，供算法配载 API 的接口设计参考。

## 9. 算法配载接口的定位与调用模式

### 9.1 接口定位

A11 报告的核心价值在于**人工 vs 算法的对比**。算法配载 API 需要提供：
1. **算法策略元数据** — 策略名称、类型、参数
2. **算法配载结果** — 与人工运单对齐的数据结构，支持逐字段对比
3. **约束条件配置** — 用于约束合规分析（C1-C5 图表）

### 9.2 建议调用模式

```
前端请求：
  "我要查看 batch_code=1031 在策略 balanced_v2 下的配载结果"

调用形式：
  POST /vrp/algo_result
  {
    "user_id": 539,
    "group_id": 539,
    "batch_code": "1031",
    "strategy_id": "balanced_v2"
  }

或批量形式：
  POST /vrp/algo_result_batch
  {
    "user_id": 539,
    "group_id": 539,
    "batch_codes": ["1031", "agent-batch1"],
    "strategy_ids": ["balanced_v2", "distance_first_v1"]
  }
```

这样，对于每个报告，前端可以：
1. 调用 `list_batches` 获取批次列表
2. 调用 `process_waybill_batch` 获取所有批次的**人工策略**数据
3. 调用算法配载 API 获取所有 batch × strategy 组合的**算法策略**数据
4. 统一转换后渲染图表

---

## 10. 算法配载结果所需的完整数据结构

以下是前端对算法配载 API 返回数据的完整需求。

### 10.1 聚合层（对应 SimulationResult）

每个 `(batch_code, strategy_id)` 组合需返回：

```json
{
  "batch_code": "1031",
  "strategy_id": "balanced_v2",
  "summary": {
    "vehicle_count": 21,
    "total_distance": 1789200.0,
    "total_duration": 5482.0,
    "avg_load_rate": 0.961,
    "max_distance": 165300.0,
    "max_duration": 480.0,
    "max_stop_interval": 42100.0,
    "vehicle_count_by_type": {
      "4.2米冷藏": 8,
      "6.8米冷藏": 10,
      "9.6米冷藏": 3
    },
    "avg_load_rate_by_type": {
      "4.2米冷藏": 0.942,
      "6.8米冷藏": 0.965,
      "9.6米冷藏": 0.971
    },
    "total_cost": 11850.25,
    "cost_by_type": {
      "4.2米冷藏": 3200.0,
      "6.8米冷藏": 5100.0,
      "9.6米冷藏": 3550.25
    }
  },
  "vehicles": [ ... ],
  "constraint_violations": [ ... ]
}
```

**聚合字段说明**：

| 字段 | 类型 | 单位 | 必需 | 说明 |
|------|------|------|:----:|------|
| `vehicle_count` | int | — | ✅ | 算法配载方案的总车次数 |
| `total_distance` | float | 米 | ✅ | 所有车辆总行驶里程 |
| `total_duration` | float | 分钟 | ✅ | 所有车辆总工作时长（**请明确单位**） |
| `avg_load_rate` | float | 0~1 | ✅ | 所有车辆平均装载率 |
| `max_distance` | float | 米 | ✅ | 单车最大里程 |
| `max_duration` | float | 分钟 | ✅ | 单车最大时长 |
| `max_stop_interval` | float | 米 | 🟡 | 全局最大相邻卸货点间距 |
| `vehicle_count_by_type` | object | — | ✅ | 按车型分组的车次数 |
| `avg_load_rate_by_type` | object | 0~1 | ✅ | 按车型分组的平均装载率 |
| `total_cost` | float | 元 | 🟡 | 总运输成本（如有） |
| `cost_by_type` | object | 元 | 🟡 | 按车型拆分的成本 |

### 10.2 车辆明细层（对应 VehicleDetail）

`vehicles` 数组中每个元素需包含：

```json
{
  "vehicle_id": "V-1031-bal-001",
  "vehicle_type": "6.8米冷藏",
  "order_count": 7,
  "stop_count": 6,
  "distance": 85200.0,
  "duration": 260.0,
  "load_rate": 0.962,

  "weight_load": 4820.0,
  "volume_load": 31.69,
  "qty_load": 1167,
  "pallet_load": 12,

  "weight_util": 0.964,
  "volume_util": 0.932,
  "qty_util": 0.972,
  "pallet_util": 0.948,

  "route_span": 38100.0,
  "cross_region_count": 1,
  "top_k_avg": 4500.0,
  "max_stop_interval": 10200.0,
  "detour_ratio": 1.12,

  "node_list": [
    {
      "code": "SHCSC",
      "name": "SHCSC",
      "lng": 121.272,
      "lat": 31.047,
      "type": "dc"
    },
    {
      "order_number": "888809641",
      "code": "ST0097",
      "name": "上海世纪联华",
      "lng": 121.5648,
      "lat": 31.277,
      "volume": 0.567,
      "weight": 120.0,
      "box": 6,
      "type": "customer"
    }
  ],
  "distances_between": [15200.0, 8300.0, 12500.0, 6800.0]
}
```

**车辆明细字段说明**：

| 字段 | 类型 | 单位 | 必需 | 说明 | 对应图表 |
|------|------|------|:----:|------|---------|
| `vehicle_id` | string | — | ✅ | 车辆/路线唯一标识 | 全部 |
| `vehicle_type` | string | — | ✅ | 车型名称 | E5, E6, C4 |
| `order_count` | int | — | ✅ | 该车辆配送的订单数 | 统计 |
| `stop_count` | int | — | ✅ | 卸货点数（不含 DC） | F4 |
| `distance` | float | 米 | ✅ | 总行驶里程 | E2, C3 |
| `duration` | float | 分钟 | ✅ | 总工作时长 | E3, C2 |
| `load_rate` | float | 0~1 | ✅ | 体积装载率 | E4, E5 |
| `weight_load` | float | kg | ✅ | 实际装载重量 | 统计 |
| `volume_load` | float | m³ | ✅ | 实际装载体积 | 统计 |
| `qty_load` | int | 件 | ✅ | 实际装载件数 | 统计 |
| `pallet_load` | int | 板 | 🟡 | 实际装载板数 | 统计 |
| `weight_util` | float | 0~1 | ✅ | 重量装载率 (= weight_load / 车辆最大载重) | C4 |
| `volume_util` | float | 0~1 | ✅ | 体积装载率 | C4 |
| `qty_util` | float | 0~1 | ✅ | 件数装载率 | C4 |
| `pallet_util` | float | 0~1 | 🟡 | 托盘装载率 | C4 |
| `route_span` | float | 米 | ✅ | 路线跨度（最远两客户点距离） | F1, F7 |
| `cross_region_count` | int | — | ✅ | 经过的行政区数量 | F2, F7 |
| `top_k_avg` | float | 米 | ✅ | Top-3 最近邻平均距离 | F5, F7 |
| `max_stop_interval` | float | 米 | ✅ | 最大相邻卸货点间距 | F6, F7 |
| `detour_ratio` | float | 比率 | ✅ | 绕路率 (1.0=最优, 1.25=25%绕路) | F3, F7 |
| `node_list` | array | — | 🟡 | 节点列表（含 DC + 客户） | 路线可视化 |
| `distances_between` | array | 米 | 🟡 | 相邻节点间距离 | F6 衍生 |

> 🟡 标记的字段为可选（nice-to-have），不影响核心图表渲染。

### 10.3 约束违反层（对应 ConstraintViolation）

如果算法配载 API 能直接返回约束违反统计，可省去前端计算。否则前端可根据 `VehicleDetail` + `ProjectConstraints` 自行计算。

**建议返回格式**：

```json
"constraint_violations": [
  {
    "type": "工作时长",
    "violated_count": 1,
    "total_count": 21,
    "violation_rate": 0.048,
    "max_overage": 25.3,
    "avg_overage": 25.3
  },
  {
    "type": "装载重量",
    "violated_count": 2,
    "total_count": 21,
    "violation_rate": 0.095,
    "max_overage": 85.0,
    "avg_overage": 62.5
  }
]
```

**约束类型枚举**（前端期望的 7 种）：

| type 值 | 说明 | 超限单位 |
|---------|------|---------|
| `"工作时长"` | duration > maxDurationLimit | 分钟 |
| `"行驶里程"` | distance > maxDistanceLimit | 米/公里 |
| `"装载重量"` | weightLoad > maxWeightLimit | kg |
| `"装载体积"` | volumeLoad > maxVolumeLimit | m³ |
| `"装载件数"` | qtyLoad > maxQtyLimit | 件 |
| `"跨区数量"` | crossRegionCount > maxCrossRegionLimit | 个 |
| `"卸货点数"` | stopCount > maxStopLimit | 个 |

---

## 11. 约束配置与车辆规格需求

前端定义了 `ProjectConstraints` 接口（`src/types/index.ts:88-102`）：

```typescript
interface ConstraintConfig {
  maxDurationLimit?: number;      // 最大工时（分钟）如 600
  maxDistanceLimit?: number;      // 最大里程（km）如 300
  maxWeightLimit?: number;        // 最大载重（kg）如 5000
  maxVolumeLimit?: number;        // 最大体积（m³）如 34
  maxQtyLimit?: number;           // 最大件数 如 1200
  maxPalletLimit?: number;        // 最大板数
  maxCrossRegionLimit?: number;   // 最大跨区数 如 3
  maxStopLimit?: number;          // 最大卸货点数 如 20
}

interface ProjectConstraints {
  global: ConstraintConfig;          // 全局约束
  byVehicleType?: Record<string, ConstraintConfig>;  // 车型级约束
}
```

**期望算法配载 API 提供约束配置**（可作为独立接口或在配载结果中附带）：

```json
{
  "constraints": {
    "global": {
      "max_duration_limit": 600,
      "max_distance_limit": 300000,
      "max_cross_region_limit": 3,
      "max_stop_limit": 20
    },
    "by_vehicle_type": {
      "4.2米冷藏": {
        "max_weight_limit": 2000,
        "max_volume_limit": 16,
        "max_qty_limit": 500
      },
      "6.8米冷藏": {
        "max_weight_limit": 5000,
        "max_volume_limit": 34,
        "max_qty_limit": 1200
      },
      "9.6米冷藏": {
        "max_weight_limit": 8000,
        "max_volume_limit": 55,
        "max_qty_limit": 2000
      }
    }
  }
}
```

> 约束配置同时用于：
> 1. 算法配载结果的约束违反分析
> 2. **人工运单数据的约束违反分析**（用相同阈值评估人工方案）
>
> 因此，即使人工运单 API 不提供约束配置，前端只需从算法 API 获取一次即可应用于所有策略。

---

## 12. 策略元数据需求

前端 `Strategy` 接口定义（`src/types/index.ts:11-18`）：

```typescript
interface Strategy {
  id: string;
  name: string;
  type: 'manual' | 'algorithm';
  iterations?: number;
  savingsRate?: number;
  color: string;  // 前端分配，无需后端提供
}
```

**期望算法 API 提供策略列表**：

```json
{
  "strategies": [
    {
      "id": "balanced_v2",
      "name": "均衡优化 v2.1",
      "type": "algorithm",
      "iterations": 12,
      "savings_rate": 0.082,
      "description": "兼顾里程、时效与满载率的均衡优化"
    },
    {
      "id": "distance_first_v1",
      "name": "里程优先 v1.0",
      "type": "algorithm",
      "iterations": 8,
      "savings_rate": 0.115,
      "description": "以最小化总里程为首要目标"
    }
  ]
}
```

**人工策略** (id=`"manual"`, name=`"人工经验策略"`, type=`"manual"`) 由前端硬编码，无需后端返回。

---

# 附录

## A. 字段覆盖率统计

### 人工运单 API 对前端数据需求的覆盖率

| 数据实体 | 总字段数 | ✅ 直接映射 | ⚠️ 需转换/计算 | ❌ 无法获取 |
|---------|---------|-----------|--------------|-----------|
| **OrderBatch** | 7 | 2 (id, date) | 3 (name, stopCount, orderCount) | 2 (totalWeight, totalVolume)¹ |
| **VehicleDetail (基础)** | 7 | 4 (vehicleId, weightLoad, volumeLoad, qtyLoad) | 3 (distance, duration, loadRate) | 0 |
| **VehicleDetail (分析)** | 7 | 0 | 2 (routeSpan², maxStopInterval³) | 5 (crossRegion, topKAvg, weightUtil, qtyUtil, palletUtil) |
| **VehicleDetail (可行性)** | 2 | 0 | 1 (detourRatio²) | 1 (routeOverlapCount) |
| **SimulationResult** | 9 | 3 (vehicleCount) | 5 (distance, duration, loadRate, maxDist, maxDur) | 1 (maxStopInterval³) |

> ¹ `totalWeight` / `totalVolume` 无法从 `list_batches` 获取，但可通过 `process_waybill` 结果累加得到
> ² 可从节点经纬度衍生计算
> ³ 依赖 `distances_between` 字段非空

### 算法配载 API 的预期覆盖率

如果算法 API 按本文档第 10-12 章的规格实现，预期覆盖率：

| 数据实体 | 覆盖率 |
|---------|--------|
| Strategy | 100%（含元数据） |
| VehicleDetail (全部) | 100%（含可行性指标） |
| SimulationResult | 100%（含成本、约束违反） |
| ProjectConstraints | 100% |

---

## B. 22 个图表与数据字段依赖矩阵

### 经济性图表 (E1-E8) — 人工 API 满足度

| 图表 | 核心数据 | 人工 API 可满足？ | 备注 |
|------|---------|:----------------:|------|
| E1 车次数对比 | `vehicleCount` per batch | ✅ | `human_benchmark.route_count` |
| E2 总里程对比 | `totalDistance` per batch | ✅ | 需 ÷1000 |
| E3 总工时对比 | `totalDuration` per batch | ⚠️ | 需确认 `total_time` 单位 |
| E4 满载率趋势 | `avgLoadRate` per batch | ✅ | 需 ×100 |
| E5 按车型满载率 | `avgLoadRateByType` | ⚠️ | 需从 shipments 聚合 + 车型名映射 |
| E6 按车型车次 | `vehicleCountByType` | ⚠️ | 需从 shipments 聚合 + 车型名映射 |
| E7 成本排名 | `totalCost` | ❌ | API 无成本数据 |
| E8 节降趋势 | 多批次 distance 对比 | ✅ | 人工策略仅有基线值 |

### 约束合规图表 (C1-C5) — 需约束配置（来自算法 API）

| 图表 | 核心数据 | 人工 API 可满足？ | 备注 |
|------|---------|:----------------:|------|
| C1 约束违反率 | `constraintViolations` | ❌ | 需约束阈值 + overLimit 计算 |
| C2 工时超限 | `durationOverLimit` | ❌ | 需约束阈值 |
| C3 里程超限 | `distanceOverLimit` | ❌ | 需约束阈值 |
| C4 装载超限热力图 | weight/volume/qty OverLimit | ❌ | 需约束阈值 + 车辆容量 |
| C5 违反散点 | constraintViolations | ❌ | 需约束阈值 |

> C1-C5 的人工策略数据可在获取到约束配置（来自算法 API）后由前端计算。

### 可行性图表 (F1-F7) — 大部分人工 API 不直接提供

| 图表 | 核心数据 | 人工 API 可满足？ | 备注 |
|------|---------|:----------------:|------|
| F1 路线跨度箱线图 | `routeSpan` | ⚠️ | 可从经纬度计算 |
| F2 跨区分析 | `crossRegionCount` | ❌ | 需行政区数据 |
| F3 绕路率 | `detourRatio` | ⚠️ | 可从经纬度+距离计算 |
| F4 卸货点箱线图 | `stopCount` | ✅ | 从 node_list 计算 |
| F5 TopK 邻近散点 | `topKAvg` | ❌ | 需节点间距矩阵 |
| F6 间距 CDF | `maxStopInterval` | ⚠️ | 需 distances_between 非空 |
| F7 可行性雷达 | 上述 6 维综合 | ⚠️ | 依赖各维度可用性 |

### 综合评分 (S1-S2) — 需完整数据

| 图表 | 核心数据 | 说明 |
|------|---------|------|
| S1 策略雷达 | 经济/约束/可行性得分 | 需所有维度完整 |
| S2 排名柱状图 | 综合加权得分 | 需所有维度完整 |
