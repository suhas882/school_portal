import React, { useState, useEffect } from 'react';
import { 
  Landmark, 
  Users, 
  Search, 
  Layers, 
  Plus, 
  Trash2, 
  Loader2, 
  CheckCircle,
  History,
  Coins,
  Calendar,
  Printer,
  X,
  CreditCard,
  Receipt
} from 'lucide-react';
import { api } from '../utils/api';

export default function ManageFees() {
  const [activeSubTab, setActiveSubTab] = useState('billing'); // 'billing', 'classes', 'expenses'
  
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [expenses, setExpenses] = useState([]);

  // Filter & Pagination states
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Class fees update states
  const [editingClass, setEditingClass] = useState(null);
  const [editDayFee, setEditDayFee] = useState('');
  const [editHostelFee, setEditHostelFee] = useState('');

  // Payment Recording Modal states
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  // Payment Ledger Modal states
  const [viewLedgerStudent, setViewLedgerStudent] = useState(null);
  const [studentPayments, setStudentPayments] = useState([]);

  // Printable receipt state (renders dedicated printable layout and triggers print)
  const [printingReceipt, setPrintingReceipt] = useState(null);

  // Expense Form states
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseDate, setNewExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  async function loadInitialData() {
    setLoading(true);
    try {
      const [classesData, sectionsData, expensesData] = await Promise.all([
        api.classes.list(),
        api.sections.list(),
        api.expenses.list()
      ]);
      setClasses(classesData);
      setSections(sectionsData);
      setExpenses(expensesData);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to load billing dependencies' });
    } finally {
      setLoading(false);
    }
  }

  // Load students based on search and filters
  async function loadStudentsList() {
    try {
      const data = await api.students.list({
        search,
        class_id: classFilter,
        section_id: sectionFilter,
        page,
        limit: 10
      });
      setStudents(data.students);
      setTotalStudents(data.total);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'billing') {
      loadStudentsList();
    }
  }, [search, classFilter, sectionFilter, page, activeSubTab]);

  // Handle Class Fees Update
  const handleSaveClassFees = async (e, classId) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      await api.classes.updateFees(classId, {
        day_scholar_fee: parseFloat(editDayFee) || 0,
        hostel_student_fee: parseFloat(editHostelFee) || 0
      });
      setMessage({ type: 'success', text: 'Class tuition fees updated and student balances re-calculated successfully' });
      setEditingClass(null);
      await loadInitialData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update class fees' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Recording Student Payment
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !paymentAmount || parseFloat(paymentAmount) <= 0) return;

    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      await api.payments.create(selectedStudent.id, parseFloat(paymentAmount), paymentDate);
      setMessage({ type: 'success', text: `Recorded ₹${paymentAmount} payment for ${selectedStudent.name}` });
      setSelectedStudent(null);
      setPaymentAmount('');
      await loadStudentsList();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Payment recording failed' });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Payment Ledger Modal
  const openLedgerModal = async (student) => {
    setViewLedgerStudent(student);
    try {
      const logs = await api.payments.listByStudent(student.id);
      setStudentPayments(logs);
    } catch (err) {
      alert('Failed to load transaction ledger');
    }
  };

  // Handle Expense Creation
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!newExpenseName.trim() || !newExpenseAmount || parseFloat(newExpenseAmount) <= 0) return;

    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      await api.expenses.create({
        item_name: newExpenseName.trim(),
        amount: parseFloat(newExpenseAmount),
        date: newExpenseDate
      });
      setNewExpenseName('');
      setNewExpenseAmount('');
      setMessage({ type: 'success', text: 'Expense log saved successfully' });
      const expensesData = await api.expenses.list();
      setExpenses(expensesData);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save expense' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Expense Deletion
  const handleDeleteExpense = async (id, name) => {
    if (!window.confirm(`Delete expense record: "${name}"?`)) return;
    try {
      await api.expenses.delete(id);
      const expensesData = await api.expenses.list();
      setExpenses(expensesData);
    } catch (err) {
      alert(err.message || 'Failed to delete expense record');
    }
  };

  // Trigger Receipt Browser Print
  const handlePrintReceipt = (payment, student) => {
    setPrintingReceipt({ payment, student });
    setTimeout(() => {
      window.print();
    }, 300);
  };

  if (loading && classes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={36} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in no-print">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Fee & Expense Portal</h1>
        <p className="text-xs text-slate-400 font-medium mt-0.5">Manage class tuition fees, student payments ledgers, and track school expenditures</p>
      </div>

      {/* Navigation Sub Tabs */}
      <div className="flex bg-white border border-slate-200 p-1.5 rounded-2xl w-full max-w-md shadow-sm">
        {['billing', 'classes', 'expenses'].map((tab) => (
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
            {tab === 'billing' ? 'Student Billing' : tab === 'classes' ? 'Class Fees' : 'Expenditures'}
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

      {/* Sub-tab 1: Student Billing */}
      {activeSubTab === 'billing' && (
        <div className="space-y-4">
          {/* Filters Area */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Net Tuition (₹)</th>
                    <th className="px-6 py-4">Balance Owed (₹)</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-600 font-medium">
                  {students.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{st.name}</td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-bold">
                          {st.class_name}-{st.section_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold">{st.type}</td>
                      <td className="px-6 py-4 font-semibold">
                        ₹{st.fee_after_concession}
                        {st.concession > 0 && (
                          <span className="text-[10px] text-emerald-600 block">(-₹{st.concession} discount)</span>
                        )}
                      </td>
                      <td className={`px-6 py-4 font-bold ${st.remaining_balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        ₹{st.remaining_balance}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-full
                          ${st.payment_status === 'Paid' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}
                        `}>
                          {st.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 text-xs">
                          <button
                            onClick={() => setSelectedStudent(st)}
                            disabled={st.remaining_balance <= 0}
                            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 active:scale-95 transition-all"
                          >
                            <Coins size={13} />
                            <span>Collect Fee</span>
                          </button>
                          <button
                            onClick={() => openLedgerModal(st)}
                            className="border border-slate-200 hover:bg-slate-50 text-indigo-650 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 active:scale-95 transition-all"
                          >
                            <History size={13} />
                            <span>History</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: Class Tuition Configuration */}
      {activeSubTab === 'classes' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-4xl">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Set Tuition Fee Rates per Academic Grade</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classes.map((c) => (
              <div key={c.id} className="border border-slate-150 p-5 rounded-2xl hover:border-slate-300 transition-colors">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-emerald-500" />
                    <span className="font-bold text-slate-800 text-sm">{c.name}</span>
                  </div>
                  {editingClass?.id !== c.id && (
                    <button
                      onClick={() => {
                        setEditingClass(c);
                        setEditDayFee(c.day_scholar_fee);
                        setEditHostelFee(c.hostel_student_fee);
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-500"
                    >
                      Configure Fees
                    </button>
                  )}
                </div>

                {editingClass?.id === c.id ? (
                  <form onSubmit={(e) => handleSaveClassFees(e, c.id)} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Day Scholar (₹)</label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={editDayFee}
                          onChange={(e) => setEditDayFee(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hostel Student (₹)</label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={editHostelFee}
                          onChange={(e) => setEditHostelFee(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-xl text-[10px]"
                      >
                        {submitting ? 'Syncing...' : 'Save Settings'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingClass(null)}
                        className="border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold px-3 py-1.5 rounded-xl text-[10px]"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-650">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="block text-[9px] text-slate-400 uppercase tracking-wider">Day Scholar Fee</span>
                      <span className="text-sm font-bold text-slate-850">₹{c.day_scholar_fee}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="block text-[9px] text-slate-400 uppercase tracking-wider">Hostel student Fee</span>
                      <span className="text-sm font-bold text-slate-855">₹{c.hostel_student_fee}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-tab 3: Expenses */}
      {activeSubTab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Expense Form */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-fit">
            <h3 className="font-bold text-slate-800 text-sm mb-4">Record New Expenditure</h3>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Item / Expense Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Lab Supplies"
                  value={newExpenseName}
                  onChange={(e) => setNewExpenseName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Amount (₹)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="e.g. 3500"
                  value={newExpenseAmount}
                  onChange={(e) => setNewExpenseAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Date</label>
                <input
                  type="date"
                  required
                  value={newExpenseDate}
                  onChange={(e) => setNewExpenseDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 text-xs shadow-md"
              >
                <Plus size={16} />
                <span>Save Expense Record</span>
              </button>
            </form>
          </div>

          {/* Expenses List */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-2">
            <h3 className="font-bold text-slate-800 text-sm mb-4">Expenditure Register</h3>
            
            <div className="overflow-hidden border border-slate-100 rounded-2xl">
              {expenses.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="px-5 py-3">Expense Name</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Transaction Date</th>
                      <th className="px-5 py-3 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-semibold">
                    {expenses.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3 font-bold text-slate-800">{e.item_name}</td>
                        <td className="px-5 py-3 text-rose-600">₹{e.amount}</td>
                        <td className="px-5 py-3">{e.date}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => handleDeleteExpense(e.id, e.item_name)}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-10 text-xs font-semibold text-slate-400 italic bg-slate-50/50">
                  No expenditure records has been registered.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Collect Fee / Record Payment Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Record Fee Collection</h3>
              <button onClick={() => setSelectedStudent(null)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl text-xs font-semibold">
                <p className="text-slate-400 uppercase tracking-wide text-[9px] mb-1">Collecting tuition for</p>
                <p className="text-slate-800 text-sm font-bold">{selectedStudent.name}</p>
                <p className="text-slate-450 mt-1">Roll number: {selectedStudent.roll_number}</p>
                <p className="text-rose-600 mt-2 font-bold">Remaining Balance: ₹{selectedStudent.remaining_balance}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Payment Amount (₹)</label>
                <input
                  type="number"
                  min="0.01"
                  max={selectedStudent.remaining_balance}
                  step="0.01"
                  required
                  placeholder={`Max: ${selectedStudent.remaining_balance}`}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Payment Date</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all text-slate-650"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 text-sm mt-4"
              >
                {submitting ? 'Recording transaction...' : 'Submit Payment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* View Ledger Modal */}
      {viewLedgerStudent && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Receipts & Payment Ledger</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Logs for {viewLedgerStudent.name}</p>
              </div>
              <button onClick={() => setViewLedgerStudent(null)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
              {studentPayments.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {studentPayments.map((pay) => (
                    <div key={pay.id} className="py-3.5 flex justify-between items-center text-xs font-semibold">
                      <div>
                        <p className="text-slate-850 font-bold">₹{pay.amount}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5">Transaction date: {pay.date}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePrintReceipt(pay, viewLedgerStudent)}
                          className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1 text-[10px] font-bold text-indigo-650"
                        >
                          <Printer size={12} />
                          <span>Print Slip</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-400 font-semibold italic">
                  No payments have been logged for this student.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Receipt Template */}
      {printingReceipt && (
        <div className="hidden print:block fixed inset-0 bg-white text-slate-900 p-8 text-sm leading-relaxed z-[9999]">
          <div className="flex justify-between items-start pb-6 border-b-2 border-slate-300">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight uppercase text-slate-900">New Millennium School</h1>
              <p className="text-xs text-slate-450 mt-1">123 Education Lane, Springfield | office@millennium.edu</p>
            </div>
            <div className="p-3 bg-slate-900 rounded-2xl text-emerald-400">
              <Receipt size={32} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 py-6 border-b border-slate-200">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Receipt Issued For</h4>
              <p className="font-extrabold text-base text-slate-800">{printingReceipt.student.name}</p>
              <p className="text-xs text-slate-500 font-medium">Roll No: {printingReceipt.student.roll_number}</p>
              <p className="text-xs text-slate-500 font-medium">Class: {printingReceipt.student.class_name} - {printingReceipt.student.section_name}</p>
            </div>
            <div className="text-right">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Reference</h4>
              <p className="font-extrabold text-base text-slate-800">TXN-00{printingReceipt.payment.id}</p>
              <p className="text-xs text-slate-500 font-medium">Payment Date: {printingReceipt.payment.date}</p>
              <p className="text-xs text-slate-500 font-medium">Method: Cash / School Ledger</p>
            </div>
          </div>

          <div className="py-6 space-y-4">
            <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Fee Account Ledger Summary</h4>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-300 text-xs font-bold text-slate-700">
                  <th className="py-2">Item Description</th>
                  <th className="py-2 text-right">Ledger Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                <tr>
                  <td className="py-2.5 font-medium">Class Program Tuition Fees ({printingReceipt.student.type})</td>
                  <td className="py-2.5 text-right font-semibold">₹{printingReceipt.student.fee_amount}</td>
                </tr>
                {printingReceipt.student.concession > 0 && (
                  <tr>
                    <td className="py-2.5 font-medium text-emerald-700">Approved Concession / Scholarship Discount</td>
                    <td className="py-2.5 text-right font-semibold text-emerald-700">-₹{printingReceipt.student.concession}</td>
                  </tr>
                )}
                <tr className="border-t border-slate-300 font-bold text-slate-850 bg-slate-50/50">
                  <td className="py-3 px-2">Net Term Tuition Fee</td>
                  <td className="py-3 px-2 text-right">₹{printingReceipt.student.fee_after_concession}</td>
                </tr>
                <tr className="font-bold text-emerald-700">
                  <td className="py-3 px-2">Amount Paid in this Transaction</td>
                  <td className="py-3 px-2 text-right font-extrabold text-sm">₹{printingReceipt.payment.amount}</td>
                </tr>
                <tr className="font-bold text-slate-900 border-t-2 border-double border-slate-400">
                  <td className="py-3 px-2">Remaining Balance Owed</td>
                  <td className="py-3 px-2 text-right">₹{printingReceipt.student.remaining_balance}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-12 text-center text-xs text-slate-455 border-t border-slate-200 pt-6">
            <p className="font-semibold">Thank you for your payment!</p>
            <p className="text-[10px] mt-1 italic">This is an automated computer-generated receipt, signature is not required.</p>
          </div>
        </div>
      )}
    </div>
  );
}
