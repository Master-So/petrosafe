import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

export default function IncidentCategoryFunnelChart({ analytics }) {
  const option = useMemo(() => {
    if (!analytics || !analytics.by_category) return {};
    
    const categories = Object.keys(analytics.by_category);
    const sortedCategories = categories
      .map(cat => ({ name: cat, value: analytics.by_category[cat] }))
      .sort((a, b) => b.value - a.value);

    // Premium modern color palette suitable for data visualization
    const colorPalette = [
      '#3b82f6', // Blue 500
      '#8b5cf6', // Violet 500
      '#ec4899', // Pink 500
      '#f43f5e', // Rose 500
      '#f97316', // Orange 500
      '#eab308', // Yellow 500
      '#10b981', // Emerald 500
      '#06b6d4', // Cyan 500
    ];

    const data = sortedCategories.map((item, idx) => ({
      value: item.value,
      name: item.name,
      itemStyle: {
        color: colorPalette[idx % colorPalette.length],
        borderColor: '#ffffff',
        borderWidth: 2,
        shadowBlur: 8,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
        shadowColor: 'rgba(0, 0, 0, 0.1)',
      }
    }));

    return {
      backgroundColor: 'transparent',
      title: {
        text: 'INCIDENTS BY CATEGORY',
        subtext: 'Distribution of issues by root classification',
        left: 'center',
        top: '2%',
        textStyle: { fontSize: 16, fontWeight: '900', color: '#1f2937', fontFamily: 'Inter, sans-serif' },
        subtextStyle: { fontSize: 12, color: '#6b7280', fontFamily: 'Inter, sans-serif' }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b} : {c} ({d}%)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: '#374151', fontSize: 13, fontWeight: '500' },
        extraCssText: 'box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border-radius: 8px;'
      },
      legend: {
        bottom: '0%',
        left: 'center',
        type: 'scroll',
        itemWidth: 12,
        itemHeight: 12,
        itemGap: 16,
        textStyle: { color: '#4b5563', fontSize: 11, fontWeight: '600' }
      },
      series: [
        {
          name: 'Incidents',
          type: 'funnel',
          left: '10%',
          width: '60%', // Leaves 30% on the right for labels
          top: '18%',
          bottom: '12%',
          minSize: '5%',
          maxSize: '100%',
          sort: 'descending',
          gap: 3,
          label: {
            show: true,
            position: 'right',
            formatter: (params) => {
              return `{name|${params.name}}\n{value|${params.value} Incidents}`;
            },
            rich: {
              name: {
                fontSize: 12,
                color: '#4b5563',
                fontWeight: '600',
                lineHeight: 18
              },
              value: {
                fontSize: 14,
                color: '#111827',
                fontWeight: '900',
                lineHeight: 20
              }
            }
          },
          labelLine: {
            show: true,
            length: 30,
            lineStyle: { width: 1.5, type: 'solid', color: '#d1d5db' }
          },
          itemStyle: {
            opacity: 0.95
          },
          emphasis: {
            label: {
              fontSize: 15
            },
            itemStyle: {
              opacity: 1,
              shadowBlur: 15,
              shadowColor: 'rgba(0, 0, 0, 0.2)'
            }
          },
          data: data
        }
      ]
    };
  }, [analytics]);

  return (
    <ReactECharts
      option={option}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
}
