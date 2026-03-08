import ReactECharts from 'echarts-for-react';
import type { SimulationResult } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme, axisStyle } from '../../lib/chartTheme';
import { boxplotStats } from '../../lib/utils';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
}

export default function RouteSpanBoxChart({ results, strategyIds }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));

  const boxData = strategies.map(s => {
    const spans = results
      .filter(r => r.strategyId === s.id)
      .flatMap(r => r.vehicleDetails.map(v => v.routeSpan));
    return { stats: boxplotStats(spans), raw: spans };
  });

  const option = {
    ...chartTheme,
    tooltip: {
      ...chartTheme.tooltip,
      trigger: 'item',
      formatter: (params: { name: string; data: { value: number[] } | number[] }) => {
        const d = Array.isArray(params.data) ? params.data : params.data.value;
        if (!d || d.length < 5) return params.name;
        return `${params.name}<br/>最大: ${d[4]}km<br/>Q3: ${d[3]}km<br/>中位: ${d[2]}km<br/>Q1: ${d[1]}km<br/>最小: ${d[0]}km`;
      },
    },
    xAxis: {
      type: 'category',
      data: strategies.map(s => s.name),
      ...axisStyle,
    },
    yAxis: {
      type: 'value',
      name: '路线跨度(km)',
      ...axisStyle,
    },
    series: [
      {
        type: 'boxplot',
        data: boxData.map((d, i) => ({
          value: d.stats,
          itemStyle: { color: 'transparent', borderColor: strategies[i].color, borderWidth: 2 },
        })),
      },
      // Jitter scatter overlay
      ...strategies.map((s, si) => ({
        type: 'scatter',
        data: boxData[si].raw.map(v => [si, v]),
        itemStyle: { color: s.color, opacity: 0.3 },
        symbolSize: 4,
        silent: true,
      })),
    ],
  };

  return <ReactECharts option={option} style={{ height: '100%' }} />;
}
