'use client';

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { authApi } from '../lib/api';
import {
  Bell,
  LogOut,
  Calendar,
  Layers
} from 'lucide-react';

interface HeaderProps {
  onSelectModule: (module: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onSelectModule }) => {
  const { currentUser, notifications, markNotificationAsRead, addToast } = useApp();
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'director': return { label: 'ผู้อำนวยการ', bg: 'bg-amber-100 text-amber-900 border-amber-200' };
      case 'deputy_personnel': return { label: 'รอง ผอ.บุคคล', bg: 'bg-blue-100 text-blue-900 border-blue-200' };
      case 'deputy_budget': return { label: 'รอง ผอ.งบประมาณ', bg: 'bg-orange-100 text-orange-900 border-orange-200' };
      case 'academic_affairs': return { label: 'ฝ่ายวิชาการ', bg: 'bg-purple-100 text-purple-900 border-purple-200' };
      case 'head': return { label: 'หัวหน้างาน', bg: 'bg-slate-100 text-slate-900 border-slate-200' };
      case 'technician': return { label: 'งานช่าง', bg: 'bg-rose-100 text-rose-900 border-rose-200' };
      case 'driver': return { label: 'พนักงานขับรถ', bg: 'bg-teal-100 text-teal-900 border-teal-200' };
      case 'admin': return { label: 'ผู้ดูแลระบบ', bg: 'bg-indigo-100 text-indigo-900 border-indigo-200' };
      default: return { label: 'ครูผู้สอน', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const roleInfo = getRoleBadge(currentUser.role);

  const handleLogout = async () => {
    try {
      await authApi.logout();
      window.location.reload();
    } catch {
      addToast('ออกจากระบบไม่สำเร็จ กรุณาลองใหม่', 'error');
    }
  };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-4 lg:px-7 py-3 flex items-center justify-between shadow-2xs">
      {/* School Emblem & Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-white p-1 shadow-xs border border-slate-100 flex items-center justify-center shrink-0">
          <img
            src="/school-logo.png"
            alt="ตราประจำโรงเรียนมกุฎเมืองราชวิทยาลัย"
            className="w-full h-full object-contain"
          />
        </div>
        <div>
          <h1 className="text-sm lg:text-base font-extrabold text-[#0b1f3a] tracking-tight flex items-center gap-1.5">
            <span>โรงเรียนมกุฎเมืองราชวิทยาลัย</span>
            <span className="hidden sm:inline text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
              MMV Smart School
            </span>
          </h1>
          <p className="text-[11px] text-slate-400 font-medium hidden md:block">
            สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง
          </p>
        </div>
      </div>

      {/* Right Action Tools */}
      <div className="flex items-center gap-3">
        {/* Date Display */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold">
          <Calendar className="w-3.5 h-3.5 text-[#0b1f3a]" />
          <span>{new Date().toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all shadow-2xs"
            title="การแจ้งเตือน"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse shadow-xs">
                {unreadCount}
              </span>
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

        {/* User Profile Info & Logout */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2.5 p-1 pr-3 rounded-2xl border border-slate-200 bg-white shadow-2xs text-left">
            <div className="w-8 h-8 rounded-full bg-[#0b1f3a] text-white font-bold flex items-center justify-center text-xs shadow-inner">
              {currentUser.name.replace(/^(นาย|นางสาว|นาง|ครู|ดร\.|ว่าที่\s*ร้อยตรี\s*หญิง|ว่าที่\s*ร้อยตรี|ว่าที่\s*ร\.ต\.\s*หญิง|ว่าที่\s*ร\.ต\.)\s*/, '').slice(0, 1)}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="truncate max-w-[120px]">{currentUser.name}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border ${roleInfo.bg}`}>
                  {roleInfo.label}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 shadow-2xs transition-all flex items-center gap-1.5 font-bold text-xs cursor-pointer"
            title="ออกจากระบบ (Log Out)"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden sm:inline">ออกจากระบบ</span>
          </button>
        </div>
      </div>
    </header>
  );
};
