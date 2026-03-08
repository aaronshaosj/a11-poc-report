import ReactECharts from 'echarts-for-react';
import type { SimulationResult } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme, axisStyle } from '../../lib/chartTheme';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
}

export default function DistDurationScatter({ results, strategyIds }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));

  const option = {
    ...chartTheme,
    tooltip: {
      ...chartTheme.tooltip,
      formatter: (params: { seriesName: string; data: number[] }) =>
        `${params.seriesName}<br/>距离: ${params.data[0]} km<br/>时长: ${params.data[1]} min`,
    },
    legend: { ...chartTheme.legend, data: strategies.map(s => s.name) },
    xAxis: {
      type: 'value',
      name: '行驶距离(km)',
      ...axisStyle,
    },
    yAxis: {
      type: 'value',
      name: '工作时长(min)',
      ...axisStyle,
    },
    series: strategies.map(s => {
      const vehicles = results
        .filter(r => r.strategyId === s.id)
        .flatMap(r => r.vehicleDetails);
      return {
        name: s.name,
        type: 'scatter',
        data: vehicles.map(v => [v.distance, v.duration]),
        itemStyle: { color: s.color, opacity: 0.5 },
        symbolSize: 7,
      };
    }),
    dataZoom: [
      { type: 'inside', xAxisIndex: 0 },
      { type: 'inside', yAxisIndex: 0 },
    ],
  };

  return <ReactECharts option={option} style={{ height: '100%' }} />;
}
