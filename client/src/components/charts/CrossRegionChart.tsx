import ReactEChartsCore from 'echarts-for-react/lib/core';
import echarts from '../../lib/echarts';
import type { SimulationResult } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme, axisStyle } from '../../lib/chartTheme';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
}

const regionLabels = ['不跨区', '跨1区', '跨2区', '跨3+区'];
const regionColors = ['#34d399', '#4a9eff', '#f59e0b', '#ef4444'];

export default function CrossRegionChart({ results, strategyIds }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));

  const option = {
    ...chartTheme,
    tooltip: { ...chartTheme.tooltip, trigger: 'axis' },
    legend: { ...chartTheme.legend, data: regionLabels },
    xAxis: {
      type: 'category',
      data: strategies.map(s => s.name),
      ...axisStyle,
    },
    yAxis: {
      type: 'value',
      name: '车次数',
      ...axisStyle,
    },
    series: regionLabels.map((label, ri) => ({
      name: label,
      type: 'bar',
      stack: 'total',
      data: strategies.map(s => {
        const vehicles = results
          .filter(r => r.strategyId === s.id)
          .flatMap(r => r.vehicleDetails);
        return vehicles.filter(v => {
          if (ri === 0) return v.crossRegionCount === 0;
          if (ri === 1) return v.crossRegionCount === 1;
          if (ri === 2) return v.crossRegionCount === 2;
          return v.crossRegionCount >= 3;
        }).length;
      }),
      itemStyle: { color: regionColors[ri], borderRadius: ri === regionLabels.length - 1 ? [3, 3, 0, 0] : undefined },
      barMaxWidth: 36,
    })),
  };

  return <ReactEChartsCore echarts={echarts} option={option} style={{ height: '100%' }} />;
}
