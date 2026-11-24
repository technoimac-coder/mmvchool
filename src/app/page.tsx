'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { AppProvider, useApp } from '../context/AppContext';
import { Sidebar } from '../components/Sidebar';
import { Dashboard } from '../components/Dashboard';
import { ToastContainer } from '../components/ToastContainer';
import { LoginScreen } from '../components/LoginScreen';
import { authApi, isAdminRole } from '../lib/api';
import { canReviewDocuments, canViewLeaveSummary, canViewDutyReport, canViewRoomReport } from '../config/approvalWorkflow';
import { Menu } from 'lucide-react';
import { LanguageProvider, LanguageToggle, useLanguage } from '../context/LanguageContext';
import { PushNotificationPrompt } from '../components/PushNotificationPrompt';

const moduleLoading = () => <div className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-500 shadow-sm">กำลังเปิดระบบ…</div>;
const PersonnelModule = dynamic(() => import('../components/modules/PersonnelModule').then(module => module.PersonnelModule), { loading: moduleLoading });
const LeaveModule = dynamic(() => import('../components/modules/LeaveModule').then(module => module.LeaveModule), { loading: moduleLoading });
const LeaveStatisticsModule = dynamic(() => import('../components/modules/LeaveStatisticsModule').then(module => module.LeaveStatisticsModule), { loading: moduleLoading });
const OfficialDutyModule = dynamic(() => import('../components/modules/OfficialDutyModule').then(module => module.OfficialDutyModule), { loading: moduleLoading });
const DutyReportModule = dynamic(() => import('../components/modules/DutyReportModule').then(module => module.DutyReportModule), { loading: moduleLoading });
const RoomReportModule = dynamic(() => import('../components/modules/RoomReportModule').then(module => module.RoomReportModule), { loading: moduleLoading });
const VehicleModule = dynamic(() => import('../components/modules/VehicleModule').then(module => module.VehicleModule), { loading: moduleLoading });
const RoomBookingModule = dynamic(() => import('../components/modules/RoomBookingModule').then(module => module.RoomBookingModule), { loading: moduleLoading });
const RepairModule = dynamic(() => import('../components/modules/RepairModule').then(module => module.RepairModule), { loading: moduleLoading });
const SubstituteModule = dynamic(() => import('../components/modules/SubstituteModule').then(module => module.SubstituteModule), { loading: moduleLoading });
const PortfolioModule = dynamic(() => import('../components/modules/PortfolioModule').then(module => module.PortfolioModule), { loading: moduleLoading });
const AdminConsoleModule = dynamic(() => import('../components/modules/AdminConsoleModule').then(module => module.AdminConsoleModule), { loading: moduleLoading });
const DocumentWorkflowModule = dynamic(() => import('../components/modules/DocumentWorkflowModule').then(module => module.DocumentWorkflowModule), { loading: moduleLoading });
const DocumentReviewModule = dynamic(() => import('../components/modules/DocumentReviewModule').then(module => module.DocumentReviewModule), { loading: moduleLoading });
const EOfficeModule = dynamic(() => import('../components/modules/EOfficeModule').then(module => module.EOfficeModule), { loading: moduleLoading });

function MainApp() {
  const { t } = useLanguage();
  const { currentUser, setCurrentUser, pipelinesConfig, notifications } = useApp();
  const [activeModule, setActiveModuleState] = useState<string>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const unreadNotificationCount = notifications.filter(notification => !notification.read).length;

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
        const requestedModule=hash || savedModule || 'dashboard';
        setActiveModuleState(requestedModule==='lesson_plan'?'document_workflow':requestedModule);
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
        setActiveModuleState(currentHash==='lesson_plan'?'document_workflow':currentHash);
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

  const setActiveModule = (requestedModule: string) => {
    const mod=requestedModule==='lesson_plan'?'document_workflow':requestedModule;
    setActiveModuleState(mod);
    setMobileMenuOpen(false);
    try {
      localStorage.setItem('school_mis_active_module', mod);
      window.location.hash = mod;
    } catch (e) {
      console.error(e);
    }
  };

  const moduleLabels: Record<string, string> = {
    eoffice: 'สารบรรณอิเล็กทรอนิกส์ (e-Office)',
    dashboard: t('หน้าหลักของฉัน'), personnel: t('ทำเนียบบุคลากร'), leave: t('ระบบการลา'), leave_summary: 'สรุปการลา',
    official_duty: t('ขออนุญาตไปราชการ'), vehicle: t('ขอใช้รถส่วนกลาง'), room: t('จองห้องประชุม'),
    duty_report: 'รายงานการไปราชการ',
    room_report: 'รายงานขอใช้สถานที่',
    repair: t('แจ้งซ่อมบำรุง'), substitute: t('จัดครูสอนแทน'), portfolio: t('ผลงาน&รางวัล'),
    lesson_plan: t('แผนการจัดการเรียนรู้'), admin_console: t('ศูนย์ควบคุมผู้ดูแลระบบ'),
    document_workflow: 'ส่งเอกสารและลงนามออนไลน์',
    document_review: t('ผู้ตรวจสอบเอกสาร'),
  };

  if (!isInitialized) return null;

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  const renderModule = () => {
    switch (activeModule) {
      case 'eoffice':
        return <EOfficeModule />;
      case 'dashboard':
        return <Dashboard onSelectModule={setActiveModule} />;
      case 'personnel':
        return <PersonnelModule />;
      case 'leave':
        return <LeaveModule />;
      case 'leave_summary':
        return canViewLeaveSummary(pipelinesConfig, currentUser)
          ? <LeaveStatisticsModule />
          : <Dashboard onSelectModule={setActiveModule} />;
      case 'official_duty':
        return <OfficialDutyModule />;
      case 'duty_report':
        return canViewDutyReport(pipelinesConfig, currentUser) ? <DutyReportModule /> : <Dashboard onSelectModule={setActiveModule} />;
      case 'vehicle':
        return <VehicleModule />;
      case 'room':
        return <RoomBookingModule />;
      case 'room_report':
        return canViewRoomReport(pipelinesConfig, currentUser) ? <RoomReportModule /> : <Dashboard onSelectModule={setActiveModule} />;
      case 'repair':
        return <RepairModule />;
      case 'substitute':
        return <SubstituteModule />;
      case 'portfolio':
        return <PortfolioModule />;
      case 'lesson_plan':
        return <DocumentWorkflowModule />;
      case 'document_workflow':
        return <DocumentWorkflowModule />;
      case 'document_review':
        return canReviewDocuments(pipelinesConfig, currentUser)
          ? <DocumentReviewModule />
          : <Dashboard onSelectModule={setActiveModule} />;
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
    <div className="h-[100dvh] w-full flex overflow-hidden font-sans bg-[#f4f7fc]">
      <div className="fixed right-4 top-4 z-[60] hidden lg:block">
        <LanguageToggle />
      </div>
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="ปิดเมนูด้านข้าง"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[1px] lg:hidden"
        />
      )}
      <Sidebar
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      
      <main className="app-content min-w-0 flex-1 overflow-y-auto overscroll-contain w-full">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200/90 bg-white/95 px-3 py-2.5 shadow-xs backdrop-blur-md lg:hidden safe-top">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0b1f3a] text-white shadow-sm active:scale-95"
            aria-label="เปิดเมนูหลัก"
          >
            <Menu className="h-5 w-5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-4 h-4 rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-4 ring-2 ring-white">
                {unreadNotificationCount}
              </span>
            )}
          </button>
          <img src="/school-logo.png" alt="ตราโรงเรียน" className="h-9 w-9 shrink-0 rounded-xl bg-white object-contain p-0.5 ring-1 ring-slate-200" />
          <div className="min-w-0">
            <div className="truncate text-xs font-extrabold text-[#0b1f3a]">{moduleLabels[activeModule] || 'MMV Smart School'}</div>
            <div className="truncate text-[10px] text-slate-500">{t('โรงเรียนมกุฎเมืองราชวิทยาลัย')}</div>
          </div>
          <div className="ml-auto"><LanguageToggle compact /></div>
        </div>
        <div className="mx-auto w-full max-w-7xl p-3 sm:p-4 lg:p-7">
          {renderModule()}
        </div>
      </main>

      <ToastContainer />
      <PushNotificationPrompt />
    </div>
  );
}

export default function Home() {
  return (
    <LanguageProvider>
      <AppProvider>
        <MainApp />
      </AppProvider>
    </LanguageProvider>
  );
}
