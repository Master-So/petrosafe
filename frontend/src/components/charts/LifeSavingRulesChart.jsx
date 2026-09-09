import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

const COLORS = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF']; // Apple System Colors

export default function LifeSavingRulesChart({ analytics = {} }) {
  const { categories, values } = useMemo(() => {
    const byRule = analytics.by_life_saving_rule || {};
    // Sort descending by count so the most violated rule is at top
    const sorted = Object.entries(byRule)
      .sort((a, b) => a[1] - b[1]); // ECharts renders bottom-up, so ascending puts largest on top
    return {
      categories: sorted.map(([name]) => name),
      values: sorted.map(([, count]) => count),
    };
  }, [analytics]);

  const hasData = values.length > 0 && values.some(v => v > 0);

  const option = useMemo(() => ({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#FFFFFF',
      borderColor: '#E2E8F0',
      borderWidth: 1,
      textStyle: { color: '#111827', fontSize: 12, fontFamily: 'Inter, sans-serif' },
    },
    grid: {
      left: 0,
      right: 0,
      top: 10,
      bottom: 0,
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      show: false, // Hide axis completely as per reference
      max: hasData ? Math.max(...values) * 1.1 : 10,
    },
    yAxis: [
      {
        type: 'category',
        data: hasData ? categories : ['No Data'],
        axisLabel: {
          fontSize: 11,
          color: '#111827',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          margin: 0, // Align closer to the left
          padding: [0, 10, 25, 0], // Push label up above the bar
          verticalAlign: 'bottom',
          inside: true, // Keep inside so it aligns with the left edge of the bar
        },
        axisLine: { show: false },
        axisTick: { show: false },
        z: 10
      },
      {
        // Second yAxis for the count labels on the right side
        type: 'category',
        data: hasData ? values : [0],
        axisLabel: {
          fontSize: 11,
          fontWeight: 800,
          color: '#111827',
          fontFamily: 'Inter, sans-serif',
          margin: 0,
          padding: [0, 0, 25, 10], // Push label up above the bar
          verticalAlign: 'bottom',
          inside: true,
          formatter: (value) => value
        },
        axisLine: { show: false },
        axisTick: { show: false },
        z: 10
      }
    ],
    series: [
      {
        name: 'Violations',
        type: 'bar',
        data: hasData ? values.map((val, idx) => ({
          value: val,
          itemStyle: { color: COLORS[idx % COLORS.length] }
        })) : [0],
        barWidth: 8,
        itemStyle: {
          borderRadius: 4,
        },
        showBackground: true,
        backgroundStyle: {
          color: '#F1F5F9',
          borderRadius: 4,
        },
        // We removed the label here because we are using the second yAxis to display the count on the right
      },
    ],
  }), [categories, values, hasData]);

  return (
    <div className="h-full">
      <div className="mb-2">
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Life-Saving Rules Compliance (Breach Counts)</h3>
      </div>
      <ReactECharts
        option={option}
        style={{ height: 180, width: '100%' }}
        opts={{ renderer: 'svg' }}
        notMerge={true}
      />
    </div>
  );
}
