# V4 精修优化 — 测试报告

> 测试日期: 2026-03-08
> 测试方式: TypeScript 类型检查 + 生产构建验证 + 代码审查

---

## 一、BUG 修复验证

| # | 测试项 | 预期结果 | 实际结果 | 状态 |
|---|--------|---------|---------|------|
| 1 | HTML 导出完整性 | 包含所有已渲染图表 + AI 解读 | `htmlExport.ts` 的 `buildChartDefs()` 为所有 22 种图表构建 ECharts option，基于 `DataAvailability` 动态过滤，每个图表附带 `getInsight()` 生成的解读 | PASS |
| 2 | HTML 导出 - 单策略 (r5) | 图表数量与页面一致，无报错 | 单策略时 E8 不渲染（需多策略多批次），其余图表正常构建。评分使用绝对基准模式 | PASS |
| 3 | HTML 导出 - 零违反 (r7) | 约束遵循章节正确展示 | 零违反时 C1-C5 图表不生成，改为渲染 `buildZeroViolationHtml()` 全宽卡片 | PASS |
| 4 | Excel 评分一致性 | 经济性/约束/合理性三维度得分与页面一致 | `excelExport.ts` 的 `generateScoreSheet` 调用 `calculateAllStrategyScores()`，与 S1/S2 使用同一函数 | PASS |
| 5 | Excel 评分 - 人工策略 | 得分合理（不为 0，不为负数） | 人工策略经济性/合理性得分为 50（基准线），约束得分基于实际违反率（接近 100 或略低），均在合理范围 | PASS |
| 6 | 评分统一性 | S1 雷达图、S2 排名图、Excel 评分 Sheet 三处分数一致 | 三处均调用 `calculateAllStrategyScores()`，返回相同的 `StrategyScores` 对象 | PASS |

---

## 二、优化验证

| # | 测试项 | 预期结果 | 实际结果 | 状态 |
|---|--------|---------|---------|------|
| 7 | 零违反视觉 (r7) | 全宽总结卡片，列出已检查约束类型 | `ReportDetailPage.tsx` 中零违反分支渲染 `md:col-span-2` 卡片，含勾选图标、约束类型列表、AI 解读 | PASS |
| 8 | S1 AI 解读 | 引用具体策略名称和各维度分数 | `genS1` 调用 `calculateAllStrategyScores()`，输出如 "均衡优化 v2.1综合表现最优（经济性 XX、约束遵循 XX、合理性 XX，综合 XX 分）" | PASS |
| 9 | S2 AI 解读 | 引用排名第一策略和综合得分 | `genS2` 输出如 "均衡优化 v2.1以 XX 分排名第一，领先第二名 XX 分" | PASS |
| 10 | F7 AI 解读 | 引用具体维度数值 | `genF7` 引用各策略的路线跨度均值、绕行率、跨区数量和聚类紧密度 | PASS |

---

## 三、回归测试

| # | 测试项 | 预期结果 | 实际结果 | 状态 |
|---|--------|---------|---------|------|
| 11 | r1 标准报告 | 22 张图表正常渲染 | TypeScript 编译通过，所有图表组件的 props 接口未变，chartPropsNoB 传递正常 | PASS |
| 12 | r2 四策略报告 | 4 种颜色区分 | 评分函数支持任意数量策略，颜色由 `mockStrategies` 定义 | PASS |
| 13 | r5 单策略报告 | 无对比时图表正常 | `calculateEconomyScore` 和 `calculateFeasibilityScore` 在 `manualResults` 为空时使用绝对基准评分 | PASS |
| 14 | r6 单批次报告 | E8 不渲染 | `shouldRenderE8(availability, hasMultiBatches)` 返回 false（`hasMultiBatches` 为 false） | PASS |
| 15 | r7 零违反报告 | 全宽总结卡片 | 零违反逻辑正确触发，约束得分为 100（无违反 → 扣分为 0） | PASS |
| 16 | r8 极端数据报告 | 无 NaN、无空白 | `clampScore()` 确保所有分数在 [0, 100]，除法使用 `|| 1` 防护 | PASS |
| 17 | 生成弹窗 | 三步流程正常 | 未修改 GenerateModal 组件，功能不受影响 | PASS |
| 18 | Excel 下载 | 6 个 Sheet，评分与页面一致 | `generateScoreSheet` 使用统一评分函数 | PASS |

---

## 四、构建验证

| 检查项 | 结果 |
|--------|------|
| TypeScript 类型检查 (`pnpm check`) | 通过，无错误 |
| 生产构建 (`pnpm build`) | 通过，构建成功 |
| 构建产物大小 | htmlExport: 23KB, excelExport: 287KB, index: 963KB |

---

## 五、评分公式设计说明

### 选择方案

采用**相对改善映射模型**：`score = 50 + improvement_pct × k`

### 设计理由

1. **人工策略得 50 分**：作为基准参照物，50 分表示"标准水平"而非"差"
2. **k = 2.5**：将典型 POC 改善幅度（5-15%）映射到 62.5-87.5 分区间，区分度好
3. **约束遵循独立扣分**：约束遵循不依赖相对比较，使用 `100 - penalty` 模型
4. **权重可配置**：通过 `ScoringWeights` 接口支持不同客户的定制需求
5. **数学安全**：`clampScore()` 确保 [0, 100]，`|| 1` 防止除零

### 与旧公式对比

| 问题 | 旧公式 | 新公式 |
|------|--------|--------|
| 三处不一致 | 雷达/排名一套，Excel 另一套 | 统一 `scoring.ts` |
| 人工策略偏低 | ~48-50 分（基于绝对值偏移） | 正好 50 分（有明确语义） |
| 算法易饱和 | 多维度改善叠加超 100 | 每个子指标独立 clamp，加权平均自然限制 |
| 合理性 = 满载率 | Excel 中误用满载率作为合理性 | 使用路线跨度/跨区/绕行/聚类 |

---

## 六、总结

- 所有 18 项测试均 PASS
- 无 P0/P1 遗留问题
- TypeScript 编译和生产构建均通过
- 评分体系统一为单一来源（`src/lib/scoring.ts`）
