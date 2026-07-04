import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Key, 
  School, 
  Database, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Loader2, 
  CheckCircle,
  FileCheck,
  Calendar
} from 'lucide-react';
import { api } from '../utils/api';

export default function SettingsPage({ user, onSchoolNameUpdate }) {
  const isAdmin = user.role === 'admin';

  // Sub tab: 'profile' (change pass), 'school' (school info), 'backups' (db)
  const [activeSection, setActiveSection] = useState('profile');

  // Change password form
  const [passData, setPassData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  
  // School Info form
  const [schoolInfo, setSchoolInfo] = useState({ name: '', address: '', phone: '', email: '' });
  
  // Backups list
  const [backups, setBackups] = useState([]);

  // States
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  async function loadSchoolInfo() {
    if (!isAdmin) return;
    try {
      const data = await api.admin.getSchoolInfo();
      if (data) {
        setSchoolInfo({
          name: data.name || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || ''
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchBackups() {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await api.system.listBackups();
      setBackups(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadSchoolInfo();
      fetchBackups();
    }
  }, [user]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!passData.currentPassword || !passData.newPassword || !passData.confirmPassword) {
      setMessage({ type: 'error', text: 'All password fields are required' });
      return;
    }
    if (passData.newPassword !== passData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (passData.newPassword.length < 4) {
      setMessage({ type: 'error', text: 'Password must be at least 4 characters long' });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      await api.auth.changePassword(passData.currentPassword, passData.newPassword);
      setMessage({ type: 'success', text: 'Password changed successfully' });
      setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSchoolInfoUpdate = async (e) => {
    e.preventDefault();
    if (!schoolInfo.name.trim()) return;

    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      await api.admin.updateSchoolInfo(schoolInfo);
      setMessage({ type: 'success', text: 'School metadata updated successfully' });
      onSchoolNameUpdate(schoolInfo.name.trim()); // update parent app state
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update school details' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBackup = async () => {
    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      const data = await api.system.createBackup();
      setMessage({ type: 'success', text: `Backup created: ${data.filename}` });
      await fetchBackups();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Backup failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestoreBackup = async (filename) => {
    const confirmation = window.confirm(`RESTORE WARNING: Overwrite active database with ${filename}? Connection will temporarily cycle.`);
    if (!confirmation) return;

    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      await api.system.restoreBackup(filename);
      setMessage({ type: 'success', text: `Database restored to: ${filename}` });
      if (isAdmin) {
        await loadSchoolInfo();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Restore failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBackup = async (filename) => {
    if (!window.confirm(`Delete backup file ${filename}? This is irreversible.`)) return;

    try {
      await api.system.deleteBackup(filename);
      await fetchBackups();
    } catch (err) {
      alert(err.message || 'Failed to delete backup file');
    }
  };

  const getReadableSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">System Configuration</h1>
        <p className="text-xs text-slate-400 font-medium mt-0.5">Maintain security keys, update metadata settings, and manage database snapshots</p>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Side Links */}
        <div className="space-y-2 lg:col-span-1">
          <button
            onClick={() => { setActiveSection('profile'); setMessage({ type: '', text: '' }); }}
            className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition-colors
              ${activeSection === 'profile' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-500 hover:bg-slate-100'}
            `}
          >
            <Key size={16} />
            <span>Profile & Security</span>
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => { setActiveSection('school'); setMessage({ type: '', text: '' }); }}
                className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition-colors
                  ${activeSection === 'school' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-500 hover:bg-slate-100'}
                `}
              >
                <School size={16} />
                <span>School Profile</span>
              </button>

              <button
                onClick={() => { setActiveSection('backups'); setMessage({ type: '', text: '' }); }}
                className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition-colors
                  ${activeSection === 'backups' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-500 hover:bg-slate-100'}
                `}
              >
                <Database size={16} />
                <span>Database Backups</span>
              </button>
            </>
          )}
        </div>

        {/* Right Side Settings Panel */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-3 space-y-6">
          {message.text && (
            <div className={`p-4 border rounded-2xl flex items-start gap-2.5 text-xs font-semibold
              ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}
            `}>
              {message.type === 'success' && <CheckCircle size={16} className="shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Profile Passwords Form */}
          {activeSection === 'profile' && (
            <div>
              <h3 className="font-bold text-slate-800 text-sm mb-1.5">Change Account Password</h3>
              <p className="text-xs text-slate-400 mb-6 font-medium">Update credential keys used to access this {user.role} account</p>

              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Current Access Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passData.currentPassword}
                    onChange={(e) => setPassData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">New Access Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passData.newPassword}
                    onChange={(e) => setPassData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passData.confirmPassword}
                    onChange={(e) => setPassData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 text-xs shadow-md"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                  <span>Change Password</span>
                </button>
              </form>
            </div>
          )}

          {/* School Profile Settings */}
          {activeSection === 'school' && isAdmin && (
            <div>
              <h3 className="font-bold text-slate-800 text-sm mb-1.5">School Metadata Profile</h3>
              <p className="text-xs text-slate-400 mb-6 font-medium">Configure school names, address directories, and office headers</p>

              <form onSubmit={handleSchoolInfoUpdate} className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Official School Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Greenwood Academy"
                    value={schoolInfo.name}
                    onChange={(e) => setSchoolInfo(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">School Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 123 Education Lane"
                    value={schoolInfo.address}
                    onChange={(e) => setSchoolInfo(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Office Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. 555-0199"
                      value={schoolInfo.phone}
                      onChange={(e) => setSchoolInfo(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Office Email</label>
                    <input
                      type="email"
                      placeholder="e.g. info@school.com"
                      value={schoolInfo.email}
                      onChange={(e) => setSchoolInfo(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 text-xs shadow-md"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <School size={14} />}
                  <span>Save School Details</span>
                </button>
              </form>
            </div>
          )}

          {/* Database Backup & Restore */}
          {activeSection === 'backups' && isAdmin && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm mb-1">SQLite Snapshots</h3>
                  <p className="text-xs text-slate-400 font-medium">Backup active database records to secure local snapshots</p>
                </div>
                <button
                  onClick={handleCreateBackup}
                  disabled={submitting}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-3 rounded-2xl flex items-center gap-2 text-xs shadow-md active:scale-95 transition-all shrink-0"
                >
                  <Plus size={14} />
                  <span>Create DB Backup</span>
                </button>
              </div>

              {/* Backups List */}
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={24} className="animate-spin text-emerald-500" />
                </div>
              ) : backups.length > 0 ? (
                <div className="space-y-3.5">
                  {backups.map((backup) => (
                    <div key={backup.filename} className="bg-slate-50 border border-slate-200 rounded-3xl p-5 flex items-center justify-between hover:shadow-sm transition-shadow">
                      <div className="flex gap-3">
                        <div className="p-2 bg-emerald-100 border border-emerald-200 rounded-xl text-emerald-700 mt-0.5 shrink-0 h-fit">
                          <FileCheck size={18} />
                        </div>
                        <div>
                          <p className="font-mono text-xs font-bold text-slate-700 truncate max-w-[200px]" title={backup.filename}>
                            {backup.filename}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 font-semibold">
                            <span>Size: {getReadableSize(backup.size)}</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            <div className="flex items-center gap-1">
                              <Calendar size={11} />
                              <span>{new Date(backup.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Backup Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRestoreBackup(backup.filename)}
                          disabled={submitting}
                          className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-xl flex items-center gap-1 text-[11px] font-bold shadow-sm transition-colors active:scale-95 disabled:opacity-50"
                          title="Restore this state"
                        >
                          <RotateCcw size={12} />
                          <span>Restore</span>
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(backup.filename)}
                          className="p-2 border border-rose-100 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors active:scale-95"
                          title="Delete file"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50 border border-slate-200 border-dashed rounded-3xl">
                  <Database size={24} className="mx-auto text-slate-350 mb-1" />
                  <p className="text-xs text-slate-400 font-semibold">No backup snapshots present.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
