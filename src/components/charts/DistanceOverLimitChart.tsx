import ReactECharts from 'echarts-for-react';
import type { SimulationResult } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme, axisStyle } from '../../lib/chartTheme';
import { boxplotStats } from '../../lib/utils';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
}

export default function DistanceOverLimitChart({ results, strategyIds }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));

  const boxData = strategies.map(s => {
    const overLimits = results
      .filter(r => r.strategyId === s.id)
      .flatMap(r => r.vehicleDetails)
      .map(v => v.distanceOverLimit)
      .filter((v): v is number => v !== undefined && v > 0);
    return { stats: overLimits.length >= 2 ? boxplotStats(overLimits) : null, count: overLimits.length };
  });

  const option = {
    ...chartTheme,
    tooltip: {
      ...chartTheme.tooltip,
      trigger: 'item',
      formatter: (params: { name: string; data: { value: number[] } }) => {
        const d = params.data.value;
        if (!d || d.length < 5) return params.name;
        return `${params.name}<br/>最大超限: ${d[4]}km<br/>Q3: ${d[3]}km<br/>中位: ${d[2]}km<br/>Q1: ${d[1]}km<br/>最小超限: ${d[0]}km`;
      },
    },
    xAxis: {
      type: 'category',
      data: strategies.map((s, i) => `${s.name}\n(${boxData[i].count}车次)`),
      ...axisStyle,
    },
    yAxis: {
      type: 'value',
      name: '超限幅度(km)',
      ...axisStyle,
    },
    series: [{
      type: 'boxplot',
      data: boxData.map((d, i) => ({
        value: d.stats || [0, 0, 0, 0, 0],
        itemStyle: {
          color: 'transparent',
          borderColor: d.stats ? strategies[i].color : 'transparent',
          borderWidth: 2,
        },
      })),
    }],
  };

  return <ReactECharts option={option} style={{ height: '100%' }} />;
}
