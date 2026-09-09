import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function IncidentRow({ incident }) {
  const [expanded, setExpanded] = useState(false);

  const {
    id,
    date, // Often just YYYY-MM-DD
    created_at, // Has actual timestamp from DB if available
    location,
    short_cause,
    description,
    local_summary,
    local_risk_level,
    sif_precursor_density_score,
  } = incident;

  // Use created_at for real timestamp, fallback to date, fallback to N/A
  const timestampToUse = created_at || date;
  const formattedDate = timestampToUse ? (() => {
    const d = new Date(timestampToUse);
    // If it's a valid date, format as YYYY-MM-DD HH:MM
    if (!isNaN(d.getTime())) {
      const datePart = d.toISOString().split('T')[0];
      const hour = d.getHours().toString().padStart(2, '0');
      const min = d.getMinutes().toString().padStart(2, '0');
      return `${datePart} ${hour}:${min}`;
    }
    return timestampToUse;
  })() : 'N/A';

  // Format ID to INC-XXXX
  const displayId = `INC-${id.substring(0, 4).toUpperCase()}`;

  // Severity pill
  let pillText = local_risk_level || 'NEGLIGIBLE';
  let pillClass = 'pill-negligible';

  const score = sif_precursor_density_score || 0;
  if (score >= 7 || local_risk_level === 'SIF-HIGH') {
    pillText = 'CRITICAL';
    pillClass = 'pill-critical';
  } else if (score >= 5) {
    pillText = 'HIGH';
    pillClass = 'pill-high';
  } else if (score >= 3) {
    pillText = 'MEDIUM';
    pillClass = 'pill-medium';
  } else if (score >= 1) {
    pillText = 'LOW';
    pillClass = 'pill-low';
  }

  return (
    <>
      <tr
        onClick={() => setExpanded(!expanded)}
        className="hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <td className="px-2 py-4">
          <div className="flex items-center space-x-2">
            {expanded ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
            <span className="text-xs font-black text-gray-900">{displayId}</span>
          </div>
        </td>
        <td className="px-2 py-4">
          <span className="text-[11px] font-mono text-gray-500">{formattedDate}</span>
        </td>
        <td className="px-2 py-4 max-w-sm">
          <div className="text-[11px] font-bold text-gray-900">{short_cause}</div>
          <div className="text-[10px] text-gray-500 truncate">{description}</div>
        </td>
        <td className="px-2 py-4">
          <span className="text-[11px] text-gray-500">{location}</span>
        </td>
        <td className="px-2 py-4">
          <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-widest ${pillClass}`}>
            {pillText}
          </span>
        </td>
      </tr>

      {/* Expanded Row Content */}
      {expanded && (
        <tr className="bg-gray-50 border-b border-gray-100">
          <td colSpan={5} className="px-6 py-4">
            <div className="space-y-4">
              <div>
                <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                  Full Description
                </span>
                <p className="text-xs text-gray-700 leading-relaxed bg-white border border-gray-200 p-3 rounded">
                  {description}
                </p>
              </div>

              {local_summary && (
                <div>
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                    AI Summary
                  </span>
                  <p className="text-xs text-gray-700 leading-relaxed bg-white border border-gray-200 p-3 rounded">
                    {local_summary}
                  </p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
