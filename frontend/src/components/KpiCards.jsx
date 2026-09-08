import React from 'react';
import {
  ClipboardList,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Activity,
  TrendingUp,
} from 'lucide-react';

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
      label: 'Total Incidents',
      value: total,
      sub: `Avg SIF: ${avgSif}/10`,
      icon: ClipboardList,
      gradient: 'kpi-teal',
      delay: 'fade-in-up-delay-1',
    },
    {
      label: 'High SIF Precursors',
      value: highSifCount,
      sub: `${highSifPct}% of total`,
      icon: AlertTriangle,
      gradient: 'kpi-amber',
      delay: 'fade-in-up-delay-2',
    },
    {
      label: 'Fatal Potential',
      value: fatalCount,
      sub: fatalCount > 0 ? 'CRITICAL' : 'Zero Flagged',
      icon: Flame,
      gradient: 'kpi-coral',
      glowClass: fatalCount > 0 ? 'glow-coral pulse-alert' : '',
      delay: 'fade-in-up-delay-3',
    },
    {
      label: 'Top Violated Rule',
      value: topRuleName,
      sub: `${topRuleCount} occurrences`,
      icon: ShieldAlert,
      gradient: 'kpi-violet',
      isText: true,
      delay: 'fade-in-up-delay-4',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`
              ${card.gradient} rounded-xl p-5 shadow-lg
              hover:scale-[1.03] hover:shadow-xl transition-all duration-300 cursor-default
              fade-in-up ${card.delay} ${card.glowClass || ''}
            `}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                {card.label}
              </span>
              <div className="p-1.5 rounded-lg bg-white/15 backdrop-blur-sm">
                <Icon className="w-4 h-4 text-white" />
              </div>
            </div>

            <div className={card.isText ? '' : 'flex items-baseline justify-between'}>
              {card.isText ? (
                <div className="text-lg font-extrabold text-white tracking-tight truncate" title={card.value}>
                  {card.value}
                </div>
              ) : (
                <span className="text-3xl font-black text-white tracking-tight">
                  {card.value}
                </span>
              )}
              {!card.isText && (
                <span className="text-xs font-semibold text-white/60 flex items-center space-x-1">
                  <Activity className="w-3 h-3" />
                  <span>{card.sub}</span>
                </span>
              )}
            </div>

            {card.isText && (
              <div className="mt-1 text-xs font-semibold text-white/60">
                {card.sub}
              </div>
            )}

            {/* Decorative bottom bar */}
            <div className="mt-4 h-0.5 w-full rounded-full bg-white/20" />
          </div>
        );
      })}
    </div>
  );
}
