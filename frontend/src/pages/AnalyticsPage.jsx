import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getAnalytics } from '../services/api';
import ReactECharts from 'echarts-for-react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import IncidentCategoryFunnelChart from '../components/charts/IncidentCategoryFunnelChart';

const PREMIUM_COLORS = ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51', '#8ab17d', '#babb74'];

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const fetchData = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await getAnalytics();
      setAnalytics(data);
    } catch (err) {
      setError(err.message || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Data Processors ---

  // 1. Top Reasons (Category) (Extracted to IncidentCategoryFunnelChart)

  // 2. Equipment Failures (Vertical Bar Chart - Styled like reference image)
  const equipmentChartOption = useMemo(() => {
    if (!analytics || !analytics.equipment_failures) return {};
    const equipmentEntries = Object.entries(analytics.equipment_failures).sort((a, b) => b[1] - a[1]);
    
    // Make labels multiline if they contain spaces to fit cleanly
    const categories = equipmentEntries.map(e => e[0].split(' ').join('\n'));
    
    // Earthy color palette
    const barColors = ['#5c3a21', '#e8b495', '#c37553', '#cfad87', '#875d41', '#f3d2c1'];

    const data = equipmentEntries.map((e, idx) => ({
      value: e[1],
      itemStyle: { color: barColors[idx % barColors.length] }
    }));

    return {
      backgroundColor: {
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: '#fbf7f4' }, { offset: 1, color: '#f5e4da' }]
      },
      title: { 
        text: 'EQUIPMENT FAILURES', 
        subtext: '(Based on Incidents or Observations)',
        left: 'center',
        top: '5%',
        textStyle: { fontSize: 18, fontWeight: '900', color: '#4a3525' },
        subtextStyle: { fontSize: 13, color: '#6d5647' }
      },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '15%', right: '5%', bottom: '15%', top: '25%', containLabel: false },
      xAxis: { 
        type: 'category', 
        data: categories, 
        axisLine: { lineStyle: { color: '#4a3525', width: 1 } },
        axisTick: { show: false },
        axisLabel: { 
          fontSize: 10, 
          fontWeight: 'bold',
          color: '#4a3525',
          interval: 0,
          lineHeight: 12,
          margin: 10
        } 
      },
      yAxis: { 
        type: 'value', 
        name: 'Number',
        nameLocation: 'middle',
        nameGap: 40,
        nameTextStyle: { color: '#4a3525', fontSize: 14, fontWeight: 'bold' },
        splitLine: { lineStyle: { color: '#e6d8cd', width: 1 } },
        axisLine: { show: true, lineStyle: { color: '#4a3525', width: 1 } },
        axisLabel: { color: '#4a3525', fontSize: 12 },
        minInterval: 1 
      },
      series: [
        {
          name: 'Failures',
          type: 'bar',
          data: data,
          barWidth: '70%',
          label: {
            show: true,
            position: 'top',
            distance: 10,
            fontSize: 24,
            fontWeight: 'bold',
            color: '#4a3525'
          },
          itemStyle: { borderRadius: 0 } // completely square bars
        }
      ]
    };
  }, [analytics]);

  // 3. Timeline
  const timelineChartOption = useMemo(() => {
    if (!analytics || !analytics.timeline) return {};
    
    // Extract months for the selected year
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    const data = months.map(month => {
      const key = `${selectedYear}-${month}`;
      return analytics.timeline[key] || 0;
    });

    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return {
      title: { text: `Incident Timeline (${selectedYear})`, textStyle: { fontSize: 14, fontWeight: 'bold', color: '#333' } },
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: monthLabels },
      yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
      series: [
        {
          name: 'Incidents',
          type: 'line',
          smooth: true,
          data,
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: '#2a9d8f' }, { offset: 1, color: 'rgba(42,157,143,0.1)' }]
            }
          },
          itemStyle: { color: '#2a9d8f' },
          lineStyle: { width: 3 }
        }
      ]
    };
  }, [analytics, selectedYear]);

  // Extract available years for the dropdown filter
  const availableYears = useMemo(() => {
    if (!analytics || !analytics.timeline) return [new Date().getFullYear().toString()];
    const years = new Set();
    Object.keys(analytics.timeline).forEach(key => years.add(key.split('-')[0]));
    return Array.from(years).sort().reverse();
  }, [analytics]);

  return (
    <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-black text-gray-900 uppercase">Advanced Analytics Overview</h1>
        <button onClick={fetchData} className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center space-x-1">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>SYNC</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-3 rounded-md">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block text-sm">Connection Error</span>
            <p className="mt-0.5">{error}</p>
            <button
              onClick={fetchData}
              className="mt-2 text-xs font-semibold underline hover:text-red-900 cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {loading && !analytics ? (
        <div className="flex justify-center items-center h-64">
           <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Category Chart */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg h-[500px]">
              <IncidentCategoryFunnelChart analytics={analytics} />
            </div>

            {/* Equipment Chart */}
            <div className="rounded-xl overflow-hidden shadow-lg h-[500px]">
              <ReactECharts option={equipmentChartOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>

          {/* Timeline Chart */}
          <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm h-96 flex flex-col">
            <div className="flex justify-end mb-2">
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className="text-xs px-3 py-1 border border-gray-300 rounded font-medium text-gray-700 bg-gray-50 focus:outline-none focus:border-blue-500"
              >
                {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <ReactECharts option={timelineChartOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
