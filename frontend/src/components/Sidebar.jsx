import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  GraduationCap, 
  BookOpen, 
  Layers, 
  Users, 
  Bell, 
  History, 
  Settings, 
  LogOut,
  Menu,
  X,
  School,
  Landmark
} from 'lucide-react';

export default function Sidebar({ role, activeTab, setActiveTab, schoolName, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);

  const adminMenu = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: GraduationCap },
    { id: 'classes', label: 'Classes & Subjects', icon: Layers },
    { id: 'parents', label: 'Parent Accounts', icon: Users },
    { id: 'fees', label: 'Fees & Expenses', icon: Landmark },
    { id: 'homework', label: 'Homework Module', icon: BookOpen },
    { id: 'notices', label: 'Notices', icon: Bell },
    { id: 'logs', label: 'Activity Logs', icon: History },
    { id: 'settings', label: 'Settings & Backups', icon: Settings },
  ];

  const parentMenu = [
    { id: 'dashboard', label: 'My Portal', icon: LayoutDashboard },
    { id: 'notices', label: 'Announcements', icon: Bell },
    { id: 'settings', label: 'Change Password', icon: Settings },
  ];

  const menuItems = role === 'admin' ? adminMenu : parentMenu;

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden w-full bg-slate-900 text-white h-16 flex items-center justify-between px-4 fixed top-0 left-0 z-30 shadow-md">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500 rounded-lg text-slate-900">
            <School size={20} />
          </div>
          <span className="font-bold text-sm truncate max-w-[200px]">{schoolName || 'School System'}</span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-lg hover:bg-slate-800 focus:outline-none transition-colors"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-950/40 z-20 transition-opacity"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-20 
        w-64 bg-slate-900 text-slate-200 
        flex flex-col justify-between 
        transform lg:transform-none transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 pt-16 lg:pt-0
      `}>
        {/* Sidebar Header (Desktop Only) */}
        <div className="hidden lg:flex items-center gap-3 px-6 py-6 border-b border-slate-800">
          <div className="p-2 bg-emerald-500 rounded-xl text-slate-900">
            <School size={24} />
          </div>
          <div>
            <h1 className="font-bold text-white leading-tight tracking-wide text-lg truncate max-w-[150px]">
              {schoolName || 'School Manager'}
            </h1>
            <span className="text-xs text-slate-400 font-medium capitalize">{role} Portal</span>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`
                  w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}
                `}
              >
                <Icon size={18} className={isActive ? 'text-slate-950' : 'text-slate-400'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-all duration-200"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
