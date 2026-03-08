# A11 POC 报告生成器 — V3 优化方案

> **文档版本**: V3.0  
> **基于**: V2 已完成代码 + 独立验收测试结果  
> **目标**: 修复已知缺陷、增强数据鲁棒性、提升视觉与交互品质  

---

## 一、背景与验收总结

V2 迭代将指标体系从 Type A/B/C 重构为经济性/约束遵循/合理性三维度，实现了 22 张 ECharts 图表（11 种类型）和 DataAvailability 弹性渲染逻辑。经独立浏览器验收测试，V2 整体功能完整、架构合理，但在以下方面存在需要优化的问题。

### 1.1 验收发现的问题清单

下表按优先级排列了所有验收中发现的问题，V3 需逐一解决。

| 编号 | 优先级 | 问题描述 | 所在模块 |
|------|--------|---------|---------|
| BUG-01 | P0 | E4 满载率折线图中存在蓝色半透明矩形遮挡数据，疑似 `areaStyle` 的 `opacity: 0.06` 在多策略叠加时产生视觉干扰 | `LoadRateChart.tsx` |
| BUG-02 | P1 | 生成弹窗（GenerateModal）在构建后的静态文件中点击无反应，疑似事件绑定或状态管理问题 | `GenerateModal.tsx` |
| BUG-03 | P1 | SPA 路由在非 SPA 服务器下直接访问子路由（如 `/report/r2`）返回 404，需要在 `index.html` 中添加 fallback 或在构建配置中处理 | `vite.config.ts` / 部署配置 |
| BUG-04 | P2 | C2/C3 箱线图中，当某策略无违反车次时显示空白区域和"0车次"标签，缺少友好的"无违反"提示 | `DurationOverLimitChart.tsx` / `DistanceOverLimitChart.tsx` |
| BUG-05 | P2 | E4 图表中 `markPoint`（最高/最低标记）在多策略场景下标签重叠，影响可读性 | `LoadRateChart.tsx` |
| BUG-06 | P2 | 列表页卡片（glass-card）在构建后边框不够明显，视觉层次感不足 | `index.css` / `ReportCard.tsx` |
| BUG-07 | P3 | 存在 12 个未使用的 V1 图表组件文件（如 `MaxDistanceBoxChart.tsx`、`MaxDurationBoxChart.tsx` 等），增加包体积 | `src/components/charts/` |

### 1.2 数据鲁棒性问题

以下问题不是功能 Bug，而是在实际项目数据接入时可能导致图表渲染异常或误导的风险点。

| 编号 | 风险等级 | 问题描述 | 影响范围 |
|------|---------|---------|---------|
| DATA-01 | 高 | Mock 数据中所有批次的数据模式过于相似，缺少异常批次（如订单量特别大/小、某车型占绝对主导的批次），无法验证图表在极端数据分布下的表现 | 所有图表 |
| DATA-02 | 高 | 当 `DataAvailability` 中某个类别的所有指标均为 `false` 时（例如约束遵循的所有约束都不适用），该章节的 section header 仍然会渲染，导致出现空白章节 | `ReportDetailPage.tsx` |
| DATA-03 | 高 | 当仅选择 1 个策略（无对比基准）时，所有"对比"类图表（如分组柱状图、雷达图）的呈现逻辑未经验证，可能出现单柱/单线的尴尬展示 | 所有图表 |
| DATA-04 | 中 | 当仅选择 1 个批次时，E8 里程节降率趋势图（折线图）只有一个数据点，无法形成趋势线 | `SavingsTrendChart.tsx` |
| DATA-05 | 中 | 约束违反率为 0% 的约束类型在 C1 图表中被隐藏，但如果所有约束都无违反，C1 图表将完全为空 | `ConstraintViolationChart.tsx` |
| DATA-06 | 中 | 综合评分（S1/S2）的权重硬编码为经济性 40%、约束遵循 30%、合理性 30%，不同项目可能需要不同权重 | `StrategyRadarChart.tsx` / `StrategyRankChart.tsx` |
| DATA-07 | 低 | 车型名称在 Mock 中硬编码为"4.2米冷藏"等，实际项目中车型命名可能完全不同，需要确保图表组件不依赖特定车型名称 | 多个图表 |

---

## 二、V3 优化任务清单

### 2.1 P0/P1 Bug 修复

#### 任务 2.1.1：修复 E4 满载率折线图蓝色遮挡

**问题根因分析**：`LoadRateChart.tsx` 中每个 series 都设置了 `areaStyle: { color: s.color, opacity: 0.06 }`，当 3-4 个策略的面积区域叠加时，半透明色彩累积形成明显的蓝色矩形遮挡。

**修复方案**：
1. 移除 `areaStyle` 配置，满载率折线图不需要面积填充
2. 如果希望保留视觉层次感，改用 `emphasis` 的 `areaStyle` 仅在 hover 时显示
3. 同时优化 `markPoint` 的位置策略，避免多策略标签重叠：设置 `markPoint.label.position` 为交替的 `'top'` 和 `'bottom'`，或者当策略数 > 2 时关闭 `markPoint`

**验收标准**：在 4 策略场景下，E4 图表无任何遮挡，所有数据点和折线清晰可见。

#### 任务 2.1.2：修复生成弹窗事件绑定

**问题根因分析**：需要检查 `GenerateModal.tsx` 中的状态管理和事件传播。可能的原因包括：
- `useState` 的 `isOpen` 状态在构建后的 bundle 中未正确初始化
- 按钮的 `onClick` 事件被父级 `div` 的 `onClick`（卡片点击跳转）拦截
- React 18/19 的事件委托机制在某些情况下的兼容性问题

**修复方案**：
1. 在 `ReportListPage.tsx` 中确认"生成 POC 报告"按钮的 `onClick` 正确绑定到 `setShowModal(true)`
2. 确保 Modal 组件使用 React Portal（`createPortal`）渲染到 `document.body`，避免被父级 CSS 影响
3. 添加 `console.log` 调试点确认事件是否触发
4. 如果使用了第三方 Modal 库，确认其与 React 19 的兼容性

**验收标准**：在构建后的静态文件中，点击"生成 POC 报告"按钮能正确弹出三步引导弹窗，且弹窗的每一步都能正常交互。

#### 任务 2.1.3：SPA 路由 Fallback

**修复方案**：在 `vite.config.ts` 中确保构建配置正确。由于这是一个 SPA 应用，部署时需要服务器将所有路由 fallback 到 `index.html`。这不是代码 Bug，而是部署配置问题，但应在项目中添加说明。

**具体操作**：
1. 在项目根目录创建 `public/_redirects` 文件（Netlify 风格）：`/* /index.html 200`
2. 在项目根目录创建 `public/404.html`，内容为重定向脚本
3. 在 README 中说明部署时需要配置 SPA fallback

### 2.2 数据鲁棒性增强

#### 任务 2.2.1：空数据与边界场景的 Fallback UI

这是 V3 最重要的优化任务。在实际项目中，数据分布的差异性远超 Mock 数据的覆盖范围。每个图表组件都需要具备"优雅降级"的能力。

**需要实现的 Fallback 场景**：

| 场景 | 触发条件 | 期望行为 |
|------|---------|---------|
| 空章节 | 某个维度（经济性/约束遵循/合理性）的所有图表都被 `shouldRender` 过滤掉 | 隐藏整个 section header 和分区，不留空白 |
| 空图表数据 | 图表组件接收到的数据数组为空或全为 0 | 显示占位卡片："该指标在当前数据集中无有效数据" |
| 单策略模式 | 用户仅选择了 1 个策略（无对比基准） | 分组柱状图退化为单色柱状图；雷达图仅显示单条折线；AI 解读文案调整为"单策略分析"而非"对比分析" |
| 单批次模式 | 用户仅选择了 1 个批次 | E8 趋势图不渲染（单点无趋势）；E1-E4 的 X 轴仅显示 1 个批次名称 |
| 全零违反 | 所有策略的所有约束违反率均为 0 | C1 显示"所有策略均完全遵循约束条件"的正面信息卡片；C2-C5 不渲染 |
| 极端数据 | 某个指标值远超正常范围（如满载率 > 100% 或 < 0%） | 图表 Y 轴自动适配，不被极端值压缩正常数据的可视区间；可选择裁剪极端值并标注 |

**实现方式**：

在每个图表组件的顶部添加数据有效性检查：

```typescript
// 通用的图表数据有效性检查 Hook
function useChartDataValidity(results: SimulationResult[], strategyIds: string[], batchIds: string[]) {
  const hasData = results.length > 0;
  const hasMultiStrategies = strategyIds.length > 1;
  const hasMultiBatches = batchIds.length > 1;
  const isValid = hasData;
  
  return { hasData, hasMultiStrategies, hasMultiBatches, isValid };
}
```

在 `ChartCard.tsx` 中添加空状态渲染：

```typescript
interface ChartCardProps {
  title: string;
  chartId: string;
  insight?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}

// 当 isEmpty 为 true 时，渲染优雅的空状态占位
```

在 `ReportDetailPage.tsx` 中添加章节级别的空检测：

```typescript
// 计算每个章节实际渲染的图表数量
const economicChartCount = [true, true, true, true, 
  shouldRenderE5(availability), shouldRenderE6(availability),
  shouldRenderE7(availability), shouldRenderE8(availability)
].filter(Boolean).length;

// 如果某章节图表数为 0，隐藏整个章节
{economicChartCount > 0 && (
  <section id="economic">...</section>
)}
```

#### 任务 2.2.2：丰富 Mock 数据的多样性

当前 Mock 数据的问题在于所有批次的数据模式过于相似。V3 需要创建更具区分度的 Mock 数据集，以验证图表在各种数据分布下的表现。

**Mock 数据增强要求**：

1. **异常批次**：在 `mockBatches` 中增加 1-2 个特殊批次：
   - 一个"大批次"（订单量 300+，站点 250+），验证图表在高密度数据下的表现
   - 一个"小批次"（订单量 30-50，站点 20-30），验证图表在稀疏数据下的表现

2. **车型分布不均**：在 `mockSimulation.ts` 的 `generateVehicleDetails` 中，为不同批次设置不同的车型分布权重。例如：
   - 某些批次 70% 使用 4.2 米冷藏（小件为主的场景）
   - 某些批次 60% 使用 9.6 米冷藏（大宗货物场景）

3. **约束违反的极端案例**：在某些策略-批次组合中，生成 1-2 个严重超限的车次（如工作时长超限 2 小时、重量超限 30%），验证箱线图和散点图对离群值的处理

4. **全零违反场景**：为 `mockReports` 中的某一份报告，设置一个所有策略都完全遵循约束的数据集，验证 C1-C5 的空状态处理

5. **单策略报告**：在 `mockReports` 中增加一份仅包含 1 个策略的报告，验证单策略模式下的图表退化行为

6. **单批次报告**：在 `mockReports` 中增加一份仅包含 1 个批次的报告，验证单批次模式下的图表行为

#### 任务 2.2.3：综合评分权重可配置化

当前 S1/S2 的评分权重硬编码在组件中。V3 需要将其提取为可配置项。

**实现方案**：

```typescript
// 在 types/index.ts 中新增
export interface ScoringWeights {
  economic: number;    // 默认 0.4
  constraint: number;  // 默认 0.3
  feasibility: number; // 默认 0.3
}

// 在 mockAvailability.ts 或独立的 config 文件中
export const defaultScoringWeights: ScoringWeights = {
  economic: 0.4,
  constraint: 0.3,
  feasibility: 0.3,
};
```

在 S1 和 S2 组件中接收 `weights` 作为 props，而非硬编码。

### 2.3 视觉与交互优化

#### 任务 2.3.1：列表页卡片视觉增强

当前列表页卡片在构建后边框不够明显，视觉层次感不足。

**优化方案**：
1. 增强 `glass-card` 的 `border` 透明度：从 `rgba(255,255,255,0.06)` 提升到 `rgba(255,255,255,0.10)`
2. 添加微妙的 `box-shadow`：`0 4px 24px rgba(0,0,0,0.3)`
3. 卡片 hover 时增加边框高亮效果：`border-color: rgba(74,158,255,0.3)` 过渡动画
4. 已完成状态的卡片左侧添加 3px 宽的状态色条（绿色），生成中为蓝色，失败为红色
5. 策略标签的背景色透明度从 `20`（hex）提升到 `30`，增加可读性

#### 任务 2.3.2：图表交互增强

**Tooltip 优化**：
1. 所有图表的 tooltip 统一使用自定义 formatter，显示策略名称、具体数值、与基准（人工策略）的差值百分比
2. 分组柱状图的 tooltip 增加"策略间排名"信息（如"该批次里程最低"）
3. 箱线图的 tooltip 显示完整的五数概括（min, Q1, median, Q3, max）和样本量

**图例交互**：
1. 所有图表的图例支持点击切换显示/隐藏
2. 人工经验策略的图例项始终排在第一位，且使用虚线图标（与折线图的虚线风格一致）

**响应式优化**：
1. 当图表容器宽度 < 400px 时，分组柱状图自动切换为堆叠模式
2. 当策略数 > 4 时，图例自动从顶部切换为右侧纵向排列
3. 所有图表在窗口 resize 时自动重新计算尺寸

#### 任务 2.3.3：AI 解读文案的动态化

当前 AI 解读文案是硬编码在 `mockInsights.ts` 中的静态文本。V3 需要实现基于实际数据的动态解读生成逻辑。

**实现方案**：

创建 `src/lib/insightGenerator.ts`，为每种图表类型实现一个解读生成函数。这些函数接收图表的实际数据，通过模板 + 数据填充的方式生成解读文案。

```typescript
// 示例：E1 车次数对比的解读生成
function generateE1Insight(results: SimulationResult[], strategies: Strategy[], batches: OrderBatch[]): string {
  const manual = results.filter(r => r.strategyId === 's1'); // 人工策略
  const algorithms = strategies.filter(s => s.type === 'algorithm');
  
  // 计算各算法策略相对人工的车次变化
  const changes = algorithms.map(algo => {
    const algoResults = results.filter(r => r.strategyId === algo.id);
    const totalManual = manual.reduce((sum, r) => sum + r.vehicleCount, 0);
    const totalAlgo = algoResults.reduce((sum, r) => sum + r.vehicleCount, 0);
    const diff = totalAlgo - totalManual;
    const pct = ((diff / totalManual) * 100).toFixed(1);
    return { name: algo.name, diff, pct };
  });
  
  // 找出最优策略
  const best = changes.reduce((a, b) => a.diff < b.diff ? a : b);
  
  // 生成文案
  if (best.diff < 0) {
    return `在车次数维度，${best.name} 表现最优，相比人工调度共减少 ${Math.abs(best.diff)} 个车次（降幅 ${Math.abs(parseFloat(best.pct))}%）。` +
           `在 ${batches.length} 个批次中，${changes.filter(c => c.diff <= 0).length} 个算法策略实现了车次持平或减少。`;
  } else {
    return `各算法策略的车次数与人工调度基本持平，差异在 ${Math.abs(best.diff)} 个车次以内。` +
           `建议关注其他经济性指标（如总里程、满载率）以评估综合效益。`;
  }
}
```

**关键原则**：
1. 解读必须引用具体数据（数值、百分比、排名），不能是泛泛而谈
2. 解读应该指出"最优策略"和"需要关注的风险"
3. 当数据差异不显著时（如差异 < 2%），应明确指出"差异不显著"
4. 单策略模式下，解读应聚焦于"该策略的绝对表现"而非"对比"
5. 每条解读控制在 80-150 字

**需要实现解读生成函数的图表**：E1-E8、C1-C5、F1-F7、S1-S2，共 22 个函数。

### 2.4 代码质量优化

#### 任务 2.4.1：清理未使用的 V1 组件

以下组件在 V2 的 `ReportDetailPage.tsx` 中不再被引用，应当删除以减少包体积：

```
src/components/charts/MaxDistanceBoxChart.tsx
src/components/charts/MaxDurationBoxChart.tsx
src/components/charts/OrderCountBoxChart.tsx
src/components/charts/StopIntervalChart.tsx
src/components/charts/DistDurationScatter.tsx
src/components/charts/LoadUtilRadarChart.tsx
src/components/charts/RouteSpanHistChart.tsx
```

删除前需确认这些组件确实没有被任何其他文件引用。使用 `grep -r "import.*from.*MaxDistanceBoxChart" src/` 进行验证。

#### 任务 2.4.2：图表组件的统一 Props 接口

当前各图表组件的 Props 接口不统一，有些接收 `results + strategyIds + batchIds`，有些还接收 `availability`。V3 应统一为：

```typescript
interface BaseChartProps {
  results: SimulationResult[];
  strategyIds: string[];
  batchIds: string[];
  availability?: DataAvailability;
}
```

所有图表组件都应实现此接口，即使某些组件不需要所有字段。

#### 任务 2.4.3：ECharts 按需引入

当前 `echarts-for-react` 引入了完整的 ECharts 包（约 800KB+），导致构建产物 1318KB。V3 应改为按需引入：

```typescript
// src/lib/echarts.ts
import * as echarts from 'echarts/core';
import { BarChart, LineChart, ScatterChart, RadarChart, HeatmapChart, BoxplotChart, CustomChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent, RadarComponent, VisualMapComponent, MarkPointComponent, MarkLineComponent, MarkAreaComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart, LineChart, ScatterChart, RadarChart, HeatmapChart, BoxplotChart, CustomChart,
  TitleComponent, TooltipComponent, LegendComponent, GridComponent, RadarComponent,
  VisualMapComponent, MarkPointComponent, MarkLineComponent, MarkAreaComponent,
  CanvasRenderer
]);

export default echarts;
```

然后在 `echarts-for-react` 中使用自定义的 echarts 实例：

```typescript
import ReactECharts from 'echarts-for-react/lib/core';
import echarts from '../lib/echarts';

// 在组件中
<ReactECharts echarts={echarts} option={option} />
```

预期可将 ECharts 相关体积从 ~800KB 降低到 ~400KB。

#### 任务 2.4.4：添加图表 Loading Skeleton

当图表数据正在计算或渲染时，应显示 loading skeleton 而非空白区域。

```typescript
// src/components/report/ChartSkeleton.tsx
export default function ChartSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-4 w-1/3 bg-white/5 rounded" />
      <div className="h-[300px] bg-white/5 rounded-lg" />
      <div className="h-3 w-2/3 bg-white/5 rounded" />
    </div>
  );
}
```

在 `ChartCard` 中使用 `React.Suspense` 或自定义 loading 状态包裹图表组件。

---

## 三、KPI 概览区域优化

### 3.1 KPI 卡片的数据驱动化

当前 KPI 卡片的数量和内容是硬编码的 5 个。V3 需要根据 `DataAvailability` 动态决定显示哪些 KPI。

**KPI 与数据可用性的映射**：

| KPI | 始终显示 | 条件显示 | 依赖字段 |
|-----|---------|---------|---------|
| 总车次数 | 是 | — | `vehicleCount` |
| 总里程 | 是 | — | `totalDistance` |
| 总工作时长 | 是 | — | `totalDuration` |
| 平均满载率 | 是 | — | `avgLoadRate` |
| 里程节降率 | — | `hasMultiBatches` 且策略数 > 1 | 计算字段 |
| 总成本 | — | `hasCostStructure` | `totalCost` |
| 约束违反率 | — | 至少 1 种约束有数据 | `constraintViolations` |

### 3.2 KPI 变化量的方向语义

当前 KPI 卡片中的变化量使用 ↑/↓ 箭头，但语义不够明确。例如：
- 车次数 ↓ 5 是好事（节约了车次）
- 满载率 ↓ 1.5% 是坏事（满载率降低了）

V3 应为每个 KPI 定义"正向"和"负向"的语义，并用颜色（绿色=好/红色=差）而非单纯的方向箭头来表达：

```typescript
interface KpiDefinition {
  label: string;
  unit: string;
  positiveDirection: 'up' | 'down'; // 'down' 表示数值下降是好事（如车次、里程）
  format: (value: number) => string;
}
```

---

## 四、浮动导航优化

### 4.1 动态章节列表

当前浮动导航固定显示 5 个章节按钮。V3 需要根据实际渲染的章节动态生成导航项。

当某个章节因为 `DataAvailability` 而完全不渲染时，对应的导航按钮也应隐藏。

### 4.2 章节内图表计数

在每个导航按钮旁边显示该章节包含的图表数量，如"经济性指标 (6)"。

### 4.3 进度指示

在浮动导航中添加一个微型进度条，显示当前阅读位置占总页面长度的百分比。

---

## 五、Excel 导出增强

### 5.1 当前状态

V2 的"下载 Excel"按钮为 placeholder 状态。V3 需要实现真正的 Excel 导出功能。

### 5.2 实现方案

使用 `xlsx`（SheetJS）库在前端生成 Excel 文件。

```bash
pnpm add xlsx
```

**Excel 文件结构**（多 Sheet）：

| Sheet 名称 | 内容 | 对应原始 POC 报告 |
|-----------|------|-----------------|
| 概览 | 项目信息、批次列表、策略列表、KPI 汇总 | 新增 |
| 经济性对比 | 各批次 x 各策略的车次/里程/时长/满载率明细 | 对应原始 Excel |
| 分车型明细 | 各车型 x 各策略的满载率和使用次数 | 对应原始 Excel 的分车型 sheet |
| 约束遵循 | 各约束类型 x 各策略的违反率/最大超限/平均超限 | 新增 |
| 合理性指标 | 各策略的路线跨度/跨区/绕行率/卸货点数等统计值 | 新增 |
| 综合评分 | 各策略的三维度评分和综合排名 | 新增 |
| 车次明细 | 所有车次的完整明细数据（可选，数据量较大） | 对应原始 Excel 的明细 sheet |

**实现代码结构**：

```typescript
// src/lib/excelExport.ts
import * as XLSX from 'xlsx';

export function generateExcel(
  report: PocReport,
  results: SimulationResult[],
  strategies: Strategy[],
  batches: OrderBatch[],
  availability: DataAvailability
): void {
  const wb = XLSX.utils.book_new();
  
  // Sheet 1: 概览
  const overviewData = generateOverviewSheet(report, strategies, batches);
  XLSX.utils.book_append_sheet(wb, overviewData, '概览');
  
  // Sheet 2: 经济性对比
  const economicData = generateEconomicSheet(results, strategies, batches);
  XLSX.utils.book_append_sheet(wb, economicData, '经济性对比');
  
  // ... 其他 sheets
  
  XLSX.writeFile(wb, `POC报告_${report.title}_${new Date().toISOString().slice(0,10)}.xlsx`);
}
```

### 5.3 HTML 导出

"下载 HTML"按钮应生成一个自包含的 HTML 文件，内嵌 ECharts CDN 引用和所有图表配置数据。这样用户可以在任何浏览器中打开查看交互式图表。

**实现要点**：
1. 生成的 HTML 文件应引用 ECharts CDN（`https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js`）
2. 所有图表的 `option` 配置序列化为 JSON 嵌入 HTML
3. AI 解读文案直接嵌入 HTML
4. 保持深色星空主题的 CSS 样式
5. 文件大小控制在 500KB 以内（不含 ECharts CDN）

---

## 六、测试要求

### 6.1 功能测试清单

| 测试场景 | 测试内容 | 验收标准 |
|---------|---------|---------|
| 3 策略 + 3 批次 | 标准场景，验证所有图表正常渲染 | 22 张图表全部正确显示 |
| 4 策略 + 5 批次 | 多策略场景，验证颜色区分和布局 | 图例和柱状图不拥挤 |
| 1 策略 + 3 批次 | 单策略模式，验证退化行为 | 无对比类图表，AI 解读调整 |
| 3 策略 + 1 批次 | 单批次模式，验证 E8 不渲染 | E8 隐藏，其他图表正常 |
| 全零约束违反 | 验证 C1-C5 的空状态处理 | 显示正面信息，无空白 |
| 极端数据批次 | 验证图表对离群值的处理 | Y 轴自适应，不压缩正常数据 |
| DataAvailability 全 false | 验证空章节隐藏 | 无空白章节，导航自适应 |
| 生成弹窗完整流程 | 选批次→选策略→确认→生成 | 每步交互正常，可后台运行 |
| Excel 导出 | 下载并打开 Excel 文件 | 6 个 Sheet 数据完整 |
| HTML 导出 | 下载并在浏览器中打开 | 图表可交互，样式正确 |

### 6.2 视觉回归测试

对以下关键页面进行截图对比，确保 V3 优化不破坏 V2 已有的视觉效果：
1. 列表页整体布局
2. 报告详情页 KPI 区域
3. E1-E4 经济性图表区域
4. C1-C5 约束遵循图表区域
5. F1-F7 合理性图表区域
6. S1-S2 综合评估区域

### 6.3 性能测试

| 指标 | V2 基准 | V3 目标 |
|------|--------|--------|
| 构建产物大小 | 1318 KB | < 900 KB |
| 首屏渲染时间 | 未测量 | < 2s |
| 图表渲染完成时间（22 张） | 未测量 | < 3s |
| Excel 生成时间 | N/A | < 2s |

---

## 七、文件变更清单

以下是 V3 预期需要修改或新增的文件：

| 操作 | 文件路径 | 变更说明 |
|------|---------|---------|
| 修改 | `src/components/charts/LoadRateChart.tsx` | 移除 areaStyle，优化 markPoint |
| 修改 | `src/components/generate/GenerateModal.tsx` | 修复事件绑定，使用 Portal |
| 修改 | `src/pages/ReportDetailPage.tsx` | 添加章节级空检测，动态 KPI |
| 修改 | `src/pages/ReportListPage.tsx` | 确认弹窗事件绑定 |
| 修改 | `src/components/report/ChartCard.tsx` | 添加空状态渲染 |
| 修改 | `src/components/report/KpiCard.tsx` | 添加正向/负向语义颜色 |
| 修改 | `src/components/layout/FloatingNav.tsx` | 动态章节列表 + 图表计数 |
| 修改 | `src/data/mockSimulation.ts` | 丰富数据多样性 |
| 修改 | `src/data/mockReports.ts` | 增加单策略/单批次/全零违反报告 |
| 修改 | `src/data/mockAvailability.ts` | 增加多套配置 |
| 修改 | `src/data/mockInsights.ts` | 替换为动态生成调用 |
| 修改 | `src/index.css` | 增强 glass-card 样式 |
| 修改 | `src/types/index.ts` | 新增 ScoringWeights 等类型 |
| 新增 | `src/lib/insightGenerator.ts` | AI 解读动态生成逻辑 |
| 新增 | `src/lib/excelExport.ts` | Excel 导出功能 |
| 新增 | `src/lib/htmlExport.ts` | HTML 导出功能 |
| 新增 | `src/lib/echarts.ts` | ECharts 按需引入配置 |
| 新增 | `src/hooks/useChartDataValidity.ts` | 图表数据有效性检查 Hook |
| 新增 | `src/components/report/ChartSkeleton.tsx` | 图表 Loading Skeleton |
| 新增 | `src/components/report/EmptyState.tsx` | 空状态组件 |
| 新增 | `public/_redirects` | SPA 路由 fallback |
| 删除 | `src/components/charts/MaxDistanceBoxChart.tsx` | 未使用的 V1 组件 |
| 删除 | `src/components/charts/MaxDurationBoxChart.tsx` | 未使用的 V1 组件 |
| 删除 | `src/components/charts/OrderCountBoxChart.tsx` | 未使用的 V1 组件 |
| 删除 | `src/components/charts/StopIntervalChart.tsx` | 未使用的 V1 组件 |
| 删除 | `src/components/charts/DistDurationScatter.tsx` | 未使用的 V1 组件 |
| 删除 | `src/components/charts/LoadUtilRadarChart.tsx` | 未使用的 V1 组件 |
| 删除 | `src/components/charts/RouteSpanHistChart.tsx` | 未使用的 V1 组件 |

---

## 八、执行优先级

V3 的任务应按以下顺序执行，确保每一步都可独立验证：

| 阶段 | 任务 | 预估工作量 | 依赖 |
|------|------|-----------|------|
| 1 | 清理未使用的 V1 组件（2.4.1） | 小 | 无 |
| 2 | 修复 P0/P1 Bug（2.1.1 ~ 2.1.3） | 中 | 无 |
| 3 | 空数据 Fallback UI（2.2.1） | 大 | 无 |
| 4 | 丰富 Mock 数据（2.2.2） | 中 | 阶段 3 |
| 5 | AI 解读动态化（2.3.3） | 大 | 阶段 4 |
| 6 | 视觉与交互优化（2.3.1 ~ 2.3.2） | 中 | 无 |
| 7 | KPI 与导航优化（三、四） | 中 | 阶段 3 |
| 8 | Excel/HTML 导出（五） | 大 | 阶段 4 |
| 9 | ECharts 按需引入（2.4.3） | 中 | 无 |
| 10 | 统一 Props 接口（2.4.2） | 小 | 无 |
| 11 | 全面测试（六） | 大 | 所有阶段 |

---

## 九、验收标准

V3 优化完成后，需满足以下验收标准：

1. **零 P0/P1 Bug**：E4 遮挡修复、生成弹窗可用、SPA 路由 fallback 配置完成
2. **数据鲁棒性**：6 种边界场景（单策略/单批次/全零违反/极端数据/空章节/大批次）全部通过测试
3. **动态 AI 解读**：22 个图表的解读文案均基于实际数据动态生成，引用具体数值
4. **导出功能**：Excel 和 HTML 导出均可正常工作，文件内容完整
5. **包体积**：构建产物 < 900KB
6. **TypeScript**：编译零错误
7. **测试报告**：在 `tests/V3-TEST-REPORT.md` 中记录完整的测试结果

---

## 附录 A：V2 代码结构参考

```
src/
├── components/
│   ├── charts/          # 32 个图表组件（V3 清理后应为 25 个）
│   ├── generate/        # GenerateModal.tsx
│   ├── layout/          # FloatingNav.tsx, Navbar.tsx
│   └── report/          # AiInsight, ChartCard, KpiCard, ReportCard, StrategyLegend
├── data/
│   ├── mockAvailability.ts
│   ├── mockBatches.ts
│   ├── mockConstraints.ts
│   ├── mockInsights.ts
│   ├── mockReports.ts
│   ├── mockSimulation.ts
│   └── mockStrategies.ts
├── lib/
│   ├── chartTheme.ts
│   ├── colors.ts
│   └── utils.ts
├── pages/
│   ├── ReportDetailPage.tsx
│   └── ReportListPage.tsx
├── types/
│   └── index.ts
├── App.tsx
├── index.css
└── main.tsx
```

## 附录 B：关键颜色配置

```typescript
// 策略颜色（已定义，V3 保持不变）
人工经验策略: '#f59e0b' (琥珀色)
均衡优化:     '#4a9eff' (蓝色)
里程优先:     '#34d399' (绿色)
时效优先:     '#8b5cf6' (紫色)
满载优先:     '#f43f5e' (红色)

// 扩展色板（当策略数 > 5 时使用）
策略6: '#06b6d4' (青色)
策略7: '#eab308' (黄色)
策略8: '#ec4899' (粉色)
```
