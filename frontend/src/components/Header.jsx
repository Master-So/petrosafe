import React from 'react';
import { 
  ShieldAlert, 
  Plus, 
  RefreshCw, 
  Server, 
  Cpu, 
  Database, 
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function Header({ 
  systemStatus, 
  onRefresh, 
  isRefreshing, 
  onOpenReportModal,
  lastUpdated 
}) {
  const isBackendUp = systemStatus.backend === 'ok';
  const isAiUp = systemStatus.ai === 'ok';
  const isDbUp = systemStatus.db === 'ok';

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
      {/* Top corporate bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand & Emblem */}
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-lg bg-[#0B4F6C] flex items-center justify-center shadow-sm text-white flex-shrink-0">
              {/* Industrial safety flame/oil droplet logo */}
              <svg 
                className="w-7 h-7" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
              </svg>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xs tracking-wider uppercase text-[#0B4F6C] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  Oil India Limited
                </span>
                <span className="text-xs text-slate-400 font-medium">HSSE Division</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-[#0F172A] tracking-tight leading-snug">
                HSSE Incident Intelligence & SIF Precursor Command Center
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                Real-time field safety surveillance • Automated AI precursor scoring • Life-Saving Rules compliance
              </p>
            </div>
          </div>

          {/* Right Action & Status Area */}
          <div className="flex items-center space-x-3">
            
            {/* Refresh button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh dashboard data"
              className="p-2 text-slate-500 hover:text-[#0F172A] hover:bg-slate-100 rounded-md transition-colors border border-slate-200 text-sm flex items-center space-x-1 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#0B4F6C]' : ''}`} />
              <span className="hidden md:inline text-xs font-medium text-slate-600">
                {isRefreshing ? 'Syncing...' : 'Sync'}
              </span>
            </button>

            {/* Primary CTA: Report New Incident */}
            <button
              id="btn-report-incident"
              onClick={onOpenReportModal}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-md font-semibold text-sm text-white bg-[#0B4F6C] hover:bg-[#093f56] transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/40 cursor-pointer"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              <span>Report New Incident</span>
            </button>
          </div>

        </div>

        {/* Sub-header System Telemetry Bar */}
        <div className="py-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
          
          {/* Status indicators */}
          <div className="flex items-center space-x-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              System Telemetry:
            </span>

            {/* FastAPI Microservice */}
            <div className="flex items-center space-x-1.5" title="Local Classifier + Gemini Enrichment (Port 8000)">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium text-slate-700">FastAPI AI (:8000):</span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border ${
                isAiUp 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isAiUp ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                {isAiUp ? 'Connected' : 'Offline'}
              </span>
            </div>

            {/* Express Server */}
            <div className="flex items-center space-x-1.5" title="Node Express API Server (Port 4000)">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium text-slate-700">Express API (:4000):</span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border ${
                isBackendUp 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isBackendUp ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                {isBackendUp ? 'Connected' : 'Down'}
              </span>
            </div>

            {/* PostgreSQL DB */}
            <div className="flex items-center space-x-1.5" title="PostgreSQL Schema: petrosafe (Port 5432)">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium text-slate-700">PostgreSQL (:5432):</span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border ${
                isDbUp 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isDbUp ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                {isDbUp ? 'Active' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Timestamp */}
          <div className="text-[11px] text-slate-400">
            {lastUpdated ? `Last Telemetry Sync: ${new Date(lastUpdated).toLocaleTimeString()}` : 'Initializing...'}
          </div>

        </div>
      </div>
    </header>
  );
}
