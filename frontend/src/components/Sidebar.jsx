import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Droplet, 
  ChevronLeft, 
  ChevronRight, 
  LayoutDashboard, 
  FileText, 
  BarChart2, 
  AlertTriangle,
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { checkHealth, getIncidents } from '../services/api';

export default function Sidebar({ isCollapsed, setIsCollapsed }) {
  const location = useLocation();
  const [systemStatus, setSystemStatus] = useState({
    backend: 'checking',
    ai: 'checking',
    db: 'checking'
  });
  const [incidents, setIncidents] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    checkHealth().then(res => {
      if (res.status === 'ok') setSystemStatus(prev => ({ ...prev, backend: 'ok', db: 'ok', ai: 'ok' }));
    }).catch(() => {
      setSystemStatus(prev => ({ ...prev, backend: 'down', db: 'down', ai: 'down' }));
    });

    getIncidents().then(data => {
      if (Array.isArray(data)) {
        setIncidents(data);
      }
    }).catch(err => console.error("Failed to fetch incidents for sidebar", err));

    const interval = setInterval(() => {
      getIncidents().then(data => {
        if (Array.isArray(data)) setIncidents(data);
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/report/new', label: 'Reports', icon: FileText },
    { to: '/analytics', label: 'Analytics', icon: BarChart2 },
  ];

  const isBackendUp = systemStatus.backend === 'ok';
  const isAiUp = systemStatus.ai === 'ok';
  const isDbUp = systemStatus.db === 'ok';

  const getSeverityColor = (score, risk) => {
    if (score >= 7 || risk === 'SIF-HIGH') return 'text-red-500 bg-red-50';
    if (score >= 5) return 'text-orange-500 bg-orange-50';
    if (score >= 3) return 'text-yellow-600 bg-yellow-50';
    if (score >= 1) return 'text-blue-500 bg-blue-50';
    return 'text-green-500 bg-green-50';
  };

  const getSeverityLabel = (score, risk) => {
    if (score >= 7 || risk === 'SIF-HIGH') return 'CRITICAL';
    if (score >= 5) return 'HIGH';
    if (score >= 3) return 'MEDIUM';
    if (score >= 1) return 'LOW';
    return risk || 'NEGLIGIBLE';
  };

  return (
    <aside className={`bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 transition-all duration-300 z-50 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      
      {/* Header / Logo */}
      <div className={`p-4 flex items-center border-b border-gray-200 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-8 h-8 flex-shrink-0 rounded bg-gray-900 flex items-center justify-center">
            <Droplet className="w-5 h-5 text-yellow-500" fill="currentColor" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col justify-center whitespace-nowrap">
              <span className="text-sm font-black text-gray-900 tracking-tight leading-none uppercase">PETROSAFE</span>
              <span className="text-[9px] font-bold text-yellow-600 tracking-widest uppercase">AI COMMAND</span>
            </div>
          )}
        </div>
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-1 rounded hover:bg-gray-100 text-gray-500 ${isCollapsed ? 'absolute -right-3 bg-white border border-gray-200 shadow-sm rounded-full' : ''}`}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.label}
              to={item.to}
              title={isCollapsed ? item.label : ""}
              className={`flex items-center space-x-3 px-3 py-2 rounded text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              } ${isCollapsed ? 'justify-center' : ''}`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Incident History Accordion */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <button
          onClick={() => {
            if (isCollapsed) setIsCollapsed(false);
            setIsHistoryOpen(!isHistoryOpen);
          }}
          title={isCollapsed ? "Incident History" : ""}
          className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm font-semibold transition-colors text-gray-500 hover:bg-gray-50 hover:text-gray-900 ${isCollapsed ? 'justify-center' : ''}`}
        >
          <div className="flex items-center space-x-3">
            <History className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>Recent History</span>}
          </div>
          {!isCollapsed && (
            isHistoryOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {/* Accordion Content */}
        {!isCollapsed && isHistoryOpen && (
          <div className="mt-2 ml-4 pl-3 border-l border-gray-200 space-y-2">
            {incidents.length === 0 ? (
              <div className="text-[10px] text-gray-400 py-2">No history</div>
            ) : (
              incidents.map(incident => {
                const score = incident.sif_precursor_density_score || 0;
                const risk = incident.local_risk_level;
                const label = getSeverityLabel(score, risk);
                const colorClass = getSeverityColor(score, risk);
                const displayId = `INC-${incident.id.substring(0,4).toUpperCase()}`;

                return (
                  <div key={incident.id} className="flex justify-between items-center py-1.5 pr-2 text-xs hover:bg-gray-50 rounded cursor-pointer">
                    <span className="font-semibold text-gray-600 hover:text-gray-900">{displayId}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider ${colorClass}`}>
                      {label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Bottom Section (Telemetry) */}
      <div className={`p-4 border-t border-gray-200 ${isCollapsed ? 'hidden' : 'space-y-3'}`}>
        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">System Status</div>
        <div className="flex flex-col space-y-2 text-[10px] font-bold uppercase tracking-wider">
          <TelemetryStatus label="AI ENGINE" isUp={isAiUp} />
          <TelemetryStatus label="INGEST API" isUp={isBackendUp} />
          <TelemetryStatus label="DATABASE" isUp={isDbUp} />
        </div>
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
