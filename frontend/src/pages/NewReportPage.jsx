import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ShieldAlert, Loader2, ArrowLeft } from 'lucide-react';
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
      description: "During casing installation, a 12kg hydraulic torque wrench slipped from an unrated safety lanyard at 15 meters above the drill floor. The tool landed within 1 meter of a roustabout standing in the rotary table area. No injuries reported, but high-impact zone was unprotected.",
      primary_cause_category: 'Human Error',
      equipment_failed: [],
      shift: 'Day'
    }
  },
  {
    name: "Chemical Spray",
    data: {
      location: "Moran Gathering Station",
      short_cause: "Chemical Exposure / Pressurized Line",
      description: "During transfer of corrosion inhibitor chemical, an uninspected flange gasket failed under 45 psi, releasing liquid spray towards two field operators. Eye-wash station was engaged immediately; operators were wearing standard PPE with eye shields.",
      primary_cause_category: 'Protocol Not Followed',
      equipment_failed: [],
      shift: 'Night'
    }
  },
  {
    name: "Low-Risk Office",
    data: {
      location: "Jorhat Compressor Terminal",
      short_cause: "Minor paper cut",
      description: "An employee was opening a newly delivered cardboard box of printer paper in the office. While pulling the cardboard flap, they sustained a minor paper cut to their right index finger. They washed the finger with soap and water and applied a small band-aid from the office first-aid kit. The employee immediately returned to normal administrative duties without any further medical attention required.",
      primary_cause_category: 'Other',
      equipment_failed: [],
      shift: 'Day'
    }
  },
  {
    name: "Pump Failure",
    data: {
      location: "Digboi Rig #4",
      short_cause: "High Pressure Pump Failure",
      description: "During normal drilling operations, the main mud pump experienced a catastrophic seal failure resulting in a loss of pressure. The drill pipe became temporarily stuck. Maintenance investigation found worn out valves and damaged pump seals.",
      primary_cause_category: 'Equipment Failure',
      equipment_failed: ['Pumps', 'Valves', 'Drill Pipe'],
      shift: 'Night'
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
    description: '',
    primary_cause_category: 'Equipment Failure',
    equipment_failed: [],
    shift: 'Day'
  });

  const CATEGORY_OPTIONS = [
    "Equipment Failure",
    "Overloaded",
    "Protocol Not Followed",
    "Environmental Hazard",
    "Human Error",
    "Other"
  ];

  const EQUIPMENT_OPTIONS = [
    "Drill Pipe",
    "Valves",
    "Blowout Preventer",
    "Compressor",
    "Pumps",
    "Other"
  ];

  const handleEquipmentChange = (eq) => {
    setFormData(prev => {
      const isSelected = prev.equipment_failed.includes(eq);
      const newEquipment = isSelected 
        ? prev.equipment_failed.filter(item => item !== eq)
        : [...prev.equipment_failed, eq];
      return { ...prev, equipment_failed: newEquipment };
    });
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successResult, setSuccessResult] = useState(null);

  const handlePresetSelect = (preset) => {
    setFormData({ date: getTodayString(), ...preset.data });
    setError(null);
    setSuccessResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!formData.description || formData.description.trim().length < 5) {
      setError("Please provide a detailed description.");
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
    if (score >= 7) return "pill-critical";
    if (score >= 4) return "pill-high";
    return "pill-low";
  };

  return (
    <div className="flex-1 flex flex-col w-full">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="inline-flex items-center space-x-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>DASHBOARD</span>
            </Link>
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-gray-900" />
              <span className="text-xs font-black text-gray-900 uppercase">New Incident Report</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {successResult ? (
          <div className="space-y-6">
            <div className="p-4 rounded-md bg-green-50 border border-green-200 flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-green-900 uppercase">Incident Processed & Stored</h3>
                <p className="text-xs text-green-700 mt-1 font-medium">Gemini enrichment complete. Persisted to database.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flat-card p-4 text-center">
                <div className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-2">SIF SCORE</div>
                <div className="text-3xl font-black text-gray-900">{successResult.sif_precursor_density_score}<span className="text-sm font-normal text-gray-400">/10</span></div>
                <div className={`inline-block mt-2 px-2 py-0.5 rounded text-[9px] font-bold tracking-widest ${getScoreBadge(successResult.sif_precursor_density_score)}`}>
                  {successResult.local_risk_level}
                </div>
              </div>

              <div className="flat-card p-4 text-center">
                <div className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-2">FATAL POTENTIAL</div>
                <div className={`text-xl font-black mt-3 ${successResult.fatal_potential_flag ? 'text-red-600' : 'text-gray-900'}`}>
                  {successResult.fatal_potential_flag ? 'FLAGGED' : 'NON-FATAL'}
                </div>
              </div>

              <div className="flat-card p-4 text-center">
                <div className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-2">LIFE-SAVING RULE</div>
                <div className="text-xs font-bold text-gray-900 mt-4 line-clamp-2">
                  {successResult.life_saving_rule || 'None'}
                </div>
              </div>
            </div>

            <div className="flat-card p-5 space-y-4">
              {successResult.local_summary && (
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">AI Summary</span>
                  <p className="text-sm text-gray-800">{successResult.local_summary}</p>
                </div>
              )}
              {successResult.risk_reasoning && (
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Risk Reasoning</span>
                  <p className="text-sm text-gray-800">{successResult.risk_reasoning}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                onClick={() => { 
                  setSuccessResult(null); 
                  setFormData({ 
                    date: getTodayString(), 
                    location: LOCATION_PRESETS[0], 
                    short_cause: '', 
                    description: '',
                    primary_cause_category: 'Equipment Failure',
                    equipment_failed: [],
                    shift: 'Day'
                  }); 
                }}
                className="btn-secondary px-5 py-2 text-xs"
              >
                SUBMIT ANOTHER
              </button>
              <button
                onClick={() => navigate('/')}
                className="btn-primary px-5 py-2 text-xs"
              >
                RETURN TO DASHBOARD
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-black text-gray-900 uppercase">Submit Field Incident</h2>
              <p className="text-xs text-gray-500 mt-1 font-medium">
                Gemini AI will extract SIF precursor density, life-saving rules, and corrective actions.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Test Scenarios</label>
              <div className="flex flex-wrap gap-2">
                {DEMO_PRESETS.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={loading}
                    onClick={() => handlePresetSelect(p)}
                    className="text-[10px] px-3 py-1.5 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 font-bold uppercase"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flat-card p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-widest mb-1.5">Date</label>
                  <input type="date" required disabled={loading} value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full text-xs px-3 py-2 input-flat font-medium" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-widest mb-1.5">Location</label>
                  <select disabled={loading} value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full text-xs px-3 py-2 input-flat font-medium">
                    {LOCATION_PRESETS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-widest mb-1.5">Primary Cause</label>
                <input type="text" required disabled={loading} placeholder="e.g., Dropped Object"
                  value={formData.short_cause}
                  onChange={(e) => setFormData({ ...formData, short_cause: e.target.value })}
                  className="w-full text-xs px-3 py-2 input-flat font-medium" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-widest mb-1.5">Primary Cause Category</label>
                  <select disabled={loading} value={formData.primary_cause_category}
                    onChange={(e) => setFormData({ ...formData, primary_cause_category: e.target.value, equipment_failed: [] })}
                    className="w-full text-xs px-3 py-2 input-flat font-medium">
                    {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-widest mb-1.5">Shift</label>
                  <div className="flex space-x-4 mt-2">
                    <label className="flex items-center space-x-2 text-xs font-medium text-gray-700">
                      <input type="radio" value="Day" checked={formData.shift === 'Day'} onChange={(e) => setFormData({...formData, shift: e.target.value})} disabled={loading} />
                      <span>Day Shift</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs font-medium text-gray-700">
                      <input type="radio" value="Night" checked={formData.shift === 'Night'} onChange={(e) => setFormData({...formData, shift: e.target.value})} disabled={loading} />
                      <span>Night Shift</span>
                    </label>
                  </div>
                </div>
              </div>

              {formData.primary_cause_category === 'Equipment Failure' && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-widest mb-1.5">Equipment Failed (Select multiple)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2 p-3 border border-gray-200 rounded bg-gray-50">
                    {EQUIPMENT_OPTIONS.map(eq => (
                      <label key={eq} className="flex items-center space-x-2 text-xs font-medium text-gray-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          value={eq}
                          checked={formData.equipment_failed.includes(eq)}
                          onChange={() => handleEquipmentChange(eq)}
                          disabled={loading} 
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                        <span>{eq}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-widest mb-1.5">Description</label>
                <textarea required rows={5} disabled={loading}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs px-3 py-2 input-flat font-medium resize-none" />
              </div>

              {error && (
                <div className="p-3 rounded bg-red-50 border border-red-200 text-xs text-red-800 font-medium flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {loading && (
                <div className="flex items-center space-x-2 text-xs font-bold text-gray-500 uppercase tracking-widest justify-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing with AI Engine...</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <Link to="/" className="btn-secondary px-5 py-2 text-xs">
                  CANCEL
                </Link>
                <button type="submit"
                  disabled={loading || !formData.short_cause || formData.description.length < 5}
                  className="btn-primary px-6 py-2 text-xs flex items-center space-x-2">
                  <span>{loading ? 'PROCESSING...' : 'ANALYZE & SUBMIT'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
