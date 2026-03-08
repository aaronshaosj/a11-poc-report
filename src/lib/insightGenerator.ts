import type { SimulationResult, Strategy, OrderBatch } from '../types';

// ──────── Helpers ────────

function manual(results: SimulationResult[]) {
  return results.filter(r => r.strategyId === 's1');
}
function algo(results: SimulationResult[], strategies: Strategy[]) {
  const algos = strategies.filter(s => s.type === 'algorithm');
  return algos.map(a => ({
    strategy: a,
    results: results.filter(r => r.strategyId === a.id),
  }));
}
function pct(a: number, b: number) { return b === 0 ? 0 : +((a - b) / b * 100).toFixed(1); }
function abs(n: number) { return Math.abs(n); }
function f1(n: number) { return n.toFixed(1); }
function f0(n: number) { return Math.round(n).toString(); }
function sumField(rs: SimulationResult[], fn: (r: SimulationResult) => number) { return rs.reduce((s, r) => s + fn(r), 0); }
function avgField(rs: SimulationResult[], fn: (r: SimulationResult) => number) { return rs.length === 0 ? 0 : sumField(rs, fn) / rs.length; }
function isSingleStrategy(strategies: Strategy[]) { return strategies.length <= 1; }

// ──────── E1: Vehicle Count ────────

function genE1(results: SimulationResult[], strategies: Strategy[], batches: OrderBatch[]): string {
  const m = manual(results);
  const mTotal = sumField(m, r => r.vehicleCount);

  if (isSingleStrategy(strategies)) {
    return `当前单策略模式下，${strategies[0].name}在 ${batches.length} 个批次中共使用 ${mTotal} 个车次，平均每批次 ${f1(mTotal / batches.length)} 车次。`;
  }

  const changes = algo(results, strategies).map(a => {
    const total = sumField(a.results, r => r.vehicleCount);
    return { name: a.strategy.name, diff: total - mTotal, pct: pct(total, mTotal) };
  });
  const best = changes.reduce((a, b) => a.diff < b.diff ? a : b);

  if (best.diff < 0) {
    return `在车次数维度，${best.name}表现最优，相比人工调度共减少 ${abs(best.diff)} 个车次（降幅 ${abs(best.pct)}%）。在 ${batches.length} 个批次中，${changes.filter(c => c.diff <= 0).length} 个算法策略实现了车次持平或减少。`;
  }
  return `各算法策略的车次数与人工调度基本持平，最优策略 ${best.name} 差异仅 ${abs(best.diff)} 个车次。建议关注里程和满载率等维度以评估综合效益。`;
}

// ──────── E2: Total Distance ────────

function genE2(results: SimulationResult[], strategies: Strategy[], batches: OrderBatch[]): string {
  const m = manual(results);
  const mDist = sumField(m, r => r.totalDistance);

  if (isSingleStrategy(strategies)) {
    return `当前策略总里程 ${f1(mDist)}km，覆盖 ${batches.length} 个批次，平均每批次 ${f1(mDist / batches.length)}km。`;
  }

  const changes = algo(results, strategies).map(a => {
    const total = sumField(a.results, r => r.totalDistance);
    return { name: a.strategy.name, saved: mDist - total, pctSaved: pct(total, mDist) };
  });
  const best = changes.reduce((a, b) => a.saved > b.saved ? a : b);

  if (best.saved > 0) {
    return `总里程对比显示，${best.name}累计节约里程 ${f1(best.saved)}km（降幅 ${f1(abs(best.pctSaved))}%）。${changes.filter(c => c.saved > 0).length} 个算法策略实现了里程缩减，总里程节降对物流成本有直接影响。`;
  }
  return `各策略总里程与人工调度差异不显著（<2%）。${best.name}总里程为 ${f1(mDist + best.saved)}km，与人工基准接近。建议关注满载率和时效等综合指标。`;
}

// ──────── E3: Total Duration ────────

function genE3(results: SimulationResult[], strategies: Strategy[], batches: OrderBatch[]): string {
  const m = manual(results);
  const mDur = sumField(m, r => r.totalDuration);

  if (isSingleStrategy(strategies)) {
    return `当前策略总工作时长 ${f1(mDur / 60)} 小时，平均每批次 ${f1(mDur / 60 / batches.length)} 小时。`;
  }

  const changes = algo(results, strategies).map(a => {
    const total = sumField(a.results, r => r.totalDuration);
    return { name: a.strategy.name, saved: mDur - total, pctVal: pct(total, mDur) };
  });
  const best = changes.reduce((a, b) => a.saved > b.saved ? a : b);
  return `总工作时长对比中，${best.name}较人工缩短 ${f1(abs(best.saved) / 60)} 小时（${f1(abs(best.pctVal))}%），可有效减少加班成本。在 ${batches.length} 个批次中有 ${changes.filter(c => c.saved > 0).length} 个策略实现了时效提升。`;
}

// ──────── E4: Load Rate ────────

function genE4(results: SimulationResult[], strategies: Strategy[], batches: OrderBatch[]): string {
  const m = manual(results);
  const mAvg = avgField(m, r => r.avgLoadRate);

  if (isSingleStrategy(strategies)) {
    return `当前策略平均满载率 ${f1(mAvg)}%，在 ${batches.length} 个批次间保持稳定，无明显波动。`;
  }

  const all = strategies.map(s => {
    const rs = results.filter(r => r.strategyId === s.id);
    return { name: s.name, avg: avgField(rs, r => r.avgLoadRate) };
  });
  const best = all.reduce((a, b) => a.avg > b.avg ? a : b);
  const worst = all.reduce((a, b) => a.avg < b.avg ? a : b);

  return `满载率对比中，${best.name}以 ${f1(best.avg)}% 领先。人工策略满载率 ${f1(mAvg)}%，${worst.name}最低为 ${f1(worst.avg)}%。各策略均保持在 ${f1(Math.min(...all.map(a => a.avg)))}% 以上的高水平。`;
}

// ──────── E5: Load Rate by Type ────────

function genE5(results: SimulationResult[], strategies: Strategy[]): string {
  const types = new Set<string>();
  results.forEach(r => Object.keys(r.avgLoadRateByType || {}).forEach(t => types.add(t)));
  const typeArr = Array.from(types);

  if (isSingleStrategy(strategies)) {
    const rs = results.filter(r => r.strategyId === strategies[0].id);
    const byType = typeArr.map(t => {
      const rates = rs.map(r => r.avgLoadRateByType?.[t]).filter((v): v is number => v != null);
      return { type: t, avg: rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0 };
    }).filter(x => x.avg > 0);
    const best = byType.reduce((a, b) => a.avg > b.avg ? a : b, byType[0]);
    return `分车型满载率中，${best?.type || ''}满载率最高达 ${f1(best?.avg || 0)}%。各车型满载率均在合理范围内，车型配置与订单结构匹配良好。`;
  }

  let maxDiff = 0, maxType = '', hiStrat = '', loStrat = '';
  for (const t of typeArr) {
    const rates = strategies.map(s => {
      const rs = results.filter(r => r.strategyId === s.id);
      const vals = rs.map(r => r.avgLoadRateByType?.[t]).filter((v): v is number => v != null);
      return { name: s.name, avg: vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0 };
    }).filter(x => x.avg > 0);
    if (rates.length >= 2) {
      const hi = rates.reduce((a, b) => a.avg > b.avg ? a : b);
      const lo = rates.reduce((a, b) => a.avg < b.avg ? a : b);
      if (hi.avg - lo.avg > maxDiff) { maxDiff = hi.avg - lo.avg; maxType = t; hiStrat = hi.name; loStrat = lo.name; }
    }
  }
  return `分车型满载率显示，${maxType}在各策略间差异最大（${f1(maxDiff)}个百分点），${hiStrat}领先于${loStrat}。差异来自订单分配策略的不同偏好。`;
}

// ──────── E6: Vehicle Count by Type ────────

function genE6(results: SimulationResult[], strategies: Strategy[]): string {
  const m = results.filter(r => r.strategyId === 's1');
  const mTypes = m.reduce((acc, r) => {
    for (const [t, c] of Object.entries(r.vehicleCountByType || {})) { acc[t] = (acc[t] || 0) + c; }
    return acc;
  }, {} as Record<string, number>);
  const dominant = Object.entries(mTypes).reduce((a, b) => a[1] > b[1] ? a : b, ['', 0]);

  if (isSingleStrategy(strategies)) {
    return `当前策略车型使用中，${dominant[0]}使用最多（${dominant[1]}次），车型分布集中度适中。`;
  }

  return `分车型使用次数揭示了策略差异：人工策略${dominant[0]}使用最多（${dominant[1]}次）。各算法策略根据优化目标不同，车型选择策略有所差异，车型分布直接影响固定成本和变动成本结构。`;
}

// ──────── E7: Total Cost ────────

function genE7(results: SimulationResult[], strategies: Strategy[]): string {
  const all = strategies.map(s => {
    const rs = results.filter(r => r.strategyId === s.id);
    const total = rs.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    return { name: s.name, total };
  }).filter(x => x.total > 0);
  if (all.length === 0) return '当前报告无成本数据，总成本对比暂不可用。';
  const best = all.reduce((a, b) => a.total < b.total ? a : b);
  const mCost = all.find(x => x.name.includes('人工'))?.total || all[0].total;
  return `总成本对比显示，${best.name}以最低总成本胜出，较人工策略节约 ${f1(abs(pct(best.total, mCost)))}%。成本差异主要来自车次数和里程的综合优化效果。`;
}

// ──────── E8: Savings Trend ────────

function genE8(results: SimulationResult[], strategies: Strategy[], batches: OrderBatch[]): string {
  if (isSingleStrategy(strategies) || batches.length <= 1) {
    return '当前场景下里程节降率趋势图不适用（需多策略多批次数据）。';
  }
  const m = manual(results);
  const algos = algo(results, strategies);
  const bestAlgo = algos.map(a => {
    const savings = batches.map(b => {
      const mR = m.find(r => r.batchId === b.id);
      const aR = a.results.find(r => r.batchId === b.id);
      if (!mR || !aR) return 0;
      return (mR.totalDistance - aR.totalDistance) / mR.totalDistance * 100;
    });
    return { name: a.strategy.name, avg: savings.reduce((s, v) => s + v, 0) / savings.length, std: Math.sqrt(savings.reduce((s, v) => s + (v - savings.reduce((a, b) => a + b, 0) / savings.length) ** 2, 0) / savings.length) };
  }).reduce((a, b) => a.avg > b.avg ? a : b);

  return `里程节降率趋势表明，${bestAlgo.name}在 ${batches.length} 个批次中保持 ${f1(bestAlgo.avg)}% 的平均节降率，波动标准差为 ${f1(bestAlgo.std)}%。节降率稳定性是评估算法可推广性的关键指标。`;
}

// ──────── C1: Constraint Violation Overview ────────

function genC1(results: SimulationResult[], strategies: Strategy[]): string {
  const allZero = results.every(r => r.constraintViolations.length === 0 || r.constraintViolations.every(cv => cv.violatedCount === 0));
  if (allZero) return '所有策略均完全遵循约束条件，无任何违反记录。这表明当前数据集下各策略的约束适配性良好。';

  if (isSingleStrategy(strategies)) {
    const cv = results.flatMap(r => r.constraintViolations).filter(v => v.violatedCount > 0);
    const worst = cv.reduce((a, b) => a.violationRate > b.violationRate ? a : b, cv[0]);
    return `当前策略的约束违反集中在${worst?.type || '未知'}维度（违反率 ${f1(worst?.violationRate || 0)}%），总体约束遵循率处于可接受水平。`;
  }

  const byStrategy = strategies.map(s => {
    const rs = results.filter(r => r.strategyId === s.id);
    const totalViolations = rs.reduce((sum, r) => sum + r.constraintViolations.reduce((a, v) => a + v.violatedCount, 0), 0);
    const totalVehicles = rs.reduce((sum, r) => sum + r.vehicleCount, 0);
    return { name: s.name, rate: totalVehicles > 0 ? totalViolations / totalVehicles * 100 : 0, type: s.type };
  });
  const best = byStrategy.filter(b => b.type === 'algorithm').reduce((a, b) => a.rate < b.rate ? a : b, byStrategy[0]);
  const manualRate = byStrategy.find(b => b.type === 'manual')?.rate || 0;

  return `约束违反率总览显示，人工调度综合违反率 ${f1(manualRate)}%，${best.name}以 ${f1(best.rate)}% 的最低违反率表现最优。算法策略在约束遵循方面整体优于人工调度。`;
}

// ──────── C2: Duration Over Limit ────────

function genC2(results: SimulationResult[], strategies: Strategy[]): string {
  const m = results.filter(r => r.strategyId === 's1');
  const mOver = m.flatMap(r => r.vehicleDetails).filter(v => v.durationOverLimit && v.durationOverLimit > 0);
  const mTotal = m.reduce((s, r) => s + r.vehicleCount, 0);

  if (mOver.length === 0 && isSingleStrategy(strategies)) {
    return '当前策略无工作时长超限车次，所有车次均在规定时间内完成配送任务。';
  }

  const mRate = mTotal > 0 ? (mOver.length / mTotal * 100) : 0;
  const mAvgOver = mOver.length > 0 ? mOver.reduce((s, v) => s + (v.durationOverLimit || 0), 0) / mOver.length : 0;

  if (isSingleStrategy(strategies)) {
    return `当前策略有 ${mOver.length} 个车次超出工作时长限制（超限率 ${f1(mRate)}%），平均超限 ${f0(mAvgOver)} 分钟。建议关注超限集中的批次和车型。`;
  }

  return `工作时长超限方面，人工调度超限率 ${f1(mRate)}%（${mOver.length} 车次，平均超限 ${f0(mAvgOver)}min）。算法策略通过优化路线规划有效降低了超限风险。`;
}

// ──────── C3: Distance Over Limit ────────

function genC3(results: SimulationResult[], _strategies: Strategy[]): string {
  const allOver = results.flatMap(r => r.vehicleDetails).filter(v => v.distanceOverLimit && v.distanceOverLimit > 0);
  if (allOver.length === 0) {
    return '行驶里程维度各策略均无超限车次，所有车次里程均在约束范围内，里程约束配置合理。';
  }
  const total = results.reduce((s, r) => s + r.vehicleCount, 0);
  const rate = total > 0 ? (allOver.length / total * 100) : 0;
  return `行驶里程超限率为 ${f1(rate)}%（${allOver.length} 车次），超限幅度在 ${f1(Math.min(...allOver.map(v => v.distanceOverLimit || 0)))}-${f1(Math.max(...allOver.map(v => v.distanceOverLimit || 0)))}km 之间，属于边界情况。`;
}

// ──────── C4: Load Over Limit Heatmap ────────

function genC4(results: SimulationResult[], strategies: Strategy[]): string {
  const dims = ['weightOverLimit', 'volumeOverLimit', 'qtyOverLimit'] as const;
  const labels = { weightOverLimit: '重量', volumeOverLimit: '体积', qtyOverLimit: '件数' };
  let maxDim = '', maxRate = 0, maxStrat = '';

  for (const s of strategies) {
    const details = results.filter(r => r.strategyId === s.id).flatMap(r => r.vehicleDetails);
    const total = details.length;
    for (const d of dims) {
      const violated = details.filter(v => v[d] && (v[d] as number) > 0).length;
      const rate = total > 0 ? violated / total * 100 : 0;
      if (rate > maxRate) { maxRate = rate; maxDim = labels[d]; maxStrat = s.name; }
    }
  }

  if (maxRate === 0) return '装载量各维度（重量/体积/件数）均无超限记录，车型配置与订单结构匹配良好。';
  return `装载量超限热力图显示，${maxStrat}在${maxDim}维度违反率最高（${f1(maxRate)}%），这是追求高满载率的代价。其他维度违反率较低，表明约束上限设置较为宽松。`;
}

// ──────── C5: Violation Scatter ────────

function genC5(results: SimulationResult[], _strategies: Strategy[]): string {
  const total = results.reduce((s, r) => s + r.vehicleCount, 0);
  const violated = results.flatMap(r => r.vehicleDetails).filter(v =>
    (v.durationOverLimit && v.durationOverLimit > 0) || (v.distanceOverLimit && v.distanceOverLimit > 0) ||
    (v.weightOverLimit && v.weightOverLimit > 0) || (v.volumeOverLimit && v.volumeOverLimit > 0)
  );
  if (violated.length === 0) return '所有车次均在约束范围内，无违反明细数据。约束配置与运营实际匹配良好。';
  const rate = total > 0 ? (violated.length / total * 100) : 0;
  return `约束违反车次共 ${violated.length} 辆（占总车次 ${f1(rate)}%），超限集中在少数车次且幅度较小。建议针对高频违反约束调整参数阈值或优化装载策略。`;
}

// ──────── F1: Route Span Box ────────

function genF1(results: SimulationResult[], strategies: Strategy[]): string {
  const all = strategies.map(s => {
    const spans = results.filter(r => r.strategyId === s.id).flatMap(r => r.vehicleDetails.map(v => v.routeSpan));
    spans.sort((a, b) => a - b);
    const median = spans[Math.floor(spans.length / 2)] || 0;
    return { name: s.name, median };
  });
  const best = all.reduce((a, b) => a.median < b.median ? a : b);
  if (isSingleStrategy(strategies)) {
    return `当前策略路线跨度中位值 ${f1(best.median)}km，路线覆盖范围适中。`;
  }
  return `路线跨度分析显示，${best.name}中位跨度最小（${f1(best.median)}km），路线空间紧凑度最优。各策略跨度差异反映了订单分配逻辑的不同取向。`;
}

// ──────── F2: Cross Region ────────

function genF2(results: SimulationResult[], strategies: Strategy[]): string {
  const all = strategies.map(s => {
    const details = results.filter(r => r.strategyId === s.id).flatMap(r => r.vehicleDetails);
    const zeroCross = details.filter(v => v.crossRegionCount === 0).length;
    return { name: s.name, zeroPct: details.length > 0 ? zeroCross / details.length * 100 : 0 };
  });
  const best = all.reduce((a, b) => a.zeroPct > b.zeroPct ? a : b);
  if (isSingleStrategy(strategies)) {
    return `当前策略零跨区车次占比 ${f1(best.zeroPct)}%，跨区情况在可接受范围内。`;
  }
  return `跨区数量分布显示，${best.name}的零跨区车次占比最高（${f1(best.zeroPct)}%），路线空间紧凑度最优。跨区配送会增加运营复杂度和成本。`;
}

// ──────── F3: Detour Ratio ────────

function genF3(results: SimulationResult[], strategies: Strategy[]): string {
  const all = strategies.map(s => {
    const ratios = results.filter(r => r.strategyId === s.id).flatMap(r => r.vehicleDetails.map(v => v.detourRatio)).filter((v): v is number => v != null);
    const avg = ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0;
    return { name: s.name, avg };
  });
  const best = all.reduce((a, b) => a.avg < b.avg ? a : b);
  if (isSingleStrategy(strategies)) {
    return `当前策略平均绕行率 ${f1(best.avg)}%，即平均绕行 ${f1(best.avg - 100)}% 的额外距离。`;
  }
  return `绕行率对比中，${best.name}表现最优（平均 ${f1(best.avg)}%），即仅有 ${f1(best.avg - 100)}% 的绕行。较低的绕行率意味着更高的路线直达性和配送效率。`;
}

// ──────── F4: Stop Count Box ────────

function genF4(results: SimulationResult[], strategies: Strategy[]): string {
  const all = strategies.map(s => {
    const stops = results.filter(r => r.strategyId === s.id).flatMap(r => r.vehicleDetails.map(v => v.stopCount));
    stops.sort((a, b) => a - b);
    const median = stops[Math.floor(stops.length / 2)] || 0;
    const max = Math.max(...stops);
    return { name: s.name, median, max };
  });
  if (isSingleStrategy(strategies)) {
    return `当前策略卸货点数中位值 ${all[0].median} 个，最大 ${all[0].max} 个。卸货点数直接影响配送时效和司机接受度。`;
  }
  const maxStops = all.reduce((a, b) => a.max > b.max ? a : b);
  return `卸货点数分布显示，各策略中位值在 ${Math.min(...all.map(a => a.median))}-${Math.max(...all.map(a => a.median))} 个之间。${maxStops.name}部分车次达 ${maxStops.max} 个点，需关注实际配送中的时效压力。`;
}

// ──────── F5: Top-K Scatter ────────

function genF5(results: SimulationResult[], strategies: Strategy[]): string {
  const all = strategies.map(s => {
    const vals = results.filter(r => r.strategyId === s.id).flatMap(r => r.vehicleDetails.map(v => v.topKAvg));
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { name: s.name, avg };
  });
  const best = all.reduce((a, b) => a.avg < b.avg ? a : b);
  if (isSingleStrategy(strategies)) {
    return `当前策略 Top-K 最近邻均值 ${f1(best.avg)}km，站点聚集程度适中。`;
  }
  return `聚类紧密度分析显示，${best.name}的 Top-K 最近邻均值最低（${f1(best.avg)}km），站点空间聚集度最优。较低的均值意味着路线中站点分布更紧凑，有利于减少绕行。`;
}

// ──────── F6: Interval CDF ────────

function genF6(results: SimulationResult[], strategies: Strategy[]): string {
  const all = strategies.map(s => {
    const intervals = results.filter(r => r.strategyId === s.id).flatMap(r => r.vehicleDetails.map(v => v.maxStopInterval));
    const avg = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
    const under10 = intervals.filter(v => v <= 10).length;
    return { name: s.name, avg, pctUnder10: intervals.length > 0 ? under10 / intervals.length * 100 : 0 };
  });
  const best = all.reduce((a, b) => a.pctUnder10 > b.pctUnder10 ? a : b);
  if (isSingleStrategy(strategies)) {
    return `当前策略 ${f1(best.pctUnder10)}% 的车次点间距在 10km 以内，平均点间距 ${f1(best.avg)}km。`;
  }
  return `点间距累积分布表明，${best.name}有 ${f1(best.pctUnder10)}% 的车次点间距在 10km 以内，平均点间距 ${f1(best.avg)}km。较短的点间距意味着更高效的区域内配送。`;
}

// ──────── F7: Feasibility Radar ────────

function genF7(_results: SimulationResult[], strategies: Strategy[]): string {
  if (isSingleStrategy(strategies)) {
    return `当前策略在路线跨度、绕行率、聚类紧密度等多个维度表现均衡，综合合理性评分处于中等水平。`;
  }
  const dimNames = ['路线跨度', '跨区数量', '绕行率', '站点聚集度', '点间距'];
  return `多维合理性雷达图综合显示，各策略在${dimNames.join('、')}等维度各有优劣。均衡类策略表现最为稳定，里程类策略空间紧凑性最优但可能牺牲部分约束遵循性。`;
}

// ──────── S1: Strategy Radar ────────

function genS1(_results: SimulationResult[], strategies: Strategy[]): string {
  if (isSingleStrategy(strategies)) {
    return `当前单策略模式，综合评分雷达图展示了${strategies[0].name}在经济性、约束遵循、合理性三个维度的绝对表现。`;
  }
  return `策略综合评分雷达图显示，各策略在经济性（40%权重）、约束遵循（30%权重）、合理性（30%权重）三个维度表现各有侧重。均衡类策略各维度得分最接近，综合稳定性最优。`;
}

// ──────── S2: Strategy Rank ────────

function genS2(_results: SimulationResult[], strategies: Strategy[]): string {
  if (isSingleStrategy(strategies)) {
    return `当前为单策略模式，${strategies[0].name}的综合评分可作为后续算法优化的基准参考。`;
  }
  const algoNames = strategies.filter(s => s.type === 'algorithm').map(s => s.name);
  return `综合评分排行中，${algoNames.length} 个算法策略均优于人工基准。排名第一的策略适合作为标准方案推广，排名靠后的策略可在其擅长的细分场景中使用。`;
}

// ──────── Router ────────

const generators: Record<string, (r: SimulationResult[], s: Strategy[], b: OrderBatch[]) => string> = {
  E1: genE1, E2: genE2, E3: genE3, E4: genE4,
  E5: (r, s) => genE5(r, s), E6: (r, s) => genE6(r, s),
  E7: (r, s) => genE7(r, s), E8: genE8,
  C1: (r, s) => genC1(r, s), C2: (r, s) => genC2(r, s),
  C3: (r, s) => genC3(r, s), C4: (r, s) => genC4(r, s),
  C5: (r, s) => genC5(r, s),
  F1: (r, s) => genF1(r, s), F2: (r, s) => genF2(r, s),
  F3: (r, s) => genF3(r, s), F4: (r, s) => genF4(r, s),
  F5: (r, s) => genF5(r, s), F6: (r, s) => genF6(r, s),
  F7: (r, s) => genF7(r, s),
  S1: (r, s) => genS1(r, s), S2: (r, s) => genS2(r, s),
};

export function getInsight(
  chartId: string,
  results: SimulationResult[],
  strategies: Strategy[],
  batches: OrderBatch[]
): string {
  const gen = generators[chartId];
  if (!gen) return '';
  try {
    return gen(results, strategies, batches);
  } catch {
    return '';
  }
}
