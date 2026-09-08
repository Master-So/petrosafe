import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  MapPin, 
  Calendar, 
  FileText, 
  Sparkles,
  Flame,
  CheckSquare,
  Hash
} from 'lucide-react';

export default function IncidentRow({ incident }) {
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

  // Format date nicely
  const formattedDate = date ? new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) : 'N/A';

  // Badge styling per design system:
  // SIF High (Score >= 7): bg-red-50 text-red-800 border-red-200
  // SIF Medium (4-6): bg-amber-50 text-amber-800 border-amber-200
  // SIF Low (1-3): bg-green-50 text-green-800 border-green-200
  const getSifBadgeClasses = (score) => {
    if (score >= 7) return "bg-red-50 text-red-800 border-red-200";
    if (score >= 4) return "bg-amber-50 text-amber-800 border-amber-200";
    return "bg-green-50 text-green-800 border-green-200";
  };

  const score = sif_precursor_density_score ?? 0;

  return (
    <>
      <tr 
        onClick={() => setExpanded(!expanded)}
        className={`border-b border-slate-200 hover:bg-slate-50/80 transition-colors cursor-pointer ${
          expanded ? 'bg-slate-50' : 'bg-white'
        }`}
      >
        {/* Date & Location */}
        <td className="px-5 py-4 whitespace-nowrap">
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#0F172A]">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium">{location}</span>
          </div>
        </td>

        {/* Cause & Summary */}
        <td className="px-5 py-4">
          <div className="font-semibold text-xs text-[#0F172A] leading-tight">
            {short_cause}
          </div>
          <div className="text-xs text-slate-500 mt-1 line-clamp-2 max-w-md">
            {description}
          </div>
        </td>

        {/* SIF Score Badge */}
        <td className="px-5 py-4 whitespace-nowrap text-center">
          <div className="inline-flex flex-col items-center">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${getSifBadgeClasses(score)}`}>
              Score: {score}/10
            </span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">
              {local_risk_level || 'EVALUATED'}
            </span>
          </div>
        </td>

        {/* Fatal Potential Flag */}
        <td className="px-5 py-4 whitespace-nowrap text-center">
          {fatal_potential_flag ? (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-bold bg-red-50 text-red-800 border border-red-200">
              <Flame className="w-3.5 h-3.5 text-red-600" />
              <span>FATAL RISK</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-800 border border-green-200">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              <span>Contained</span>
            </span>
          )}
        </td>

        {/* Life-Saving Rule */}
        <td className="px-5 py-4 whitespace-nowrap">
          <div className="flex items-center space-x-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-[#0B4F6C]" />
            <span className="text-xs font-semibold text-[#0F172A]">
              {life_saving_rule || 'None'}
            </span>
          </div>
        </td>

        {/* Action Expand Button */}
        <td className="px-5 py-4 whitespace-nowrap text-right">
          <button
            type="button"
            className="inline-flex items-center space-x-1 text-xs font-medium text-[#0B4F6C] hover:text-[#093f56] p-1.5 rounded hover:bg-slate-100 transition-colors"
          >
            <span>{expanded ? 'Hide Details' : 'View AI Intel'}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </td>
      </tr>

      {/* EXPANDED AI DEEP-DIVE DRAWER */}
      {expanded && (
        <tr className="bg-slate-50/90 border-b border-slate-200">
          <td colSpan={6} className="px-6 py-5">
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
              
              {/* Header row */}
              <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded bg-sky-50 text-[#0B4F6C]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                    Automated HSSE Intelligence Dossier
                  </h4>
                </div>
                <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-2">
                  <Hash className="w-3 h-3" />
                  <span>UUID: {id}</span>
                </div>
              </div>

              {/* Local Summary */}
              {local_summary && (
                <div>
                  <span className="text-xs font-semibold text-slate-700 block mb-1">
                    AI Operational Synthesis:
                  </span>
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded border border-slate-200 leading-relaxed">
                    {local_summary}
                  </p>
                </div>
              )}

              {/* Risk Reasoning */}
              {risk_reasoning && (
                <div>
                  <span className="text-xs font-semibold text-slate-700 block mb-1">
                    Risk & SIF Precursor Reasoning:
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed pl-1">
                    {risk_reasoning}
                  </p>
                </div>
              )}

              {/* Corrective Actions Checklist */}
              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-2">
                  Prescribed HSSE Corrective Actions:
                </span>

                {Array.isArray(corrective_actions) && corrective_actions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {corrective_actions.map((action, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-start space-x-2 p-2.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-700"
                      >
                        <CheckSquare className="w-4 h-4 text-[#0B4F6C] mt-0.5 flex-shrink-0" />
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    No specific corrective action array logged for this record.
                  </p>
                )}
              </div>

              {/* Footer details */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Record Created: {created_at ? new Date(created_at).toLocaleString() : 'N/A'}</span>
                <span className="text-slate-500">OIL HSSE Digital Assurance Database</span>
              </div>

            </div>
          </td>
        </tr>
      )}
    </>
  );
}
