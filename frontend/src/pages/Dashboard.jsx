import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import KpiCards from '../components/KpiCards';
import IncidentTable from '../components/IncidentTable';
import Toast from '../components/Toast';
import RiskLevelChart from '../components/charts/RiskLevelChart';
import LifeSavingRulesChart from '../components/charts/LifeSavingRulesChart';
import { getIncidents, getAnalytics, checkHealth } from '../services/api';
import { AlertCircle, RefreshCw, Radio, BarChart3 } from 'lucide-react';

export default function Dashboard() {
  const [incidents, setIncidents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [systemStatus, setSystemStatus] = useState({
    backend: 'checking',
    ai: 'checking',
    db: 'checking'
  });

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setError(null);

    try {
      const [incidentsData, analyticsData] = await Promise.all([
        getIncidents(),
        getAnalytics()
      ]);
      setIncidents(Array.isArray(incidentsData) ? incidentsData : []);
      setAnalytics(analyticsData);
      setLastUpdated(new Date().toISOString());
      setSystemStatus(prev => ({ ...prev, backend: 'ok', db: 'ok', ai: 'ok' }));
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err.message || "Failed to load dashboard data.");
      setSystemStatus(prev => ({ ...prev, backend: 'down', db: 'down' }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    checkHealth().then(res => {
      if (res.status === 'ok') setSystemStatus(prev => ({ ...prev, backend: 'ok' }));
    });
    const interval = setInterval(() => fetchData(false), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-[#0F1729] flex flex-col selection:bg-cyan-900/50 selection:text-cyan-200">

      <Header
        systemStatus={systemStatus}
        onRefresh={() => fetchData(true)}
        isRefreshing={refreshing}
        lastUpdated={lastUpdated}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

        {/* Error Banner */}
        {error && (
          <div className="p-4 glass-card border-rose-500/30 text-rose-300 text-xs flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block text-sm text-rose-200">Connection Warning</span>
              <p className="mt-0.5 text-rose-300/80">{error}</p>
              <button
                onClick={() => fetchData(true)}
                className="mt-2 text-xs font-semibold underline text-rose-200 hover:text-white flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        )}

        {/* KPI CARDS */}
        <section className="fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center space-x-1.5">
              <Radio className="w-3 h-3 text-cyan-400" />
              <span>Operational Risk & Precursor Metrics</span>
            </h2>
            <span className="text-[10px] text-slate-600 font-mono">
              Live · PostgreSQL
            </span>
          </div>
          <KpiCards analytics={analytics || {}} incidents={incidents} />
        </section>

        {/* CHARTS */}
        <section className="fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center space-x-1.5">
              <BarChart3 className="w-3 h-3 text-cyan-400" />
              <span>Interactive Analytics</span>
            </h2>
            <span className="text-[10px] text-slate-600 font-mono">
              Apache ECharts
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RiskLevelChart analytics={analytics || {}} />
            <LifeSavingRulesChart analytics={analytics || {}} />
          </div>
        </section>

        {/* INCIDENT TABLE */}
        <section className="space-y-3 fade-in-up" style={{ animationDelay: '0.35s' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">
                Real-Time HSSE Incident Feed
              </h2>
              <p className="text-xs text-slate-500">
                AI risk reasoning · Life-saving rules · Corrective checklists
              </p>
            </div>
          </div>
          <IncidentTable
            incidents={incidents}
            loading={loading}
            onRefresh={() => fetchData(true)}
          />
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.04] bg-[#151E2E]/50 py-4 mt-12 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-xs text-slate-600">
            © {new Date().getFullYear()} Oil India Limited • HSSE Division
          </span>
          <span className="text-[10px] text-slate-700 font-mono">
            AI Precursor Engine v1.0 · Gemini Enrichment
          </span>
        </div>
      </footer>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
