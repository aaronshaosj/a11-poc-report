import ReactECharts from 'echarts-for-react';
import type { SimulationResult } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme, axisStyle } from '../../lib/chartTheme';
import { boxplotStats } from '../../lib/utils';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
}

export default function MaxDistanceBoxChart({ results, strategyIds }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));

  // Collect distance data per strategy across all batches
  const boxData = strategies.map(s => {
    const allDistances = results
      .filter(r => r.strategyId === s.id)
      .flatMap(r => r.vehicleDetails.map(v => v.distance));
    return boxplotStats(allDistances);
  });

  const option = {
    ...chartTheme,
    tooltip: {
      ...chartTheme.tooltip,
      trigger: 'item',
      formatter: (params: { name: string; data: number[] }) => {
        const d = params.data;
        return `${params.name}<br/>最大: ${d[4]}<br/>Q3: ${d[3]}<br/>中位: ${d[2]}<br/>Q1: ${d[1]}<br/>最小: ${d[0]}`;
      },
    },
    xAxis: {
      type: 'category',
      data: strategies.map(s => s.name),
      ...axisStyle,
    },
    yAxis: {
      type: 'value',
      name: '里程(km)',
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
