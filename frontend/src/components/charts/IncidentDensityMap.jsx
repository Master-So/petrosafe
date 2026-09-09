import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

// Hardcoded reference coordinates (Longitude, Latitude) for the schematic spatial layout.
// This structure is reusable: backend can easily replace these fields.
const LOCATION_COORDINATES = {
  "Jorhat Compressor Terminal": [94.20, 26.75],
  "Moran Gathering Station": [94.90, 27.15],
  "Naharkatiya Production Well #22": [95.20, 27.25], // Shifted West/South slightly for visual separation
  "Duliajan Rig #7": [95.45, 27.40],               // Shifted East/North slightly for visual separation
  "Digboi Rig #4": [95.70, 27.45],
};

export default function IncidentDensityMap({ incidents = [] }) {
  const { data, maxIncidents } = useMemo(() => {
    // 1. Initialize location aggregations based on the 5 primary facilities
    const agg = {};
    Object.keys(LOCATION_COORDINATES).forEach(loc => {
      agg[loc] = {
        location: loc,
        latitude: LOCATION_COORDINATES[loc][1],
        longitude: LOCATION_COORDINATES[loc][0],
        incidents: 0,
        sifScoreTotal: 0,
        lsrViolations: 0
      };
    });

    // 2. Aggregate actual data from the backend incident feed
    incidents.forEach(incident => {
      const loc = incident.location;
      if (agg[loc]) {
        agg[loc].incidents += 1;
        agg[loc].sifScoreTotal += (incident.sif_precursor_density_score || 0);
        if (incident.life_saving_rule && incident.life_saving_rule !== 'None') {
          agg[loc].lsrViolations += 1;
        }
      }
    });

    let maxIncidents = 0;
    
    // 3. Format for ECharts scatter series
    const chartData = Object.values(agg).map(item => {
      if (item.incidents > maxIncidents) maxIncidents = item.incidents;
      
      const avgSif = item.incidents > 0 ? (item.sifScoreTotal / item.incidents).toFixed(1) : "0.0";
      
      return {
        name: item.location,
        value: [
          item.longitude, // X coordinate
          item.latitude,  // Y coordinate
          item.incidents, // Value for visual scale
          avgSif,         // Extra metric for tooltip
          item.lsrViolations // Extra metric for tooltip
        ]
      };
    });

    return { data: chartData, maxIncidents: maxIncidents || 1 };
  }, [incidents]);

  const option = useMemo(() => {
    return {
      title: {
        text: 'Northeast Region Schematic Incident Map',
        subtext: 'Spatial distribution of HSE incidents across primary facilities',
        left: '2%',
        top: '2%',
        textStyle: { fontSize: 14, fontWeight: 'bold', color: '#1e293b', fontFamily: 'Inter, sans-serif' },
        subtextStyle: { fontSize: 11, color: '#64748b', fontFamily: 'Inter, sans-serif' }
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: '#ffffff',
        borderColor: '#cbd5e1',
        borderWidth: 1,
        padding: 12,
        textStyle: { color: '#334155', fontFamily: 'Inter, sans-serif' },
        formatter: function (params) {
          const [lon, lat, count, avgSif, lsr] = params.value;
          return `
            <div style="font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
              ${params.name}
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
              <span style="color: #64748b;">Total Incidents:</span>
              <strong style="margin-left: 12px;">${count}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
              <span style="color: #64748b;">Avg. SIF Exposure:</span>
              <strong style="margin-left: 12px; color: ${avgSif > 5 ? '#b91c1c' : '#334155'}">${avgSif}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
              <span style="color: #64748b;">LSR Violations:</span>
              <strong style="margin-left: 12px;">${lsr}</strong>
            </div>
          `;
        }
      },
      grid: {
        left: '10%',
        right: '10%',
        top: '20%',
        bottom: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        scale: true,
        show: false // Hidden to mimic a spatial map
      },
      yAxis: {
        type: 'value',
        scale: true,
        show: false // Hidden to mimic a spatial map
      },
      visualMap: {
        type: 'continuous',
        min: 0,
        max: maxIncidents,
        inRange: {
          color: ['#cbd5e1', '#64748b', '#334155', '#0f172a'], // Restrained industrial scale (slate to deep navy)
          symbolSize: [12, 35] // Higher incidents = larger marker
        },
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '2%',
        itemWidth: 12,
        itemHeight: 200,
        text: ['High', 'Low'],
        textStyle: { color: '#64748b', fontSize: 10, fontWeight: '600' }
      },
      series: [
        {
          name: 'Facilities',
          type: 'scatter',
          symbol: 'path://M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
          symbolOffset: [0, '-50%'],
          data: data,
          label: {
            show: true,
            position: 'bottom',
            distance: 12,
            formatter: '{b}', // Name of location
            color: '#475569',
            fontSize: 11,
            fontWeight: '600',
            // Clean text outline for map readability
            textBorderColor: '#f8fafc',
            textBorderWidth: 2
          },
          itemStyle: {
            borderColor: '#ffffff',
            borderWidth: 1.5,
            opacity: 0.95
          },
          emphasis: {
            itemStyle: {
              borderColor: '#1e293b',
              borderWidth: 2,
              opacity: 1
            }
          }
        }
      ]
    };
  }, [data, maxIncidents]);

  return (
    <div className="bg-[#f8fafc] border border-gray-200 rounded-sm p-4 shadow-sm h-full w-full relative overflow-hidden">
      {/* Subtle schematic background to establish the industrial/spatial context without clutter */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]" 
           style={{ backgroundImage: 'linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      <ReactECharts
        option={option}
        style={{ height: 450, width: '100%', position: 'relative', zIndex: 10 }}
        opts={{ renderer: 'svg' }} // Crisp rendering
        notMerge={true}
      />
    </div>
  );
}
