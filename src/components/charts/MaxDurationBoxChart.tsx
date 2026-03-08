import ReactECharts from 'echarts-for-react';
import type { SimulationResult } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme, axisStyle } from '../../lib/chartTheme';
import { boxplotStats } from '../../lib/utils';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
}

export default function MaxDurationBoxChart({ results, strategyIds }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));

  const boxData = strategies.map(s => {
    const allDurations = results
      .filter(r => r.strategyId === s.id)
      .flatMap(r => r.vehicleDetails.map(v => v.duration));
    return boxplotStats(allDurations);
  });

  const option = {
    ...chartTheme,
    tooltip: {
      ...chartTheme.tooltip,
      trigger: 'item',
      formatter: (params: { name: string; data: number[] }) => {
        const d = params.data;
        return `${params.name}<br/>最大: ${d[4]}min<br/>Q3: ${d[3]}min<br/>中位: ${d[2]}min<br/>Q1: ${d[1]}min<br/>最小: ${d[0]}min`;
      },
    },
    xAxis: {
      type: 'category',
      data: strategies.map(s => s.name),
      ...axisStyle,
    },
    yAxis: {
      type: 'value',
      name: '时长(min)',
      ...axisStyle,
    },
    series: [{
      type: 'boxplot',
      data: boxData.map((d, i) => ({
        value: d,
        itemStyle: { color: 'transparent', borderColor: strategies[i].color, borderWidth: 2 },
      })),
    }],
  };

  return <ReactECharts option={option} style={{ height: '100%' }} />;
}
