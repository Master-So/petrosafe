import React from 'react';
import IncidentRow from './IncidentRow';

export default function IncidentTable({
  incidents = [],
  loading = false,
}) {
  return (
    <div className="w-full">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-100 text-[9px] font-bold uppercase tracking-widest text-gray-400">
            <th className="px-2 py-3 w-32">INCIDENT ID</th>
            <th className="px-2 py-3 w-40">TIMESTAMP</th>
            <th className="px-2 py-3 min-w-[300px]">DESCRIPTION</th>
            <th className="px-2 py-3">LOCATION</th>
            <th className="px-2 py-3 w-32">SEVERITY</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading && incidents.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-2 py-12 text-center text-[10px] font-bold text-gray-400 tracking-widest">
                LOADING INCIDENT RECORDS...
              </td>
            </tr>
          ) : incidents.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-2 py-12 text-center text-[10px] font-bold text-gray-400 tracking-widest">
                NO INCIDENTS FOUND
              </td>
            </tr>
          ) : (
            incidents.map((incident) => (
              <IncidentRow key={incident.id} incident={incident} />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
