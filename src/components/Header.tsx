'use client';

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, Search, Globe, ChevronDown, Check, ShieldCheck, Building2 } from 'lucide-react';

interface HeaderProps {
  onSelectModule: (module: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onSelectModule }) => {
  const { currentUser, setCurrentUser, users, notifications, markNotificationAsRead } = useApp();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [lang, setLang] = useState<'TH' | 'EN'>('TH');

  const unreadCount = notifications.filter(n => !n.read).length;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'director': return { label: 'ผู้อำนวยการ', bg: 'bg-amber-50 text-amber-900 border-amber-200' };
      case 'deputy_personnel': return { label: 'รอง ผอ.บุคคล', bg: 'bg-blue-50 text-blue-900 border-blue-200' };
      case 'deputy_budget': return { label: 'รอง ผอ.งบประมาณ', bg: 'bg-orange-50 text-orange-900 border-orange-200' };
      case 'academic_affairs': return { label: 'ฝ่ายวิชาการ', bg: 'bg-purple-50 text-purple-900 border-purple-200' };
      case 'head': return { label: 'ผู้ดูแล/หัวหน้า', bg: 'bg-slate-100 text-slate-900 border-slate-200' };
      case 'technician': return { label: 'งานช่าง', bg: 'bg-rose-50 text-rose-900 border-rose-200' };
      case 'driver': return { label: 'พนักงานขับรถ', bg: 'bg-teal-50 text-teal-900 border-teal-200' };
      default: return { label: 'ครูผู้สอน', bg: 'bg-blue-50 text-blue-900 border-blue-200' };
    }
  };

  const roleInfo = getRoleBadge(currentUser.role);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#dbe4f0] px-4 lg:px-8 py-2.5 flex items-center justify-between shadow-xs">
      {/* Left Breadcrumb Context */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-white p-0.5 flex items-center justify-center border border-slate-200 shadow-2xs">
          <img src="/school-logo.png" alt="ตราโรงเรียนมกุฎเมืองราชวิทยาลัย" className="w-full h-full object-contain" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-[#0b1f3a] text-sm lg:text-base leading-tight">
              ระบบสารสนเทศโรงเรียน
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 bg-blue-50 text-[#0b1f3a] text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200/80">
              ปีการศึกษา 2567
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal hidden sm:block">
            โรงเรียนมกุฎเมืองราชวิทยาลัย · สพม.ชลบุรี ระยอง
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Global Search Box */}
        <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-60 text-xs text-slate-500 focus-within:border-blue-700 focus-within:bg-white transition-all">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาเมนูหรือข้อมูล..."
            className="bg-transparent border-none outline-hidden w-full text-xs placeholder:text-slate-400"
          />
        </div>

        {/* Language Switch */}
        <button
          onClick={() => setLang(lang === 'TH' ? 'EN' : 'TH')}
          className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-2.5 py-1.5 rounded-xl shadow-2xs transition-all"
        >
          <Globe className="w-3.5 h-3.5 text-slate-500" />
          <span>{lang}</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative p-2 rounded-xl text-slate-600 hover:text-[#0b1f3a] hover:bg-blue-50 transition-all border border-slate-200 bg-white shadow-2xs"
            title="การแจ้งเตือน"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white animate-pulse"></span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#0b1f3a]" />
                  <h3 className="font-bold text-[#0b1f3a] text-sm">การแจ้งเตือน & เวิร์กโฟลว์</h3>
                </div>
                <span className="text-[11px] font-bold text-[#0b1f3a] bg-blue-50 px-2 py-0.5 rounded-full">
                  {unreadCount} ใหม่
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">ไม่มีการแจ้งเตือนในขณะนี้</div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markNotificationAsRead(notif.id);
                        onSelectModule(notif.module);
                        setShowNotifMenu(false);
                      }}
                      className={`p-3.5 text-xs cursor-pointer transition-all ${
                        !notif.read ? 'bg-blue-50/50 hover:bg-blue-100/60 font-medium' : 'hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="font-bold text-[#0b1f3a] flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0b1f3a]"></span>
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{notif.timestamp}</span>
                      </div>
                      <p className="text-slate-700 text-xs leading-relaxed pl-3">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1 pr-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-2xs text-left"
          >
            <div className="w-8 h-8 rounded-full bg-[#0b1f3a] text-white font-bold flex items-center justify-center text-xs shadow-inner">
              {currentUser.name.replace(/^(นาย|นางสาว|นาง|ครู|ดร\.)\s*/, '').slice(0, 1)}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="truncate max-w-[120px]">{currentUser.name}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border ${roleInfo.bg}`}>
                  {roleInfo.label}
                </span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-2.5 z-50 max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 mb-1.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#0b1f3a]">สลับบทบาทผู้ใช้งาน</p>
                  <p className="text-[10px] text-slate-400">จำลองสิทธิ์การเสนอ-อนุมัติ-จัดสรร</p>
                </div>
                <ShieldCheck className="w-4 h-4 text-[#0b1f3a]" />
              </div>
              <div className="space-y-1">
                {users.map(u => {
                  const isActive = u.id === currentUser.id;
                  const uBadge = getRoleBadge(u.role);
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        setCurrentUser(u);
                        setShowUserMenu(false);
                      }}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs transition-all ${
                        isActive
                          ? 'bg-[#0b1f3a] text-white font-semibold shadow-xs'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-[#0b1f3a] font-bold flex items-center justify-center text-xs shrink-0">
                        {u.name.replace(/^(นาย|นางสาว|นาง|ครู|ดร\.)\s*/, '').slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="truncate font-bold">{u.name}</span>
                          {isActive ? (
                            <Check className="w-3.5 h-3.5 text-white shrink-0" />
                          ) : (
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${uBadge.bg}`}>
                              {uBadge.label}
                            </span>
                          )}
                        </div>
                        <p className={`text-[10px] truncate mt-0.5 ${isActive ? 'text-blue-200' : 'text-slate-400'}`}>
                          {u.position}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
