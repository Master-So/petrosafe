import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

const RISK_COLORS = {
  'CRITICAL': '#EF4444',
  'SIF-HIGH': '#F59E0B',
  'MEDIUM': '#EAB308',
  'LOW': '#3B82F6',
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
      orient: 'horizontal',
      bottom: 0,
      left: 'center',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 15,
      textStyle: {
        rich: {
          name: { width: 55, color: '#6B7280', fontSize: 10, fontWeight: 600 },
          count: { color: '#111827', fontSize: 10, fontWeight: 700 }
        }
      },
      formatter: (name) => {
        const item = data.find(d => d.name === name);
        const count = item ? item.value : 0;
        return `{name|${name}} {count|${count}}`;
      }
    },
    title: {
      text: hasData ? `{val|${total}}\n{sub|TOTAL INCIDENTS}` : '{val|0}\n{sub|NO DATA}',
      left: 'center',
      top: '35%', // Shifted slightly higher to visually center inside the pie
      textStyle: {
        align: 'center', // Centers the multi-line text block properly
        rich: {
          val: { fontSize: 26, fontWeight: 900, color: '#111827', lineHeight: 28 },
          sub: { fontSize: 9, fontWeight: 700, color: '#9CA3AF' }
        }
      }
    },
    series: [
      {
        name: 'Risk Level',
        type: 'pie',
        radius: ['52%', '75%'], // Increased inner radius so text doesn't touch edges
        center: ['50%', '45%'],
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
