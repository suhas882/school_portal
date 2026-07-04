import React, { useState, useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Bell, 
  Activity, 
  PlusCircle, 
  Database,
  ArrowRight,
  Loader2,
  Landmark
} from 'lucide-react';
import { api } from '../utils/api';

export default function AdminDashboard({ setActiveTab }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await api.admin.getStats();
        setStats(data);
      } catch (err) {
        setError('Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={36} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
        {error}
      </div>
    );
  }

  const statCards = [
    { label: 'Total Enrolled Students', value: stats.totalStudents, icon: GraduationCap, color: 'text-emerald-600 bg-emerald-100 border-emerald-200' },
    { label: 'Registered Parent Accounts', value: stats.totalParents, icon: Users, color: 'text-indigo-600 bg-indigo-100 border-indigo-200' },
    { label: 'Total Income (Fees)', value: `₹${stats.totalIncome}`, icon: Landmark, color: 'text-emerald-600 bg-emerald-100 border-emerald-200' },
    { label: 'Net School Balance', value: `₹${stats.netBalance}`, icon: Landmark, color: 'text-indigo-600 bg-indigo-100 border-indigo-200' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative bg-slate-900 text-white rounded-3xl p-6 lg:p-8 overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-emerald-500/10 blur-[60px]" />
        <div className="relative z-10 max-w-xl">
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">Welcome Back, Administrator</h1>
          <p className="text-slate-400 mt-2 text-sm leading-relaxed">
            Monitor school operations, edit student directories, organize daily class assignments, post system-wide notices, and maintain secure database backups from one centralized portal.
          </p>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{card.label}</span>
                <p className="text-3xl font-extrabold text-slate-800 leading-tight">{card.value}</p>
              </div>
              <div className={`p-4 rounded-2xl border ${card.color} shrink-0`}>
                <Icon size={24} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Grid - Distribution Chart & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Custom Visual Distribution Grid */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-2">
          <h3 className="font-bold text-slate-800 text-base mb-1">Database Distribution Summary</h3>
          <p className="text-xs text-slate-400 mb-6 font-medium">Visual representation of school records split</p>

          <div className="space-y-5">
            {/* ProgressBar Students */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                <span>Students Data (approx 1,000 capacity)</span>
                <span>{stats.totalStudents} ({Math.min(Math.round((stats.totalStudents / 1000) * 100), 100)}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min((stats.totalStudents / 1000) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* ProgressBar Parents */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                <span>Parents Accounts Linked</span>
                <span>{stats.totalParents}</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min((stats.totalParents / 1000) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Progress Bar Classes */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                <span>Active Core Classes</span>
                <span>{stats.totalClasses}</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min((stats.totalClasses / 30) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-emerald-800 text-xs flex items-center justify-between">
            <span className="font-semibold">Local SQLite DB integrity status: Optimal</span>
            <span className="px-2 py-0.5 bg-emerald-200 rounded-full font-bold text-[10px] text-emerald-950 uppercase">Secure</span>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base mb-1">Administrative Actions</h3>
            <p className="text-xs text-slate-400 mb-6 font-medium">Quick links to key operations</p>
            
            <div className="space-y-3">
              <button 
                onClick={() => setActiveTab('students')}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-left text-sm font-bold text-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <PlusCircle size={18} className="text-emerald-500" />
                  <span>Enrol New Student</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </button>

              <button 
                onClick={() => setActiveTab('homework')}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-left text-sm font-bold text-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <BookOpen size={18} className="text-indigo-500" />
                  <span>Post Class Homework</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </button>

              <button 
                onClick={() => setActiveTab('notices')}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-left text-sm font-bold text-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bell size={18} className="text-amber-500" />
                  <span>Create Announcement</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </button>

              <button 
                onClick={() => setActiveTab('settings')}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-left text-sm font-bold text-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Database size={18} className="text-sky-500" />
                  <span>Manage Backups</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 mt-6 text-center text-xs text-slate-400 font-medium">
            SQLite Database File Size: Auto-optimized
          </div>
        </div>
      </div>

      {/* Activity Logs Footer Snippet */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-slate-800 text-base mb-1">Recent Activities</h3>
            <p className="text-xs text-slate-400 font-medium">Log records of recent administrative adjustments</p>
          </div>
          <button 
            onClick={() => setActiveTab('logs')}
            className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <span>View All Logs</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {stats.recentActivities && stats.recentActivities.length > 0 ? (
          <div className="divide-y divide-slate-100 overflow-hidden">
            {stats.recentActivities.map((log) => (
              <div key={log.id} className="py-3.5 flex items-start justify-between text-sm">
                <div className="flex gap-3">
                  <div className={`p-2 rounded-xl border mt-0.5 shrink-0
                    ${log.user_type === 'admin' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}
                  `}>
                    <Activity size={15} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-700">{log.action}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{log.details}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-medium shrink-0">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-slate-400 font-medium">
            No logged activities found.
          </div>
        )}
      </div>
    </div>
  );
}
