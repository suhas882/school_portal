import React, { useState, useEffect } from 'react';
import { Search, History, Loader2, RefreshCw } from 'lucide-react';
import { api } from '../utils/api';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  async function loadLogs() {
    setLoading(true);
    try {
      const data = await api.admin.getActivityLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      log.action.toLowerCase().includes(term) ||
      (log.details && log.details.toLowerCase().includes(term)) ||
      log.user_type.toLowerCase().includes(term) ||
      log.user_id.toString().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">System Audit Logs</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Read-only chronicle of logins, updates, and database actions</p>
        </div>
        <button
          onClick={loadLogs}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-3 rounded-2xl flex items-center gap-2 text-xs shadow-sm active:scale-95 transition-all shrink-0"
        >
          <RefreshCw size={14} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter and Table */}
      <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm max-w-md">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder="Search actions or logs details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 transition-all"
            />
          </div>
        </div>

        {/* Audit Logs Table Card */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={36} className="animate-spin text-emerald-500" />
            </div>
          ) : filteredLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Operator Role</th>
                    <th className="px-6 py-4">Action Type</th>
                    <th className="px-6 py-4">Details Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-semibold">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 border rounded-full font-bold text-[9px] uppercase tracking-wide
                          ${log.user_type === 'admin' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-indigo-50 border-indigo-100 text-indigo-700'}
                        `}>
                          {log.user_type} (ID: {log.user_id})
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-800 font-bold">{log.action}</td>
                      <td className="px-6 py-4 text-slate-500 max-w-xs sm:max-w-md truncate" title={log.details}>
                        {log.details || <span className="italic text-slate-350">No details</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-20">
              <History size={30} className="mx-auto text-slate-350 mb-2" />
              <p className="text-slate-400 font-semibold">No activity logs recorded yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
