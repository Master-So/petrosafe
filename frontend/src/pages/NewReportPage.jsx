import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Flame,
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
    name: "Dropped Object",
    data: {
      location: "Duliajan Rig #7",
      short_cause: "Dropped Object / Line of Fire",
      description: "During casing installation, a 12kg hydraulic torque wrench slipped from an unrated safety lanyard at 15 meters above the drill floor. The tool landed within 1 meter of a roustabout standing in the rotary table area. No injuries reported, but high-impact zone was unprotected."
    }
  },
  {
    name: "Chemical Spray",
    data: {
      location: "Moran Gathering Station",
      short_cause: "Chemical Exposure / Pressurized Line",
      description: "During transfer of corrosion inhibitor chemical, an uninspected flange gasket failed under 45 psi, releasing liquid spray towards two field operators. Eye-wash station was engaged immediately; operators were wearing standard PPE with eye shields."
    }
  },
  {
    name: "LOTO Failure",
    data: {
      location: "Digboi Rig #4",
      short_cause: "Energy Isolation / LOTO Failure",
      description: "Maintenance technician opened high-pressure mud pump manifold before verifying zero energy state. Residual trapped pressure of 800 psi discharged suddenly against containment shield. Lockout/tagout protocol was not signed off by shift supervisor."
    }
  },
  {
    name: "Low-Risk Office",
    data: {
      location: "Jorhat Compressor Terminal",
      short_cause: "Minor paper cut",
      description: "An employee was opening a newly delivered cardboard box of printer paper in the office. While pulling the cardboard flap, they sustained a minor paper cut to their right index finger. They washed the finger with soap and water and applied a small band-aid from the office first-aid kit. The employee immediately returned to normal administrative duties without any further medical attention required."
    }
  }
];

export default function NewReportPage() {
  const navigate = useNavigate();
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
    "Sending to Gemini for SIF analysis...",
    "Synthesizing Life-Saving Rules & reasoning...",
    "Persisting to PostgreSQL..."
  ];

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

  const handlePresetSelect = (preset) => {
    setFormData({ date: getTodayString(), ...preset.data });
    setError(null);
    setSuccessResult(null);
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
    } catch (err) {
      setError(err.message || "Failed to submit. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const getScoreBadge = (score) => {
    if (score >= 7) return "kpi-coral";
    if (score >= 4) return "kpi-amber";
    return "bg-gradient-to-br from-emerald-500 to-teal-500";
  };

  return (
    <div className="min-h-screen bg-[#0F1729] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30">
        <div className="bg-[#151E2E]/90 backdrop-blur-md border-b border-white/[0.06]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <Link
                to="/"
                className="inline-flex items-center space-x-2 text-xs font-medium text-slate-400 hover:text-cyan-400 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 text-white">
                  <ShieldAlert className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-white">New Incident Report</span>
              </div>
            </div>
          </div>
        </div>
        <div className="gradient-line" />
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {successResult ? (
          <div className="space-y-5 fade-in-up">
            {/* Success banner */}
            <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start space-x-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-base font-bold text-emerald-300">Incident Processed & Stored</h3>
                <p className="text-sm text-emerald-400/70 mt-1">Gemini enrichment complete. Persisted to PostgreSQL.</p>
              </div>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={`${getScoreBadge(successResult.sif_precursor_density_score)} rounded-xl p-5 text-center text-white`}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">SIF Score</div>
                <div className="text-3xl font-black mt-2">{successResult.sif_precursor_density_score}<span className="text-sm font-normal text-white/50">/10</span></div>
                <div className="text-xs font-bold mt-1 text-white/80">{successResult.local_risk_level}</div>
              </div>

              <div className={`rounded-xl p-5 text-center text-white ${
                successResult.fatal_potential_flag ? 'kpi-coral pulse-alert' : 'bg-gradient-to-br from-emerald-500 to-teal-500'
              }`}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">Fatal Potential</div>
                <div className="flex items-center justify-center mt-2 space-x-1">
                  <Flame className="w-5 h-5" />
                  <span className="text-lg font-bold">{successResult.fatal_potential_flag ? 'FLAGGED' : 'NON-FATAL'}</span>
                </div>
              </div>

              <div className="kpi-violet rounded-xl p-5 text-center text-white">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">Life-Saving Rule</div>
                <div className="text-sm font-bold mt-3 truncate">{successResult.life_saving_rule || 'None'}</div>
              </div>
            </div>

            {/* Summary */}
            {successResult.local_summary && (
              <div className="glass-card p-5">
                <span className="font-semibold text-xs text-slate-400 block mb-2">AI Summary:</span>
                <p className="text-sm text-slate-300 leading-relaxed">{successResult.local_summary}</p>
              </div>
            )}

            {/* Risk Reasoning */}
            {successResult.risk_reasoning && (
              <div className="glass-card p-5 border-amber-500/10">
                <span className="font-semibold text-xs text-amber-400 block mb-2">Risk Reasoning:</span>
                <p className="text-sm text-amber-300/80 leading-relaxed">{successResult.risk_reasoning}</p>
              </div>
            )}

            {/* Corrective Actions */}
            {Array.isArray(successResult.corrective_actions) && successResult.corrective_actions.length > 0 && (
              <div className="glass-card p-5">
                <span className="font-semibold text-xs text-slate-400 block mb-3">Corrective Actions:</span>
                <ul className="space-y-2">
                  {successResult.corrective_actions.map((a, i) => (
                    <li key={i} className="flex items-start space-x-2 text-sm text-slate-300">
                      <span className="w-5 h-5 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">{i + 1}</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
              <button
                onClick={() => { setSuccessResult(null); setFormData({ date: getTodayString(), location: LOCATION_PRESETS[0], short_cause: '', description: '' }); }}
                className="px-5 py-2.5 border border-white/[0.08] text-slate-300 text-sm font-medium rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                Submit Another
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-medium text-sm rounded-lg shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <span>View Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="fade-in-up">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">Submit Field Incident</h2>
              <p className="text-sm text-slate-500 mt-1">
                Gemini AI will extract SIF precursor density, life-saving rules, fatal potential, and corrective actions.
              </p>
            </div>

            {/* Presets */}
            <div className="mb-6">
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Quick Load:</label>
              <div className="flex flex-wrap gap-2">
                {DEMO_PRESETS.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={loading}
                    onClick={() => handlePresetSelect(p)}
                    className="text-xs px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.03] text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/5 hover:border-cyan-500/20 transition-all font-medium cursor-pointer disabled:opacity-50"
                  >
                    ⚡ {p.name}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Incident Date</label>
                  <input type="date" required disabled={loading} value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full text-sm px-4 py-2.5 input-dark" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Location</label>
                  <select disabled={loading} value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full text-sm px-4 py-2.5 input-dark">
                    {LOCATION_PRESETS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Primary Cause</label>
                <input type="text" required disabled={loading} placeholder="e.g., Dropped Object / Line of Fire"
                  value={formData.short_cause}
                  onChange={(e) => setFormData({ ...formData, short_cause: e.target.value })}
                  className="w-full text-sm px-4 py-2.5 input-dark" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">Description</label>
                  <span className="text-[10px] text-slate-600 font-mono">{formData.description.length} chars</span>
                </div>
                <textarea required rows={6} disabled={loading}
                  placeholder="Describe the events, proximity, equipment, and controls..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-sm px-4 py-3 input-dark resize-none" />
              </div>

              {error && (
                <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-sm text-rose-300 flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {loading && (
                <div className="p-5 glass-card space-y-3">
                  <div className="flex items-center space-x-2.5">
                    <Loader2 className="w-5 h-5 text-cyan-400 animate-spin flex-shrink-0" />
                    <span className="text-sm font-semibold text-white">Processing AI Pipeline...</span>
                  </div>
                  <p className="text-sm text-slate-400 italic pl-7">{stages[loadingStage]}</p>
                  <div className="w-full bg-white/[0.06] h-2 rounded-full overflow-hidden mt-2">
                    <div className="bg-gradient-to-r from-cyan-500 to-teal-500 h-full transition-all duration-500 rounded-full"
                      style={{ width: `${((loadingStage + 1) / stages.length) * 100}%` }} />
                  </div>
                </div>
              )}

              <div className="pt-4 flex items-center justify-between border-t border-white/[0.06]">
                <Link to="/" className="px-5 py-2.5 border border-white/[0.08] text-slate-400 text-sm font-medium rounded-lg hover:bg-white/[0.04] transition-colors">
                  Cancel
                </Link>
                <button type="submit"
                  disabled={loading || !formData.short_cause || formData.description.length < 5}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer">
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /><span>Analyzing...</span></>
                  ) : (
                    <><Sparkles className="w-4 h-4" /><span>Analyze & Submit</span></>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      <footer className="border-t border-white/[0.04] bg-[#151E2E]/50 py-4 mt-12 text-center">
        <div className="max-w-3xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-xs text-slate-600">© {new Date().getFullYear()} Oil India Limited • HSSE</span>
          <span className="text-[10px] text-slate-700 font-mono">Gemini Enrichment</span>
        </div>
      </footer>
    </div>
  );
}
