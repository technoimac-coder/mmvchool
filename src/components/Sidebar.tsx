'use client';

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ApiError, authApi, isAdminRole, lineAccountApi, type LineAccountStatus } from '../lib/api';
import {
  LayoutDashboard,
  CalendarDays,
  Briefcase,
  Car,
  Users,
  Wrench,
  UserCheck,
  Award,
  BookOpen,
  HelpCircle,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  Check,
  Bell,
  X,
  LogOut,
  MessageCircle,
  Link2,
  Copy,
  Loader2,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

interface SidebarProps {
  activeModule: string;
  onSelectModule: (module: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeModule, onSelectModule }) => {
  const { currentUser, pendingApprovalsCount, notifications, markNotificationAsRead, addToast } = useApp();
  
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showLineModal, setShowLineModal] = useState(false);
  const [lineStatus, setLineStatus] = useState<LineAccountStatus | null>(null);
  const [lineCode, setLineCode] = useState('');
  const [lineLoading, setLineLoading] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const menuItems = [
    { id: 'dashboard', label: 'หน้าหลักของฉัน', icon: LayoutDashboard, category: 'ภาพรวม' },
    { id: 'personnel', label: 'ทำเนียบบุคลากร', icon: Users, category: 'ภาพรวม' },
    { id: 'leave', label: 'ระบบการลา', icon: CalendarDays, category: 'ระบบงานโรงเรียน' },
    { id: 'official_duty', label: 'ขออนุญาตไปราชการ', icon: Briefcase, category: 'ระบบงานโรงเรียน' },
    { id: 'vehicle', label: 'ขอใช้รถส่วนกลาง', icon: Car, category: 'ระบบงานโรงเรียน' },
    { id: 'room', label: 'จองห้องประชุม', icon: Users, category: 'ระบบงานโรงเรียน' },
    { id: 'repair', label: 'แจ้งซ่อมบำรุง', icon: Wrench, category: 'ระบบงานโรงเรียน' },
    { id: 'substitute', label: 'จัดครูสอนแทน', icon: UserCheck, category: 'การอนุมัติและติดตาม' },
    { id: 'portfolio', label: 'ผลงาน & ว.PA', icon: Award, category: 'การอนุมัติและติดตาม' },
    { id: 'lesson_plan', label: 'แผนการจัดการเรียนรู้', icon: BookOpen, category: 'การอนุมัติและติดตาม' },
    { id: 'admin_console', label: 'ศูนย์ควบคุมผู้ดูแลระบบ', icon: ShieldCheck, category: 'การอนุมัติและติดตาม' },
  ].filter(item => item.id !== 'admin_console' || isAdminRole(currentUser.role));

  const categories = ['ภาพรวม', 'ระบบงานโรงเรียน', 'การอนุมัติและติดตาม'];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'director': return { label: 'ผู้อำนวยการ', bg: 'bg-amber-500/20 text-amber-300 border-amber-400/30' };
      case 'deputy_personnel': return { label: 'รอง ผอ.บุคคล', bg: 'bg-blue-500/20 text-blue-300 border-blue-400/30' };
      case 'deputy_budget': return { label: 'รอง ผอ.งบประมาณ', bg: 'bg-orange-500/20 text-orange-300 border-orange-400/30' };
      case 'academic_affairs': return { label: 'ฝ่ายวิชาการ', bg: 'bg-purple-500/20 text-purple-300 border-purple-400/30' };
      case 'head': return { label: 'ผู้ดูแล/หัวหน้า', bg: 'bg-slate-500/20 text-slate-300 border-slate-400/30' };
      case 'technician': return { label: 'งานช่าง', bg: 'bg-rose-500/20 text-rose-300 border-rose-400/30' };
      case 'driver': return { label: 'พนักงานขับรถ', bg: 'bg-teal-500/20 text-teal-300 border-teal-400/30' };
      default: return { label: 'ครูผู้สอน', bg: 'bg-blue-500/20 text-blue-300 border-blue-400/30' };
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

  const refreshLineStatus = async () => {
    setLineLoading(true);
    try {
      const status = await lineAccountApi.status();
      setLineStatus(status);
      if (status.linked) setLineCode('');
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ไม่สามารถตรวจสอบสถานะ LINE ได้', 'error');
    } finally {
      setLineLoading(false);
    }
  };

  const openLineModal = () => {
    setShowLineModal(true);
    void refreshLineStatus();
  };

  const createLineCode = async () => {
    setLineLoading(true);
    try {
      const result = await lineAccountApi.createCode();
      setLineCode(result.code);
      addToast('สร้างรหัสเชื่อมบัญชีแล้ว รหัสมีอายุ 10 นาที', 'success');
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ไม่สามารถสร้างรหัสเชื่อมบัญชีได้', 'error');
    } finally {
      setLineLoading(false);
    }
  };

  const copyLineCommand = async () => {
    if (!lineCode) return;
    await navigator.clipboard.writeText(`ผูกบัญชี ${lineCode}`);
    addToast('คัดลอกข้อความสำหรับส่งใน LINE แล้ว', 'success');
  };

  const disconnectLine = async () => {
    if (!window.confirm('ยืนยันยกเลิกการเชื่อมบัญชี LINE หรือไม่?')) return;
    setLineLoading(true);
    try {
      await lineAccountApi.disconnect();
      setLineStatus({ linked: false, linkedAt: null });
      setLineCode('');
      addToast('ยกเลิกการเชื่อมบัญชี LINE แล้ว', 'success');
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ไม่สามารถยกเลิกการเชื่อมบัญชีได้', 'error');
    } finally {
      setLineLoading(false);
    }
  };

  return (
    <aside className="w-64 bg-gradient-to-b from-[#0b1f3a] via-[#102a4e] to-[#08172c] text-white flex flex-col justify-between shrink-0 shadow-2xl select-none z-30 border-r border-[#1e3a63] h-full">
      {/* Brand Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-white p-1 flex items-center justify-center shadow-md ring-2 ring-blue-300/30 shrink-0">
            <img src="/school-logo.png" alt="ตราโรงเรียนมกุฎเมืองราชวิทยาลัย" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-white text-sm tracking-tight truncate">
              MMV Smart School
            </div>
            <div className="text-[11px] text-blue-200/70 truncate">
              โรงเรียนมกุฎเมืองราชวิทยาลัย
            </div>
          </div>
        </div>

        {/* Notifications Icon Button */}
        <button
          onClick={() => setShowNotifModal(true)}
          className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all shrink-0"
          title="การแจ้งเตือน"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center ring-2 ring-[#0b1f3a] animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Navigation Menu */}
      <div className="p-3 space-y-3.5 overflow-y-auto flex-1 custom-scrollbar">
        {categories.map(cat => {
          const items = menuItems.filter(i => i.category === cat);
          return (
            <div key={cat} className="space-y-1">
              <div className="px-3 py-0.5 text-[10px] font-bold text-blue-200/60 uppercase tracking-wider">
                {cat}
              </div>
              <div className="space-y-0.5">
                {items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeModule === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectModule(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                        isActive
                          ? 'bg-white text-[#0b1f3a] shadow-md font-bold'
                          : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-[#0b1f3a]' : 'text-blue-300/70'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.id === 'dashboard' && pendingApprovalsCount > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${isActive ? 'bg-[#0b1f3a] text-white' : 'bg-rose-500 text-white animate-pulse'}`}>
                          {pendingApprovalsCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Area: Real Authenticated User Profile & Logout */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center justify-between p-2 rounded-2xl bg-white/10 border border-white/10 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white text-[#0b1f3a] font-extrabold flex items-center justify-center text-xs shrink-0 shadow-inner">
              {currentUser.name.replace(/^(นาย|นางสาว|นาง|ครู|ดร\.)\s*/, '').slice(0, 1)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate max-w-[110px]">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-blue-200/70 truncate max-w-[110px]">
                {currentUser.position}
              </div>
            </div>
          </div>

          <button
            onClick={openLineModal}
            className="relative p-2 rounded-xl bg-white/10 hover:bg-emerald-500 text-blue-200 hover:text-white border border-white/10 transition-all shrink-0 cursor-pointer"
            title="เชื่อมบัญชี LINE"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {lineStatus?.linked && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#102a4e]" />
            )}
          </button>

          <button
            onClick={() => void handleLogout()}
            className="p-2 rounded-xl bg-white/10 hover:bg-rose-500 text-blue-200 hover:text-white border border-white/10 transition-all shrink-0 cursor-pointer"
            title="ออกจากระบบ (Log Out)"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* LINE Account Linking Modal */}
      {showLineModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#06C755] text-white flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">เชื่อมบัญชี LINE</h3>
                  <p className="text-[10px] text-slate-500">รับผลอนุมัติที่เกี่ยวข้องกับคุณโดยตรง</p>
                </div>
              </div>
              <button onClick={() => setShowLineModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-5">
              {lineLoading && !lineStatus ? (
                <div className="py-10 flex items-center justify-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : lineStatus?.linked ? (
                <div className="space-y-4 text-center">
                  <CheckCircle2 className="w-14 h-14 text-[#06C755] mx-auto" />
                  <div>
                    <h4 className="font-bold text-emerald-700">เชื่อมบัญชีสำเร็จแล้ว</h4>
                    <p className="text-xs text-slate-500 mt-1">LINE นี้ผูกกับบัญชี {currentUser.name}</p>
                  </div>
                  <button
                    onClick={() => void disconnectLine()}
                    disabled={lineLoading}
                    className="w-full py-2.5 rounded-xl border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-50 disabled:opacity-50"
                  >
                    ยกเลิกการเชื่อมบัญชี
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-xs text-emerald-900 leading-relaxed">
                    <ol className="list-decimal pl-4 space-y-1.5">
                      <li>เพิ่มเพื่อน LINE OA <strong>@162dxdae</strong></li>
                      <li>สร้างรหัสเชื่อมบัญชีด้านล่าง</li>
                      <li>ส่งข้อความ “ผูกบัญชี ตามด้วยรหัส” ในแชตส่วนตัว</li>
                      <li>กลับมากดตรวจสอบสถานะ</li>
                    </ol>
                  </div>

                  {!lineCode ? (
                    <button
                      onClick={() => void createLineCode()}
                      disabled={lineLoading}
                      className="w-full py-3 rounded-xl bg-[#06C755] hover:bg-[#05b84e] text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {lineLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                      สร้างรหัสเชื่อมบัญชี
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-[10px] text-slate-500 mb-1">รหัสมีอายุ 10 นาที</p>
                        <div className="font-mono text-3xl tracking-[0.25em] font-black text-[#0b1f3a]">{lineCode}</div>
                      </div>
                      <button
                        onClick={() => void copyLineCommand()}
                        className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-2"
                      >
                        <Copy className="w-4 h-4" /> คัดลอก “ผูกบัญชี {lineCode}”
                      </button>
                      <a
                        href="https://line.me/R/ti/p/@162dxdae"
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2.5 rounded-xl bg-[#06C755] text-white text-xs font-bold flex items-center justify-center gap-2"
                      >
                        เปิดแชต LINE OA <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  <button
                    onClick={() => void refreshLineStatus()}
                    disabled={lineLoading}
                    className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 disabled:opacity-50"
                  >
                    {lineLoading ? 'กำลังตรวจสอบ...' : 'ตรวจสอบสถานะการเชื่อมบัญชี'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotifModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#0b1f3a]" />
                <h3 className="font-bold text-slate-800 text-sm">การแจ้งเตือน & เวิร์กโฟลว์</h3>
              </div>
              <button
                onClick={() => setShowNotifModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 py-2">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">ไม่มีการแจ้งเตือนในขณะนี้</div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      markNotificationAsRead(notif.id);
                      onSelectModule(notif.module);
                      setShowNotifModal(false);
                    }}
                    className={`p-3 text-xs cursor-pointer transition-all ${
                      !notif.read ? 'bg-blue-50/60 hover:bg-blue-100/60 font-medium' : 'hover:bg-slate-50 text-slate-600'
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
        </div>
      )}
    </aside>
  );
};
