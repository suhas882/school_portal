import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Layers, CheckCircle } from 'lucide-react';
import { api } from '../utils/api';

export default function ManageClasses() {
  const [activeSubTab, setActiveSubTab] = useState('classes'); // 'classes', 'sections', 'subjects'
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newClassName, setNewClassName] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [sectionClassId, setSectionClassId] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [subjectClassId, setSubjectClassId] = useState('');
  const [newDayFee, setNewDayFee] = useState('0');
  const [newHostelFee, setNewHostelFee] = useState('0');

  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [classesData, sectionsData, subjectsData] = await Promise.all([
        api.classes.list(),
        api.sections.list(),
        api.subjects.list()
      ]);
      setClasses(classesData);
      setSections(sectionsData);
      setSubjects(subjectsData);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to load school configs' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      await api.classes.create({
        name: newClassName.trim(),
        day_scholar_fee: parseFloat(newDayFee) || 0,
        hostel_student_fee: parseFloat(newHostelFee) || 0
      });
      setNewClassName('');
      setNewDayFee('0');
      setNewHostelFee('0');
      setMessage({ type: 'success', text: `Class '${newClassName}' created successfully` });
      await loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to create class' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    if (!newSectionName.trim() || !sectionClassId) return;

    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      await api.sections.create(newSectionName, parseInt(sectionClassId));
      setNewSectionName('');
      setMessage({ type: 'success', text: `Section '${newSectionName}' added successfully` });
      await loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to create section' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectName.trim() || !subjectClassId) return;

    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      await api.subjects.create(newSubjectName, parseInt(subjectClassId));
      setNewSubjectName('');
      setMessage({ type: 'success', text: `Subject '${newSubjectName}' created successfully` });
      await loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to create subject' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClass = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? All associated sections and subjects will be lost.`)) return;
    try {
      await api.classes.delete(id);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete class');
    }
  };

  const handleDeleteSection = async (id, name) => {
    if (!window.confirm(`Delete section "${name}"?`)) return;
    try {
      await api.sections.delete(id);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete section');
    }
  };

  const handleDeleteSubject = async (id, name) => {
    if (!window.confirm(`Delete subject "${name}"?`)) return;
    try {
      await api.subjects.delete(id);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete subject');
    }
  };

  if (loading && classes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={36} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Academic Structure</h1>
        <p className="text-xs text-slate-400 font-medium mt-0.5">Configure core classes, sections (divisions), and courses/subjects</p>
      </div>

      {/* Sub Tabs */}
      <div className="flex bg-white border border-slate-200 p-1.5 rounded-2xl w-full max-w-md shadow-sm">
        {['classes', 'sections', 'subjects'].map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveSubTab(tab); setMessage({ type: '', text: '' }); }}
            className={`
              flex-1 py-2.5 rounded-xl text-xs font-bold capitalize transition-all duration-200
              ${activeSubTab === tab 
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' 
                : 'text-slate-500 hover:text-slate-800'}
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {message.text && (
        <div className={`p-4 border rounded-2xl max-w-xl flex items-start gap-2.5 text-xs font-semibold
          ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}
        `}>
          {message.type === 'success' && <CheckCircle size={16} className="shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Render Active View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left side: Setup Form */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-fit">
          <h3 className="font-bold text-slate-800 text-sm mb-4">
            {activeSubTab === 'classes' && 'Add New Class'}
            {activeSubTab === 'sections' && 'Add Section to Class'}
            {activeSubTab === 'subjects' && 'Register New Subject'}
          </h3>

          {/* Classes Form */}
          {activeSubTab === 'classes' && (
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Class Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Class 10"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Day Scholar Tuition Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newDayFee}
                  onChange={(e) => setNewDayFee(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Hostel Student Tuition Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newHostelFee}
                  onChange={(e) => setNewHostelFee(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 text-xs shadow-md"
              >
                <Plus size={16} />
                <span>Save Class</span>
              </button>
            </form>
          )}

          {/* Sections Form */}
          {activeSubTab === 'sections' && (
            <form onSubmit={handleCreateSection} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Class</label>
                <select
                  required
                  value={sectionClassId}
                  onChange={(e) => setSectionClassId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all text-slate-600 font-medium"
                >
                  <option value="">Choose class...</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Section Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all uppercase"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 text-xs shadow-md"
              >
                <Plus size={16} />
                <span>Create Section</span>
              </button>
            </form>
          )}

          {/* Subjects Form */}
          {activeSubTab === 'subjects' && (
            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Class</label>
                <select
                  required
                  value={subjectClassId}
                  onChange={(e) => setSubjectClassId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all text-slate-600 font-medium"
                >
                  <option value="">Choose class...</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Subject Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 text-xs shadow-md"
              >
                <Plus size={16} />
                <span>Add Subject</span>
              </button>
            </form>
          )}
        </div>

        {/* Right side: List Directory */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-2">
          <h3 className="font-bold text-slate-800 text-sm mb-4">
            {activeSubTab === 'classes' && 'Class Directory'}
            {activeSubTab === 'sections' && 'Section Mappings'}
            {activeSubTab === 'subjects' && 'Subject Mappings'}
          </h3>

          {/* Classes Table */}
          {activeSubTab === 'classes' && (
            <div className="overflow-hidden border border-slate-100 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-5 py-3">Class Name</th>
                    <th className="px-5 py-3">Day Scholar Fee</th>
                    <th className="px-5 py-3">Hostel Student Fee</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-semibold">
                  {classes.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Layers size={14} className="text-emerald-500" />
                          <span className="font-bold text-slate-800">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-700">₹{c.day_scholar_fee}</td>
                      <td className="px-5 py-3 font-semibold text-slate-700">₹{c.hostel_student_fee}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleDeleteClass(c.id, c.name)}
                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sections Table */}
          {activeSubTab === 'sections' && (
            <div className="overflow-hidden border border-slate-100 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-5 py-3">Class</th>
                    <th className="px-5 py-3">Section Code</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-semibold">
                  {sections.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 text-slate-800 font-bold">{s.class_name}</td>
                      <td className="px-5 py-3">
                        <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-bold">
                          {s.name}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleDeleteSection(s.id, s.name)}
                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Subjects Table */}
          {activeSubTab === 'subjects' && (
            <div className="overflow-hidden border border-slate-100 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-5 py-3">Class</th>
                    <th className="px-5 py-3">Subject Name</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-semibold">
                  {subjects.map(sub => (
                    <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 text-slate-800 font-bold">{sub.class_name}</td>
                      <td className="px-5 py-3 font-semibold text-slate-600">{sub.name}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleDeleteSubject(sub.id, sub.name)}
                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
