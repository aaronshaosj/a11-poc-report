# A11 POC 报告生成器 — 设计方案构思

## 设计背景

本项目是 C-ROS Agentic Workbench 的 A11 模块 POC 报告生成器的高保真交互原型。需要与 C-ROS 现有的深色星空主题保持一致，同时展示 16+ 张 ECharts 交互式图表、LLM 解读文字、三步引导式生成流程等完整功能。

---

<response>
<text>

## 方案一：Glassmorphism Deep Space（玻璃态深空）

**Design Movement**: Glassmorphism + Dark Space UI，灵感来自 NASA Mission Control 和 Bloomberg Terminal 的融合。

**Core Principles**:
1. 半透明玻璃态卡片叠加在深色星空背景上，营造层次感和科技感
2. 信息密度优先——单屏展示尽可能多的有效信息
3. 冷色调为主（深蓝-钢蓝-青色），琥珀橙作为人工策略的对比色

**Color Philosophy**: 深空蓝(#0a0e1a)为底色，代表宇宙的无限可能；钢蓝(#4a9eff)为主色调，传达专业与信赖；琥珀橙(#f59e0b)用于人工经验策略，暗示"传统"与"温暖"的人工智慧；翡翠绿(#34d399)代表算法优化的"增长"。

**Layout Paradigm**: 两列网格布局，图表卡片均匀排列，右侧浮动导航提供快速跳转。列表页使用瀑布流卡片。

**Signature Elements**:
1. 玻璃态卡片（backdrop-filter: blur + 半透明边框）
2. 顶部渐变光线条（hover时显现的蓝-青渐变线）
3. AI 解读区的蓝色竖线 + "AI" 标签

**Interaction Philosophy**: 悬停时卡片微微上浮并发光，图表支持 tooltip 和图例筛选，导航平滑滚动。

**Animation**: 卡片入场使用 fade-up + scale，图表数据加载使用 ECharts 内置动画，状态标签使用 pulse 呼吸效果。

**Typography System**: Inter 字体族，标题 600-700 weight，正文 400，数据数值使用 tabular-nums。

</text>
<probability>0.06</probability>
</response>

<response>
<text>

## 方案二：Tactical HUD（战术抬头显示器）

**Design Movement**: Military HUD + Cyberpunk Data Visualization，灵感来自战斗机座舱显示和赛博朋克数据墙。

**Core Principles**:
1. 所有元素使用细线框和扫描线效果，营造"实时监控"的紧迫感
2. 数据以"仪表盘"形式呈现，每个图表都像一个独立的监控面板
3. 强调动态——持续的微动画暗示系统在"活着运行"

**Color Philosophy**: 纯黑底(#050508)配以荧光绿(#00ff88)为主色，代表"系统在线"；警告用荧光橙(#ff6600)；危险用荧光红(#ff0044)。所有颜色都带有发光效果(glow)。

**Layout Paradigm**: 不对称的面板布局，左侧为主内容区（70%），右侧为实时状态面板（30%）。图表使用不等高的拼贴式排列。

**Signature Elements**:
1. 扫描线动画（每隔几秒从上到下扫过一道半透明光线）
2. 角落装饰线（每个面板四角有 L 形装饰线条）
3. 数据闪烁效果（关键数值偶尔闪烁一下）

**Interaction Philosophy**: 鼠标经过时面板边框发光增强，点击时有"激活"的脉冲波纹效果。

**Animation**: 页面加载时面板逐个"启动"（从暗到亮），数据以打字机效果逐位显示。

**Typography System**: JetBrains Mono 等宽字体用于数据，Rajdhani 用于标题，营造技术感。

</text>
<probability>0.03</probability>
</response>

<response>
<text>

## 方案三：Refined Observatory（精致天文台）

**Design Movement**: Swiss Design + Astronomical Observatory UI，灵感来自天文台控制室的精密仪器界面。

**Core Principles**:
1. 极致的网格对齐和数学精度，每个元素都在严格的 8px 网格上
2. 克制的装饰——用数据本身的美感说话，减少不必要的视觉噪音
3. 对比度精确控制——确保每一层信息都有明确的视觉层级

**Color Philosophy**: 深靛蓝(#0c1222)为底色，象征夜空；银白(#c8d0e0)为主文字色，如星光；淡蓝(#5b8def)为交互色，如晨曦；暖金(#d4a853)用于人工策略，如黄铜仪器。

**Layout Paradigm**: 严格的 12 列网格系统，图表以 2×N 矩阵排列，每个图表卡片尺寸完全一致。顶部固定信息栏，底部无限滚动。

**Signature Elements**:
1. 精密刻度线（图表区域边缘有细微的刻度标记）
2. 圆形进度指示器（KPI 使用环形进度条而非纯数字）
3. 细线分隔符（用 1px 细线而非卡片阴影来分隔区域）

**Interaction Philosophy**: 极简交互——hover 只改变透明度，不改变位置或大小。点击反馈用颜色变化而非动画。

**Animation**: 几乎无动画，仅在页面切换时使用 200ms 的 opacity 过渡。图表使用 ECharts 默认动画。

**Typography System**: DM Sans 用于标题（clean geometric），Source Sans Pro 用于正文，Fira Code 用于数据。

</text>
<probability>0.04</probability>
</response>

---

## 选定方案

**选定方案一：Glassmorphism Deep Space（玻璃态深空）**

理由：该方案与 C-ROS Workbench 现有的深色星空主题最为契合，已在原型中验证了视觉效果。玻璃态卡片和蓝-青渐变色系是 C-ROS 的标志性视觉语言，切换到其他风格会破坏产品的视觉一致性。
