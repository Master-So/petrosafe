import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Droplet } from 'lucide-react'; // Oil related logo
import { checkHealth } from '../services/api';

export default function Sidebar() {
  const location = useLocation();
  const [systemStatus, setSystemStatus] = React.useState({
    backend: 'checking',
    ai: 'checking',
    db: 'checking'
  });

  React.useEffect(() => {
    checkHealth().then(res => {
      if (res.status === 'ok') setSystemStatus(prev => ({ ...prev, backend: 'ok', db: 'ok', ai: 'ok' }));
    }).catch(() => {
      setSystemStatus(prev => ({ ...prev, backend: 'down', db: 'down', ai: 'down' }));
    });
  }, []);

  const navItems = [
    { to: '/', label: 'Dashboard' },
    { to: '/report/new', label: 'Reports' },
    { to: '/analytics', label: 'Analytics' },
    // Removed Settings options
  ];

  const isBackendUp = systemStatus.backend === 'ok';
  const isAiUp = systemStatus.ai === 'ok';
  const isDbUp = systemStatus.db === 'ok';

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 overflow-y-auto">
      {/* Logo */}
      <div className="p-6 flex items-center space-x-3 border-b border-gray-200">
        <div className="w-8 h-8 rounded bg-gray-900 flex items-center justify-center">
          <Droplet className="w-5 h-5 text-yellow-500" fill="currentColor" />
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-sm font-black text-gray-900 tracking-tight leading-none uppercase">PETROSAFE</span>
          <span className="text-[9px] font-bold text-yellow-600 tracking-widest uppercase">AI COMMAND CENTER</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className={`block px-4 py-2 rounded text-sm font-semibold transition-colors ${
              location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to))
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom Section (Telemetry) */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">System Status</div>
        <div className="flex flex-col space-y-2 text-[10px] font-bold uppercase tracking-wider">
          <TelemetryStatus label="AI ENGINE" isUp={isAiUp} />
          <TelemetryStatus label="INGEST API" isUp={isBackendUp} />
          <TelemetryStatus label="DATABASE" isUp={isDbUp} />
        </div>
        {/* Profile and notification logos removed */}
      </div>
    </aside>
  );
}

function TelemetryStatus({ label, isUp }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className={`w-1.5 h-1.5 rounded-full ${isUp ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-gray-500">{label}</span>
      </div>
      <span className={isUp ? 'text-green-500' : 'text-red-500'}>{isUp ? 'OK' : 'ERR'}</span>
    </div>
  );
}
