import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import KpiCards from '../components/KpiCards';
import IncidentTable from '../components/IncidentTable';
import Toast from '../components/Toast';
import RiskLevelChart from '../components/charts/RiskLevelChart';
import LifeSavingRulesChart from '../components/charts/LifeSavingRulesChart';
import Location3DChart from '../components/charts/Location3DChart';
import { getIncidents, getAnalytics, checkHealth } from '../services/api';
import { AlertCircle, RefreshCw } from 'lucide-react';

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
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">

      <Header
        systemStatus={systemStatus}
        lastUpdated={lastUpdated}
      />

      {/* Toolbar / Legend strip matching reference */}
      <div className="bg-white border-b border-gray-200 py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-4 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
            <span>SEVERITY SCALING:</span>
            <div className="flex items-center space-x-1.5"><div className="w-1.5 h-1.5 bg-red-500 rounded-full"/><span>Critical</span></div>
            <div className="flex items-center space-x-1.5"><div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"/><span>High</span></div>
            <div className="flex items-center space-x-1.5"><div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"/><span>Medium</span></div>
            <div className="flex items-center space-x-1.5"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"/><span>Low</span></div>
            <div className="flex items-center space-x-1.5"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"/><span>Negligible</span></div>
          </div>
          {refreshing && (
            <div className="flex items-center text-[10px] text-gray-400 font-bold">
              <RefreshCw className="w-3 h-3 animate-spin mr-1" /> SYNCING
            </div>
          )}
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-3 rounded-md">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block text-sm">Connection Error</span>
              <p className="mt-0.5">{error}</p>
              <button
                onClick={() => fetchData(true)}
                className="mt-2 text-xs font-semibold underline hover:text-red-900 cursor-pointer"
              >
                Retry Connection
              </button>
            </div>
          </div>
        )}

        <KpiCards analytics={analytics || {}} incidents={incidents} />

        {/* Charts block */}
        <div className="border border-blue-400 border-dashed rounded-md p-4 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            <div className="md:px-4 py-4 md:py-0">
              <RiskLevelChart analytics={analytics || {}} />
            </div>
            <div className="md:px-4 py-4 md:py-0">
              <LifeSavingRulesChart analytics={analytics || {}} />
            </div>
            <div className="md:px-4 py-4 md:py-0">
              <Location3DChart analytics={analytics || {}} />
            </div>
          </div>
        </div>

        {/* INCIDENT TABLE */}
        <div className="bg-white border border-gray-200 rounded-md p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              RECENT COMMAND CENTER INCIDENT LOGS (AI & MANUAL DETECTION)
            </h2>
            <div className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-bold uppercase tracking-widest border border-gray-200">
              REAL-TIME EVENT FEED
            </div>
          </div>
          <IncidentTable
            incidents={incidents}
            loading={loading}
            onRefresh={() => fetchData(true)}
          />
        </div>

      </main>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
