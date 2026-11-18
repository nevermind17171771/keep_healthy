'use client';

import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Line, LineChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
export default function ProgressChart({
  data,
  dataKey = 'value',
  color = '#ed6a58',
  line = false
}: {
  data: Record<string, unknown>[];
  dataKey?: string;
  color?: string;
  line?: boolean;
}) {
  const config = {
    [dataKey]: {
      label: '기록',
      color
    }
  };
  return <ChartContainer config={config} className="trend-chart">{line ? <LineChart data={data}><CartesianGrid vertical={false} stroke="#34383d" /><XAxis dataKey="label" tickLine={false} axisLine={false} /><YAxis width={38} tickLine={false} axisLine={false} domain={['auto', 'auto']} /><ChartTooltip content={<ChartTooltipContent />} /><Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={{
        r: 3
      }} connectNulls /></LineChart> : <BarChart data={data}><CartesianGrid vertical={false} stroke="#34383d" /><XAxis dataKey="label" tickLine={false} axisLine={false} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey={dataKey} fill={color} radius={[5, 5, 0, 0]} /></BarChart>}</ChartContainer>;
}
