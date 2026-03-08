import ReactEChartsCore from 'echarts-for-react/lib/core';
import echarts from '../../lib/echarts';
import type { SimulationResult } from '../../types';
import { mockStrategies } from '../../data/mockStrategies';
import { chartTheme, axisStyle } from '../../lib/chartTheme';

interface Props {
  results: SimulationResult[];
  strategyIds: string[];
}

const constraintLabels = ['工作时长', '行驶里程', '装载重量', '装载体积', '装载件数', '跨区数量', '卸货点数'];
const overLimitFields = [
  'durationOverLimit', 'distanceOverLimit', 'weightOverLimit',
  'volumeOverLimit', 'qtyOverLimit', 'crossRegionOverLimit', 'stopOverLimit',
] as const;

export default function ViolationScatterChart({ results, strategyIds }: Props) {
  const strategies = mockStrategies.filter(s => strategyIds.includes(s.id));

  const seriesData = strategies.map(s => {
    const allVehicles = results
      .filter(r => r.strategyId === s.id)
      .flatMap(r => r.vehicleDetails);

    const points: [number, number, number][] = [];
    for (const v of allVehicles) {
      for (let ci = 0; ci < overLimitFields.length; ci++) {
        const val = v[overLimitFields[ci]];
        if (val !== undefined && val > 0) {
          points.push([val as number, ci, Math.min(30, 5 + (val as number) * 0.3)]);
        }
      }
    }

    return {
      name: s.name,
      type: 'scatter',
      data: points,
      itemStyle: { color: s.color, opacity: 0.7 },
      symbolSize: (val: [number, number, number]) => val[2],
    };
  });

  const option = {
    ...chartTheme,
    tooltip: {
      ...chartTheme.tooltip,
      formatter: (params: { seriesName: string; data: [number, number, number] }) => {
        const [overage, ci] = params.data;
        return `${params.seriesName}<br/>约束: ${constraintLabels[ci]}<br/>超限幅度: ${overage}`;
      },
    },
    legend: { ...chartTheme.legend, data: strategies.map(s => s.name) },
    xAxis: {
      type: 'value',
      name: '超限幅度',
      ...axisStyle,
    },
    yAxis: {
      type: 'category',
      data: constraintLabels,
      ...axisStyle,
    },
    series: seriesData,
  };

  return <ReactEChartsCore echarts={echarts} option={option} style={{ height: '100%' }} />;
}
