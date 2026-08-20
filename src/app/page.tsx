'use client';

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from '../context/AppContext';
import { Sidebar } from '../components/Sidebar';
import { Dashboard } from '../components/Dashboard';
import { PersonnelModule } from '../components/modules/PersonnelModule';
import { LeaveModule } from '../components/modules/LeaveModule';
import { OfficialDutyModule } from '../components/modules/OfficialDutyModule';
import { VehicleModule } from '../components/modules/VehicleModule';
import { RoomBookingModule } from '../components/modules/RoomBookingModule';
import { RepairModule } from '../components/modules/RepairModule';
import { SubstituteModule } from '../components/modules/SubstituteModule';
import { PortfolioModule } from '../components/modules/PortfolioModule';
import { LessonPlanModule } from '../components/modules/LessonPlanModule';
import { AdminSettingsModule } from '../components/modules/AdminSettingsModule';
import { ToastContainer } from '../components/ToastContainer';
import { LoginScreen } from '../components/LoginScreen';

function MainApp() {
  const { currentUser, setCurrentUser, users } = useApp();
  const [activeModule, setActiveModuleState] = useState<string>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check auth session on initial load (using sessionStorage so new visits always see Login)
  useEffect(() => {
    try {
      const sessionAuth = sessionStorage.getItem('mmv_authenticated_user');
      if (sessionAuth) {
        const parsed = JSON.parse(sessionAuth);
        if (parsed && parsed.id) {
          const fresh = users.find(u => u.id === parsed.id) || parsed;
          setCurrentUser(fresh);
          setIsAuthenticated(true);
        }
      }

      const hash = window.location.hash.replace('#', '').trim();
      const savedModule = localStorage.getItem('school_mis_active_module');
      const targetModule = hash || savedModule || 'dashboard';
      setActiveModuleState(targetModule);
    } catch (e) {
      console.error(e);
    } finally {
      setIsInitialized(true);
    }

    const handleHashChange = () => {
      const currentHash = window.location.hash.replace('#', '').trim();
      if (currentHash) {
        setActiveModuleState(currentHash);
        try {
          localStorage.setItem('school_mis_active_module', currentHash);
        } catch (e) {}
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [users, setCurrentUser]);

  const setActiveModule = (mod: string) => {
    setActiveModuleState(mod);
    try {
      localStorage.setItem('school_mis_active_module', mod);
      window.location.hash = mod;
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('mmv_authenticated_user');
    localStorage.removeItem('mmv_authenticated_user');
    setIsAuthenticated(false);
  };

  if (!isInitialized) return null;

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard onSelectModule={setActiveModule} />;
      case 'personnel':
        return <PersonnelModule />;
      case 'leave':
        return <LeaveModule />;
      case 'official_duty':
        return <OfficialDutyModule />;
      case 'vehicle':
        return <VehicleModule />;
      case 'room':
        return <RoomBookingModule />;
      case 'repair':
        return <RepairModule />;
      case 'substitute':
        return <SubstituteModule />;
      case 'portfolio':
        return <PortfolioModule />;
      case 'lesson_plan':
        return <LessonPlanModule />;
      case 'admin_settings':
        return <AdminSettingsModule />;
      default:
        return <Dashboard onSelectModule={setActiveModule} />;
    }
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden font-sans bg-[#f4f7fc]">
      <Sidebar activeModule={activeModule} onSelectModule={setActiveModule} />
      
      <main className="flex-1 overflow-y-auto p-4 lg:p-7 max-w-7xl mx-auto w-full">
        {renderModule()}
      </main>

      <ToastContainer />
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
