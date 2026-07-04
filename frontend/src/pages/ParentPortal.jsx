import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Download, 
  Calendar, 
  Bell, 
  GraduationCap, 
  Loader2, 
  CheckCircle,
  FileText,
  Landmark,
  Printer,
  Receipt
} from 'lucide-react';
import { api } from '../utils/api';

export default function ParentPortal({ user }) {
  // Tabs: 'homework', 'notices', 'fees'
  const [activePortalTab, setActivePortalTab] = useState('homework'); 
  
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  
  const [homeworkList, setHomeworkList] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Receipt printing modal/state
  const [printingReceipt, setPrintingReceipt] = useState(null);

  async function loadPortalData() {
    setLoading(true);
    try {
      // Securely fetch parent profile and linked children
      const parentProfile = await api.parents.getParentProfile();
      
      if (parentProfile && parentProfile.children && parentProfile.children.length > 0) {
        setChildren(parentProfile.children);
        setSelectedChild(parentProfile.children[0]); // default to first child
      }

      // Fetch notice boards announcements
      const noticesData = await api.notices.list();
      const filteredNotices = noticesData.filter(n => n.audience === 'all' || n.audience === 'parents');
      setNotices(filteredNotices);
    } catch (err) {
      console.error('Failed to load portal data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPortalData();
  }, [user]);

  // Load homework and payment ledgers when child switches
  useEffect(() => {
    async function loadChildLedger() {
      if (!selectedChild) return;
      try {
        const [hwData, paymentsData] = await Promise.all([
          api.homework.list({
            class_id: selectedChild.class_id,
            section_id: selectedChild.section_id
          }),
          api.parents.getChildPayments(selectedChild.id)
        ]);
        setHomeworkList(hwData.homework);
        setPayments(paymentsData);
      } catch (err) {
        console.error('Failed to load homework/billing for selected child:', err);
      }
    }
    loadChildLedger();
  }, [selectedChild]);

  const handlePrint = (payment) => {
    setPrintingReceipt(payment);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const getAbsoluteFileUrl = (relativePath) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    return `${backendUrl}${relativePath}`;
  };

  if (loading && children.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={36} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in no-print">
      {/* Welcome & Child Selector */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] rounded-full bg-emerald-500/5 blur-[50px]" />
        <div className="z-10">
          <h1 className="text-xl font-bold">Hello, {user.username}</h1>
          <p className="text-xs text-slate-400 mt-1">Parent access panel to homework tracker and school circulars</p>
        </div>

        {/* Children dropdown selector */}
        {children.length > 0 ? (
          <div className="z-10 flex items-center gap-2.5 bg-slate-800 border border-slate-700 p-2 rounded-2xl">
            <div className="p-1.5 bg-emerald-500 rounded-lg text-slate-950">
              <GraduationCap size={16} />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide leading-none mb-1">Select Child</label>
              <select
                value={selectedChild ? selectedChild.id : ''}
                onChange={(e) => {
                  const target = children.find(c => c.id === parseInt(e.target.value));
                  if (target) setSelectedChild(target);
                }}
                className="bg-transparent text-sm font-bold text-white focus:outline-none pr-6 cursor-pointer"
              >
                {children.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-800 text-white">
                    {c.name} ({c.class_name}-{c.section_name})
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="bg-rose-950/40 border border-rose-900 px-4 py-2.5 rounded-2xl text-rose-300 text-xs font-semibold">
            No children are currently linked to your parent account. Please contact school administration.
          </div>
        )}
      </div>

      {/* Navigation SubTabs */}
      <div className="flex bg-white border border-slate-200 p-1.5 rounded-2xl w-full max-w-sm shadow-sm">
        <button
          onClick={() => setActivePortalTab('homework')}
          className={`
            flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200
            ${activePortalTab === 'homework' 
              ? 'bg-emerald-500 text-slate-950 shadow-md font-bold' 
              : 'text-slate-500 hover:text-slate-800'}
          `}
        >
          Homework Log
        </button>
        <button
          onClick={() => setActivePortalTab('fees')}
          className={`
            flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200
            ${activePortalTab === 'fees' 
              ? 'bg-emerald-500 text-slate-950 shadow-md font-bold' 
              : 'text-slate-500 hover:text-slate-800'}
          `}
        >
          Fee Ledger
        </button>
        <button
          onClick={() => setActivePortalTab('notices')}
          className={`
            flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200
            ${activePortalTab === 'notices' 
              ? 'bg-emerald-500 text-slate-950 shadow-md font-bold' 
              : 'text-slate-500 hover:text-slate-800'}
          `}
        >
          Announcements
        </button>
      </div>

      {/* Homework Tab View */}
      {activePortalTab === 'homework' && (
        <div className="space-y-4">
          <h3 className="font-bold text-slate-750 text-sm">
            Homework list for: <strong className="text-slate-900 font-extrabold">{selectedChild?.name}</strong>
          </h3>

          {homeworkList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {homeworkList.map((hw) => (
                <div key={hw.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <div>
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide">
                          {hw.subject_name}
                        </span>
                        <h4 className="font-bold text-slate-800 text-base mt-2">{hw.title}</h4>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold shrink-0">
                        <Calendar size={13} />
                        <span>Due: {hw.due_date}</span>
                      </div>
                    </div>
                    <p className="text-slate-650 text-xs leading-relaxed mb-6 whitespace-pre-line bg-slate-50/50 p-4 border border-slate-150 rounded-2xl font-medium">
                      {hw.description}
                    </p>
                  </div>

                  {hw.attachments && hw.attachments.length > 0 && (
                    <div className="border-t border-slate-100 pt-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-2">Attachments</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {hw.attachments.map((file) => (
                          <a
                            key={file.id}
                            href={getAbsoluteFileUrl(file.file_path)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-xl transition-all"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText size={14} className="text-emerald-500 shrink-0" />
                              <span className="text-xs font-bold text-slate-650 truncate max-w-[120px]" title={file.file_name}>
                                {file.file_name}
                              </span>
                            </div>
                            <Download size={13} className="text-slate-400 shrink-0 ml-1.5" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm">
              <BookOpen size={30} className="mx-auto text-slate-300 mb-2" />
              <p className="text-slate-400 font-semibold">No homework has been assigned yet.</p>
              <p className="text-xs text-slate-350 mt-0.5">Check back later for school tasks.</p>
            </div>
          )}
        </div>
      )}

      {/* Fees Ledger Tab View */}
      {activePortalTab === 'fees' && selectedChild && (
        <div className="space-y-6">
          <h3 className="font-bold text-slate-755 text-sm">
            Fee Ledger for: <strong className="text-slate-900 font-extrabold">{selectedChild.name}</strong>
          </h3>

          {/* Billing Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Student Program Type</span>
              <span className="text-lg font-bold text-slate-800 block mt-1">{selectedChild.type}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Net Tuition Fees</span>
              <span className="text-lg font-bold text-slate-850 block mt-1">
                ₹{selectedChild.fee_after_concession}
                {selectedChild.concession > 0 && (
                  <span className="text-xs text-emerald-600 font-medium ml-1.5">
                    (₹{selectedChild.concession} Concession applied)
                  </span>
                )}
              </span>
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Paid Tuition</span>
              <span className="text-lg font-bold text-emerald-600 block mt-1">
                ₹{selectedChild.fee_after_concession - selectedChild.remaining_balance}
              </span>
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Balance Owed</span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-lg font-bold ${selectedChild.remaining_balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  ₹{selectedChild.remaining_balance}
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border
                  ${selectedChild.payment_status === 'Paid' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}
                `}>
                  {selectedChild.payment_status}
                </span>
              </div>
            </div>
          </div>

          {/* Payments Logs Ledger */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Landmark size={18} className="text-emerald-500" />
              <h4 className="font-bold text-slate-800 text-sm">Receipts & Payment History</h4>
            </div>

            {payments.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-6 py-3.5">Payment Date</th>
                    <th className="px-6 py-3.5">Reference ID</th>
                    <th className="px-6 py-3.5">Amount Paid</th>
                    <th className="px-6 py-3.5 text-right">Invoices</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3.5">{p.date}</td>
                      <td className="px-6 py-3.5 font-mono text-[10px] text-slate-400">TXN-00{p.id}</td>
                      <td className="px-6 py-3.5 font-bold text-slate-800">₹{p.amount}</td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => handlePrint(p)}
                          className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 ml-auto text-[10px] font-bold text-indigo-650"
                        >
                          <Printer size={12} />
                          <span>Print Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-10 text-xs text-slate-400 font-medium italic">
                No payments have been logged for this student yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Announcements Tab View */}
      {activePortalTab === 'notices' && (
        <div className="space-y-4">
          <h3 className="font-bold text-slate-700 text-sm">Notice Board</h3>
          
          {notices.length > 0 ? (
            <div className="space-y-4 max-w-3xl">
              {notices.map((notice) => (
                <div key={notice.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <h4 className="font-bold text-slate-800 text-base">{notice.title}</h4>
                    <span className="text-slate-400 text-xs font-semibold shrink-0">
                      {new Date(notice.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-655 text-xs leading-relaxed font-medium whitespace-pre-line">
                    {notice.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm">
              <Bell size={30} className="mx-auto text-slate-350 mb-2" />
              <p className="text-slate-400 font-semibold">Notice board is currently empty.</p>
            </div>
          )}
        </div>
      )}

      {/* Hidden Print Receipt Invoice Template */}
      {printingReceipt && selectedChild && (
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
              <p className="font-extrabold text-base text-slate-800">{selectedChild.name}</p>
              <p className="text-xs text-slate-500 font-medium">Roll No: {selectedChild.roll_number}</p>
              <p className="text-xs text-slate-500 font-medium">Class: {selectedChild.class_name} - {selectedChild.section_name}</p>
            </div>
            <div className="text-right">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Reference</h4>
              <p className="font-extrabold text-base text-slate-800">TXN-00{printingReceipt.id}</p>
              <p className="text-xs text-slate-500 font-medium">Payment Date: {printingReceipt.date}</p>
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
                  <td className="py-2.5 font-medium">Class Program Tuition Fees ({selectedChild.type})</td>
                  <td className="py-2.5 text-right font-semibold">₹{selectedChild.fee_amount}</td>
                </tr>
                {selectedChild.concession > 0 && (
                  <tr>
                    <td className="py-2.5 font-medium text-emerald-700">Approved Concession / Scholarship Discount</td>
                    <td className="py-2.5 text-right font-semibold text-emerald-700">-₹{selectedChild.concession}</td>
                  </tr>
                )}
                <tr className="border-t border-slate-300 font-bold text-slate-850 bg-slate-50/50">
                  <td className="py-3 px-2">Net Term Tuition Fee</td>
                  <td className="py-3 px-2 text-right">₹{selectedChild.fee_after_concession}</td>
                </tr>
                <tr className="font-bold text-emerald-700">
                  <td className="py-3 px-2">Amount Paid in this Transaction</td>
                  <td className="py-3 px-2 text-right font-extrabold text-sm">₹{printingReceipt.amount}</td>
                </tr>
                <tr className="font-bold text-slate-900 border-t-2 border-double border-slate-400">
                  <td className="py-3 px-2">Remaining Balance Owed</td>
                  <td className="py-3 px-2 text-right">₹{selectedChild.remaining_balance}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-12 text-center text-xs text-slate-450 border-t border-slate-200 pt-6">
            <p className="font-semibold">Thank you for your payment!</p>
            <p className="text-[10px] mt-1 italic">This is an automated computer-generated receipt, signature is not required.</p>
          </div>
        </div>
      )}
    </div>
  );
}
