import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Flame,
  Plus,
  SlidersHorizontal,
  RefreshCw,
  X
} from 'lucide-react';
import IncidentRow from './IncidentRow';

export default function IncidentTable({
  incidents = [],
  loading = false,
  onRefresh,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRiskTab, setSelectedRiskTab] = useState('ALL');
  const [fatalOnly, setFatalOnly] = useState(false);

  // Filter pipeline
  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const term = searchTerm.toLowerCase().trim();
      if (term) {
        const matchesLocation = incident.location?.toLowerCase().includes(term);
        const matchesCause = incident.short_cause?.toLowerCase().includes(term);
        const matchesDesc = incident.description?.toLowerCase().includes(term);
        const matchesRule = incident.life_saving_rule?.toLowerCase().includes(term);
        if (!matchesLocation && !matchesCause && !matchesDesc && !matchesRule) {
          return false;
        }
      }
      if (selectedRiskTab !== 'ALL') {
        const riskLevel = incident.local_risk_level?.toUpperCase();
        if (selectedRiskTab === 'SIF-HIGH') {
          if (riskLevel !== 'SIF-HIGH' && (incident.sif_precursor_density_score || 0) < 7) return false;
        } else if (selectedRiskTab === 'MEDIUM') {
          if (riskLevel !== 'MEDIUM' && ((incident.sif_precursor_density_score || 0) < 4 || (incident.sif_precursor_density_score || 0) > 6)) return false;
        } else if (selectedRiskTab === 'LOW') {
          if (riskLevel !== 'LOW' && (incident.sif_precursor_density_score || 0) > 3) return false;
        }
      }
      if (fatalOnly && !incident.fatal_potential_flag) return false;
      return true;
    });
  }, [incidents, searchTerm, selectedRiskTab, fatalOnly]);

  const riskTabs = [
    { id: 'ALL', label: 'All', count: incidents.length },
    {
      id: 'SIF-HIGH', label: 'SIF-High',
      count: incidents.filter(i => (i.sif_precursor_density_score >= 7) || i.local_risk_level === 'SIF-HIGH').length,
      color: 'text-rose-400',
    },
    {
      id: 'MEDIUM', label: 'Medium',
      count: incidents.filter(i => (i.sif_precursor_density_score >= 4 && i.sif_precursor_density_score <= 6) || i.local_risk_level === 'MEDIUM').length,
      color: 'text-amber-400',
    },
    {
      id: 'LOW', label: 'Low',
      count: incidents.filter(i => (i.sif_precursor_density_score <= 3) || i.local_risk_level === 'LOW').length,
      color: 'text-emerald-400',
    }
  ];

  return (
    <div className="glass-card overflow-hidden">

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="p-4 sm:p-5 border-b border-white/[0.06] space-y-3">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Rig, Location, Cause, or Life-Saving Rule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-8 py-2.5 input-dark"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Fatal Toggle */}
          <div className="flex items-center space-x-3">
            <label className="inline-flex items-center cursor-pointer select-none px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
              <input
                type="checkbox"
                checked={fatalOnly}
                onChange={(e) => setFatalOnly(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-8 h-4 rounded-full transition-colors relative mr-2 ${fatalOnly ? 'bg-rose-500' : 'bg-slate-600'}`}>
                <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 left-0.5 transition-transform ${fatalOnly ? 'transform translate-x-4' : ''}`} />
              </div>
              <Flame className={`w-3.5 h-3.5 mr-1.5 ${fatalOnly ? 'text-rose-400' : 'text-slate-500'}`} />
              <span className={`text-xs font-semibold ${fatalOnly ? 'text-rose-300' : 'text-slate-400'}`}>
                Fatal Only
              </span>
            </label>

            {(searchTerm || selectedRiskTab !== 'ALL' || fatalOnly) && (
              <button
                onClick={() => { setSearchTerm(''); setSelectedRiskTab('ALL'); setFatalOnly(false); }}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Risk Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mr-2 flex items-center">
            <SlidersHorizontal className="w-3 h-3 mr-1" />
            Risk:
          </span>
          {riskTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedRiskTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                selectedRiskTab === tab.id
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 border border-white/[0.06] hover:bg-white/[0.04] hover:text-slate-300'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                selectedRiskTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'bg-white/[0.04] text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.02] border-b border-white/[0.06] text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <th className="px-5 py-3">Date & Location</th>
              <th className="px-5 py-3">Cause & Description</th>
              <th className="px-5 py-3 text-center">SIF Score</th>
              <th className="px-5 py-3 text-center">Fatal</th>
              <th className="px-5 py-3">Life-Saving Rule</th>
              <th className="px-5 py-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading && incidents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                    <span className="text-xs font-medium text-slate-500">Loading from PostgreSQL…</span>
                  </div>
                </td>
              </tr>
            ) : filteredIncidents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <div className="max-w-sm mx-auto flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center text-slate-500 mb-2">
                      <Search className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-bold text-white">No Matching Incidents</span>
                    <p className="text-xs text-slate-500 mt-1">
                      Try clearing filters or submit a new report.
                    </p>
                    <Link
                      to="/report/new"
                      className="mt-3 inline-flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-cyan-500/20"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Report</span>
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              filteredIncidents.map((incident, idx) => (
                <IncidentRow key={incident.id} incident={incident} isEven={idx % 2 === 0} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-white/[0.02] border-t border-white/[0.06] flex flex-wrap items-center justify-between text-[11px] text-slate-500">
        <div>
          Showing <strong className="text-slate-300">{filteredIncidents.length}</strong> of{' '}
          <strong className="text-slate-300">{incidents.length}</strong> incidents
        </div>
        <div className="text-[10px] text-slate-600">
          Click any row to expand AI reasoning & corrective actions
        </div>
      </div>
    </div>
  );
}
