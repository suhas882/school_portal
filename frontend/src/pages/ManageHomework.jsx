import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Loader2, 
  FileText, 
  X, 
  Calendar,
  CheckCircle,
  FileCheck
} from 'lucide-react';
import { api } from '../utils/api';

export default function ManageHomework() {
  const [homework, setHomework] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Form toggles
  const [formOpen, setFormOpen] = useState(false);
  const [editingHw, setEditingHw] = useState(null); // null for create mode
  const [loading, setLoading] = useState(true);

  // Filters for table view
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    class_id: '',
    section_id: '',
    subject_id: '',
    title: '',
    description: '',
    due_date: ''
  });
  const [selectedFiles, setSelectedFiles] = useState([]); // files array for uploading
  const [formSections, setFormSections] = useState([]);
  const [formSubjects, setFormSubjects] = useState([]);
  
  // Existing files when editing homework
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState([]); // IDs to delete on submit

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  async function loadData() {
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
    }
  }

  async function fetchHomework() {
    setLoading(true);
    try {
      const data = await api.homework.list({
        class_id: classFilter,
        section_id: sectionFilter
      });
      setHomework(data.homework);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    fetchHomework();
  }, [classFilter, sectionFilter]);

  // Form class dependency checks
  const handleClassChange = (classId) => {
    setFormData(prev => ({ ...prev, class_id: classId, section_id: '', subject_id: '' }));
    if (classId) {
      setFormSections(sections.filter(s => s.class_id === parseInt(classId)));
      setFormSubjects(subjects.filter(sub => sub.class_id === parseInt(classId)));
    } else {
      setFormSections([]);
      setFormSubjects([]);
    }
  };

  const openCreateMode = () => {
    setEditingHw(null);
    setFormData({
      class_id: '',
      section_id: '',
      subject_id: '',
      title: '',
      description: '',
      due_date: ''
    });
    setSelectedFiles([]);
    setFormSections([]);
    setFormSubjects([]);
    setExistingAttachments([]);
    setAttachmentsToDelete([]);
    setMessage({ type: '', text: '' });
    setFormOpen(true);
  };

  const openEditMode = (hw) => {
    setEditingHw(hw);
    setFormData({
      class_id: hw.class_id.toString(),
      section_id: hw.section_id.toString(),
      subject_id: hw.subject_id.toString(),
      title: hw.title,
      description: hw.description,
      due_date: hw.due_date
    });
    setSelectedFiles([]);
    
    // Populate class sections and subjects
    setFormSections(sections.filter(s => s.class_id === hw.class_id));
    setFormSubjects(subjects.filter(sub => sub.class_id === hw.class_id));
    
    setExistingAttachments(hw.attachments || []);
    setAttachmentsToDelete([]);
    setMessage({ type: '', text: '' });
    setFormOpen(true);
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray].slice(0, 5)); // cap at 5
    }
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== index));
  };

  const markAttachmentForDelete = (id) => {
    setAttachmentsToDelete(prev => [...prev, id]);
    setExistingAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.class_id || !formData.section_id || !formData.subject_id || !formData.title.trim() || !formData.description.trim() || !formData.due_date) {
      setMessage({ type: 'error', text: 'All fields are required' });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    // Construct FormData payload for file uploading
    const payload = new FormData();
    payload.append('class_id', formData.class_id);
    payload.append('section_id', formData.section_id);
    payload.append('subject_id', formData.subject_id);
    payload.append('title', formData.title.trim());
    payload.append('description', formData.description.trim());
    payload.append('due_date', formData.due_date);

    selectedFiles.forEach((file) => {
      payload.append('files', file);
    });

    try {
      if (editingHw) {
        // If editing, append deleted attachments list
        attachmentsToDelete.forEach((attId) => {
          payload.append('delete_attachments[]', attId);
        });

        await api.homework.update(editingHw.id, payload);
        setMessage({ type: 'success', text: 'Homework task updated successfully' });
      } else {
        await api.homework.create(payload);
        setMessage({ type: 'success', text: 'Homework task published successfully' });
      }

      await fetchHomework();
      setTimeout(() => setFormOpen(false), 1000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Operation failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete homework "${title}"? This removes files permanently.`)) return;
    try {
      await api.homework.delete(id);
      await fetchHomework();
    } catch (err) {
      alert(err.message || 'Failed to delete homework');
    }
  };

  const getAbsoluteFileUrl = (relativePath) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    return `${backendUrl}${relativePath}`;
  };

  return (
    <div className="space-y-6">
      {/* Header and Toggle Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Homework Hub</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Post, edit, and review academic assignments and files</p>
        </div>
        <button
          onClick={openCreateMode}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-3 rounded-2xl flex items-center gap-2 text-sm shadow-lg shadow-emerald-500/10 active:scale-95 transition-all shrink-0"
        >
          <Plus size={18} />
          <span>Upload Homework</span>
        </button>
      </div>

      {/* Filter Options */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
        <select
          value={classFilter}
          onChange={(e) => { setClassFilter(e.target.value); setSectionFilter(''); }}
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all text-slate-600 font-medium"
        >
          <option value="">Filter Class (All)</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={sectionFilter}
          disabled={!classFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all text-slate-600 font-medium disabled:opacity-50"
        >
          <option value="">Filter Section (All)</option>
          {sections.filter(s => s.class_id === parseInt(classFilter)).map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* History Grid */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={36} className="animate-spin text-emerald-500" />
          </div>
        ) : homework.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="px-6 py-4">Title / Subject</th>
                  <th className="px-6 py-4">Class</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4">Attachments</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-600 font-medium">
                {homework.map((hw) => (
                  <tr key={hw.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-100 rounded-xl text-indigo-700 mt-0.5 shrink-0">
                          <FileText size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{hw.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5 font-bold uppercase">{hw.subject_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                        {hw.class_name} - {hw.section_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <Calendar size={13} className="text-slate-400" />
                        <span>{hw.due_date}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {hw.attachments && hw.attachments.length > 0 ? (
                        <div className="space-y-1">
                          {hw.attachments.map((file) => (
                            <a
                              key={file.id}
                              href={getAbsoluteFileUrl(file.file_path)}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                            >
                              <Download size={12} />
                              <span className="truncate max-w-[120px]" title={file.file_name}>{file.file_name}</span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditMode(hw)}
                          className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                          title="Edit Task"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(hw.id, hw.title)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-slate-400 font-semibold">No homework history found.</p>
            <p className="text-xs text-slate-350 mt-1">Publish homework tasks for student classes.</p>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingHw ? `Edit Homework Task` : 'Publish Homework Task'}
              </h3>
              <button onClick={() => setFormOpen(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              {message.text && (
                <div className={`p-4 border rounded-2xl flex items-start gap-2.5 text-xs font-semibold
                  ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}
                `}>
                  {message.type === 'success' && <CheckCircle size={16} className="shrink-0" />}
                  <span>{message.text}</span>
                </div>
              )}

              {/* Class and Section selects */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Class</label>
                  <select
                    required
                    value={formData.class_id}
                    onChange={(e) => handleClassChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all font-medium text-slate-600"
                  >
                    <option value="">Select Class</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Section</label>
                  <select
                    required
                    disabled={!formData.class_id}
                    value={formData.section_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, section_id: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all font-medium text-slate-600 disabled:opacity-50"
                  >
                    <option value="">Select Section</option>
                    {formSections.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subject and Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Subject</label>
                  <select
                    required
                    disabled={!formData.class_id}
                    value={formData.subject_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject_id: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all font-medium text-slate-600 disabled:opacity-50"
                  >
                    <option value="">Select Subject</option>
                    {formSubjects.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Due Date</label>
                  <input
                    type="date"
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all font-medium text-slate-600"
                  />
                </div>
              </div>

              {/* Homework Title */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Homework Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Solve Algebra Practice Sheet"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Instructions / Description</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write clear instructions for students and parents..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Edit Mode: List existing files */}
              {editingHw && existingAttachments.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Existing Attachments</label>
                  <div className="space-y-2 border border-slate-100 rounded-2xl p-3 bg-slate-50/50">
                    {existingAttachments.map(att => (
                      <div key={att.id} className="flex justify-between items-center bg-white px-3 py-2 border border-slate-250 rounded-xl">
                        <span className="text-xs text-slate-600 truncate max-w-[200px]">{att.file_name}</span>
                        <button
                          type="button"
                          onClick={() => markAttachmentForDelete(att.id)}
                          className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Files */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Upload Files (Max 5, 5MB each)</label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-emerald-500 transition-colors relative cursor-pointer">
                  <input
                    type="file"
                    multiple
                    disabled={selectedFiles.length >= 5}
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <FileCheck size={24} className="mx-auto text-slate-400 mb-1" />
                  <p className="text-xs text-slate-500 font-semibold">Click or Drag files to attach</p>
                </div>

                {/* Selected Files List */}
                {selectedFiles.length > 0 && (
                  <div className="mt-3.5 space-y-2">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2">
                        <span className="text-xs font-semibold text-slate-650 truncate max-w-[240px]">{file.name}</span>
                        <button type="button" onClick={() => removeSelectedFile(idx)} className="text-slate-400 hover:text-rose-500 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
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
                  <span>{editingHw ? 'Save Homework Changes' : 'Publish Homework'}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
