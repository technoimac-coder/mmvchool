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
import { AdminConsoleModule } from '../components/modules/AdminConsoleModule';
import { ToastContainer } from '../components/ToastContainer';
import { LoginScreen } from '../components/LoginScreen';
import { authApi, isAdminRole } from '../lib/api';

function MainApp() {
  const { currentUser, setCurrentUser } = useApp();
  const [activeModule, setActiveModuleState] = useState<string>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // A server-side PHP session is the only authentication source of truth.
  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      try {
        const session = await authApi.session();
        if (cancelled) return;
        if (session.authenticated && session.user) {
          setCurrentUser(session.user);
          setIsAuthenticated(true);
        }
        const hash = window.location.hash.replace('#', '').trim();
        const savedModule = localStorage.getItem('school_mis_active_module');
        setActiveModuleState(hash || savedModule || 'dashboard');
      } catch (error) {
        console.error('Session initialization failed', error);
      } finally {
        if (!cancelled) setIsInitialized(true);
      }
    };
    void initialize();

    const handleHashChange = () => {
      const currentHash = window.location.hash.replace('#', '').trim();
      if (currentHash) {
        setActiveModuleState(currentHash);
        try {
          localStorage.setItem('school_mis_active_module', currentHash);
        } catch {
          // Storage can be unavailable in privacy-focused browser modes.
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      cancelled = true;
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [setCurrentUser]);

  const setActiveModule = (mod: string) => {
    setActiveModuleState(mod);
    try {
      localStorage.setItem('school_mis_active_module', mod);
      window.location.hash = mod;
    } catch (e) {
      console.error(e);
    }
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
      case 'admin_console':
      case 'admin_settings':
        return isAdminRole(currentUser.role)
          ? <AdminConsoleModule />
          : <Dashboard onSelectModule={setActiveModule} />;
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
