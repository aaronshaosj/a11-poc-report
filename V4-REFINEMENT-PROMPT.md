# V4 精修优化开发指令

> **版本**: V4 Refinement  
> **前置条件**: V3 已完成开发并通过基本功能验证  
> **本轮目标**: 修复独立验收发现的 Bug，统一评分体系，完善 HTML 导出，提升数据鲁棒性  
> **核心原则**: 不要机械地执行指令——理解每个问题背后的本质原因，选择你认为最优的解决方案

---

## 第一章 验收背景与问题总览

V3 经过独立验收测试（覆盖 8 份报告、4 种状态、5 种边界场景），22 张 ECharts 图表全部正常渲染，数据可用性弹性逻辑（`shouldRender` + `DataAvailability`）工作正常，`insightGenerator` 为每张图表生成了引用具体数值的 AI 解读。整体质量良好。

但验收过程中发现了以下需要修复和优化的问题：

| 编号 | 优先级 | 类别 | 问题摘要 |
|------|--------|------|---------|
| BUG-1 | P0 | 功能缺陷 | HTML 导出仅包含 3/22 张图表，内容严重不完整 |
| BUG-2 | P1 | 数据一致性 | Excel 评分公式与页面评分公式完全不同，导致数据矛盾 |
| BUG-3 | P2 | 设计缺陷 | 三处评分逻辑（Radar/Rank/Excel）各自独立，未共享计算函数 |
| OPT-1 | P2 | 评分设计 | 评分公式系数缺乏理论依据，人工策略得分偏低，算法策略容易饱和 |
| OPT-2 | P2 | 视觉体验 | 零违反报告的约束遵循章节仅显示半宽 EmptyState 卡片，视觉空旷 |
| OPT-3 | P3 | 解读质量 | S1/S2/F7 的 AI 解读使用硬编码文本，未引用具体分数 |

---

## 第二章 BUG-1：HTML 导出内容不完整（P0）

### 2.1 问题分析

当前 `htmlExport.ts` 的 `generateHtml()` 函数仅在 HTML 模板中包含了 E1（车次数）、E2（总里程）、E4（满载率）和 S2（排名）共 4 张图表。而页面上实际渲染了 22 张图表（E1-E8、C1-C5、F1-F7、S1-S2），导出的 HTML 文件缺失了 18 张图表。

更深层的问题是：`htmlExport.ts` 中只实现了 `makeBar` 和 `makeLine` 两个 ECharts 图表生成函数，无法覆盖 V3 使用的全部图表类型（箱线图、热力图、散点图、雷达图、CDF 曲线、堆叠柱状图、气泡散点图等）。

### 2.2 修复要求

**你需要独立思考最佳的实现方案。** 以下是两种可能的方向，但不限于此：

**方向 A：完整重写 HTML 模板**  
为每种图表类型实现对应的 ECharts option 生成函数，在 HTML 模板中完整复现页面上的所有图表。这种方案导出的 HTML 文件与在线版本视觉一致性最高，但工作量大。

**方向 B：截图式导出**  
利用 ECharts 的 `getDataURL()` API 将每张图表导出为 base64 图片，嵌入到 HTML 模板中。这种方案实现简单，但失去了交互性。

**方向 C：混合方案**  
对于常见图表类型（bar/line/radar）用 ECharts 渲染，对于复杂类型（heatmap/boxplot/scatter）用静态图片。

**无论选择哪种方案，必须满足以下约束：**

1. 导出的 HTML 必须是**自包含单文件**（所有 CSS、JS、数据内联，ECharts 通过 CDN 引用）
2. 必须包含页面上所有已渲染的图表（根据 `DataAvailability` 动态决定）
3. 必须包含每张图表的 AI 解读文字
4. 必须包含 KPI 概览卡片
5. 必须包含报告元信息（标题、批次、策略、生成时间）
6. 文件大小应控制在合理范围内（建议 < 2MB）
7. 在无网络环境下也能正常查看（如果使用 CDN，需要有 fallback）

### 2.3 关键提示

- 当前 `htmlExport.ts` 的模板字符串中使用了 `<\/script>` 转义，这是正确的做法（避免浏览器将模板中的 `</script>` 误解析为闭合标签）
- 导出时需要根据 `DataAvailability` 和 `shouldRender` 逻辑动态决定包含哪些图表
- 每张图表的 ECharts option 应该尽量复用现有图表组件中的 option 构建逻辑，而不是重写一套

---

## 第三章 BUG-2 + BUG-3：评分体系不一致（P1）

### 3.1 问题分析

当前项目中存在**三套独立的评分计算逻辑**：

| 位置 | 经济性得分公式 | 合理性得分公式 |
|------|---------------|---------------|
| `StrategyRadarChart.tsx` | `50 + distSaving*2 + durSaving*1.5 + (avgLoadRate-90)*1.2 + vehicleSaving*2` | `50 + (50-avgSpan)*0.8 + (2-avgCross)*10 + (5-avgTopK)*5 + (120-avgDetour)*0.5` |
| `StrategyRankChart.tsx` | 同上（复制粘贴） | 同上（复制粘贴） |
| `excelExport.ts` | `60 + (95 - totalDist / rs.length / 10)` | `avgLoad`（直接用满载率作为合理性得分） |

这导致：
- Excel 中的评分与页面上雷达图/排名图的评分**完全不同**
- 用户下载 Excel 后对照页面会发现数据矛盾
- `excelExport.ts` 的经济性得分基于绝对里程值归一化，与实际数据范围不匹配
- `excelExport.ts` 的合理性得分直接使用满载率，概念上就是错误的（满载率属于经济性指标）

### 3.2 修复要求

**核心要求：抽取统一的评分计算函数，三处调用同一份逻辑。**

1. 在 `src/lib/scoring.ts`（新建）中实现统一的评分函数：

```typescript
// 建议的函数签名（你可以根据自己的理解调整）
export interface StrategyScores {
  economy: number;      // 0-100
  constraint: number;   // 0-100
  feasibility: number;  // 0-100
  overall: number;      // 加权综合分
}

export function calculateStrategyScores(
  strategyResults: SimulationResult[],
  manualResults: SimulationResult[],
  weights: ScoringWeights
): StrategyScores;
```

2. `StrategyRadarChart.tsx`、`StrategyRankChart.tsx`、`excelExport.ts` 三处都调用这个统一函数。

3. 评分公式需要重新设计。**请你独立思考什么样的评分公式是合理的。** 以下是一些需要考虑的要点：

   - **人工策略的得分问题**：人工策略与自身对比，所有 saving 为 0，当前公式下得分约 48-50。这是否合理？一种思路是：人工策略作为基准线，得分固定为某个中位值（如 50 或 60），算法策略的得分体现相对于基准的改善程度。另一种思路是：所有策略（包括人工）都用绝对指标评分，不依赖相对对比。
   
   - **得分饱和问题**：当前公式中算法策略如果在多个维度都有显著改善，得分很容易超过 100 被截断，失去区分度。需要考虑归一化方式。
   
   - **合理性得分的指标选择**：合理性应该反映路线的落地可行性，包括跨度、跨区数、绕行率、聚类紧密度等，而不是满载率。
   
   - **约束遵循得分**：当前公式 `100 - violationRate * 500` 在违反率 > 20% 时就会变成 0，是否过于敏感？
   
   - **权重可配置**：V3 已经在 `types/index.ts` 中定义了 `ScoringWeights` 和 `defaultScoringWeights`，但实际代码中未使用。统一评分函数应该接受权重参数。

### 3.3 单策略报告的评分处理

当只有一个策略（没有人工基准对比）时，评分逻辑需要特殊处理：
- 不应该出现"相对节降"类指标（因为没有对比基准）
- 可以只展示绝对指标的评分，或者标注"无对比基准，仅展示绝对表现"

---

## 第四章 OPT-1：评分公式设计建议（供参考，非强制）

以下是一种可能的评分设计思路，**仅供参考**。你应该基于自己对物流调度 POC 评估的理解，设计你认为最合理的方案。

### 4.1 经济性得分

经济性的核心是"相比人工，算法能节省多少成本"。可以考虑的子指标：
- 车次数节降率（权重较高，因为直接关联车辆调度成本）
- 总里程节降率（权重较高，因为直接关联油费/过路费）
- 总时长节降率（权重中等）
- 平均满载率提升（权重中等，满载率越高说明装载效率越好）

归一化方式：可以用 `50 + improvement_percentage * k` 的线性映射，其中 k 的选择应该让典型的改善幅度（5%-15%）映射到 60-80 分的区间。

### 4.2 约束遵循得分

约束遵循的核心是"方案违反了多少运营规则"。这是一个"扣分制"指标：
- 基础分 100
- 每种约束的违反率按权重扣分
- 严重违反（超限幅度大）应该比轻微违反扣更多分

### 4.3 合理性得分

合理性的核心是"路线在实际中是否可行"。可以考虑的子指标：
- 路线跨度（越小越好，说明路线紧凑）
- 跨区数量（越少越好，减少跨区调度复杂度）
- 绕行率（越低越好，说明路线直接）
- 聚类紧密度 TopK（越小越好，说明相邻站点距离近）

归一化方式：每个子指标需要根据实际数据范围进行归一化。可以用 min-max 归一化或者基于经验阈值的分段映射。

### 4.4 重要提醒

**不要过度追求评分公式的"完美"。** 在实际项目中，评分公式的系数和权重往往需要根据具体客户的业务场景进行调整。当前阶段最重要的是：
1. 三处评分逻辑统一
2. 公式在数学上合理（不会出现负分、不会轻易饱和）
3. 权重可配置（通过 `ScoringWeights`）
4. 人工策略的得分有合理的解释

---

## 第五章 OPT-2：零违反场景的视觉优化（P2）

### 5.1 问题描述

当报告中所有策略的所有约束违反数均为 0 时（如 r7 零违反验证报告），约束遵循章节仅显示一个半宽的 `EmptyState` 卡片（因为 grid 是 `md:grid-cols-2`），右侧留白，视觉上显得空旷和不完整。

### 5.2 优化建议

将零违反场景的展示从单个 EmptyState 卡片升级为一个**全宽的"约束遵循总结卡片"**，内容可以包括：
- 一个醒目的"全部通过"图标和标题
- 列出所有已检查的约束类型（如"工作时长上限 ✓"、"行驶里程上限 ✓"、"装载量上限 ✓"等）
- 一段 AI 解读总结

具体的视觉设计由你决定，但要求：
1. 占据整行宽度（`col-span-2` 或 `md:col-span-2`）
2. 视觉上传达"全部合规"的正面信息
3. 与深色星空主题一致

---

## 第六章 OPT-3：AI 解读质量提升（P3）

### 6.1 问题描述

`insightGenerator.ts` 中大部分图表的解读函数（genE1-genE8、genC1-genC5、genF1-genF6）质量较好，能引用具体数值。但以下三个函数使用了硬编码文本：

- `genS1`（综合评分雷达图）：返回固定文本，未引用各维度的具体分数
- `genS2`（策略排名图）：返回固定文本，未引用具体排名和分数
- `genF7`（多维合理性雷达图）：返回固定文本，未引用具体维度数值

### 6.2 修复要求

这三个函数需要像其他函数一样，基于实际数据生成解读。例如：

- `genS1` 应该引用各策略在三个维度的具体得分，指出哪个策略综合表现最优
- `genS2` 应该引用排名第一的策略名称和综合得分，以及与第二名的分差
- `genF7` 应该引用各策略在跨度、跨区、绕行率等维度的具体数值

**注意**：修复 genS1/genS2 时需要调用统一的评分函数（第三章），确保解读中引用的分数与图表展示的分数一致。

---

## 第七章 代码质量与架构优化

### 7.1 评分函数统一（必须）

新建 `src/lib/scoring.ts`，将评分计算逻辑集中管理：

```
src/lib/scoring.ts
├── calculateStrategyScores()    // 核心评分函数
├── calculateEconomyScore()      // 经济性子评分
├── calculateConstraintScore()   // 约束遵循子评分
├── calculateFeasibilityScore()  // 合理性子评分
└── normalizeScore()             // 归一化工具函数
```

调用方：
- `StrategyRadarChart.tsx` → `calculateStrategyScores()`
- `StrategyRankChart.tsx` → `calculateStrategyScores()`
- `excelExport.ts` → `calculateStrategyScores()`
- `insightGenerator.ts` (genS1/genS2) → `calculateStrategyScores()`

### 7.2 HTML 导出重构（必须）

无论选择哪种导出方案，`htmlExport.ts` 需要：
- 接收 `DataAvailability` 参数，动态决定导出哪些图表
- 接收 `insightGenerator` 的输出，包含每张图表的 AI 解读
- 导出的 HTML 应该有清晰的章节结构（经济性 / 约束遵循 / 合理性 / 综合评估）

### 7.3 数据鲁棒性检查

在修复过程中，请同时检查以下边界场景是否正常：
- 单策略报告（r5）：评分函数在无人工基准时的处理
- 单批次报告（r6）：E8 里程节降率趋势图应该不渲染
- 零违反报告（r7）：约束遵循得分应该为 100 或接近 100
- 极端数据报告（r8）：评分函数在极端数据下不应产生 NaN 或负数

---

## 第八章 测试清单

完成开发后，请按以下清单逐项验证并记录结果：

### 8.1 BUG 修复验证

| 测试项 | 验证方法 | 预期结果 |
|--------|---------|---------|
| HTML 导出完整性 | 下载 r1 的 HTML，在浏览器中打开 | 包含所有已渲染图表（E1-E4+E5+E6+E8+C1-C5+F1-F7+S1-S2），有 AI 解读 |
| HTML 导出 - 单策略 | 下载 r5 的 HTML | 图表数量与页面一致，无报错 |
| HTML 导出 - 零违反 | 下载 r7 的 HTML | 约束遵循章节正确展示零违反状态 |
| Excel 评分一致性 | 下载 r1 的 Excel，对比页面 S1 雷达图 | 经济性/约束/合理性三个维度的得分完全一致 |
| Excel 评分 - 人工策略 | 检查 Excel 中人工经验策略的得分 | 得分合理（不为 0，不为负数） |
| 评分统一性 | 对比 S1 雷达图、S2 排名图、Excel 评分 Sheet | 三处显示的分数完全一致 |

### 8.2 优化验证

| 测试项 | 验证方法 | 预期结果 |
|--------|---------|---------|
| 零违反视觉 | 打开 r7 报告详情页 | 约束遵循章节显示全宽总结卡片，列出已检查的约束类型 |
| S1 AI 解读 | 查看 r1 的 S1 图表解读 | 引用具体策略名称和各维度分数 |
| S2 AI 解读 | 查看 r1 的 S2 图表解读 | 引用排名第一的策略和综合得分 |
| F7 AI 解读 | 查看 r1 的 F7 图表解读 | 引用具体维度数值 |

### 8.3 回归测试

| 测试项 | 验证方法 | 预期结果 |
|--------|---------|---------|
| r1 标准报告 | 浏览所有图表 | 22 张图表正常渲染，无视觉异常 |
| r2 四策略报告 | 浏览所有图表 | 4 种颜色区分，图例正常 |
| r5 单策略报告 | 浏览所有图表 | 无对比时图表正常，评分有合理解释 |
| r6 单批次报告 | 检查 E8 是否隐藏 | E8 不渲染（因为只有 1 个批次） |
| r7 零违反报告 | 检查约束遵循章节 | 显示全宽总结卡片 |
| r8 极端数据报告 | 浏览所有图表 | 无 NaN、无空白、无溢出 |
| 生成弹窗 | 完整走完三步流程 | 批次选择→策略选择→确认，正常工作 |
| Excel 下载 | 下载并用 Excel 打开 | 6 个 Sheet，数据完整，评分与页面一致 |

---

## 第九章 提交要求

1. 所有代码变更提交到 GitHub，commit message 清晰描述变更内容
2. 在 `tests/V4-TEST-REPORT.md` 中记录完整测试报告，包括：
   - 每个测试项的结果（通过/失败/部分通过）
   - 失败项的具体表现和截图描述
   - 评分公式的最终设计说明（你选择了什么方案、为什么）
3. 在 `docs/V4-IMPLEMENTATION.md` 中记录实施方案，包括：
   - 你对每个问题的分析和解决思路
   - 你做出的关键设计决策及理由
   - 如果你对提示词中的建议有不同意见，请说明你的替代方案和理由

---

## 附录 A：当前文件结构参考

```
src/
├── components/
│   ├── charts/
│   │   ├── ConstraintViolationChart.tsx    # C1
│   │   ├── CostComparisonChart.tsx         # E7
│   │   ├── CrossRegionChart.tsx            # F2
│   │   ├── DetourRatioChart.tsx            # F3
│   │   ├── DistanceOverLimitChart.tsx      # C3
│   │   ├── DurationOverLimitChart.tsx      # C2
│   │   ├── LoadOverLimitHeatmap.tsx        # C4
│   │   ├── LoadRateByTypeChart.tsx         # E5
│   │   ├── LoadRateTrendChart.tsx          # E4
│   │   ├── MileageSavingTrendChart.tsx     # E8
│   │   ├── RouteSpanBoxChart.tsx           # F1
│   │   ├── StrategyRadarChart.tsx          # S1
│   │   ├── StrategyRankChart.tsx           # S2
│   │   ├── StopBoxChart.tsx               # F4
│   │   ├── StopIntervalCDFChart.tsx        # F6
│   │   ├── TopKScatterChart.tsx            # F5
│   │   ├── VehicleCountChart.tsx           # E1
│   │   ├── VehicleTypeUsageChart.tsx       # E6
│   │   ├── ViolationScatterChart.tsx       # C5
│   │   ├── DistanceChart.tsx               # E2
│   │   ├── DurationChart.tsx               # E3
│   │   └── FeasibilityRadarChart.tsx       # F7
│   ├── report/
│   │   ├── AiInsight.tsx
│   │   ├── ChartCard.tsx
│   │   ├── EmptyState.tsx
│   │   ├── FloatingNav.tsx
│   │   └── KpiCard.tsx
│   └── generate/
│       └── GenerateModal.tsx
├── data/
│   ├── mockAvailability.ts
│   ├── mockBatches.ts
│   ├── mockReports.ts
│   ├── mockSimulation.ts
│   └── mockStrategies.ts
├── hooks/
│   └── useChartDataValidity.ts
├── lib/
│   ├── chartTheme.ts
│   ├── colors.ts
│   ├── echarts.ts
│   ├── excelExport.ts
│   ├── htmlExport.ts
│   ├── insightGenerator.ts
│   └── utils.ts
├── pages/
│   ├── ReportDetailPage.tsx
│   └── ReportListPage.tsx
└── types/
    └── index.ts
```

## 附录 B：关键类型定义参考

```typescript
// types/index.ts 中的关键类型
export interface ScoringWeights {
  economy: number;     // 默认 0.4
  constraint: number;  // 默认 0.3
  feasibility: number; // 默认 0.3
}

export const defaultScoringWeights: ScoringWeights = {
  economy: 0.4,
  constraint: 0.3,
  feasibility: 0.3,
};

export interface SimulationResult {
  id: string;
  batchId: string;
  strategyId: string;
  vehicleCount: number;
  totalDistance: number;
  totalDuration: number;
  avgLoadRate: number;
  avgLoadRateByType?: Record<string, number>;
  vehicleTypeUsage?: Record<string, number>;
  totalCost?: number;
  costBreakdown?: Record<string, number>;
  constraintViolations: ConstraintViolation[];
  details: VehicleDetail[];
}

export interface VehicleDetail {
  vehicleId: string;
  vehicleType: string;
  loadRate: number;
  distance: number;
  duration: number;
  stopCount: number;
  orderCount: number;
  routeSpan: number;
  crossRegionCount: number;
  detourRatio: number;
  topKAvg: number;
  maxStopInterval: number;
  durationOverLimit?: number;
  distanceOverLimit?: number;
  weightOverLimit?: number;
  volumeOverLimit?: number;
  qtyOverLimit?: number;
  crossRegionOverLimit?: number;
  stopOverLimit?: number;
}

export interface DataAvailability {
  hasMultiVehicleTypes: boolean;
  hasCostStructure: boolean;
  hasMultiBatches: boolean;
  hasDurationLimit: boolean;
  hasDistanceLimit: boolean;
  hasWeightLimit: boolean;
  hasVolumeLimit: boolean;
  hasQtyLimit: boolean;
  hasPalletLimit: boolean;
  hasCrossRegionLimit: boolean;
  hasStopLimit: boolean;
  hasRouteSpan: boolean;
  hasCrossRegion: boolean;
  hasDetourRatio: boolean;
  hasTopK: boolean;
  hasStopInterval: boolean;
  hasRouteOverlap: boolean;
}
```
