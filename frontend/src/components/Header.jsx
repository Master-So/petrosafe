import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShieldAlert,
  Plus,
  RefreshCw,
  Server,
  Cpu,
  Database,
  LayoutDashboard,
  BarChart3,
  FileText,
} from 'lucide-react';

export default function Header({
  systemStatus,
  onRefresh,
  isRefreshing,
  lastUpdated
}) {
  const location = useLocation();
  const isBackendUp = systemStatus.backend === 'ok';
  const isAiUp = systemStatus.ai === 'ok';
  const isDbUp = systemStatus.db === 'ok';

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/report/new', label: 'New Report', icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-30">
      {/* Main header bar */}
      <div className="bg-[#151E2E]/90 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Brand */}
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <svg
                  className="w-5 h-5 text-white"
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
                <h1 className="text-sm font-bold text-white tracking-tight leading-none">
                  PetroSafe <span className="text-cyan-400">HSSE</span>
                </h1>
                <p className="text-[10px] text-slate-500 font-medium tracking-wide">
                  AI Command Center
                </p>
              </div>
            </div>

            {/* Center Navigation */}
            <nav className="hidden sm:flex items-center space-x-1">
              {navItems.map(({ to, label, icon: Icon }) => {
                const isActive = location.pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`
                      flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200
                      ${isActive
                        ? 'bg-cyan-500/10 text-cyan-400 shadow-sm shadow-cyan-500/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                      }
                    `}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center space-x-2">
              {/* Refresh */}
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Refresh dashboard data"
                className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-white/[0.04] rounded-lg transition-all border border-white/[0.06] disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
              </button>

              {/* New Report CTA */}
              <Link
                id="btn-report-incident"
                to="/report/new"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold text-xs text-white bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>New Report</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Animated gradient line */}
      <div className="gradient-line" />

      {/* Telemetry bar */}
      <div className="bg-[#0F1729]/80 backdrop-blur-sm border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between text-[11px] gap-2">

          {/* Status indicators */}
          <div className="flex items-center space-x-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
              Telemetry
            </span>

            {/* FastAPI */}
            <div className="flex items-center space-x-1.5" title="FastAPI AI (Port 8000)">
              <Cpu className="w-3 h-3 text-slate-500" />
              <span className="font-medium text-slate-400">AI</span>
              <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                isAiUp
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-amber-400 bg-amber-500/10'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isAiUp ? 'bg-emerald-400 pulse-dot' : 'bg-amber-400'}`} />
                <span>{isAiUp ? 'OK' : 'OFF'}</span>
              </span>
            </div>

            {/* Express */}
            <div className="flex items-center space-x-1.5" title="Express API (Port 4000)">
              <Server className="w-3 h-3 text-slate-500" />
              <span className="font-medium text-slate-400">API</span>
              <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                isBackendUp
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-rose-400 bg-rose-500/10'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isBackendUp ? 'bg-emerald-400 pulse-dot' : 'bg-rose-400 pulse-alert'}`} />
                <span>{isBackendUp ? 'OK' : 'DOWN'}</span>
              </span>
            </div>

            {/* PostgreSQL */}
            <div className="flex items-center space-x-1.5" title="PostgreSQL (Port 5432)">
              <Database className="w-3 h-3 text-slate-500" />
              <span className="font-medium text-slate-400">DB</span>
              <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                isDbUp
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-rose-400 bg-rose-500/10'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isDbUp ? 'bg-emerald-400 pulse-dot' : 'bg-rose-400'}`} />
                <span>{isDbUp ? 'OK' : 'DOWN'}</span>
              </span>
            </div>
          </div>

          {/* Timestamp */}
          <div className="text-[10px] text-slate-600 font-mono">
            {lastUpdated
              ? `Sync: ${new Date(lastUpdated).toLocaleTimeString()}`
              : 'Initializing…'}
          </div>
        </div>
      </div>
    </header>
  );
}
