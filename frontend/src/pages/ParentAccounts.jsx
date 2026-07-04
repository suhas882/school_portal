import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Key, 
  X, 
  Search, 
  Loader2, 
  CheckCircle,
  GraduationCap
} from 'lucide-react';
import { api } from '../utils/api';

export default function ParentAccounts() {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [editingParent, setEditingParent] = useState(null);
  const [resetTargetParent, setResetTargetParent] = useState(null);

  // Forms data
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: ''
  });
  const [newPassword, setNewPassword] = useState('');
  
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  async function fetchParents() {
    try {
      const data = await api.parents.list({ search });
      setParents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchParents();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const openCreateModal = () => {
    setEditingParent(null);
    setFormData({
      username: '',
      email: '',
      phone: '',
      password: ''
    });
    setMessage({ type: '', text: '' });
    setFormOpen(true);
  };

  const openEditModal = (parent) => {
    setEditingParent(parent);
    setFormData({
      username: parent.username,
      email: parent.email,
      phone: parent.phone || '',
      password: '' // empty password during edits
    });
    setMessage({ type: '', text: '' });
    setFormOpen(true);
  };

  const openResetModal = (parent) => {
    setResetTargetParent(parent);
    setNewPassword('parent123'); // secure default reset text
    setMessage({ type: '', text: '' });
    setResetOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.email.trim() || (!editingParent && !formData.password)) {
      setMessage({ type: 'error', text: 'Username, Email, and Password (for new accounts) are required' });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      if (editingParent) {
        await api.parents.update(editingParent.id, {
          username: formData.username,
          email: formData.email,
          phone: formData.phone
        });
        setMessage({ type: 'success', text: 'Parent account updated successfully' });
      } else {
        await api.parents.create(formData);
        setMessage({ type: 'success', text: 'Parent account created successfully' });
      }

      await fetchParents();
      setTimeout(() => setFormOpen(false), 1000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Action failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.length < 4) {
      setMessage({ type: 'error', text: 'Password must be at least 4 characters long' });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      await api.parents.resetPassword(resetTargetParent.id, newPassword);
      setMessage({ type: 'success', text: `Password reset successfully to: ${newPassword}` });
      setTimeout(() => setResetOpen(false), 1500);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Reset failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete parent account "${name}"? Linked student profiles will remain, but parent account link will be removed.`)) return;
    try {
      await api.parents.delete(id);
      await fetchParents();
    } catch (err) {
      alert(err.message || 'Failed to delete parent account');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Create Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Parent Accounts</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Configure access logs and parent credential lists</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-3 rounded-2xl flex items-center gap-2 text-sm shadow-lg shadow-emerald-500/10 active:scale-95 transition-all shrink-0"
        >
          <Plus size={18} />
          <span>Add Parent Account</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm max-w-md">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search by username, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 transition-all"
          />
        </div>
      </div>

      {/* Parents Directory List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="flex items-center justify-center col-span-2 py-20">
            <Loader2 size={36} className="animate-spin text-emerald-500" />
          </div>
        ) : parents.length > 0 ? (
          parents.map((parent) => (
            <div key={parent.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              
              {/* Profile Card Header */}
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex gap-3.5">
                    <div className="p-3 bg-emerald-100 border border-emerald-200 rounded-2xl text-emerald-700 mt-0.5">
                      <Users size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">{parent.username}</h3>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">{parent.email}</p>
                      {parent.phone && <p className="text-xs text-slate-400 font-medium mt-0.5">Phone: {parent.phone}</p>}
                    </div>
                  </div>
                  
                  {/* Account Actions */}
                  <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                    <button
                      onClick={() => openEditModal(parent)}
                      className="p-2 hover:bg-white text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                      title="Edit Parent"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => openResetModal(parent)}
                      className="p-2 hover:bg-white text-slate-400 hover:text-amber-600 rounded-lg transition-colors"
                      title="Reset Password"
                    >
                      <Key size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(parent.id, parent.username)}
                      className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      title="Delete Parent"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Linked Children List */}
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Linked Children</h4>
                  {parent.children && parent.children.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {parent.children.map((child) => (
                        <div key={child.id} className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-xl transition-colors">
                          <GraduationCap size={13} className="text-emerald-500" />
                          <span className="text-xs font-semibold text-slate-600">
                            {child.name} ({child.class_name}-{child.section_name})
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic font-medium">No children linked to this parent yet.</p>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 col-span-2 bg-white border border-slate-200 rounded-3xl">
            <p className="text-slate-400 font-semibold">No parent accounts found.</p>
            <p className="text-xs text-slate-350 mt-1">Create an account to connect parent portals.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingParent ? `Edit Parent: ${editingParent.username}` : 'Add Parent Account'}
              </h3>
              <button onClick={() => setFormOpen(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {message.text && (
                <div className={`p-4 border rounded-2xl flex items-start gap-2.5 text-xs font-semibold
                  ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}
                `}>
                  {message.type === 'success' && <CheckCircle size={16} className="shrink-0" />}
                  <span>{message.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. jdoe_parent"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. parent@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +1 555-0128"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              {!editingParent && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Initial Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 text-sm mt-6"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{editingParent ? 'Save Updates' : 'Add Parent Account'}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-fade-in">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Reset Parent Password</h3>
              <button onClick={() => setResetOpen(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              {message.text && (
                <div className={`p-4 border rounded-2xl flex items-start gap-2.5 text-xs font-semibold
                  ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}
                `}>
                  {message.type === 'success' && <CheckCircle size={16} className="shrink-0" />}
                  <span>{message.text}</span>
                </div>
              )}

              <p className="text-xs text-slate-400 font-medium">
                Set a new password access key for parent account: <strong className="text-slate-700">{resetTargetParent?.username}</strong>
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">New Password Key</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. parentPassword123"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3.5 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10 text-sm mt-6"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <span>Change Password</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
