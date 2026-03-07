# A11 POC 报告生成器 — Claude Code 开发指令

> **模块编号**: A11 | **代号**: Report Generator | **所属系统**: C-ROS Agentic Workbench
> **日期**: 2026-03-08 | **版本**: v1.0

---

## 一、任务概述

你需要为 C-ROS 智能调度系统开发 **A11 POC 报告生成器**的前端模块。这是一个独立的、自包含的 Web 应用，用于将人工调度与多种算法调度策略的仿真结果进行多维度、可交互的量化对比分析，并生成可下载的 HTML 报告和 Excel 数据表。

### 1.1 核心目标

将现有的 POC 报告（静态 PNG 图片 + Excel 表格，仅支持人工 vs 算法 1v1 对比）升级为：

| 维度 | 现状 | 目标 |
|------|------|------|
| 图表呈现 | 独立 PNG 静态图片（matplotlib 生成） | ECharts 交互式图表，统一为单个 HTML 文件 |
| 数据解读 | 无 | 每张图表配备 LLM 生成的 80-150 字凝练解读 |
| 策略对比 | 仅人工 vs 算法（2 组） | 支持 n 组策略同时对比（最多 8 组），动态扩展 |
| 生成流程 | 手动触发、无管理界面 | 完整 UI 流程：批次选择 → 策略选择 → 异步生成 → 记录管理 |
| 输出格式 | 分散的 PNG + 1 个 Excel | 1 个自包含 HTML + 1 个多 Sheet Excel |

### 1.2 技术栈要求

本项目是一个**纯前端静态应用**（设计原型阶段），使用 Mock 数据演示完整功能：

- **框架**: React 19 + TypeScript
- **样式**: Tailwind CSS 4
- **图表**: Apache ECharts 5.x（通过 `echarts-for-react` 集成）
- **UI 组件**: shadcn/ui（已预装）
- **路由**: wouter
- **构建**: Vite

### 1.3 项目上下文

C-ROS（Cloud Route Optimization System）是一个物流智能调度系统。在 POC（概念验证）阶段，实施顾问需要向客户展示算法调度相比人工调度的优势。POC 报告是核心交付物，通过量化指标对比来证明算法的价值。

**关键业务概念**：
- **订单批次**: 同一天截单后的一批订单，是对比分析的基本粒度。例如 "17-1"、"苏南17"。
- **人工经验策略**: 人工调度员的历史排线结果，作为对比基准（Baseline）。
- **算法策略**: C-ROS 算法引擎通过不同参数配置生成的调度方案，可以有多个版本。
- **仿真结果**: 每个策略对每个批次的调度结果，包含车次数、里程、时长、满载率等指标。

---

## 二、设计规范

### 2.1 视觉主题：Glassmorphism Deep Space（玻璃态深空）

本项目必须与 C-ROS Workbench 的现有 UI 风格保持一致，采用 **深色星空主题**。

**色彩体系**：

```css
/* 背景层 */
--bg-primary: #0a0e1a;        /* 主背景 - 深空蓝 */
--bg-secondary: #0f1629;      /* 次级背景 */
--bg-card: rgba(15, 22, 41, 0.7);  /* 卡片背景 - 玻璃态 */

/* 边框 */
--border-color: rgba(100, 140, 200, 0.15);
--border-glow: rgba(100, 160, 220, 0.3);  /* hover 发光 */

/* 文字 */
--text-primary: #e8ecf4;      /* 主文字 */
--text-secondary: #8b95a8;    /* 次级文字 */
--text-muted: #5a6478;        /* 弱化文字 */

/* 强调色 */
--accent-blue: #4a9eff;       /* 主色调 - 钢蓝 */
--accent-cyan: #00d4ff;       /* 辅助 - 青色 */
--accent-green: #34d399;      /* 正向 - 翡翠绿 */
--accent-orange: #f59e0b;     /* 人工策略 - 琥珀橙 */
--accent-red: #ef4444;        /* 负向/错误 */
--accent-purple: #a78bfa;     /* 紫罗兰 */
```

**策略调色板**（支持最多 8 组策略同时对比）：

| 位置 | 角色 | 颜色名 | 色值 |
|------|------|--------|------|
| #1 | 人工经验策略（固定，不可取消） | 琥珀橙 | `#f59e0b` |
| #2 | 算法策略 1 | 钢蓝 | `#4a9eff` |
| #3 | 算法策略 2 | 翡翠绿 | `#34d399` |
| #4 | 算法策略 3 | 紫罗兰 | `#8b5cf6` |
| #5 | 算法策略 4 | 玫瑰红 | `#f43f5e` |
| #6 | 算法策略 5 | 青色 | `#06b6d4` |
| #7 | 算法策略 6 | 粉色 | `#ec4899` |
| #8 | 算法策略 7 | 石灰绿 | `#84cc16` |

**视觉特征**：
1. **玻璃态卡片**: `backdrop-filter: blur(12px)` + 半透明背景 + 细微边框
2. **星空背景**: 使用 `radial-gradient` 模拟深空光晕效果
3. **顶部导航栏**: 固定定位，毛玻璃效果，高度 56px
4. **悬停效果**: 卡片 hover 时边框发光（`border-color` 过渡到 `border-glow`）
5. **入场动画**: 卡片使用 fade-up + scale 入场

### 2.2 字体

使用 Google Fonts 的 **Inter** 字体族：
- 标题: 600-700 weight
- 正文: 400 weight
- 数据数值: `font-variant-numeric: tabular-nums`

### 2.3 响应式设计

- 图表网格在宽屏下为 2 列，窄屏（< 768px）自动切换为单列
- 浮动导航在移动端隐藏
- 最小支持宽度 375px

---

## 三、页面结构与路由

### 3.1 路由设计

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 报告列表页 | 默认首页，展示所有 POC 报告记录 |
| `/report/:id` | 报告内容页 | 查看具体报告的完整内容（图表+解读） |

### 3.2 组件树

```
<App>
  ├── <ReportListPage>                    // 路由: /
  │     ├── <Navbar>                      // 顶部导航栏
  │     ├── <PageHeader>                  // 页面标题 + "生成 POC 报告" 按钮
  │     ├── <ReportCard>[]                // 报告卡片列表
  │     │     ├── <StatusBadge>           // 状态标签（已完成/生成中/失败）
  │     │     ├── <StrategyTagList>       // 策略标签组
  │     │     └── <DownloadButtons>       // 下载按钮
  │     └── <GenerateModal>              // 生成配置弹窗（三步引导）
  │           ├── <StepIndicator>         // 步骤指示器（1-2-3）
  │           ├── <BatchSelector>         // Step1: 批次选择
  │           ├── <StrategySelector>      // Step2: 策略选择
  │           ├── <ConfirmPanel>          // Step3: 确认面板
  │           └── <GeneratingOverlay>     // 生成中遮罩
  │
  └── <ReportDetailPage>                 // 路由: /report/:id
        ├── <Navbar>                     // 顶部导航栏（含面包屑+返回+下载）
        ├── <ReportMeta>                 // 报告元信息栏
        ├── <StrategyLegend>             // 策略图例栏
        ├── <KpiOverview>                // KPI 概览（5 张数值卡片）
        ├── <ChartSection>[]             // 图表分区（Type A / B / C）
        │     └── <ChartCard>[]          // 图表卡片
        │           ├── <EChartsChart>   // ECharts 图表容器
        │           └── <AiInsight>      // AI 解读文字
        └── <FloatingNav>               // 右侧浮动导航
```

---

## 四、页面详细设计

### 4.1 报告列表页 (`/`)

**布局**: 顶部固定导航栏 → 页面标题区（含"生成 POC 报告"按钮）→ 卡片列表

**报告卡片设计**：每张卡片代表一次报告生成记录，采用玻璃态卡片样式。

卡片信息结构：

| 信息项 | 说明 | 示例 |
|--------|------|------|
| 报告标题 | 自动编号 | POC 对比报告 #3 |
| 状态标签 | 已完成/生成中/失败 | 绿色「已完成」 |
| 订单批次 | 所选批次名称列表 | 17-1, 苏南17, 苏南18 |
| 对比策略数 | 策略组数 | 3 组（含人工经验策略） |
| 策略标签 | 彩色标签展示各策略名称 | 人工经验策略(橙) / 均衡优化 v2.1(蓝) |
| 图表/KPI 统计 | 仅已完成状态显示 | 包含 16 张交互式图表 · 5 项 KPI 概览 |
| 时间与耗时 | 生成时间和耗时 | 2026-03-06 14:32 · 耗时 2 分 18 秒 |
| 下载按钮 | HTML 和 Excel 两种格式 | 下载 HTML / 下载 Excel |

状态设计：

| 状态 | 颜色 | 附加信息 |
|------|------|---------|
| 已完成 | `#10b981` | 显示图表数、KPI 数、下载按钮 |
| 生成中 | `#3b82f6` | 显示预计剩余时间、进度条 |
| 生成失败 | `#ef4444` | 显示错误原因、「重新生成」按钮 |

**Mock 数据要求**: 至少准备 4 条报告记录，覆盖已完成（2条）、生成中（1条）、失败（1条）三种状态。

### 4.2 生成配置弹窗（三步引导）

点击"生成 POC 报告"按钮后弹出模态框，顶部显示步骤指示器。

**Step 1 — 选择订单批次**:
- 自动加载项目下的所有订单批次（Mock 5 个批次）
- 每行显示：批次名称、订单数、站点数、日期
- 提供「全选/取消全选」快捷操作
- 右上角实时显示已选择数量
- 至少选择 1 个批次才能点击"下一步"

**Step 2 — 选择对比策略**:
- 列表顶部固定显示「人工经验策略」，使用**橙色背景高亮**，标注「基准」标签，**默认选中且不可取消**
- 下方列出算法策略（Mock 4 个），使用蓝色「算法」标签
- 每个算法策略右侧显示：迭代轮数、节降百分比
- 至少选择 1 个策略（人工经验策略已默认选中，所以用户至少还需选 0 个算法策略即可进入下一步）

**Step 3 — 确认生成配置**:
- 结构化摘要展示：订单批次列表、对比策略列表、预估耗时
- 底部提示：报告生成为异步过程，可安全离开
- 点击"开始生成"后切换为全屏 Loading 状态
- Loading 状态包含：旋转动画、进度文字、"后台运行"按钮

### 4.3 报告内容页 (`/report/:id`)

这是核心页面，采用**单页长文档布局**，所有图表和解读按指标分类体系有序排列。

**页面结构（从上到下）**：

1. **顶部导航栏**: 面包屑（POC 报告 > POC 对比报告 #3）+ 返回列表按钮 + 下载按钮组
2. **报告元信息栏**: 项目名称 · 批次列表 · 总订单数 · 总站点数 · 生成时间
3. **策略图例栏**: 各策略的颜色标识和名称
4. **核心 KPI 概览**: 5 张数值卡片（横向排列）
5. **Type A · 边界类指标**: 6 张图表，两列网格
6. **Type B · 形态类指标**: 6 张图表，两列网格
7. **Type C · 综合效能**: 4 张图表，两列网格
8. **右侧浮动导航**: 固定在右侧，点击可平滑滚动到对应分区

---

## 五、图表规格（16 张图表 + 5 项 KPI）

### 5.1 核心 KPI 概览（5 张数值卡片）

| KPI | 数据来源 | 展示方式 |
|-----|---------|---------|
| 总车次数 | 全批次汇总 | 大字数值 + 各策略对比差值 |
| 总里程 (km) | 全批次汇总 | 大字数值 + 百分比变化 |
| 总工作时长 (h) | 全批次汇总 | 大字数值 + 百分比变化 |
| 平均满载率 | 全批次加权平均 | 大字数值 + 百分比变化 |
| 里程节降率 | 算法最优 vs 人工 | 大字数值 + 目标区间标注 |

每张 KPI 卡片应显示人工策略的基准值，以及各算法策略相对于基准的变化（用绿色箭头表示改善，红色箭头表示劣化）。

### 5.2 Type A — 边界类指标（6 张图表）

这类指标关注极值和分位数的对齐，验证算法是否在物理约束范围内运行。

| 编号 | 图表名称 | 图表类型 | X 轴 | Y 轴 | 对比逻辑 |
|------|---------|---------|------|------|---------|
| A1 | 各批次车次数对比 | 分组柱状图 | 订单批次 | 车次数 | 各批次的车次数横向对比 |
| A2 | 各批次平均满载率对比 | 折线图 | 订单批次 | 满载率(%) | 满载率趋势与差异 |
| A3 | 单车最大里程分布 | 箱线图 | 策略名称 | 里程(km) | 极值、中位数、四分位数对齐 |
| A4 | 单车最大作业时长 | 箱线图 | 策略名称 | 时长(min) | 时长分布的离散度对比 |
| A5 | 最大站点间隔对比 | 分组柱状图 | 订单批次 | 间隔(km) | 站点间距的极值控制能力 |
| A6 | 装载量上限利用率 | 雷达图 | 维度(重量/体积/托盘/件数) | 利用率(%) | 多维装载约束的利用效率 |

### 5.3 Type B — 形态类指标（6 张图表）

这类指标关注分布形状的对齐，验证算法生成的路线是否符合实际运营习惯。

| 编号 | 图表名称 | 图表类型 | X 轴 | Y 轴 | 对比逻辑 |
|------|---------|---------|------|------|---------|
| B1 | 车次订单数分布 | 箱线图（含散点） | 策略名称 | 订单数 | 每车订单数的分布形态 |
| B2 | 车次行驶距离分布 | 密度曲线图(KDE) | 行驶距离(km) | 密度 | 距离分布的峰值与偏态 |
| B3 | 线路跨度分布 | 直方图(叠加) | 跨度区间(km) | 车次数 | 外接圆直径的频率分布 |
| B4 | 点间距分布 | CDF 曲线 | 距离(km) | 累积概率 | 站点间距的累积概率分布 |
| B5 | 跨区数量分布 | 堆叠柱状图 | 策略名称 | 车次数 | 跨区车次的占比结构 |
| B6 | 聚类离散度 (Top-K) | 散点图 | 车次编号 | Top-3 均值(km) | 最近邻距离的空间聚集程度 |

### 5.4 Type C — 综合效能（4 张图表）

这类指标进行多维度的综合评价和趋势分析。

| 编号 | 图表名称 | 图表类型 | 说明 |
|------|---------|---------|------|
| C1 | 多维效能雷达图 | 雷达图 | 6 维归一化指标（里程节降/时长节降/满载率/聚类紧密度/跨区合理性/车次节约） |
| C2 | 批次维度节降率趋势 | 面积折线图 | 各策略在不同批次的节降率变化，含目标区间虚线（12%-18%） |
| C3 | 工作时长 vs 行驶距离 | 散点图 | 按车次着色，展示时长-距离的相关性与效率 |
| C4 | 综合评分排行（预留） | 水平柱状图 | 各策略的加权综合评分排名 |

### 5.5 图表通用规范

**ECharts 主题配置**（所有图表统一使用）：

```javascript
const chartTheme = {
    backgroundColor: 'transparent',
    textStyle: { color: '#8b95a8', fontFamily: 'Inter' },
    title: { textStyle: { color: '#e8ecf4', fontSize: 14, fontWeight: 600 } },
    legend: {
        textStyle: { color: '#8b95a8', fontSize: 11 },
        icon: 'roundRect',
        itemWidth: 12, itemHeight: 8
    },
    tooltip: {
        backgroundColor: 'rgba(15, 22, 41, 0.95)',
        borderColor: 'rgba(100, 140, 200, 0.2)',
        textStyle: { color: '#e8ecf4', fontSize: 12 }
    },
    // 坐标轴
    axisLine: { lineStyle: { color: '#2a3450' } },
    splitLine: { lineStyle: { color: '#1a2340' } }
};
```

**图表容器规范**：
- 每张图表卡片使用玻璃态背景
- 图表高度: 320px（雷达图 380px）
- 图表下方紧跟 AI 解读区域
- 图表支持 window resize 自适应

### 5.6 AI 解读区域

每张图表下方配备一段 AI 生成的解读文字（本阶段使用 Mock 文字）：

- 长度: 80-150 字
- 样式: 左侧蓝色竖线装饰 + "AI" 标签 + 次级文字颜色（`#8b95a8`）
- 内容要求: 聚焦数据差异的业务含义，不简单复述数字
- Mock 解读应当看起来专业、有洞察力，例如：

> 算法策略在满载率维度表现优异，均衡优化 v2.1 在 3 个批次中均保持 96% 以上的满载率，较人工提升 1.2 个百分点。里程优先 v1.3 虽然满载率略低于均衡策略，但其里程节降效果更为显著，体现了满载率与里程之间的典型 trade-off 关系。

---

## 六、Mock 数据规范

### 6.1 订单批次数据

```typescript
interface OrderBatch {
  id: string;
  name: string;           // 批次名称，如 "17-1"、"苏南17"
  orderCount: number;     // 订单数量
  stopCount: number;      // 站点数量
  totalWeight: number;    // 总重量(kg)
  totalVolume: number;    // 总体积(m³)
  date: string;           // 日期
}
```

Mock 5 个批次：

| name | orderCount | stopCount | date |
|------|-----------|-----------|------|
| 17-1 | 150 | 116 | 2026-01-17 |
| 苏南17 | 150 | 116 | 2026-02-17 |
| 苏南18 | 180 | 132 | 2026-02-18 |
| 苏南19 | 165 | 120 | 2026-02-19 |
| 苏南20 | 142 | 108 | 2026-02-20 |

### 6.2 策略数据

```typescript
interface Strategy {
  id: string;
  name: string;           // 策略名称
  type: 'manual' | 'algorithm';  // 类型
  iterations?: number;    // 迭代轮数（仅算法）
  savingsRate?: number;   // 节降率（仅算法）
  color: string;          // 显示颜色
}
```

Mock 策略：

| name | type | iterations | savingsRate | color |
|------|------|-----------|-------------|-------|
| 人工经验策略 | manual | — | — | #f59e0b |
| 均衡优化 v2.1 | algorithm | 12 | 8.2% | #4a9eff |
| 里程优先 v1.3 | algorithm | 8 | 11.5% | #34d399 |
| 时效优先 v1.0 | algorithm | 5 | 3.1% | #8b5cf6 |
| 满载优先 v1.1 | algorithm | 6 | 5.8% | #f43f5e |

### 6.3 仿真结果数据（每批次 × 每策略）

```typescript
interface SimulationResult {
  batchId: string;
  strategyId: string;
  vehicleCount: number;       // 车次数
  totalDistance: number;       // 总里程(km)
  totalDuration: number;      // 总工作时长(min)
  avgLoadRate: number;         // 平均满载率(%)
  maxDistance: number;         // 单车最大里程(km)
  maxDuration: number;         // 单车最大时长(min)
  maxStopInterval: number;     // 最大站点间隔(km)
  // 车次级别明细（用于箱线图、散点图等）
  vehicleDetails: VehicleDetail[];
}

interface VehicleDetail {
  vehicleId: string;
  vehicleType: string;        // 车型，如 "4.2米冷藏"
  orderCount: number;         // 订单数
  stopCount: number;          // 站点数
  distance: number;           // 行驶距离(km)
  duration: number;           // 工作时长(min)
  loadRate: number;           // 满载率(%)
  routeSpan: number;          // 线路跨度(km) - 外接圆直径
  crossRegionCount: number;   // 跨区数量
  topKAvg: number;            // Top-3 最近邻均值(km)
  maxStopInterval: number;    // 最大站点间隔(km)
  weightUtil: number;         // 重量利用率(%)
  volumeUtil: number;         // 体积利用率(%)
  palletUtil: number;         // 托盘利用率(%)
  qtyUtil: number;            // 件数利用率(%)
}
```

**Mock 数据生成要求**：
1. 数据应当**合理且有区分度**——不同策略之间的指标应有可辨别的差异
2. 人工策略的数据应体现"经验型"特征：满载率高但里程不一定最优
3. 算法策略应体现各自的优化倾向：里程优先策略的里程更短，满载优先策略的满载率更高
4. 每个批次每个策略生成 15-25 个 VehicleDetail 记录
5. 数据应包含一定的随机性，但整体趋势合理

### 6.4 报告记录数据

```typescript
interface PocReport {
  id: string;
  title: string;              // 如 "POC 对比报告 #3"
  status: 'completed' | 'generating' | 'failed';
  batchIds: string[];
  strategyIds: string[];
  chartCount: number;
  kpiCount: number;
  createdAt: string;
  completedAt?: string;
  duration?: number;          // 耗时(秒)
  errorMessage?: string;      // 失败原因
}
```

---

## 七、交互设计规范

### 7.1 图表交互

| 交互 | 实现方式 |
|------|---------|
| Tooltip | ECharts 内置 tooltip，显示精确数值和策略名称 |
| 图例筛选 | 点击图例可隐藏/显示对应策略的数据系列 |
| 窗口缩放 | 所有图表监听 window resize 事件，自动调用 `chart.resize()` |
| 数据缩放 | 适用于数据量大的图表（如散点图），支持 dataZoom |

### 7.2 导航交互

| 交互 | 实现方式 |
|------|---------|
| 浮动导航 | 右侧固定位置，列出 KPI / Type A / Type B / Type C 四个锚点 |
| 平滑滚动 | 点击导航项后 `scrollIntoView({ behavior: 'smooth' })` |
| 高亮当前 | 使用 IntersectionObserver 监听各分区，高亮当前可见分区 |
| 返回列表 | 面包屑和返回按钮均使用 wouter 的 `useLocation` 导航 |

### 7.3 弹窗交互

| 交互 | 实现方式 |
|------|---------|
| 步骤切换 | 点击"下一步"/"上一步"切换步骤，带过渡动画 |
| 全选/取消 | 批次和策略列表均支持全选/取消全选 |
| 实时计数 | 已选择数量实时更新 |
| 按钮禁用 | 未满足条件时"下一步"按钮禁用 |
| 生成动画 | 点击"开始生成"后显示 Loading 遮罩 |
| 后台运行 | 点击"后台运行"关闭遮罩，回到列表页 |

---

## 八、文件组织建议

```
client/src/
├── pages/
│   ├── ReportListPage.tsx        // 报告列表页
│   └── ReportDetailPage.tsx      // 报告内容页
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx            // 顶部导航栏
│   │   └── FloatingNav.tsx       // 浮动导航
│   ├── report/
│   │   ├── ReportCard.tsx        // 报告卡片
│   │   ├── StatusBadge.tsx       // 状态标签
│   │   ├── StrategyTag.tsx       // 策略标签
│   │   ├── KpiCard.tsx           // KPI 数值卡片
│   │   ├── ChartCard.tsx         // 图表卡片容器
│   │   ├── AiInsight.tsx         // AI 解读组件
│   │   └── StrategyLegend.tsx    // 策略图例栏
│   ├── charts/                   // 16 张图表组件
│   │   ├── VehicleCountChart.tsx      // A1
│   │   ├── LoadRateChart.tsx          // A2
│   │   ├── MaxDistanceBoxChart.tsx    // A3
│   │   ├── MaxDurationBoxChart.tsx    // A4
│   │   ├── StopIntervalChart.tsx      // A5
│   │   ├── LoadUtilRadarChart.tsx     // A6
│   │   ├── OrderCountBoxChart.tsx     // B1
│   │   ├── DistanceDensityChart.tsx   // B2
│   │   ├── RouteSpanHistChart.tsx     // B3
│   │   ├── IntervalCDFChart.tsx       // B4
│   │   ├── CrossRegionChart.tsx       // B5
│   │   ├── TopKScatterChart.tsx       // B6
│   │   ├── RadarOverallChart.tsx      // C1
│   │   ├── SavingsTrendChart.tsx      // C2
│   │   ├── DistDurationScatter.tsx    // C3
│   │   └── ScoreRankChart.tsx         // C4
│   └── generate/
│       ├── GenerateModal.tsx     // 生成配置弹窗
│       ├── BatchSelector.tsx     // 批次选择器
│       ├── StrategySelector.tsx  // 策略选择器
│       └── ConfirmPanel.tsx      // 确认面板
├── data/
│   ├── mockBatches.ts            // Mock 批次数据
│   ├── mockStrategies.ts         // Mock 策略数据
│   ├── mockReports.ts            // Mock 报告记录
│   ├── mockSimulation.ts         // Mock 仿真结果数据
│   └── mockInsights.ts           // Mock AI 解读文字
├── types/
│   └── index.ts                  // TypeScript 类型定义
├── hooks/
│   └── useScrollSpy.ts           // 滚动监听 Hook
└── lib/
    ├── chartTheme.ts             // ECharts 主题配置
    ├── colors.ts                 // 策略调色板
    └── utils.ts                  // 工具函数
```

---

## 九、测试要求

### 9.1 功能验证清单

开发完成后，必须逐项验证以下功能：

**报告列表页**：
- [ ] 页面正确加载，显示 4 条 Mock 报告记录
- [ ] 已完成状态的卡片显示绿色标签、图表统计、下载按钮
- [ ] 生成中状态的卡片显示蓝色标签、进度条
- [ ] 失败状态的卡片显示红色标签、错误原因、重新生成按钮
- [ ] 策略标签颜色正确（人工=橙色，算法=各自颜色）
- [ ] 点击已完成的卡片可跳转到报告内容页

**生成配置弹窗**：
- [ ] 点击"生成 POC 报告"按钮弹出模态框
- [ ] Step 1: 批次列表正确显示，全选/取消全选功能正常
- [ ] Step 1: 未选择批次时"下一步"按钮禁用
- [ ] Step 2: 人工经验策略橙色高亮、默认选中、不可取消
- [ ] Step 2: 算法策略可自由选择/取消
- [ ] Step 3: 确认面板正确显示所选批次和策略
- [ ] 点击"开始生成"显示 Loading 遮罩
- [ ] 点击"后台运行"关闭遮罩

**报告内容页**：
- [ ] 页面正确加载，显示报告元信息
- [ ] 策略图例栏正确显示所有策略及颜色
- [ ] 5 张 KPI 卡片数据正确，变化箭头方向和颜色正确
- [ ] 16 张 ECharts 图表全部正确渲染，无空白或报错
- [ ] 每张图表下方显示 AI 解读文字
- [ ] 图表 tooltip 功能正常
- [ ] 图表图例点击可隐藏/显示系列
- [ ] 浮动导航正确显示，点击可平滑滚动
- [ ] 浮动导航高亮当前可见分区
- [ ] 窗口缩放时图表自适应
- [ ] 面包屑和返回按钮可返回列表页

**视觉验证**：
- [ ] 深色星空主题正确应用
- [ ] 玻璃态卡片效果正确（半透明+模糊）
- [ ] 策略颜色在所有图表中一致
- [ ] 文字在深色背景上清晰可读
- [ ] 响应式布局在窄屏下正常（图表切换为单列）

### 9.2 测试报告格式

完成测试后，在项目根目录创建 `tests/TEST-REPORT.md`，包含：

1. **测试环境**: 浏览器版本、屏幕分辨率
2. **功能测试结果**: 逐项标注 PASS/FAIL
3. **视觉截图**: 关键页面的截图描述
4. **发现的问题**: 问题描述 + 严重程度（P0-P3）+ 修复状态
5. **总结**: 整体质量评估

---

## 十、关键约束与注意事项

1. **纯前端项目**: 不需要后端 API，所有数据使用 Mock。但数据层的接口设计应考虑未来对接真实 API 的可扩展性。
2. **ECharts 版本**: 使用 ECharts 5.x 或 6.x，通过 `echarts-for-react` 包装组件集成。
3. **图表类型多样性**: 16 张图表使用了 10 种不同的图表类型（分组柱状图、折线图、箱线图、雷达图、密度曲线图、直方图、CDF 曲线、堆叠柱状图、散点图、面积折线图），确保视觉不单调。
4. **策略扩展性**: 所有图表的 series 数组和 legend 必须根据策略数量动态生成，不能硬编码。
5. **颜色一致性**: 同一策略在所有图表中必须使用相同的颜色。
6. **人工策略特殊处理**: 人工经验策略始终排在第一位，使用琥珀橙色，在 UI 中有明确的视觉区分。
7. **性能**: 16 张图表同时渲染时页面不应卡顿，考虑使用懒加载或虚拟滚动。
8. **Mock 数据质量**: Mock 数据应当合理、有区分度、能体现不同策略的特征差异。不要使用完全随机的数据。

---

## 附录 A：现有 POC 报告的 Excel 数据结构

现有 Excel 文件（`批次维度基础数据统计表.xlsx`）的列结构：

```
批次号 | 订单数 | 点数 | 总箱数 | 总重量 | 总体积 | 车次数(人工) | 工作时长(分钟)(人工) | 行驶距离(km)(人工) | 车次数(算法) | 工作时长(分钟)(算法) | 行驶距离(km)(算法) | 平均满载率(人工) | 平均满载率(算法)
```

示例数据：
```
17-1 | 150 | 116 | — | 71557.28 | 231.78 | 22 | 6259.3 | 2067.5 | 22 | 5482.8 | 1878.2 | 95.8% | 96.1%
苏南17 | 150 | 116 | — | 71557.28 | 231.78 | 21 | 6135.4 | 1964.6 | 23 | 14398.4 | 2324.2 | 100.3% | 98.7%
```

升级后的 Excel 应扩展为多策略列结构：
```
指标名称 | 人工经验策略 | 策略A | 策略B | ... | 策略N | 最优标记
```

## 附录 B：现有 POC 报告的图表清单

现有报告包含 8 张 PNG 图表（matplotlib 生成）：

1. 不同批次平均满载率（折线图）
2. 不同批次的车次数（折线图）
3. 最大站点间隔（柱状图）
4. 不同车型车次的满载率（散点图）
5. 不同车次的订单数（蜂群图）
6. 不同车次的工作时长（蜂群图）
7. 不同车次的点数（蜂群图）
8. 不同车次的行驶距离（蜂群图）

升级后扩展为 16 张 ECharts 交互式图表 + 5 项 KPI 概览，详见第五章。

## 附录 C：TuningAgent 量化指标体系

POC 报告的图表设计严格对齐 TuningAgent 定义的三类量化指标：

**Type A — 边界类指标 (Boundary Alignment)**:
- Max_Distance（最大里程）
- Max_Stops（最大点位数）
- Max_Duration（最大作业时长）
- Max_weight / Max_volume / Max_qty / Max_pallet（装载量上限，分车型）
- 对齐逻辑：只要不超过人工历史的物理极限即视为可行

**Type B — 形态类指标 (Distribution Alignment)**:
- Route_Span（线路跨度 - 外接圆直径）
- Stop_Interval（点间距）
- Cross_Region_Count（跨区数量）
- Nearest_Top_K（聚类离散度）
- Routes_crossover（路线交叉重叠）
- 对齐逻辑：算法的指标分布应与人工历史保持一致或更优

**Type C — 综合效能**:
- 多维归一化评分
- 节降率趋势
- 效率相关性分析
- 对齐逻辑：综合权衡各维度表现
