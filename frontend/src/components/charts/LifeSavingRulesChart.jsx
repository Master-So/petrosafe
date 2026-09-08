import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

export default function LifeSavingRulesChart({ analytics = {} }) {
  const { categories, values } = useMemo(() => {
    const byRule = analytics.by_life_saving_rule || {};
    const sorted = Object.entries(byRule)
      .sort((a, b) => a[1] - b[1]);
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
      backgroundColor: 'rgba(26, 35, 50, 0.95)',
      borderColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      textStyle: { color: '#F1F5F9', fontSize: 12, fontFamily: 'Inter, sans-serif' },
      formatter: (params) => {
        const p = params[0];
        return (
          `<div style="font-weight:700;margin-bottom:4px;color:#06B6D4">${p.name}</div>` +
          `<span style="font-size:18px;font-weight:800;color:#F1F5F9">${p.value}</span>` +
          ` <span style="opacity:0.5;color:#94A3B8">violations</span>`
        );
      },
    },
    grid: {
      left: 12,
      right: 44,
      top: 12,
      bottom: 12,
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      axisLabel: { fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)', type: 'dashed' } },
      axisLine: { show: false },
      axisTick: { show: false },
      minInterval: 1,
    },
    yAxis: {
      type: 'category',
      data: hasData ? categories : ['No Data'],
      axisLabel: {
        fontSize: 11,
        color: '#94A3B8',
        fontFamily: 'Inter, sans-serif',
        width: 140,
        overflow: 'truncate',
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: 'Violations',
        type: 'bar',
        data: hasData ? values : [0],
        barWidth: hasData ? '55%' : '35%',
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#06B6D4' },
              { offset: 0.5, color: '#8B5CF6' },
              { offset: 1, color: '#F43F5E' },
            ],
          },
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 16,
            shadowColor: 'rgba(6, 182, 212, 0.3)',
          },
        },
        label: {
          show: hasData,
          position: 'right',
          fontSize: 12,
          fontWeight: 800,
          color: '#F1F5F9',
          fontFamily: 'Inter, sans-serif',
        },
        animationDelay: (idx) => idx * 120,
      },
    ],
    animationEasing: 'cubicOut',
  }), [categories, values, hasData]);

  const chartHeight = Math.max(200, (hasData ? categories.length : 1) * 48 + 40);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-white">Life-Saving Rules Compliance</h3>
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">IOGP LSR</span>
      </div>
      <ReactECharts
        option={option}
        style={{ height: chartHeight }}
        opts={{ renderer: 'canvas' }}
        notMerge={true}
      />
    </div>
  );
}
