import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert, 
  Flame, 
  Info, 
  Loader2,
  FileText,
  MapPin,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { createIncident } from '../services/api';

const LOCATION_PRESETS = [
  "Duliajan Rig #7",
  "Digboi Rig #4",
  "Moran Gathering Station",
  "Naharkatiya Production Well #22",
  "Jorhat Compressor Terminal"
];

const DEMO_PRESETS = [
  {
    name: "Dropped Object Demo",
    data: {
      location: "Duliajan Rig #7",
      short_cause: "Dropped Object / Line of Fire",
      description: "During casing installation, a 12kg hydraulic torque wrench slipped from an unrated safety lanyard at 15 meters above the drill floor. The tool landed within 1 meter of a roustabout standing in the rotary table area. No injuries reported, but high-impact zone was unprotected."
    }
  },
  {
    name: "Chemical Spray Demo",
    data: {
      location: "Moran Gathering Station",
      short_cause: "Chemical Exposure / Pressurized Line",
      description: "During transfer of corrosion inhibitor chemical, an uninspected flange gasket failed under 45 psi, releasing liquid spray towards two field operators. Eye-wash station was engaged immediately; operators were wearing standard PPE with eye shields."
    }
  },
  {
    name: "LOTO / Energy Isolation Demo",
    data: {
      location: "Digboi Rig #4",
      short_cause: "Energy Isolation / LOTO Failure",
      description: "Maintenance technician opened high-pressure mud pump manifold before verifying zero energy state. Residual trapped pressure of 800 psi discharged suddenly against containment shield. Lockout/tagout protocol was not signed off by shift supervisor."
    }
  }
];

export default function ReportModal({ isOpen, onClose, onSuccess }) {
  const getTodayString = () => new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    date: getTodayString(),
    location: LOCATION_PRESETS[0],
    short_cause: '',
    description: ''
  });

  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [error, setError] = useState(null);
  const [successResult, setSuccessResult] = useState(null);

  const stages = [
    "Validating incident telemetry...",
    "Executing Local SIF Precursor Classifier (AIModels)...",
    "Synthesizing Life-Saving Rules & risk reasoning...",
    "Persisting enriched intelligence to PostgreSQL..."
  ];

  // Cycling stage text during loading
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStage((prev) => (prev < stages.length - 1 ? prev + 1 : prev));
      }, 1200);
    } else {
      setLoadingStage(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  if (!isOpen) return null;

  const handlePresetSelect = (preset) => {
    setFormData({
      date: getTodayString(),
      location: preset.data.location,
      short_cause: preset.data.short_cause,
      description: preset.data.description
    });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.description || formData.description.trim().length < 5) {
      setError("Please provide a detailed description (minimum 5 characters).");
      return;
    }

    setLoading(true);
    setSuccessResult(null);

    try {
      const created = await createIncident(formData);
      setSuccessResult(created);
      if (onSuccess) {
        onSuccess(created);
      }
    } catch (err) {
      console.error("Incident creation failed:", err);
      setError(err.message || "Failed to submit incident. Ensure backend is running on port 4000.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setSuccessResult(null);
    setError(null);
    setFormData({
      date: getTodayString(),
      location: LOCATION_PRESETS[0],
      short_cause: '',
      description: ''
    });
    onClose();
  };

  // Helper for SIF score badge styling
  const getScoreBadge = (score) => {
    if (score >= 7) return "bg-red-50 text-red-800 border-red-200";
    if (score >= 4) return "bg-amber-50 text-amber-800 border-amber-200";
    return "bg-green-50 text-green-800 border-green-200";
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-2xl w-full overflow-hidden transition-all">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded bg-[#0B4F6C] text-white">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                Submit Field Incident / SIF Report
              </h2>
              <p className="text-xs text-slate-500">
                Automated AI Precursor Extraction & Life-Saving Rule Classifier
              </p>
            </div>
          </div>

          <button
            onClick={handleResetAndClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          
          {/* SUCCESS PREVIEW STATE */}
          {successResult ? (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-900">
                    Incident Processed & Persisted to Database
                  </h3>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    FastAPI model inference and Gemini enrichment completed successfully.
                  </p>
                </div>
              </div>

              {/* Intelligence Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                
                {/* SIF Score */}
                <div className={`p-3.5 rounded-lg border text-center ${getScoreBadge(successResult.sif_precursor_density_score)}`}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider">
                    SIF Precursor Score
                  </div>
                  <div className="text-2xl font-black mt-1">
                    {successResult.sif_precursor_density_score} <span className="text-xs font-normal">/ 10</span>
                  </div>
                  <div className="text-[11px] font-bold mt-0.5">
                    {successResult.local_risk_level || 'EVALUATED'}
                  </div>
                </div>

                {/* Fatal Flag */}
                <div className={`p-3.5 rounded-lg border text-center ${
                  successResult.fatal_potential_flag 
                    ? 'bg-red-50 text-red-800 border-red-200' 
                    : 'bg-green-50 text-green-800 border-green-200'
                }`}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider">
                    Fatal Potential
                  </div>
                  <div className="text-lg font-bold mt-2">
                    {successResult.fatal_potential_flag ? 'FLAGGED (HIGH)' : 'NON-FATAL'}
                  </div>
                  <div className="text-[11px] mt-0.5">
                    {successResult.fatal_potential_flag ? 'Urgent Action Required' : 'Contained Hazard'}
                  </div>
                </div>

                {/* Life-Saving Rule */}
                <div className="p-3.5 rounded-lg border border-sky-200 bg-sky-50 text-[#0B4F6C] text-center">
                  <div className="text-[11px] font-semibold uppercase tracking-wider">
                    Life-Saving Rule
                  </div>
                  <div className="text-sm font-bold mt-2 truncate" title={successResult.life_saving_rule}>
                    {successResult.life_saving_rule || 'None'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Compliance Target
                  </div>
                </div>

              </div>

              {/* Local Summary Excerpt */}
              {successResult.local_summary && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs">
                  <span className="font-semibold text-slate-700 block mb-1">
                    AI Operational Summary:
                  </span>
                  <p className="text-slate-600 leading-relaxed">
                    {successResult.local_summary}
                  </p>
                </div>
              )}

              {/* Corrective Actions Preview */}
              {Array.isArray(successResult.corrective_actions) && successResult.corrective_actions.length > 0 && (
                <div className="border border-slate-200 rounded-lg p-3.5">
                  <span className="font-semibold text-xs text-slate-700 block mb-2">
                    Immediate Corrective Actions Recommended ({successResult.corrective_actions.length}):
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {successResult.corrective_actions.slice(0, 3).map((action, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0B4F6C] mt-1.5 flex-shrink-0"></span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Done button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-5 py-2.5 bg-[#0B4F6C] hover:bg-[#093f56] text-white font-medium text-xs rounded-md shadow-sm transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <span>Close & View in Incident Table</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          ) : (
            /* FORM SUBMISSION STATE */
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Quick Preset Buttons */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Quick Load Test Scenarios:
                </label>
                <div className="flex flex-wrap gap-2">
                  {DEMO_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={loading}
                      onClick={() => handlePresetSelect(preset)}
                      className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors font-medium cursor-pointer disabled:opacity-50"
                    >
                      ⚡ {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 1: Date & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Incident Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      disabled={loading}
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md shadow-xs focus:ring-1 focus:ring-[#0B4F6C] focus:border-[#0B4F6C] bg-white text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Oil Field / Asset Location
                  </label>
                  <select
                    disabled={loading}
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md shadow-xs focus:ring-1 focus:ring-[#0B4F6C] focus:border-[#0B4F6C] bg-white text-slate-800"
                  >
                    {LOCATION_PRESETS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Short Cause */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Cause / Category
                </label>
                <input
                  type="text"
                  required
                  disabled={loading}
                  placeholder="e.g., Dropped Object / Line of Fire, H2S Leak, Pressurized Manifold"
                  value={formData.short_cause}
                  onChange={(e) => setFormData({ ...formData, short_cause: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md shadow-xs focus:ring-1 focus:ring-[#0B4F6C] focus:border-[#0B4F6C] bg-white text-slate-800 placeholder-slate-400"
                />
              </div>

              {/* Description */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Detailed Event Description
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {formData.description.length} chars (min 5)
                  </span>
                </div>
                <textarea
                  required
                  rows={4}
                  disabled={loading}
                  placeholder="Describe the sequence of events, personnel proximity, equipment involved, and immediate controls deployed..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md shadow-xs focus:ring-1 focus:ring-[#0B4F6C] focus:border-[#0B4F6C] bg-white text-slate-800 placeholder-slate-400 resize-none font-sans"
                />
              </div>

              {/* Error Banner */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Multi-stage AI Loading Indicator */}
              {loading && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center space-x-2.5">
                    <Loader2 className="w-4 h-4 text-[#0B4F6C] animate-spin flex-shrink-0" />
                    <span className="text-xs font-semibold text-slate-800">
                      Processing AI Pipeline...
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 italic pl-6">
                    {stages[loadingStage]}
                  </p>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                    <div 
                      className="bg-[#0B4F6C] h-full transition-all duration-500 rounded-full"
                      style={{ width: `${((loadingStage + 1) / stages.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleResetAndClose}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-medium rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.short_cause || formData.description.length < 5}
                  className="px-5 py-2 bg-[#0B4F6C] hover:bg-[#093f56] text-white text-xs font-semibold rounded-md shadow-sm transition-colors flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyze & Submit</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
}
