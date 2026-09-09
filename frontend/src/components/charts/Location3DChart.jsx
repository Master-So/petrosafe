import React, { useMemo, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import 'echarts-gl';

export default function Location3DChart({ analytics = {} }) {
  const chartRef = useRef(null);

  useEffect(() => {
    // Intercept the wheel event before ECharts GL gets it.
    // This stops ECharts from zooming and prevents it from blocking the native page scroll.
    const el = chartRef.current?.getEchartsInstance()?.getDom();
    if (el) {
      const handleWheel = (e) => {
        e.stopPropagation(); // Stop ECharts from seeing the wheel event
      };
      // Must use capture phase to intercept before ECharts
      el.addEventListener('wheel', handleWheel, { capture: true, passive: true });
      return () => el.removeEventListener('wheel', handleWheel, { capture: true });
    }
  }, []);

  const { data, maxZ } = useMemo(() => {
    const byLoc = analytics.by_location || {};
    // Sort locations by count descending
    const sorted = Object.entries(byLoc).sort((a, b) => b[1] - a[1]);
    
    // We want to map these to an X,Y grid.
    // Let's create a rough grid size based on the number of locations.
    const count = sorted.length;
    const gridSize = Math.ceil(Math.sqrt(count)) || 1;
    
    let maxZ = 0;
    const dataPoints = sorted.map(([name, val], idx) => {
      const x = idx % gridSize;
      const y = Math.floor(idx / gridSize);
      const z = val;
      if (z > maxZ) maxZ = z;
      return {
        name,
        value: [x, y, z]
      };
    });

    return { data: dataPoints, maxZ };
  }, [analytics]);

  const hasData = data.length > 0 && maxZ > 0;

  const option = useMemo(() => ({
    tooltip: {
      backgroundColor: '#FFFFFF',
      borderColor: '#E2E8F0',
      borderWidth: 1,
      textStyle: { color: '#111827', fontSize: 12, fontFamily: 'Inter, sans-serif' },
      formatter: function (params) {
        if (!params || !params.data) return '';
        const { name, value } = params.data;
        return `<span style="font-weight:700">${name}</span><br/>Incidents: <span style="font-weight:700">${value[2]}</span>`;
      }
    },
    visualMap: {
      show: false,
      max: maxZ,
      inRange: {
        color: ['#93C5FD', '#3B82F6', '#1E40AF', '#1E3A8A'] // Light blue to very dark blue
      }
    },
    xAxis3D: {
      type: 'value',
      show: false // Hide grid lines
    },
    yAxis3D: {
      type: 'value',
      show: false // Hide grid lines
    },
    zAxis3D: {
      type: 'value',
      show: false // Hide grid lines
    },
    grid3D: {
      boxWidth: 100,
      boxDepth: 100,
      boxHeight: 60,
      viewControl: {
        projection: 'orthographic',
        autoRotate: true,
        autoRotateSpeed: 5,
        alpha: 35,
        beta: 45,
        minAlpha: 10,
        maxAlpha: 80,
        zoomSensitivity: 0, // Disable zooming
      },
      light: {
        main: {
          intensity: 1.2,
          shadow: true,
          shadowQuality: 'high',
          alpha: 40,
          beta: 40
        },
        ambient: {
          intensity: 0.6
        }
      },
      axisLine: { lineStyle: { color: 'transparent' } },
      axisPointer: { show: false },
      splitLine: { show: false },
      environment: '#FFFFFF' // flat white background for the 3D space
    },
    series: [
      {
        type: 'bar3D',
        data: hasData ? data : [{ name: 'No Data', value: [0, 0, 0] }],
        shading: 'realistic',
        realisticMaterial: {
          roughness: 0.8,
          metalness: 0.1
        },
        label: {
          show: false
        },
        itemStyle: {
          opacity: 0.95
        },
        emphasis: {
          label: { show: false },
          itemStyle: {
            color: '#F59E0B' // Highlight color (Orange) on hover
          }
        }
      }
    ]
  }), [data, maxZ, hasData]);

  return (
    <div className="h-full">
      <div className="mb-2">
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Incident Density (3D Location Blocks)</h3>
      </div>
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: 250, width: '100%' }}
        opts={{ renderer: 'canvas' }} // 3D requires canvas
        notMerge={true}
      />
    </div>
  );
}
