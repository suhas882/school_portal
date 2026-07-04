import React, { useState, useEffect } from 'react';
import { api, getUser } from './utils/api';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ManageStudents from './pages/ManageStudents';
import ManageClasses from './pages/ManageClasses';
import ParentAccounts from './pages/ParentAccounts';
import ManageHomework from './pages/ManageHomework';
import Notices from './pages/Notices';
import ActivityLogs from './pages/ActivityLogs';
import SettingsPage from './pages/Settings';
import ParentPortal from './pages/ParentPortal';
import ManageFees from './pages/ManageFees';

export default function App() {
  const [user, setUser] = useState(null);
  const [schoolName, setSchoolName] = useState('New Millennium School');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [initializing, setInitializing] = useState(true);

  // Synchronize authentication on boot
  useEffect(() => {
    const activeUser = getUser();
    if (activeUser) {
      setUser(activeUser);
      fetchSchoolInfo();
    }
    setInitializing(false);

    // Watch session expirations
    const handleAuthExpired = () => {
      setUser(null);
      setSchoolName('New Millennium School');
      setActiveTab('dashboard');
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  const fetchSchoolInfo = async () => {
    try {
      const data = await api.auth.getPublicSchoolInfo();
      if (data && data.name) {
        setSchoolName(data.name);
      }
    } catch (e) {
      console.warn('Failed to load school name:', e.message);
    }
  };

  const handleLoginSuccess = (loggedUser) => {
    setUser(loggedUser);
    setActiveTab('dashboard');
    fetchSchoolInfo();
  };

  const handleLogout = () => {
    api.auth.logout();
    setUser(null);
    setSchoolName('New Millennium School');
    setActiveTab('dashboard');
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Authenticated Layout Views
  return (
    <Layout 
      role={user.role} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      schoolName={schoolName} 
      user={user} 
      onLogout={handleLogout}
    >
      {/* Admin Tabs */}
      {user.role === 'admin' && (
        <>
          {activeTab === 'dashboard' && <AdminDashboard setActiveTab={setActiveTab} />}
          {activeTab === 'students' && <ManageStudents />}
          {activeTab === 'classes' && <ManageClasses />}
          {activeTab === 'parents' && <ParentAccounts />}
          {activeTab === 'fees' && <ManageFees />}
          {activeTab === 'homework' && <ManageHomework />}
          {activeTab === 'notices' && <Notices />}
          {activeTab === 'logs' && <ActivityLogs />}
          {activeTab === 'settings' && (
            <SettingsPage user={user} onSchoolNameUpdate={setSchoolName} />
          )}
        </>
      )}

      {/* Parent Tabs */}
      {user.role === 'parent' && (
        <>
          {activeTab === 'dashboard' && <ParentPortal user={user} />}
          {activeTab === 'notices' && <ParentPortal user={user} />}
          {activeTab === 'settings' && <SettingsPage user={user} />}
        </>
      )}
    </Layout>
  );
}
