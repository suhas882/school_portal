import React from 'react';
import Sidebar from './Sidebar';
import { User, Calendar } from 'lucide-react';

export default function Layout({ role, activeTab, setActiveTab, schoolName, user, onLogout, children }) {
  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return role === 'admin' ? 'Administrative Dashboard' : 'Parent Dashboard';
      case 'students':
        return 'Student Directory';
      case 'classes':
        return 'Academic Settings';
      case 'parents':
        return 'Parent Accounts';
      case 'homework':
        return 'Homework Hub';
      case 'notices':
        return 'Announcements';
      case 'logs':
        return 'System Audit Logs';
      case 'settings':
        return 'Settings & Configuration';
      default:
        return 'School System';
    }
  };

  const getBreadcrumb = () => {
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
        <span className="capitalize">{role}</span>
        <span>/</span>
        <span className="text-slate-600 capitalize font-semibold">{activeTab}</span>
      </div>
    );
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <Sidebar 
        role={role} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        schoolName={schoolName} 
        onLogout={onLogout} 
      />

      {/* Main Page Area */}
      <div className="flex-1 flex flex-col lg:pl-64 pt-16 lg:pt-0 min-h-screen">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 lg:px-8 shadow-sm">
          {/* Breadcrumb / Section Details */}
          <div className="hidden sm:block">
            {getBreadcrumb()}
            <h2 className="text-slate-800 font-bold text-sm leading-none mt-1">
              {getTabTitle()}
            </h2>
          </div>
          <div className="block sm:hidden">
            <h2 className="text-slate-800 font-bold text-sm leading-none">
              {getTabTitle()}
            </h2>
          </div>

          {/* Right Area - Current Date & User */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
              <Calendar size={14} />
              <span>{formattedDate}</span>
            </div>

            <div className="h-6 w-px bg-slate-200 hidden md:block" />

            <div className="flex items-center gap-2.5 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-900 flex items-center justify-center font-bold text-xs">
                <User size={13} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-slate-700 truncate max-w-[100px]">
                  {user?.username || 'User'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Inner Page Content */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
