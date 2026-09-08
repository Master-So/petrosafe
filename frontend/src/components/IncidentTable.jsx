import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Flame, 
  AlertCircle, 
  Plus, 
  FileText,
  SlidersHorizontal,
  RefreshCw,
  X
} from 'lucide-react';
import IncidentRow from './IncidentRow';

export default function IncidentTable({ 
  incidents = [], 
  loading = false, 
  onRefresh, 
  onOpenReportModal 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRiskTab, setSelectedRiskTab] = useState('ALL'); // 'ALL' | 'SIF-HIGH' | 'MEDIUM' | 'LOW'
  const [fatalOnly, setFatalOnly] = useState(false);

  // Filter pipeline
  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      // 1. Search term (location, short_cause, description, life_saving_rule)
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

      // 2. Risk Level filter tab
      if (selectedRiskTab !== 'ALL') {
        const riskLevel = incident.local_risk_level?.toUpperCase();
        if (selectedRiskTab === 'SIF-HIGH') {
          // Can match either SIF-HIGH level or score >= 7
          if (riskLevel !== 'SIF-HIGH' && (incident.sif_precursor_density_score || 0) < 7) {
            return false;
          }
        } else if (selectedRiskTab === 'MEDIUM') {
          if (riskLevel !== 'MEDIUM' && ((incident.sif_precursor_density_score || 0) < 4 || (incident.sif_precursor_density_score || 0) > 6)) {
            return false;
          }
        } else if (selectedRiskTab === 'LOW') {
          if (riskLevel !== 'LOW' && (incident.sif_precursor_density_score || 0) > 3) {
            return false;
          }
        }
      }

      // 3. Fatal potential only toggle
      if (fatalOnly) {
        if (!incident.fatal_potential_flag) {
          return false;
        }
      }

      return true;
    });
  }, [incidents, searchTerm, selectedRiskTab, fatalOnly]);

  const riskTabs = [
    { id: 'ALL', label: 'All Incidents', count: incidents.length },
    { 
      id: 'SIF-HIGH', 
      label: 'SIF-High (≥7)', 
      count: incidents.filter(i => (i.sif_precursor_density_score >= 7) || i.local_risk_level === 'SIF-HIGH').length 
    },
    { 
      id: 'MEDIUM', 
      label: 'Medium (4–6)', 
      count: incidents.filter(i => (i.sif_precursor_density_score >= 4 && i.sif_precursor_density_score <= 6) || i.local_risk_level === 'MEDIUM').length 
    },
    { 
      id: 'LOW', 
      label: 'Low (1–3)', 
      count: incidents.filter(i => (i.sif_precursor_density_score <= 3) || i.local_risk_level === 'LOW').length 
    }
  ];

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      
      {/* FILTER & SEARCH TOOLBAR */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 space-y-3">
        
        {/* Top filter row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Rig, Location, Cause, or Life-Saving Rule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-md shadow-xs focus:ring-1 focus:ring-[#0B4F6C] focus:border-[#0B4F6C] text-slate-800 placeholder-slate-400"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Fatal Potential Only Toggle */}
          <div className="flex items-center space-x-3">
            <label className="inline-flex items-center cursor-pointer select-none bg-white px-3 py-1.5 rounded-md border border-slate-300 shadow-xs hover:border-slate-400 transition-colors">
              <input
                type="checkbox"
                checked={fatalOnly}
                onChange={(e) => setFatalOnly(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-8 h-4 bg-slate-300 rounded-full transition-colors relative mr-2 ${fatalOnly ? 'bg-red-600' : ''}`}>
                <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 left-0.5 transition-transform ${fatalOnly ? 'transform translate-x-4' : ''}`} />
              </div>
              <Flame className={`w-3.5 h-3.5 mr-1.5 ${fatalOnly ? 'text-red-600' : 'text-slate-400'}`} />
              <span className={`text-xs font-semibold ${fatalOnly ? 'text-red-700' : 'text-slate-700'}`}>
                Fatal Potential Only
              </span>
            </label>

            {/* Quick reset if filters applied */}
            {(searchTerm || selectedRiskTab !== 'ALL' || fatalOnly) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedRiskTab('ALL');
                  setFatalOnly(false);
                }}
                className="text-xs text-slate-500 hover:text-[#0B4F6C] underline font-medium cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>

        </div>

        {/* Risk Level Segmented Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-2 flex items-center">
            <SlidersHorizontal className="w-3 h-3 mr-1" />
            Filter by Risk:
          </span>
          {riskTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedRiskTab(tab.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                selectedRiskTab === tab.id
                  ? 'bg-[#0B4F6C] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedRiskTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

      </div>

      {/* TABLE DATA FEED */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <th className="px-5 py-3">Date & Location</th>
              <th className="px-5 py-3">Cause & Description</th>
              <th className="px-5 py-3 text-center">SIF Precursor</th>
              <th className="px-5 py-3 text-center">Fatal Potential</th>
              <th className="px-5 py-3">Life-Saving Rule</th>
              <th className="px-5 py-3 text-right">Intel Details</th>
            </tr>
          </thead>
          <tbody>
            {loading && incidents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#0B4F6C]" />
                    <span className="text-xs font-medium text-slate-600">Loading incident records from PostgreSQL...</span>
                  </div>
                </td>
              </tr>
            ) : filteredIncidents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                  <div className="max-w-sm mx-auto flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                      <Search className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-bold text-[#0F172A]">No Matching Incidents Found</span>
                    <p className="text-xs text-slate-400 mt-1">
                      Try clearing search criteria or submit a new field report.
                    </p>
                    <button
                      onClick={onOpenReportModal}
                      className="mt-3 inline-flex items-center space-x-1 px-3 py-1.5 bg-[#0B4F6C] text-white text-xs font-semibold rounded shadow-xs hover:bg-[#093f56]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Report New Incident</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredIncidents.map((incident) => (
                <IncidentRow key={incident.id} incident={incident} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500">
        <div>
          Showing <strong className="text-slate-700">{filteredIncidents.length}</strong> of{' '}
          <strong className="text-slate-700">{incidents.length}</strong> total incidents
        </div>
        <div className="text-[11px] text-slate-400">
          Click any row to expand AI reasoning, SIF density analysis, and corrective actions
        </div>
      </div>

    </div>
  );
}
