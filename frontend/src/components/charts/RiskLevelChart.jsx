import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

const RISK_COLORS = {
  'CRITICAL': '#EF4444',
  'SIF-HIGH': '#F59E0B',
  'MEDIUM':   '#EAB308',
  'LOW':      '#3B82F6',
};

// Map backend risk levels to UI risk levels for color matching
const getRiskColor = (name) => {
  if (name === 'SIF-HIGH') return RISK_COLORS['CRITICAL']; // Map SIF-HIGH to red in this UI
  if (name === 'MEDIUM') return RISK_COLORS['MEDIUM'];
  if (name === 'LOW') return RISK_COLORS['LOW'];
  return '#9CA3AF'; // Default gray
};

export default function RiskLevelChart({ analytics = {} }) {
  const data = useMemo(() => {
    const byRisk = analytics.by_risk_level || {};
    return Object.entries(byRisk).map(([name, value]) => ({
      name,
      value,
      itemStyle: { color: getRiskColor(name) },
    }));
  }, [analytics]);

  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  const hasData = data.length > 0 && data.some(d => d.value > 0);

  const option = useMemo(() => ({
    tooltip: {
      trigger: 'item',
      backgroundColor: '#FFFFFF',
      borderColor: '#E2E8F0',
      borderWidth: 1,
      textStyle: { color: '#111827', fontSize: 12, fontFamily: 'Inter, sans-serif' },
    },
    legend: {
      orient: 'vertical',
      right: '10%',
      top: 'middle',
      itemWidth: 8,
      itemHeight: 8,
      icon: 'rect',
      textStyle: { color: '#6B7280', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600 },
      formatter: (name) => {
        const item = data.find(d => d.name === name);
        const count = item ? item.value : 0;
        return `{name|${name}}  {count|${count} events}`;
      },
      textStyle: {
        rich: {
          name: { width: 60, color: '#6B7280', fontSize: 11, fontWeight: 600 },
          count: { color: '#111827', fontSize: 11, fontWeight: 700 }
        }
      }
    },
    title: {
      text: hasData ? `{val|${total}}\n{sub|TOTAL INCIDENTS}` : '{val|0}\n{sub|NO DATA}',
      left: '29%',
      top: 'center',
      textAlign: 'center',
      textStyle: {
        rich: {
          val: { fontSize: 28, fontWeight: 900, color: '#111827', lineHeight: 32 },
          sub: { fontSize: 9, fontWeight: 700, color: '#9CA3AF' }
        }
      }
    },
    series: [
      {
        name: 'Risk Level',
        type: 'pie',
        radius: ['60%', '85%'],
        center: ['30%', '50%'],
        avoidLabelOverlap: false,
        label: { show: false },
        labelLine: { show: false },
        data: hasData ? data : [{ name: 'No Data', value: 1, itemStyle: { color: '#F3F4F6' } }],
      },
    ],
  }), [data, total, hasData]);

  return (
    <div className="h-full">
      <div className="mb-2">
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Risk Level Distribution</h3>
      </div>
      <ReactECharts
        option={option}
        style={{ height: 200, width: '100%' }}
        opts={{ renderer: 'svg' }}
        notMerge={true}
      />
    </div>
  );
}
