import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  CheckCircle2,
  MapPin,
  Calendar,
  Sparkles,
  Flame,
  CheckSquare,
  Hash
} from 'lucide-react';

export default function IncidentRow({ incident, isEven }) {
  const [expanded, setExpanded] = useState(false);

  const {
    id,
    date,
    location,
    short_cause,
    description,
    local_summary,
    local_risk_level,
    sif_precursor_density_score,
    life_saving_rule,
    fatal_potential_flag,
    risk_reasoning,
    corrective_actions,
    created_at
  } = incident;

  const formattedDate = date ? new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) : 'N/A';

  const score = sif_precursor_density_score ?? 0;

  const getSifBadge = (s) => {
    if (s >= 7) return 'bg-rose-500/15 text-rose-400 border-rose-500/30 glow-coral';
    if (s >= 4) return 'bg-amber-500/15 text-amber-400 border-amber-500/30 glow-amber';
    return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 glow-emerald';
  };

  return (
    <>
      <tr
        onClick={() => setExpanded(!expanded)}
        className={`border-b border-white/[0.04] hover:bg-white/[0.04] transition-all cursor-pointer ${
          expanded ? 'bg-white/[0.03]' : isEven ? 'bg-transparent' : 'bg-white/[0.015]'
        }`}
      >
        {/* Date & Location */}
        <td className="px-5 py-4 whitespace-nowrap">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-1">
            <MapPin className="w-3.5 h-3.5" />
            <span className="font-medium">{location}</span>
          </div>
        </td>

        {/* Cause & Description */}
        <td className="px-5 py-4">
          <div className="font-semibold text-xs text-slate-200 leading-tight">
            {short_cause}
          </div>
          <div className="text-xs text-slate-500 mt-1 line-clamp-2 max-w-md">
            {description}
          </div>
        </td>

        {/* SIF Score */}
        <td className="px-5 py-4 whitespace-nowrap text-center">
          <div className="inline-flex flex-col items-center">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${getSifBadge(score)}`}>
              {score}/10
            </span>
            <span className="text-[10px] text-slate-600 uppercase font-semibold mt-1">
              {local_risk_level || 'N/A'}
            </span>
          </div>
        </td>

        {/* Fatal Potential */}
        <td className="px-5 py-4 whitespace-nowrap text-center">
          {fatal_potential_flag ? (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 pulse-alert">
              <Flame className="w-3.5 h-3.5" />
              <span>FATAL</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              <span>Safe</span>
            </span>
          )}
        </td>

        {/* Life-Saving Rule */}
        <td className="px-5 py-4 whitespace-nowrap">
          <div className="flex items-center space-x-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-300">
              {life_saving_rule || 'None'}
            </span>
          </div>
        </td>

        {/* Expand Button */}
        <td className="px-5 py-4 whitespace-nowrap text-right">
          <button
            type="button"
            className="inline-flex items-center space-x-1 text-xs font-medium text-cyan-400 hover:text-cyan-300 p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            <span>{expanded ? 'Hide' : 'Intel'}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </td>
      </tr>

      {/* EXPANDED DETAIL DRAWER */}
      {expanded && (
        <tr className="border-b border-white/[0.04]">
          <td colSpan={6} className="px-6 py-5">
            <div className="glass-card p-5 space-y-4">

              {/* Header */}
              <div className="flex flex-wrap items-center justify-between border-b border-white/[0.06] pb-3 gap-2">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                    AI Intelligence Dossier
                  </h4>
                </div>
                <div className="text-[10px] text-slate-600 font-mono flex items-center space-x-1">
                  <Hash className="w-3 h-3" />
                  <span>{id}</span>
                </div>
              </div>

              {/* Summary */}
              {local_summary && (
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1.5">
                    AI Operational Summary:
                  </span>
                  <p className="text-xs text-slate-300 bg-white/[0.03] p-3 rounded-lg border border-white/[0.06] leading-relaxed">
                    {local_summary}
                  </p>
                </div>
              )}

              {/* Risk Reasoning */}
              {risk_reasoning && (
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1.5">
                    Risk & SIF Precursor Reasoning:
                  </span>
                  <p className="text-xs text-amber-300/80 bg-amber-500/5 p-3 rounded-lg border border-amber-500/10 leading-relaxed">
                    {risk_reasoning}
                  </p>
                </div>
              )}

              {/* Corrective Actions */}
              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-2">
                  Corrective Actions:
                </span>
                {Array.isArray(corrective_actions) && corrective_actions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {corrective_actions.map((action, idx) => (
                      <div
                        key={idx}
                        className="flex items-start space-x-2 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-slate-300"
                      >
                        <CheckSquare className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 italic">No corrective actions logged.</p>
                )}
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-slate-600">
                <span>Created: {created_at ? new Date(created_at).toLocaleString() : 'N/A'}</span>
                <span>OIL HSSE Digital Assurance</span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
