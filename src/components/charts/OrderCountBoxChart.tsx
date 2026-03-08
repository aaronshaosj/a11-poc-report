import ReactECharts from 'echarts-for-react';
import type { SimulationResult } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme, axisStyle } from '../../lib/chartTheme';
import { boxplotStats } from '../../lib/utils';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
}

export default function OrderCountBoxChart({ results, strategyIds }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));

  const boxData = strategies.map(s => {
    const allCounts = results
      .filter(r => r.strategyId === s.id)
      .flatMap(r => r.vehicleDetails.map(v => v.orderCount));
    return boxplotStats(allCounts);
  });

  // Scatter points (jittered)
  const scatterData = strategies.flatMap((s, i) => {
    return results
      .filter(r => r.strategyId === s.id)
      .flatMap(r => r.vehicleDetails.map(v => [i, v.orderCount]));
  });

  const option = {
    ...chartTheme,
    tooltip: { ...chartTheme.tooltip, trigger: 'item' },
    xAxis: {
      type: 'category',
      data: strategies.map(s => s.name),
      ...axisStyle,
    },
    yAxis: {
      type: 'value',
      name: '订单数',
      ...axisStyle,
    },
    series: [
      {
        type: 'boxplot',
        data: boxData.map((d, i) => ({
          value: d,
          itemStyle: { color: 'transparent', borderColor: strategies[i].color, borderWidth: 2 },
        })),
      },
      {
        type: 'scatter',
        data: scatterData.map(([x, y]) => ({
          value: [x, y],
          itemStyle: {
            color: strategies[x as number]?.color + '60',
          },
        })),
        symbolSize: 4,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: '100%' }} />;
}
