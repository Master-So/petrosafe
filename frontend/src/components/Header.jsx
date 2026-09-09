import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, User, Bell } from 'lucide-react';

export default function Header({
  systemStatus,
  lastUpdated
}) {
  const location = useLocation();
  const isBackendUp = systemStatus.backend === 'ok';
  const isAiUp = systemStatus.ai === 'ok';
  const isDbUp = systemStatus.db === 'ok';

  const navItems = [
    { to: '/', label: 'Dashboard' },
    { to: '/report/new', label: 'Reports' },
    { to: '#', label: 'Analytics' },
    { to: '#', label: 'Settings' },
  ];

  const getRelativeTime = (isoString) => {
    if (!isoString) return 'WAITING...';
    const diffInSeconds = Math.floor((new Date() - new Date(isoString)) / 1000);
    if (diffInSeconds < 60) return `${diffInSeconds} SEC AGO`;
    return `${Math.floor(diffInSeconds / 60)} MIN AGO`;
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-red-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-sm font-black text-gray-900 tracking-tight leading-none uppercase">PETROSAFE</span>
              <span className="text-[9px] font-bold text-red-500 tracking-widest uppercase">AI COMMAND CENTER</span>
            </div>
          </div>

          {/* Center Navigation */}
          <nav className="hidden sm:flex items-center space-x-2">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className={`px-4 py-1.5 rounded text-sm font-semibold transition-colors ${
                  location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to))
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Section (Telemetry & Profile) */}
          <div className="flex items-center space-x-6">
            
            <div className="flex items-center text-[10px] font-bold text-gray-400 space-x-1.5 uppercase">
              <RefreshIcon className="w-3 h-3" />
              <span>SYNCED: {getRelativeTime(lastUpdated)}</span>
            </div>

            <div className="flex items-center space-x-3 text-[9px] font-bold uppercase tracking-wider">
              <TelemetryStatus label="AI ENGINE" isUp={isAiUp} />
              <TelemetryStatus label="INGEST API" isUp={isBackendUp} />
              <TelemetryStatus label="DATABASE" isUp={isDbUp} />
            </div>

            <div className="flex items-center space-x-3">
              <button className="text-gray-400 hover:text-gray-600">
                <Bell className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                <User className="w-5 h-5" />
              </div>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
}

function TelemetryStatus({ label, isUp }) {
  return (
    <div className="flex items-center space-x-1">
      <div className={`w-1.5 h-1.5 rounded-full ${isUp ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-gray-500">{label}</span>
      <span className={isUp ? 'text-green-500' : 'text-red-500'}>{isUp ? 'OK' : 'ERR'}</span>
    </div>
  );
}

function RefreshIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}
