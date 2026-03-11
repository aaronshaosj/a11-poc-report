# A11 POC Report — 上游数据需求与 API 缺口分析

> 生成日期：2026-03-11
> 分析范围：A11 POC Report 前端模块（22 个图表 + 5 个 KPI 卡片 + 策略评分系统）
> 对比文档：`docs/Process_Waybill_API_20260311.md`（Process Waybill API，4 个接口）

---

## 目录

1. [A11 模块功能概述](#1-a11-模块功能概述)
2. [前端数据模型总览](#2-前端数据模型总览)
3. [现有 API 能力摘要](#3-现有-api-能力摘要)
4. [字段级映射分析](#4-字段级映射分析)
   - 4.1 [OrderBatch（批次信息）](#41-orderbatch批次信息)
   - 4.2 [Strategy（策略定义）](#42-strategy策略定义)
   - 4.3 [VehicleDetail（车辆级明细）](#43-vehicledetail车辆级明细)
   - 4.4 [SimulationResult（仿真聚合结果）](#44-simulationresult仿真聚合结果)
   - 4.5 [ConstraintViolation（约束违反统计）](#45-constraintviolation约束违反统计)
   - 4.6 [ProjectConstraints（约束阈值配置）](#46-projectconstraints约束阈值配置)
5. [缺口汇总](#5-缺口汇总)
   - 5.1 [完全缺失的数据维度](#51-完全缺失的数据维度)
   - 5.2 [已有但不完全匹配的字段（Gap）](#52-已有但不完全匹配的字段gap)
   - 5.3 [需要新增的 API 接口](#53-需要新增的-api-接口)
6. [建议的补充数据格式与示例](#6-建议的补充数据格式与示例)
7. [优先级排序与实施建议](#7-优先级排序与实施建议)

---

## 1. A11 模块功能概述

A11 POC Report 是 C-ROS Agentic Workbench 的报告模块，用于生成人工调度与算法调度策略的交互式对比报告。核心功能包括：

| 功能模块 | 说明 |
|---------|------|
| **报告列表页** (`/`) | 管理 POC 报告记录，支持创建、查看状态 |
| **报告详情页** (`/report/:id`) | 展示 22 个交互式 ECharts 图表 + 5 个 KPI 卡片 + AI 洞察 |
| **经济性分析 (E1-E8)** | 车次数、总里程、总工时、满载率、按车型分析、成本、节降趋势 |
| **约束合规分析 (C1-C5)** | 约束违反率、超限分布、热力图 |
| **可行性分析 (F1-F7)** | 路线跨度、跨区、绕路率、卸货点、TopK 邻近度、雷达评分 |
| **综合评分 (S1-S2)** | 策略雷达图 + 综合排名 |

**核心数据流**：批次(Batch) × 策略(Strategy) → 仿真结果(SimulationResult) → 车辆明细(VehicleDetail[]) → 图表渲染

当前阶段使用 Mock 数据，支持最多 **8 种策略** 和任意数量批次的对比。

---

## 2. 前端数据模型总览

前端定义了以下核心数据实体（源自 `src/types/index.ts`）：

| 数据实体 | 记录量级 | 用途 |
|---------|---------|------|
| `OrderBatch` | 每报告 1-7 个 | 批次元数据，X 轴标签 |
| `Strategy` | 每报告 1-8 个 | 策略定义，图例/系列区分 |
| `SimulationResult` | batches × strategies 个 | 每个批次×策略组合的聚合指标 |
| `VehicleDetail` | 每 SimulationResult 15-50 条 | 车辆级明细，分布图/箱线图数据源 |
| `ConstraintViolation` | 每 SimulationResult 0-7 条 | 约束违反聚合统计 |
| `ProjectConstraints` | 全局 1 份 | 约束阈值定义 |
| `DataAvailability` | 每报告 1 份 | 控制图表条件渲染 |
| `PocReport` | 全部报告列表 | 报告元数据 |

---

## 3. 现有 API 能力摘要

`Process_Waybill_API` 提供 4 个接口，**仅覆盖人工调度（Manual）策略的运单数据**：

| 接口 | 功能 | 提供的数据 |
|------|------|-----------|
| `GET /vrp/list_batches` | 枚举批次列表 | `batch_code`, `transport_date`, `route_count`, `node_count` |
| `POST /vrp/process_waybill` | 处理单个批次 | `human_benchmark`（聚合指标）+ `waybill_routes`（路线明细含节点） + `routes_detail`（路线汇总） |
| `POST /vrp/process_waybill_batch` | 批量处理多个批次 | 同上，按 batch_code 分组返回 |
| `GET /vrp/session/status` | 轮询异步任务 | 任务状态 + 结果 |

**关键限制**：现有 API 仅提供 **人工运单数据**（即"人工经验策略" s1），**不包含任何算法策略的仿真结果**。

---

## 4. 字段级映射分析

### 4.1 OrderBatch（批次信息）

前端需要的批次元数据与 API `list_batches` 的映射关系：

| 前端字段 | 类型 | API 字段 | 覆盖情况 | 说明 |
|---------|------|---------|---------|------|
| `id` | string | `batch_code` | ✅ 可映射 | API 返回 `batch_code` 可作为 id |
| `name` | string | `batch_code` | ⚠️ 部分满足 | API 无独立 name 字段，需用 batch_code 充当或前端自定义 |
| `orderCount` | number | ❌ 缺失 | ❌ 缺失 | API 无订单总数。`node_count` 含 DC 节点，不等同于订单数 |
| `stopCount` | number | `node_count` | ⚠️ 近似 | `node_count` 包含 DC 节点，需减去路线数才是卸货点数 |
| `totalWeight` | number | ❌ 缺失 | ❌ 缺失 | `list_batches` 不返回重量汇总，需从 `process_waybill` 结果计算 |
| `totalVolume` | number | ❌ 缺失 | ❌ 缺失 | 同上，需从明细汇总 |
| `date` | string | `transport_date` | ✅ 可映射 | 格式一致 `"YYYY-MM-DD"`，但可能为 null |

**Gap 详情**：
- `orderCount`：需要从 `process_waybill` 返回的 `waybill_routes.shipments[].node_list` 中统计 `type="customer"` 的节点数（去重 `order_number`），或在 `list_batches` 增加 `order_count` 字段
- `totalWeight` / `totalVolume`：需要从 `shipments` 中逐条累加 `weight` / `volume`，或在 `list_batches` / `human_benchmark` 中增加汇总字段

---

### 4.2 Strategy（策略定义）

| 前端字段 | 类型 | API 覆盖 | 说明 |
|---------|------|---------|------|
| `id` | string | ❌ 完全缺失 | API 无策略概念 |
| `name` | string | ❌ 完全缺失 | — |
| `type` | 'manual' \| 'algorithm' | ❌ 完全缺失 | API 仅提供人工数据 |
| `iterations` | number? | ❌ 完全缺失 | 算法迭代次数 |
| `savingsRate` | number? | ❌ 完全缺失 | 算法节降率 |
| `color` | string | ❌ 前端自定义 | 不需要后端提供 |

**结论**：**策略定义完全缺失**。现有 API 没有策略管理的概念。需要新增策略管理相关接口或在报告生成接口中返回策略元数据。

---

### 4.3 VehicleDetail（车辆级明细）

这是前端最核心、最细粒度的数据实体，每条记录代表一个批次 × 策略组合中的单辆车。

#### 4.3.1 API 可提供的字段（通过 `waybill_routes.shipments[]`）

| 前端字段 | 类型 | API 来源 | 映射方式 | Gap |
|---------|------|---------|---------|-----|
| `vehicleId` | string | `shipment_order_code` | ✅ 直接映射 | — |
| `vehicleType` | string | `vehicle_type_name` | ⚠️ 需转换 | API 返回如 `"4.2厢车"`，前端期望 `"4.2米厢式"` 或 `"4.2米冷藏"`，命名不一致 |
| `orderCount` | number | `node_list` | ⚠️ 需计算 | 需统计 `node_list` 中 `type="customer"` 且 `order_number` 不重复的数量 |
| `stopCount` | number | `node_list` | ⚠️ 需计算 | 需统计 `node_list` 中 `type="customer"` 的节点数 |
| `distance` | number (km) | `route_distance` | ⚠️ 需转换 | API 单位为**米**，前端期望**公里**，需 ÷ 1000 |
| `duration` | number (min) | `total_time` | ⚠️ 单位不明 | API 的 `total_time` 单位未明确标注（文档说"数据库原值"），前端期望**分钟** |
| `loadRate` | number (%) | `volume_rate` | ⚠️ 需转换 | API 返回 0~1（如 0.82），前端期望 0~100（如 82.0） |
| `weightLoad` | number (kg) | `weight` | ✅ 可映射 | — |
| `volumeLoad` | number (m³) | `volume` | ✅ 可映射 | — |
| `qtyLoad` | number | `box` | ✅ 可映射 | `box` 字段对应件数 |
| `palletLoad` | number? | `pallet` | ✅ 可映射 | — |

#### 4.3.2 API 完全缺失的字段

| 前端字段 | 类型 | 说明 | 影响的图表 |
|---------|------|------|-----------|
| `routeSpan` | number (km) | 路线跨度/直径 | F1 (RouteSpanBoxChart), F7 (FeasibilityRadar) |
| `crossRegionCount` | number | 跨行政区数量 | F2 (CrossRegionChart), F7 |
| `topKAvg` | number (km) | Top-3 最近邻平均距离 | F5 (TopKScatterChart), F7 |
| `maxStopInterval` | number (km) | 最大相邻卸货点间距 | F6 (IntervalCDFChart), F7 |
| `weightUtil` | number (%) | 重量装载率 | 装载分析 |
| `volumeUtil` | number (%) | 体积装载率 | 装载分析 |
| `palletUtil` | number (%) | 托盘装载率 | 装载分析 |
| `qtyUtil` | number (%) | 件数装载率 | 装载分析 |
| `detourRatio` | number (%) | 绕路率 | F3 (DetourRatioChart), F7 |
| `routeOverlapCount` | number? | 路线交叉数 | 预留字段 |
| `durationOverLimit` | number? | 超时分钟数 | C2 (DurationOverLimitChart) |
| `distanceOverLimit` | number? | 超距公里数 | C3 (DistanceOverLimitChart) |
| `weightOverLimit` | number? | 超重公斤数 | C4 (LoadOverLimitHeatmap) |
| `volumeOverLimit` | number? | 超体积 m³ | C4 |
| `qtyOverLimit` | number? | 超件数 | C4 |
| `crossRegionOverLimit` | number? | 超跨区数 | C1 |
| `stopOverLimit` | number? | 超卸货点数 | C1 |

**注意**：部分缺失字段（如 `routeSpan`, `topKAvg`, `maxStopInterval`）理论上可以从 API 提供的节点经纬度 (`lng`/`lat`) 和 `distances_between` 数组在前端计算得到。但这会带来较大的前端计算开销，建议由后端直接提供。

#### 4.3.3 可前端计算的衍生字段（基于现有 API 数据）

| 前端字段 | 计算方式 | 可行性 |
|---------|---------|--------|
| `routeSpan` | 从 `node_list` 的经纬度计算最远两点距离 | ⚠️ 可行但计算量大 |
| `stopCount` | `node_list.filter(n => n.type === 'customer').length` | ✅ 简单 |
| `orderCount` | `new Set(node_list.filter(n => n.order_number).map(n => n.order_number)).size` | ✅ 简单 |
| `maxStopInterval` | 从 `distances_between` 数组取最大值 | ⚠️ 取决于该数组是否有数据（样例中为空 `[]`） |
| `topKAvg` | 需要所有节点间距矩阵，仅靠 `distances_between` 不够 | ❌ 数据不足 |
| `weightUtil` / `volumeUtil` / `qtyUtil` | 需要车辆容量信息，API 不提供 | ❌ 缺少车辆容量 |
| `crossRegionCount` | 需要节点行政区划数据，API 仅有地址文本 | ⚠️ 需地理编码解析 |

---

### 4.4 SimulationResult（仿真聚合结果）

SimulationResult 是每个 batch × strategy 组合的聚合指标。

#### 4.4.1 人工策略 — API `human_benchmark` 映射

| 前端字段 | API 字段 | 映射 | Gap |
|---------|---------|------|-----|
| `vehicleCount` | `human_benchmark.route_count` | ✅ | — |
| `totalDistance` | `human_benchmark.total_distance` | ⚠️ | 单位差异：API=米，前端=公里 |
| `totalDuration` | `human_benchmark.total_time` | ⚠️ | 单位未知 |
| `avgLoadRate` | `human_benchmark.avg_volume_rate` | ⚠️ | API=0~1，前端=0~100 |
| `maxDistance` | ❌ | ❌ | 需从 `routes_detail` 遍历取最大 |
| `maxDuration` | ❌ | ❌ | 需从 `routes_detail` 遍历取最大 |
| `maxStopInterval` | ❌ | ❌ | 需从 `distances_between` 计算 |
| `vehicleCountByType` | ❌ | ❌ | 需从 `shipments` 按 `vehicle_type_name` 分组计数 |
| `avgLoadRateByType` | ❌ | ❌ | 需从 `shipments` 按车型分组计算平均 `volume_rate` |
| `totalCost` | ❌ | ❌ | API 无成本数据 |
| `costByType` | ❌ | ❌ | API 无成本数据 |
| `constraintViolations` | ❌ | ❌ | API 无约束违反信息 |

#### 4.4.2 算法策略 — 完全缺失

**现有 API 不提供任何算法策略的仿真结果**。所有 `strategyId !== 's1'` 的 SimulationResult 均无数据来源。

---

### 4.5 ConstraintViolation（约束违反统计）

| 前端字段 | API 覆盖 | 说明 |
|---------|---------|------|
| `type` | ❌ | 约束类型名称（工作时长/行驶里程/装载重量等） |
| `violatedCount` | ❌ | 违反该约束的车辆数 |
| `totalCount` | ❌ | 总车辆数 |
| `violationRate` | ❌ | 违反率 (%) |
| `maxOverage` | ❌ | 最大超限值 |
| `avgOverage` | ❌ | 平均超限值 |

**结论**：约束违反分析 **完全缺失**。当前 API 不提供约束定义，也不计算违反情况。如果约束阈值已知，部分违反情况可在前端根据车辆明细数据计算。

---

### 4.6 ProjectConstraints（约束阈值配置）

| 前端字段 | API 覆盖 | 说明 |
|---------|---------|------|
| `global.maxDurationLimit` | ❌ | 全局最大工时（分钟） |
| `global.maxDistanceLimit` | ❌ | 全局最大里程（km） |
| `global.maxCrossRegionLimit` | ❌ | 全局最大跨区数 |
| `global.maxStopLimit` | ❌ | 全局最大卸货点数 |
| `byVehicleType[].maxWeightLimit` | ❌ | 车型最大载重（kg） |
| `byVehicleType[].maxVolumeLimit` | ❌ | 车型最大装载体积（m³） |
| `byVehicleType[].maxQtyLimit` | ❌ | 车型最大装载件数 |

**结论**：**完全缺失**。约束阈值配置需要独立接口或配置文件。

---

## 5. 缺口汇总

### 5.1 完全缺失的数据维度

以下数据维度在现有 API 中 **完全没有** 对应的接口或字段：

| # | 缺失数据 | 影响范围 | 严重程度 |
|---|---------|---------|---------|
| 1 | **算法策略仿真结果** | 整个报告对比功能（所有 22 个图表的非人工策略系列） | 🔴 P0-Critical |
| 2 | **策略定义与管理** | 策略选择器、图例、系列区分 | 🔴 P0-Critical |
| 3 | **约束阈值配置** | C1-C5 约束合规分析 | 🟠 P1-High |
| 4 | **路线可行性指标** (`routeSpan`, `crossRegionCount`, `topKAvg`, `detourRatio`) | F1-F7 可行性分析 | 🟠 P1-High |
| 5 | **成本数据** (`totalCost`, `costByType`) | E7 (TotalCostChart) | 🟡 P2-Medium |
| 6 | **车辆容量规格** | 装载率计算 (`weightUtil`, `volumeUtil` 等) | 🟠 P1-High |
| 7 | **报告管理元数据** (`PocReport`) | 报告列表页 | 🟡 P2-Medium |

### 5.2 已有但不完全匹配的字段（Gap）

| # | 字段 | Gap 描述 | 解决方案 |
|---|------|---------|---------|
| 1 | **距离单位** | API 返回**米**，前端期望**公里** | 前端 ÷ 1000，或后端增加 km 字段 |
| 2 | **装载率表示** | API 返回 0~1（如 `0.82`），前端期望 0~100（如 `82.0`） | 前端 × 100 |
| 3 | **时长单位** | API `total_time` 单位不明确（文档称"数据库原值"），前端期望**分钟** | 需明确单位定义 |
| 4 | **车型命名** | API 如 `"4.2厢车"`，前端如 `"4.2米厢式"` / `"4.2米冷藏"` | 需统一车型命名标准或建立映射表 |
| 5 | **批次名称** | API 仅有 `batch_code`（如 `"1031"`），无友好名称 | 前端需自定义 name 或后端增加 `batch_name` 字段 |
| 6 | **订单数/卸货点数** | API `node_count` 含 DC 节点，且 `list_batches` 不区分订单数和卸货点数 | 需从明细计算或增加字段 |
| 7 | **`distances_between`** | API 定义了此字段但示例数据为空数组 `[]` | 需确认此字段是否会填充数据 |
| 8 | **批次总重量/总体积** | `list_batches` 不返回，需调用 `process_waybill` 后汇总 | 需增加字段或接受两步获取 |

### 5.3 需要新增的 API 接口

| # | 接口建议 | 说明 | 优先级 |
|---|---------|------|--------|
| 1 | **算法仿真接口** | 提交批次 + 算法策略参数，返回算法调度结果 | 🔴 P0 |
| 2 | **策略管理接口** | CRUD 策略定义（名称、类型、参数、颜色） | 🔴 P0 |
| 3 | **约束配置接口** | 获取/设置全局及车型级约束阈值 | 🟠 P1 |
| 4 | **车辆规格接口** | 获取车型容量规格（载重、体积、件数上限） | 🟠 P1 |
| 5 | **报告管理接口** | 报告列表/创建/状态查询 | 🟡 P2 |
| 6 | **路线分析增强** | 在现有接口中增加可行性指标计算 | 🟠 P1 |

---

## 6. 建议的补充数据格式与示例

### 6.1 算法仿真结果接口（最关键缺口）

**建议接口**：`POST /vrp/simulate`

**请求**：
```json
{
  "user_id": 539,
  "group_id": 539,
  "batch_codes": ["1031", "agent-batch1"],
  "strategies": [
    {
      "strategy_id": "balanced_v2",
      "strategy_name": "均衡优化 v2.1",
      "strategy_type": "algorithm",
      "parameters": {
        "optimization_target": "balanced",
        "max_iterations": 12
      }
    }
  ]
}
```

**期望返回（每个 batch × strategy）**：
```json
{
  "batch_code": "1031",
  "strategy_id": "balanced_v2",
  "summary": {
    "vehicle_count": 21,
    "total_distance": 1789200,
    "total_duration": 5482,
    "avg_load_rate": 0.961,
    "max_distance": 165300,
    "max_duration": 480,
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
    "savings_rate": 0.082
  },
  "vehicles": [
    {
      "vehicle_id": "V-1031-bal-001",
      "vehicle_type": "6.8米冷藏",
      "order_count": 7,
      "stop_count": 6,
      "distance": 85200,
      "duration": 260,
      "load_rate": 0.962,
      "weight_load": 4820,
      "volume_load": 31.69,
      "qty_load": 1167,
      "pallet_load": 12,
      "route_span": 38.1,
      "cross_region_count": 1,
      "top_k_avg": 4.5,
      "max_stop_interval": 10200,
      "detour_ratio": 1.12,
      "weight_util": 0.964,
      "volume_util": 0.932,
      "qty_util": 0.972,
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
          "weight": 120,
          "box": 6,
          "type": "customer"
        }
      ]
    }
  ]
}
```

### 6.2 约束配置接口

**建议接口**：`GET /vrp/constraints?user_id=539`

**期望返回**：
```json
{
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
```

### 6.3 策略管理接口

**建议接口**：`GET /vrp/strategies?user_id=539`

**期望返回**：
```json
{
  "strategies": [
    {
      "id": "manual",
      "name": "人工经验策略",
      "type": "manual",
      "description": "基于人工经验的调度方案"
    },
    {
      "id": "balanced_v2",
      "name": "均衡优化 v2.1",
      "type": "algorithm",
      "iterations": 12,
      "savings_rate": 0.082,
      "parameters": {
        "optimization_target": "balanced",
        "distance_weight": 0.4,
        "time_weight": 0.3,
        "load_weight": 0.3
      }
    }
  ]
}
```

### 6.4 增强现有 `process_waybill` 返回（可行性指标）

在现有 `waybill_routes.shipments[]` 中增加以下字段：

```json
{
  "shipment_order_code": "Sys20251029200706598",
  "route_distance": 43000.0,
  "total_time": 130.7,
  "vehicle_type_name": "4.2厢车",
  "volume_rate": 0.0702,
  "volume": 1.0535,
  "weight": 0,
  "box": 11.0,
  "pallet": 0,
  "node_list": [ ... ],
  "distances_between": [15200, 8300, 12500],

  "route_span": 38100,
  "cross_region_count": 1,
  "top_k_avg": 4500,
  "max_stop_interval": 12500,
  "detour_ratio": 1.25,
  "weight_util": 0.921,
  "volume_util": 0.885,
  "qty_util": 0.935
}
```

### 6.5 增强 `list_batches` 返回

```json
{
  "batch_code": "1031",
  "transport_date": "2026-01-08",
  "route_count": 40,
  "node_count": 297,
  "order_count": 261,
  "stop_count": 257,
  "total_weight": 71557,
  "total_volume": 231.78,
  "created_at": "2026-02-11T10:03:23.500213+08:00"
}
```

---

## 7. 优先级排序与实施建议

### 阶段一：核心对比功能（P0 — 上线阻塞）

| 任务 | 说明 | 预期交付物 |
|------|------|-----------|
| 算法仿真接口 | 最核心缺口，无此接口报告仅能展示人工数据，丧失对比意义 | `POST /vrp/simulate` |
| 策略管理 | 至少需要静态策略列表 | `GET /vrp/strategies` 或配置文件 |
| 单位标准化 | 明确 `total_time` 单位，确认距离米/公里，装载率格式 | 文档更新 |
| 车型命名统一 | 建立前后端统一的车型命名标准 | 枚举表/映射配置 |

### 阶段二：约束与可行性分析（P1 — 报告完整性）

| 任务 | 说明 | 预期交付物 |
|------|------|-----------|
| 约束配置接口 | 提供约束阈值，支持 C1-C5 图表 | `GET /vrp/constraints` |
| 路线可行性指标 | 后端计算 `routeSpan`, `crossRegionCount`, `topKAvg`, `detourRatio` 等 | 接口增强字段 |
| 车辆容量规格 | 提供车型容量信息，支持装载率计算 | 随约束配置返回或独立接口 |
| `distances_between` 填充 | 确保相邻节点间距数据可用 | 修复数据生成逻辑 |

### 阶段三：报告管理与成本分析（P2 — 体验完善）

| 任务 | 说明 | 预期交付物 |
|------|------|-----------|
| 报告管理接口 | 报告 CRUD、状态跟踪 | `POST/GET /vrp/reports` |
| 成本数据 | 总成本、按车型成本拆分 | 仿真结果中增加 `cost` 字段 |
| `list_batches` 增强 | 增加 `order_count`, `total_weight`, `total_volume` | 接口增强 |

### 过渡方案

在后端接口完善之前，前端可以采取以下策略：

1. **人工策略数据**：调用现有 `process_waybill` API 获取真实数据，前端做单位转换
2. **算法策略数据**：保持 Mock 数据，或提供 CSV/JSON 文件导入功能
3. **可行性指标**：利用节点经纬度在前端计算 `routeSpan` 和基于 `distances_between` 的 `maxStopInterval`
4. **约束配置**：在前端硬编码或提供配置界面

---

## 附录：字段覆盖率统计

| 数据实体 | 总字段数 | ✅ 可映射 | ⚠️ 有 Gap | ❌ 缺失 | 覆盖率 |
|---------|---------|----------|----------|--------|--------|
| OrderBatch | 7 | 2 | 3 | 2 | 29% |
| Strategy | 6 | 0 | 0 | 5+1前端 | 0% |
| VehicleDetail (V1) | 14 | 0 | 6 | 8 | 0% (⚠️43%) |
| VehicleDetail (V2) | 11 | 3 | 1 | 7 | 27% |
| SimulationResult | 13 | 1 | 3 | 9 | 8% (⚠️31%) |
| ConstraintViolation | 6 | 0 | 0 | 6 | 0% |
| ProjectConstraints | 8 | 0 | 0 | 8 | 0% |

> ⚠️ 百分比为含"有 Gap 但可通过转换/计算得到"的覆盖率

**整体结论**：现有 Process Waybill API 仅能提供 **人工策略的基础运单数据**，约覆盖 A11 模块 **~15-20%** 的数据需求。最大缺口是 **算法策略仿真结果**（P0），其次是 **约束配置和可行性分析指标**（P1）。建议按三阶段路径逐步补齐 API 能力。
