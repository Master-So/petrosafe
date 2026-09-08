import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import KpiCards from '../components/KpiCards';
import IncidentTable from '../components/IncidentTable';
import ReportModal from '../components/ReportModal';
import Toast from '../components/Toast';
import { getIncidents, getAnalytics, checkHealth } from '../services/api';
import { AlertCircle, RefreshCw, Radio } from 'lucide-react';

export default function Dashboard() {
  const [incidents, setIncidents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [systemStatus, setSystemStatus] = useState({
    backend: 'checking',
    ai: 'checking',
    db: 'checking'
  });

  // Fetch all dashboard data
  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setError(null);

    try {
      // 1. Fetch incidents and analytics in parallel
      const [incidentsData, analyticsData] = await Promise.all([
        getIncidents(),
        getAnalytics()
      ]);

      setIncidents(Array.isArray(incidentsData) ? incidentsData : []);
      setAnalytics(analyticsData);
      setLastUpdated(new Date().toISOString());

      // Update telemetry: If we got incidents and analytics from backend & db, both are ok!
      setSystemStatus(prev => ({
        ...prev,
        backend: 'ok',
        db: 'ok',
        // If we want to probe AI directly, check endpoint or mark ok if pipeline works
        ai: 'ok'
      }));

    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err.message || "Failed to load dashboard data. Please check backend connection.");
      setSystemStatus(prev => ({
        ...prev,
        backend: 'down',
        db: 'down'
      }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load + periodic health check
  useEffect(() => {
    fetchData();

    // Check health probe directly
    checkHealth().then(res => {
      if (res.status === 'ok') {
        setSystemStatus(prev => ({ ...prev, backend: 'ok' }));
      }
    });

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchData(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle successful incident report
  const handleIncidentCreated = (newIncident) => {
    // Optimistically prepend to table
    setIncidents(prev => [newIncident, ...prev]);

    // Show toast
    setToast({
      type: 'success',
      title: 'Incident Enriched & Stored',
      message: `Logged at ${newIncident.location} with SIF score ${newIncident.sif_precursor_density_score}/10 (${newIncident.local_risk_level}). Assigned rule: "${newIncident.life_saving_rule || 'None'}".`
    });

    // Refresh analytics
    getAnalytics().then(data => setAnalytics(data)).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col selection:bg-sky-100 selection:text-sky-900">
      
      {/* HEADER WITH HSSE BRANDING & TELEMETRY */}
      <Header
        systemStatus={systemStatus}
        onRefresh={() => fetchData(true)}
        isRefreshing={refreshing}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        lastUpdated={lastUpdated}
      />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        
        {/* BACKEND ERROR BANNER */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs flex items-start space-x-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block text-sm">Connection Warning:</span>
              <p className="mt-0.5 text-red-700">{error}</p>
              <button
                onClick={() => fetchData(true)}
                className="mt-2 text-xs font-semibold underline text-red-900 hover:text-red-950 flex items-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>
            </div>
          </div>
        )}

        {/* SECTION 1: METRIC KPI CARDS */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
              <Radio className="w-3.5 h-3.5 text-[#0B4F6C]" />
              <span>Operational Risk & Precursor Metrics</span>
            </h2>
            <span className="text-[11px] text-slate-400">
              Live SIF density aggregation (PostgreSQL)
            </span>
          </div>

          <KpiCards
            analytics={analytics || {}}
            incidents={incidents}
          />
        </section>

        {/* SECTION 2: FILTERABLE INCIDENT TABLE */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">
                Real-Time HSSE Incident Feed & Investigation Registry
              </h2>
              <p className="text-xs text-slate-500">
                Audited records with automated AI risk reasoning, life-saving rules mapping, and corrective checklists.
              </p>
            </div>
          </div>

          <IncidentTable
            incidents={incidents}
            loading={loading}
            onRefresh={() => fetchData(true)}
            onOpenReportModal={() => setIsReportModalOpen(true)}
          />
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © {new Date().getFullYear()} Oil India Limited • Health, Safety, Security & Environment (HSSE)
          </span>
          <span className="text-[11px] text-slate-400">
            AI Precursor Intelligence Engine v1.0 • SAP EHS & Enablon Specification
          </span>
        </div>
      </footer>

      {/* REPORT MODAL */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSuccess={handleIncidentCreated}
      />

      {/* NOTIFICATION TOAST */}
      <Toast
        toast={toast}
        onClose={() => setToast(null)}
      />

    </div>
  );
}
