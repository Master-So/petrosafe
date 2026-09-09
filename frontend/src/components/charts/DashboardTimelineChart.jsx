import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

export default function DashboardTimelineChart({ incidents = [] }) {
  const { option, currentMonthName } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    
    // Determine the number of days in the current month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Initialize data array with 0s for each day
    const dailyData = new Array(daysInMonth).fill(0);
    const daysAxis = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Filter and count incidents
    incidents.forEach(incident => {
      if (incident.date) {
        const d = new Date(incident.date);
        // Only count incidents matching the current year and month
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          const day = d.getDate();
          if (day >= 1 && day <= daysInMonth) {
            dailyData[day - 1] += 1;
          }
        }
      }
    });

    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const currentMonthName = monthNames[currentMonth];

    // Industrial HSE Style: Restrained colors, solid fills, no gradients, clean lines
    const chartOption = {
      title: {
        text: `Daily Incident Exposure - ${currentMonthName} ${currentYear}`,
        left: 'center',
        top: 0,
        textStyle: { fontSize: 14, fontWeight: 'bold', color: '#334155', fontFamily: 'Inter, sans-serif' },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#ffffff',
        borderColor: '#94a3b8',
        borderWidth: 1,
        textStyle: { color: '#334155', fontFamily: 'Inter, sans-serif', fontSize: 12 },
        padding: 8,
        formatter: (params) => {
          const data = params[0];
          return `<div style="font-weight: bold; margin-bottom: 4px;">${currentMonthName} ${data.name}, ${currentYear}</div>
                  <div>Reported Incidents: <strong>${data.value}</strong></div>`;
        }
      },
      grid: { left: '2%', right: '3%', bottom: '8%', top: '20%', containLabel: true },
      xAxis: {
        type: 'category',
        name: 'Day of Month',
        nameLocation: 'middle',
        nameGap: 30,
        boundaryGap: false, // Ensures the area fills all the way to the edges
        data: daysAxis,
        axisLine: { lineStyle: { color: '#64748b', width: 1 } },
        axisLabel: { color: '#475569', fontSize: 11, fontWeight: '500' },
        axisTick: { show: true, lineStyle: { color: '#94a3b8' } }
      },
      yAxis: {
        type: 'value',
        name: 'Incident Count',
        nameLocation: 'middle',
        nameGap: 40,
        minInterval: 1,
        splitLine: { lineStyle: { type: 'solid', color: '#e2e8f0', width: 1 } },
        axisLine: { show: true, lineStyle: { color: '#64748b', width: 1 } },
        axisLabel: { color: '#475569', fontSize: 11, fontWeight: '500' }
      },
      series: [
        {
          name: 'Incidents',
          type: 'line',
          smooth: 0.1, // Very subtle curve for professionalism
          symbol: 'circle',
          symbolSize: 4,
          showSymbol: false, // Hide symbols unless hovered
          data: dailyData,
          areaStyle: {
            color: 'rgba(51, 65, 85, 0.1)' // Restrained solid fill with opacity (No Gradient)
          },
          itemStyle: { color: '#334155' }, // Slate-800
          lineStyle: { width: 2, color: '#334155' } // Clean solid line, NO shadow/glow
        }
      ]
    };
    
    return { option: chartOption, currentMonthName };
  }, [incidents]);

  return (
    <div className="bg-white border border-gray-200 rounded-sm p-5 shadow-sm h-full w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          MONTHLY EXPOSURE ({currentMonthName})
        </h2>
      </div>
      <ReactECharts
        option={option}
        style={{ height: 320, width: '100%' }}
        opts={{ renderer: 'svg' }} // Use SVG for clean, crisp, industrial styling
        notMerge={true}
      />
    </div>
  );
}
