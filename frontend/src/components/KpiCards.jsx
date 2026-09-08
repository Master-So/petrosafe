import React from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

export default function KpiCards({ analytics = {}, incidents = [] }) {
  const total = analytics.total_incidents ?? incidents.length ?? 0;

  const highSifCount = incidents.filter(i => (i.sif_precursor_density_score ?? 0) >= 7).length ||
                       (analytics.by_risk_level && analytics.by_risk_level['SIF-HIGH']) || 0;
  const highSifPct = total > 0 ? Math.round((highSifCount / total) * 100) : 0;

  const fatalCount = analytics.fatal_potential_count ??
                     incidents.filter(i => i.fatal_potential_flag === true).length ?? 0;

  const ruleCounts = analytics.by_life_saving_rule || {};
  let topRuleName = 'None Logged';
  let topRuleCount = 0;

  const ruleEntries = Object.entries(ruleCounts);
  if (ruleEntries.length > 0) {
    const sorted = [...ruleEntries].sort((a, b) => b[1] - a[1]);
    if (sorted[0]) {
      topRuleName = sorted[0][0];
      topRuleCount = sorted[0][1];
    }
  } else if (incidents.length > 0) {
    const manualMap = {};
    incidents.forEach(i => {
      const r = i.life_saving_rule || 'Unspecified';
      manualMap[r] = (manualMap[r] || 0) + 1;
    });
    const sortedManual = Object.entries(manualMap).sort((a, b) => b[1] - a[1]);
    if (sortedManual[0]) {
      topRuleName = sortedManual[0][0];
      topRuleCount = sortedManual[0][1];
    }
  }

  const avgSif = analytics.avg_sif_score ??
                 (incidents.length > 0
                    ? (incidents.reduce((acc, i) => acc + (i.sif_precursor_density_score || 0), 0) / incidents.length).toFixed(1)
                    : '0.0');

  const cards = [
    {
      label: 'TOTAL ACTIVE INCIDENTS',
      value: total,
      subPrefix: '+12%', // Mock data matching reference for trend
      subPrefixColor: 'text-red-500',
      subSuffix: 'vs prev. period',
      pillText: 'HIGH',
      pillClass: 'pill-high',
      trendColor: 'text-yellow-400'
    },
    {
      label: 'SIF PRECURSORS DETECTED',
      value: highSifCount,
      subPrefix: `${highSifPct}% of total`,
      subPrefixColor: 'text-red-500',
      subSuffix: 'vs prev. period',
      pillText: 'CRITICAL',
      pillClass: 'pill-critical',
      trendColor: 'text-red-500'
    },
    {
      label: 'FATAL POTENTIAL EVENTS',
      value: fatalCount,
      subPrefix: '0% delta',
      subPrefixColor: 'text-green-500',
      subSuffix: 'vs prev. period',
      pillText: 'CRITICAL',
      pillClass: 'pill-critical',
      trendColor: 'text-red-500'
    },
    {
      label: 'TOP VIOLATED RULE',
      value: topRuleName,
      subPrefix: `${topRuleCount} occurrences`,
      subPrefixColor: 'text-red-500',
      subSuffix: 'vs prev. period',
      pillText: 'MEDIUM',
      pillClass: 'pill-medium',
      trendColor: 'text-yellow-400',
      isText: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <div key={idx} className="flat-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-gray-500 tracking-wider">
              {card.label}
            </span>
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-widest ${card.pillClass}`}>
              {card.pillText}
            </span>
          </div>

          <div className={`font-black text-gray-900 tracking-tight leading-none mb-4 ${card.isText ? 'text-2xl line-clamp-2' : 'text-4xl'}`}>
            {card.value}
          </div>

          <div className="flex items-center justify-between mt-auto">
            <div className="text-[10px] font-bold flex items-center space-x-1">
              {card.subPrefixColor === 'text-red-500' ? (
                <TrendingDown className={`w-3 h-3 ${card.subPrefixColor}`} />
              ) : (
                <TrendingUp className={`w-3 h-3 ${card.subPrefixColor}`} />
              )}
              <span className={card.subPrefixColor}>{card.subPrefix}</span>
              <span className="text-gray-400 font-medium ml-1">{card.subSuffix}</span>
            </div>
            
            {/* Simple mock trendline svg matching reference image */}
            <svg width="40" height="20" viewBox="0 0 40 20" fill="none" className={card.trendColor}>
              <path d="M0 15L10 10L20 18L30 5L40 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}
