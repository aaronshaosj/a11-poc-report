import ReactEChartsCore from 'echarts-for-react/lib/core';
import echarts from '../../lib/echarts';
import type { SimulationResult } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme, axisStyle } from '../../lib/chartTheme';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
}

export default function TopKScatterChart({ results, strategyIds }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));

  const option = {
    ...chartTheme,
    tooltip: {
      ...chartTheme.tooltip,
      formatter: (params: { seriesName: string; data: number[] }) =>
        `${params.seriesName}<br/>车次 #${params.data[0] + 1}<br/>Top-3 均值: ${params.data[1].toFixed(2)} km`,
    },
    legend: { ...chartTheme.legend, data: strategies.map(s => s.name) },
    xAxis: {
      type: 'value',
      name: '车次编号',
      ...axisStyle,
    },
    yAxis: {
      type: 'value',
      name: 'Top-3 均值(km)',
      ...axisStyle,
    },
    series: strategies.map(s => {
      const vehicles = results
        .filter(r => r.strategyId === s.id)
        .flatMap(r => r.vehicleDetails);
      return {
        name: s.name,
        type: 'scatter',
        data: vehicles.map((v, i) => [i, v.topKAvg]),
        itemStyle: { color: s.color, opacity: 0.6 },
        symbolSize: 6,
      };
    }),
    dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
  };

  return <ReactEChartsCore echarts={echarts} option={option} style={{ height: '100%' }} />;
}
