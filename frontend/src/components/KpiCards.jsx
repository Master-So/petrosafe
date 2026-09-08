import React from 'react';
import { 
  ClipboardList, 
  AlertTriangle, 
  Flame, 
  ShieldAlert, 
  TrendingUp, 
  CheckCircle,
  Activity
} from 'lucide-react';

export default function KpiCards({ analytics = {}, incidents = [] }) {
  // 1. Total Incidents Reported
  const total = analytics.total_incidents ?? incidents.length ?? 0;

  // 2. High SIF-Precursor Incidents (Score >= 7)
  const highSifCount = incidents.filter(i => (i.sif_precursor_density_score ?? 0) >= 7).length || 
                       (analytics.by_risk_level && analytics.by_risk_level['SIF-HIGH']) || 0;
  const highSifPct = total > 0 ? Math.round((highSifCount / total) * 100) : 0;

  // 3. Fatal Potential Flags Triggered
  const fatalCount = analytics.fatal_potential_count ?? 
                     incidents.filter(i => i.fatal_potential_flag === true).length ?? 0;

  // 4. Most Frequently Violated Life-Saving Rule
  const ruleCounts = analytics.by_life_saving_rule || {};
  let topRuleName = 'None Logged';
  let topRuleCount = 0;

  const ruleEntries = Object.entries(ruleCounts);
  if (ruleEntries.length > 0) {
    // Sort descending by count
    const sorted = [...ruleEntries].sort((a, b) => b[1] - a[1]);
    // Pick the highest
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      
      {/* CARD 1: Total Incidents */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Logged Incidents
          </span>
          <div className="p-2 rounded-md bg-slate-100 text-slate-600">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>
        
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
            {total}
          </span>
          <span className="text-xs text-slate-500 font-medium flex items-center space-x-1">
            <Activity className="w-3.5 h-3.5 text-[#0B4F6C]" />
            <span>Avg SIF: <strong className="text-slate-700">{avgSif}</strong>/10</span>
          </span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
          Cumulative reports across all OIL production assets
        </div>
      </div>

      {/* CARD 2: High SIF-Precursor Incidents */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            High SIF Precursors (≥7)
          </span>
          <div className="p-2 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
              {highSifCount}
            </span>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {highSifPct}% of total
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
          Severe Injury & Fatality precursors requiring intervention
        </div>
      </div>

      {/* CARD 3: Fatal Potential Flags */}
      <div className={`bg-white rounded-lg border p-5 shadow-sm transition-shadow ${
        fatalCount > 0 
          ? 'border-red-300 ring-1 ring-red-100 hover:shadow-md' 
          : 'border-slate-200 hover:shadow-md'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Fatal Potential Flags
          </span>
          <div className={`p-2 rounded-md ${
            fatalCount > 0 
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            <Flame className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <span className={`text-3xl font-extrabold tracking-tight ${fatalCount > 0 ? 'text-red-700' : 'text-[#0F172A]'}`}>
            {fatalCount}
          </span>
          {fatalCount > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-800 border border-red-200 pulse-alert">
              CRITICAL ATTENTION
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-800 border border-green-200">
              Zero Uncontained
            </span>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
          Near-misses or events capable of producing catastrophic loss
        </div>
      </div>

      {/* CARD 4: Top Life-Saving Rule */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Top Violated Rule
          </span>
          <div className="p-2 rounded-md bg-sky-50 text-[#0B4F6C] border border-sky-200">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xl font-bold text-[#0F172A] tracking-tight truncate" title={topRuleName}>
            {topRuleName}
          </div>
          <div className="mt-1 flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium">
              Occurrences: <strong className="text-[#0F172A]">{topRuleCount}</strong>
            </span>
            <span className="text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
              LSR Compliance
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
          Primary focus area for field HSSE toolbox talks
        </div>
      </div>

    </div>
  );
}
