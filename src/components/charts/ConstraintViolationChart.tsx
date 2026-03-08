import ReactECharts from 'echarts-for-react';
import type { SimulationResult } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme, axisStyle } from '../../lib/chartTheme';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
}

export default function ConstraintViolationChart({ results, strategyIds }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));

  // Collect all constraint types that have violations in any strategy
  const allTypes = new Set<string>();
  for (const r of results) {
    if (!strategyIds.includes(r.strategyId)) continue;
    for (const v of r.constraintViolations) {
      allTypes.add(v.type);
    }
  }

  // For each constraint type, aggregate across batches per strategy
  const constraintTypes = Array.from(allTypes);
  // Filter out types where all strategies have 0 violation rate
  const activeTypes = constraintTypes.filter(ct => {
    return strategies.some(s => {
      const sResults = results.filter(r => r.strategyId === s.id);
      const totalViolated = sResults.reduce((sum, r) => {
        const v = r.constraintViolations.find(cv => cv.type === ct);
        return sum + (v?.violatedCount || 0);
      }, 0);
      return totalViolated > 0;
    });
  });

  if (activeTypes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        所有约束均无违反
      </div>
    );
  }

  const option = {
    ...chartTheme,
    tooltip: {
      ...chartTheme.tooltip,
      trigger: 'axis',
    },
    legend: { ...chartTheme.legend, data: strategies.map(s => s.name) },
    xAxis: {
      type: 'category',
      data: activeTypes,
      ...axisStyle,
      axisLabel: { ...axisStyle.axisLabel, rotate: activeTypes.length > 5 ? 20 : 0 },
    },
    yAxis: {
      type: 'value',
      name: '违反比例(%)',
      ...axisStyle,
    },
    series: strategies.map(s => {
      const sResults = results.filter(r => r.strategyId === s.id);
      return {
        name: s.name,
        type: 'bar',
        data: activeTypes.map(ct => {
          const totalViolated = sResults.reduce((sum, r) => {
            const v = r.constraintViolations.find(cv => cv.type === ct);
            return sum + (v?.violatedCount || 0);
          }, 0);
          const totalCount = sResults.reduce((sum, r) => {
            const v = r.constraintViolations.find(cv => cv.type === ct);
            return sum + (v?.totalCount || r.vehicleCount);
          }, 0);
          return totalCount > 0 ? +(totalViolated / totalCount * 100).toFixed(1) : 0;
        }),
        itemStyle: { color: s.color, borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 28,
        label: {
          show: true,
          position: 'top',
          color: '#8b95a8',
          fontSize: 10,
          formatter: (p: { value: number; dataIndex: number }) => {
            if (p.value === 0) return '';
            const sResults2 = results.filter(r => r.strategyId === s.id);
            const ct = activeTypes[p.dataIndex];
            const violated = sResults2.reduce((sum, r) => {
              const v = r.constraintViolations.find(cv => cv.type === ct);
              return sum + (v?.violatedCount || 0);
            }, 0);
            const total = sResults2.reduce((sum, r) => {
              const v = r.constraintViolations.find(cv => cv.type === ct);
              return sum + (v?.totalCount || r.vehicleCount);
            }, 0);
            return `${violated}/${total}`;
          },
        },
      };
    }),
  };

  return <ReactECharts option={option} style={{ height: '100%' }} />;
}
