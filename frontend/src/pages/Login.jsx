import React, { useState } from 'react';
import { School, User, Lock, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../utils/api';

export default function Login({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('admin'); // 'admin' or 'parent'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [schoolName, setSchoolName] = useState('New Millennium School');

  React.useEffect(() => {
    async function fetchName() {
      try {
        const info = await api.auth.getPublicSchoolInfo();
        if (info && info.name) {
          setSchoolName(info.name);
        }
      } catch (err) {
        console.error('Failed to load public school name:', err);
      }
    }
    fetchName();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setLoading(true);

    try {
      let loggedUser;
      if (activeTab === 'admin') {
        loggedUser = await api.auth.loginAdmin(username, password);
      } else {
        loggedUser = await api.auth.loginParent(username, password);
      }
      onLoginSuccess(loggedUser);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    setUsername('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px]" />

      <div className="w-full max-w-md z-10">
        {/* School Branding */}
        <div className="flex flex-col items-center mb-8 text-center animate-fade-in">
          <div className="p-4 bg-emerald-500 rounded-3xl text-slate-950 mb-3 shadow-xl shadow-emerald-500/20">
            <School size={40} />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">{schoolName}</h1>
          <p className="text-slate-400 mt-1.5 text-sm font-medium">School Management Hub</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/85 backdrop-blur-md rounded-3xl border border-slate-800 p-8 shadow-2xl animate-fade-in">
          {/* Tab Selector */}
          <div className="flex bg-slate-950 p-1.5 rounded-2xl mb-8 border border-slate-850">
            <button
              onClick={() => handleTabChange('admin')}
              className={`
                flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200
                ${activeTab === 'admin' 
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' 
                  : 'text-slate-400 hover:text-slate-200'}
              `}
            >
              Admin Portal
            </button>
            <button
              onClick={() => handleTabChange('parent')}
              className={`
                flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200
                ${activeTab === 'parent' 
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' 
                  : 'text-slate-400 hover:text-slate-200'}
              `}
            >
              Parent Portal
            </button>
          </div>

          <h2 className="text-xl font-bold text-white mb-6">
            Sign In As {activeTab === 'admin' ? 'Administrator' : 'Parent'}
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-rose-950/40 border border-rose-800 rounded-2xl flex items-start gap-3 text-rose-300 text-sm animate-fade-in">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username/Email Input */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  placeholder={activeTab === 'admin' ? 'Enter admin username' : 'Enter parent username/email'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 text-slate-950 font-bold py-4 rounded-2xl hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-emerald-500/10 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Access Portal</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
