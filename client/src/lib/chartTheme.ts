import type { EChartsOption } from 'echarts';

export const chartTheme: Partial<EChartsOption> = {
  backgroundColor: 'transparent',
  textStyle: { color: '#8b95a8', fontFamily: 'Inter' },
  title: {
    textStyle: { color: '#e8ecf4', fontSize: 14, fontWeight: 600 },
    left: 4,
    top: 4,
  },
  legend: {
    textStyle: { color: '#8b95a8', fontSize: 11 },
    icon: 'roundRect',
    itemWidth: 12,
    itemHeight: 8,
    top: 8,
    right: 8,
  },
  tooltip: {
    backgroundColor: 'rgba(15, 22, 41, 0.95)',
    borderColor: 'rgba(100, 140, 200, 0.2)',
    textStyle: { color: '#e8ecf4', fontSize: 12 },
  },
  grid: {
    left: 60,
    right: 20,
    top: 60,
    bottom: 40,
    containLabel: false,
  },
};

export const axisStyle = {
  axisLine: { lineStyle: { color: '#2a3450' } },
  axisTick: { lineStyle: { color: '#2a3450' } },
  axisLabel: { color: '#8b95a8', fontSize: 11 },
  splitLine: { lineStyle: { color: '#1a2340', type: 'dashed' as const } },
  nameTextStyle: { color: '#8b95a8', fontSize: 11 },
};
