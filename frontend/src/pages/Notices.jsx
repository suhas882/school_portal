import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader2, Bell, X, CheckCircle } from 'lucide-react';
import { api } from '../utils/api';

export default function Notices() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal toggle & states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    audience: 'all'
  });

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  async function fetchNotices() {
    setLoading(true);
    try {
      const data = await api.notices.list();
      setNotices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotices();
  }, []);

  const openCreateModal = () => {
    setEditingNotice(null);
    setFormData({
      title: '',
      content: '',
      audience: 'all'
    });
    setMessage({ type: '', text: '' });
    setModalOpen(true);
  };

  const openEditModal = (notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      content: notice.content,
      audience: notice.audience
    });
    setMessage({ type: '', text: '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim() || !formData.audience) {
      setMessage({ type: 'error', text: 'All fields are required' });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      if (editingNotice) {
        await api.notices.update(editingNotice.id, formData);
        setMessage({ type: 'success', text: 'Notice updated successfully' });
      } else {
        await api.notices.create(formData);
        setMessage({ type: 'success', text: 'Notice published successfully' });
      }

      await fetchNotices();
      setTimeout(() => setModalOpen(false), 1000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Operation failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete notice "${title}"?`)) return;
    try {
      await api.notices.delete(id);
      await fetchNotices();
    } catch (err) {
      alert(err.message || 'Failed to delete notice');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Notice Board</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Publish alerts, circulars, and system-wide school notices</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-3 rounded-2xl flex items-center gap-2 text-sm shadow-lg shadow-emerald-500/10 active:scale-95 transition-all shrink-0"
        >
          <Plus size={18} />
          <span>Publish Notice</span>
        </button>
      </div>

      {/* Notices Board */}
      <div className="space-y-4 max-w-3xl">
        {loading ? (
          <div className="flex items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl">
            <Loader2 size={36} className="animate-spin text-emerald-500" />
          </div>
        ) : notices.length > 0 ? (
          notices.map((notice) => (
            <div key={notice.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative group">
              <div>
                <div className="flex justify-between items-start gap-4 mb-2">
                  <div className="flex gap-3">
                    <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 mt-0.5 shrink-0">
                      <Bell size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-base">{notice.title}</h4>
                      <div className="flex items-center gap-2.5 mt-1">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border
                          ${notice.audience === 'all' && 'bg-slate-100 border-slate-200 text-slate-650'}
                          ${notice.audience === 'parents' && 'bg-indigo-50 border-indigo-100 text-indigo-750'}
                          ${notice.audience === 'admins' && 'bg-amber-50 border-amber-100 text-amber-750'}
                        `}>
                          Audience: {notice.audience}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {new Date(notice.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions (visible on hover/active) */}
                  <div className="flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-slate-50 p-1 border border-slate-200 rounded-xl">
                    <button
                      onClick={() => openEditModal(notice)}
                      className="p-1.5 hover:bg-white text-slate-400 hover:text-indigo-600 rounded-md transition-colors"
                      title="Edit notice"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(notice.id, notice.title)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                      title="Delete notice"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <p className="text-slate-600 text-xs leading-relaxed mt-4 whitespace-pre-line font-medium">
                  {notice.content}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm">
            <Bell size={30} className="mx-auto text-slate-350 mb-2" />
            <p className="text-slate-400 font-semibold">No notices published yet.</p>
            <p className="text-xs text-slate-300 mt-0.5">Alerts posted here will appear on parent portals.</p>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingNotice ? `Edit Notice Details` : 'Publish Notice Announcement'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {message.text && (
                <div className={`p-4 border rounded-2xl flex items-start gap-2.5 text-xs font-semibold
                  ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}
                `}>
                  {message.type === 'success' && <CheckCircle size={16} className="shrink-0" />}
                  <span>{message.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notice Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Sports Meet Schedule"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Announce To (Audience)</label>
                <select
                  required
                  value={formData.audience}
                  onChange={(e) => setFormData(prev => ({ ...prev, audience: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all text-slate-650 font-medium"
                >
                  <option value="all">Everyone (All Portals)</option>
                  <option value="parents">Parents Only</option>
                  <option value="admins">Administrators Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Announcement Message</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Write message circular details here..."
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 text-sm mt-6"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <span>{editingNotice ? 'Save Notice' : 'Announce & Publish'}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
