import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

const RISK_COLORS = {
  'SIF-HIGH': '#F43F5E',
  'MEDIUM':   '#F59E0B',
  'LOW':      '#10B981',
};

export default function RiskLevelChart({ analytics = {} }) {
  const data = useMemo(() => {
    const byRisk = analytics.by_risk_level || {};
    return Object.entries(byRisk).map(([name, value]) => ({
      name,
      value,
      itemStyle: { color: RISK_COLORS[name] || '#64748B' },
    }));
  }, [analytics]);

  const hasData = data.length > 0 && data.some(d => d.value > 0);

  const option = useMemo(() => ({
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(26, 35, 50, 0.95)',
      borderColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      textStyle: { color: '#F1F5F9', fontSize: 12, fontFamily: 'Inter, sans-serif' },
      formatter: (params) =>
        `<div style="font-weight:700;margin-bottom:4px;color:${params.color}">${params.name}</div>` +
        `<span style="font-size:18px;font-weight:800;color:#F1F5F9">${params.value}</span>` +
        ` <span style="opacity:0.5;color:#94A3B8">incidents (${params.percent}%)</span>`,
    },
    legend: {
      bottom: 0,
      left: 'center',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 20,
      textStyle: { fontSize: 11, color: '#94A3B8', fontFamily: 'Inter, sans-serif' },
    },
    series: [
      {
        name: 'Risk Level',
        type: 'pie',
        radius: ['46%', '76%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        padAngle: 4,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#1A2332',
          borderWidth: 3,
        },
        label: {
          show: true,
          position: 'inside',
          formatter: '{c}',
          fontSize: 13,
          fontWeight: 800,
          color: '#fff',
          fontFamily: 'Inter, sans-serif',
          textShadowColor: 'rgba(0,0,0,0.4)',
          textShadowBlur: 4,
        },
        emphasis: {
          label: { show: true, fontSize: 16, fontWeight: 'bold' },
          itemStyle: {
            shadowBlur: 24,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.4)',
          },
        },
        data: hasData ? data : [{ name: 'No Data', value: 1, itemStyle: { color: '#1E293B' } }],
        animationType: 'scale',
        animationEasing: 'elasticOut',
        animationDelay: (idx) => idx * 150,
      },
    ],
  }), [data, hasData]);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-white">Risk Level Distribution</h3>
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">SIF / MEDIUM / LOW</span>
      </div>
      <ReactECharts
        option={option}
        style={{ height: 280 }}
        opts={{ renderer: 'canvas' }}
        notMerge={true}
      />
    </div>
  );
}
