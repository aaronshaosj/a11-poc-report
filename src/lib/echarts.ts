import * as echarts from 'echarts/core';
import { BarChart, LineChart, ScatterChart, RadarChart, HeatmapChart, BoxplotChart, CustomChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  RadarComponent,
  VisualMapComponent,
  MarkPointComponent,
  MarkLineComponent,
  MarkAreaComponent,
  DataZoomComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart, LineChart, ScatterChart, RadarChart, HeatmapChart, BoxplotChart, CustomChart,
  TitleComponent, TooltipComponent, LegendComponent, GridComponent, RadarComponent,
  VisualMapComponent, MarkPointComponent, MarkLineComponent, MarkAreaComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

export default echarts;
