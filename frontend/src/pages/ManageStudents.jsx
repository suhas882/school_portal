import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  CheckCircle,
  GraduationCap
} from 'lucide-react';
import { api } from '../utils/api';

export default function ManageStudents() {
  // Lists
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [parents, setParents] = useState([]);

  // Filters & State
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);

  // Form Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null); // null for create mode
  const [formData, setFormData] = useState({
    name: '',
    roll_number: '',
    class_id: '',
    section_id: '',
    parent_id: ''
  });
  const [formSections, setFormSections] = useState([]); // sections of selected class in form
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Initial data loading
  useEffect(() => {
    async function loadAcademicMeta() {
      try {
        const [classesData, sectionsData, parentsData] = await Promise.all([
          api.classes.list(),
          api.sections.list(),
          api.parents.list()
        ]);
        setClasses(classesData);
        setSections(sectionsData);
        setParents(parentsData);
      } catch (err) {
        console.error('Failed to load academic metadata:', err);
      }
    }
    loadAcademicMeta();
  }, []);

  // Fetch students on filter/page change
  useEffect(() => {
    async function fetchStudents() {
      setLoading(true);
      try {
        const data = await api.students.list({
          search,
          class_id: classFilter,
          section_id: sectionFilter,
          page,
          limit
        });
        setStudents(data.students);
        setTotal(data.total);
      } catch (err) {
        console.error('Failed to load students:', err);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      fetchStudents();
    }, 300); // debounce search input

    return () => clearTimeout(timer);
  }, [search, classFilter, sectionFilter, page]);

  // Handle class selection in forms
  const handleFormClassChange = (classId) => {
    setFormData(prev => ({ ...prev, class_id: classId, section_id: '' }));
    if (classId) {
      const filtered = sections.filter(s => s.class_id === parseInt(classId));
      setFormSections(filtered);
    } else {
      setFormSections([]);
    }
  };

  const openCreateModal = () => {
    setEditingStudent(null);
    setFormData({
      name: '',
      roll_number: '',
      class_id: '',
      section_id: '',
      parent_id: '',
      type: 'Day Scholar',
      concession: '0'
    });
    setFormSections([]);
    setMessage({ type: '', text: '' });
    setModalOpen(true);
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      roll_number: student.roll_number,
      class_id: student.class_id.toString(),
      section_id: student.section_id.toString(),
      parent_id: student.parent_id ? student.parent_id.toString() : '',
      type: student.type || 'Day Scholar',
      concession: student.concession !== undefined ? student.concession.toString() : '0'
    });
    
    // Set sections list matching student class
    const filtered = sections.filter(s => s.class_id === student.class_id);
    setFormSections(filtered);
    setMessage({ type: '', text: '' });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.roll_number.trim() || !formData.class_id || !formData.section_id) {
      setMessage({ type: 'error', text: 'All fields except Parent are required' });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const payload = {
        name: formData.name,
        roll_number: formData.roll_number,
        class_id: parseInt(formData.class_id),
        section_id: parseInt(formData.section_id),
        parent_id: formData.parent_id ? parseInt(formData.parent_id) : null,
        type: formData.type || 'Day Scholar',
        concession: parseFloat(formData.concession) || 0
      };

      if (editingStudent) {
        await api.students.update(editingStudent.id, payload);
        setMessage({ type: 'success', text: 'Student details updated successfully' });
      } else {
        await api.students.create(payload);
        setMessage({ type: 'success', text: 'Student enrolled successfully' });
      }

      // Re-fetch active page
      const freshList = await api.students.list({ search, class_id: classFilter, section_id: sectionFilter, page, limit });
      setStudents(freshList.students);
      setTotal(freshList.total);

      setTimeout(() => setModalOpen(false), 1000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Action failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete student "${name}"?`)) return;

    try {
      await api.students.delete(id);
      const data = await api.students.list({ search, class_id: classFilter, section_id: sectionFilter, page, limit });
      setStudents(data.students);
      setTotal(data.total);
    } catch (err) {
      alert(err.message || 'Failed to delete student');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Student Directory</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Manage student profiles, class rosters, and parent linkages</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-3 rounded-2xl flex items-center gap-2 text-sm shadow-lg shadow-emerald-500/10 active:scale-95 transition-all shrink-0"
        >
          <Plus size={18} />
          <span>Enroll Student</span>
        </button>
      </div>

      {/* Filters Area */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Search Bar */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search by name or roll no..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 transition-all"
          />
        </div>

        {/* Class Filter */}
        <select
          value={classFilter}
          onChange={(e) => { setClassFilter(e.target.value); setSectionFilter(''); setPage(1); }}
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all font-medium text-slate-600"
        >
          <option value="">All Classes</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Section Filter */}
        <select
          value={sectionFilter}
          disabled={!classFilter}
          onChange={(e) => { setSectionFilter(e.target.value); setPage(1); }}
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all font-medium text-slate-600 disabled:opacity-50"
        >
          <option value="">All Sections</option>
          {sections.filter(s => s.class_id === parseInt(classFilter)).map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Directory Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={36} className="animate-spin text-emerald-500" />
          </div>
        ) : students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Roll Number</th>
                  <th className="px-6 py-4">Class / Section</th>
                  <th className="px-6 py-4">Linked Parent</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Balance Owed</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-600 font-medium">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700 shrink-0">
                          <GraduationCap size={16} />
                        </div>
                        <span className="font-bold text-slate-800">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{student.roll_number}</td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                        {student.class_name} - {student.section_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {student.parent_name ? (
                        <div>
                          <p className="text-slate-700 font-semibold">{student.parent_name}</p>
                          <p className="text-[11px] text-slate-400">{student.parent_email}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not Linked</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-750 text-xs">
                        {student.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold text-xs ${student.remaining_balance > 0 ? 'text-rose-650' : 'text-emerald-650'}`}>
                          ₹{student.remaining_balance}
                        </span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border
                          ${student.payment_status === 'Paid' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}
                        `}>
                          {student.payment_status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => openEditModal(student)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors"
                          title="Edit Student"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(student.id, student.name)}
                          className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-colors"
                          title="Delete Student"
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
            <p className="text-slate-400 font-semibold">No students found matching current filters.</p>
            <p className="text-xs text-slate-350 mt-1">Enroll a student to populate the directory.</p>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">
              Showing Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(prev => prev - 1)}
                className="p-2 border border-slate-200 bg-white rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(prev => prev + 1)}
                className="p-2 border border-slate-200 bg-white rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingStudent ? `Edit Student: ${editingStudent.name}` : 'Enroll New Student'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {message.text && (
                <div className={`p-4 border rounded-2xl flex items-start gap-2.5 text-xs font-semibold
                  ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}
                `}>
                  {message.type === 'success' && <CheckCircle size={16} className="shrink-0" />}
                  <span>{message.text}</span>
                </div>
              )}

              {/* Student Name */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Student Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 transition-all"
                />
              </div>

              {/* Roll Number */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Roll Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GRW-0928"
                  value={formData.roll_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, roll_number: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 transition-all"
                />
              </div>

              {/* Class and Section */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Class</label>
                  <select
                    required
                    value={formData.class_id}
                    onChange={(e) => handleFormClassChange(e.target.value)}
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

              {/* Linked Parent */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Link Parent Account (Optional)</label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, parent_id: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all font-medium text-slate-600"
                >
                  <option value="">No Parent Link</option>
                  {parents.map(p => (
                    <option key={p.id} value={p.id}>{p.username} ({p.email})</option>
                  ))}
                </select>
              </div>

              {/* Tuition Type & Concession */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Student Program Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all font-medium text-slate-600"
                  >
                    <option value="Day Scholar">Day Scholar</option>
                    <option value="Hostel Student">Hostel Student</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Scholarship / Concession (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 1500"
                    value={formData.concession}
                    onChange={(e) => setFormData(prev => ({ ...prev, concession: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 transition-all"
                  />
                </div>
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
                  <span>{editingStudent ? 'Save Updates' : 'Enroll Student'}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
