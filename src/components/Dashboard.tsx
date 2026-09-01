'use client';

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { SchoolNews, SchoolOrder, SchoolEvent } from '../types';
import {
  Bell,
  FileText,
  Calendar,
  Sparkles,
  Download,
  Search,
  Plus,
  ChevronRight,
  Eye,
  Tag,
  Pin,
  Clock,
  MapPin,
  Users,
  Briefcase,
  CalendarDays,
  Car,
  Wrench,
  BookOpen,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Megaphone,
  Filter,
  Layers,
  ArrowUpRight
} from 'lucide-react';

interface DashboardProps {
  onSelectModule: (module: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectModule }) => {
  const { language, t } = useLanguage();
  const {
    currentUser,
    schoolNews,
    addSchoolNews,
    schoolOrders,
    addSchoolOrder,
    schoolEvents,
    leaveRequests,
    officialDuties,
    substituteLessons,
    roomBookings,
    vehicleBookings,
    pendingApprovalsByModule
  } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'news' | 'orders' | 'calendar'>('all');
  const [selectedNews, setSelectedNews] = useState<SchoolNews | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<SchoolOrder | null>(null);
  const [newsCategoryFilter, setNewsCategoryFilter] = useState<string>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Modals for adding news / orders (for Admins / Heads)
  const [showAddNewsModal, setShowAddNewsModal] = useState(false);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);

  // New News form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<SchoolNews['category']>('academic');
  const [newImage, setNewImage] = useState('');

  // New Order form state
  const [orderNo, setOrderNo] = useState('');
  const [orderTitle, setOrderTitle] = useState('');
  const [orderCategory, setOrderCategory] = useState<SchoolOrder['category']>('academic_administration');
  const [orderFile, setOrderFile] = useState<File | null>(null);

  const orderDepartments: Record<SchoolOrder['category'], string> = {
    academic_administration: 'กลุ่มบริหารวิชาการ',
    personnel_administration: 'กลุ่มบริหารบุคคล',
    budget_administration: 'กลุ่มบริหารงบประมาณ',
    general_administration: 'กลุ่มบริหารทั่วไป',
    executive_office: 'กลุ่มงานอำนวยการ',
    english_program: 'กลุ่มงาน English Program',
  };

  const canPublish = currentUser.role === 'admin' || currentUser.role === 'director' || currentUser.role === 'head' || currentUser.role === 'academic_affairs';
  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent) return;
    const saved = await addSchoolNews({
      title: newTitle,
      content: newContent,
      category: newCategory,
      author: currentUser.name,
      department: currentUser.department,
      imageUrl: newImage || 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=60',
      isPinned: false
    });
    if (!saved) return;
    setShowAddNewsModal(false);
    setNewTitle('');
    setNewContent('');
    setNewImage('');
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNo || !orderTitle || !orderFile) return;
    const today = new Date().toISOString().split('T')[0];
    const saved = await addSchoolOrder({
      orderNumber: orderNo,
      title: orderTitle,
      category: orderCategory,
      signDate: today,
      signedBy: '',
      department: orderDepartments[orderCategory],
      fileUrl: '',
      fileName: orderFile.name,
      fileSize: `${(orderFile.size / 1024 / 1024).toFixed(1)} MB`
    }, orderFile);
    if (!saved) return;
    setShowAddOrderModal(false);
    setOrderNo('');
    setOrderTitle('');
    setOrderFile(null);
  };

  // Filtered News
  const filteredNews = schoolNews.filter(n => {
    if (newsCategoryFilter === 'all') return true;
    return n.category === newsCategoryFilter;
  });

  // Filtered Orders
  const filteredOrders = schoolOrders.filter(o => {
    return o.title.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
           o.orderNumber.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
           o.department.toLowerCase().includes(orderSearchQuery.toLowerCase());
  });

  const now = new Date();
  const padDatePart = (value: number) => String(value).padStart(2, '0');
  const todayIso = `${now.getFullYear()}-${padDatePart(now.getMonth() + 1)}-${padDatePart(now.getDate())}`;
  const buddhistYear = now.getFullYear() + 543;
  const todayLabel = new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(now);
  const todayOfficialDuties = officialDuties.filter(duty =>
    duty.status === 'approved' && duty.startDate <= todayIso && duty.endDate >= todayIso
  );
  const todaySubstitutes = substituteLessons.filter(lesson => lesson.date === todayIso);
  const todayRoomBookings = roomBookings.filter(booking =>
    booking.status === 'approved' && booking.date === todayIso
  );
  const todayVehicleBookings = vehicleBookings.filter(booking =>
    booking.status === 'approved' && booking.startDate <= todayIso && booking.endDate >= todayIso
  );

  const getNewsBadge = (cat: SchoolNews['category']) => {
    switch (cat) {
      case 'academic': return { label: t('งานวิชาการ', 'Academic'), bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'personnel': return { label: t('งานบุคคล/ว.PA', 'Personnel / PA'), bg: 'bg-emerald-50 text-emerald-700 border-blue-200' };
      case 'activity': return { label: t('กิจกรรมโรงเรียน', 'School Activity'), bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'urgent': return { label: t('ด่วนที่สุด', 'Urgent'), bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      default: return { label: t('ข่าวทั่วไป', 'General News'), bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Welcome School Header & Quick Actions */}
      <div className="bg-white rounded-3xl p-6 border border-[#e6ebf2] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#0b1f3a] border border-blue-200">
              ● {t('ศูนย์ข้อมูลข่าวสารและคำสั่งโรงเรียน')}
            </span>
            <span className="text-xs text-slate-400 font-medium">{t('ภาคเรียนที่')} 1 / {language === 'en' ? now.getFullYear() : buddhistYear}</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-extrabold text-slate-800 tracking-tight">
            {t('โรงเรียนมกุฎเมืองราชวิทยาลัย')} (MMV Smart School)
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {t('ยินดีต้อนรับ', 'Welcome')} <strong>{currentUser.name}</strong> ({currentUser.position}) · {t('สพม.ชลบุรี ระยอง', 'Secondary Educational Service Area Office Chonburi Rayong')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {canPublish && (
            <>
              <button
                onClick={() => setShowAddNewsModal(true)}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all"
              >
                <Megaphone className="w-3.5 h-3.5 text-amber-600" />
                <span>+ {t('ประกาศข่าว')}</span>
              </button>
              <button
                onClick={() => setShowAddOrderModal(true)}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>+ {t('เพิ่มคำสั่ง')}</span>
              </button>
            </>
          )}
          <div className="flex w-full sm:w-auto items-center gap-2">
            <button
              onClick={() => onSelectModule('leave')}
              className="flex-1 sm:flex-none justify-center px-4 py-2 rounded-xl bg-[#0b1f3a] hover:bg-[#153a66] text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
            >
              <span>＋ {t('เขียนใบลา')}</span>
            </button>
            <button
              onClick={() => onSelectModule('official_duty')}
              className="flex-1 sm:flex-none justify-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
            >
              <span>✈ {t('ขอไปราชการ')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Quick Services Shortcuts (Bar) */}
      <div className="mobile-keep-columns grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        {[
          { id: 'leave', label: t('ระบบการลา'), icon: CalendarDays, color: 'text-emerald-700 bg-emerald-50 border-blue-200', desc: t('ยื่นลา & ติดตามผล', 'Submit & track leave') },
          { id: 'official_duty', label: t('ขอไปราชการ'), icon: Briefcase, color: 'text-blue-700 bg-blue-50 border-blue-200', desc: t('พิมพ์บันทึกข้อความ') },
          { id: 'vehicle', label: t('ขอใช้รถส่วนกลาง'), icon: Car, color: 'text-amber-700 bg-amber-50 border-amber-200', desc: t('จองรถและคนขับ', 'Book a vehicle and driver') },
          { id: 'room', label: t('จองห้องประชุม'), icon: Users, color: 'text-purple-700 bg-purple-50 border-purple-200', desc: t('3 ห้องหลักโรงเรียน', '3 main meeting rooms') },
          { id: 'repair', label: t('แจ้งซ่อมบำรุง'), icon: Wrench, color: 'text-rose-700 bg-rose-50 border-rose-200', desc: t('โสตฯ & อาคารสถานที่', 'AV, IT & facilities') },
          { id: 'lesson_plan', label: t('คลังแผนการสอน', 'Lesson Plan Repository'), icon: BookOpen, color: 'text-teal-700 bg-teal-50 border-teal-200', desc: t('ส่งฝ่ายวิชาการ', 'Submit to Academic Affairs') },
        ].map(srv => {
          const Icon = srv.icon;
          return (
            <button
              key={srv.id}
              onClick={() => onSelectModule(srv.id)}
              className="min-h-[82px] p-2.5 sm:p-3 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all text-left group flex items-center gap-2 sm:gap-3 shadow-2xs"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base border shrink-0 ${srv.color} group-hover:scale-105 transition-transform`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="font-bold text-slate-800 text-[11px] sm:text-xs leading-tight group-hover:text-blue-900 transition-colors">{srv.label}</div>
                  {pendingApprovalsByModule[srv.id] > 0 && <span className="min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center" title={`รายการรอดำเนินการในเมนู${srv.label}`}>{pendingApprovalsByModule[srv.id]}</span>}
                </div>
                <div className="text-[9px] sm:text-[10px] leading-tight text-slate-400 mt-1">{srv.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Main Split Section: Left (News & Directives) & Right (Calendar & Daily Operations) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: News & Directives Tabbed Area */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 3.1: News & Announcements */}
          <div className="bg-white rounded-3xl p-5 border border-[#e6ebf2] shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">{t('ข่าวประชาสัมพันธ์ & ข่าวสารโรงเรียน')}</h2>
                  <p className="text-[11px] text-slate-400">{t('ประกาศ นโยบาย และกิจกรรมสำคัญภายในโรงเรียน', 'School announcements, policies and important activities')}</p>
                </div>
              </div>

              {/* News Category Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setNewsCategoryFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${newsCategoryFilter === 'all' ? 'bg-white text-slate-800 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {t('ทั้งหมด')}
                </button>
                <button
                  onClick={() => setNewsCategoryFilter('academic')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${newsCategoryFilter === 'academic' ? 'bg-white text-slate-800 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {t('วิชาการ', 'Academic')}
                </button>
                <button
                  onClick={() => setNewsCategoryFilter('personnel')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${newsCategoryFilter === 'personnel' ? 'bg-white text-slate-800 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {t('บุคลากร', 'Personnel')}
                </button>
              </div>
            </div>

            {/* Featured Pinned News Card */}
            {filteredNews.length > 0 && filteredNews[0].isPinned && (
              <div
                onClick={() => setSelectedNews(filteredNews[0])}
                className="group relative rounded-2xl overflow-hidden border border-amber-200/80 bg-gradient-to-r from-amber-500/10 via-amber-50 to-white p-4 cursor-pointer hover:shadow-md transition-all flex flex-col sm:flex-row items-center gap-4"
              >
                {filteredNews[0].imageUrl && (
                  <div className="w-full sm:w-44 h-32 rounded-xl overflow-hidden shrink-0 relative">
                    <img
                      src={filteredNews[0].imageUrl}
                      alt={filteredNews[0].title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-extrabold flex items-center gap-1 shadow-sm">
                      <Pin className="w-2.5 h-2.5" /> ปักหมุด
                    </span>
                  </div>
                )}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getNewsBadge(filteredNews[0].category).bg}`}>
                      {getNewsBadge(filteredNews[0].category).label}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {filteredNews[0].date}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm leading-snug group-hover:text-amber-900 transition-colors line-clamp-2">
                    {filteredNews[0].title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {filteredNews[0].content}
                  </p>
                  <div className="text-[11px] font-bold text-amber-700 flex items-center gap-1 pt-1">
                    <span>อ่านรายละเอียดข่าว</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            )}

            {/* Other News List */}
            <div className="space-y-2.5">
              {filteredNews.slice(filteredNews[0]?.isPinned ? 1 : 0).map(item => {
                const badge = getNewsBadge(item.category);
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedNews(item)}
                    className="p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 cursor-pointer transition-all flex items-start justify-between gap-3 group"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {item.date}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate">
                          · โดย {item.author}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-xs leading-snug group-hover:text-[#0b1f3a] transition-colors line-clamp-1">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {item.content}
                      </p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3.2: School Orders & Directives (คำสั่งโรงเรียน & หนังสือเวียน) */}
          <div className="bg-white rounded-3xl p-5 border border-[#e6ebf2] shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">{t('คำสั่งโรงเรียน & หนังสือราชการ')}</h2>
                  <p className="text-[11px] text-slate-400">{t('คำสั่งแต่งตั้ง มอบหมายหน้าที่ และประกาศทางการ', 'Appointments, assignments and official announcements')}</p>
                </div>
              </div>

              {/* Order Search Bar */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-500 w-52 focus-within:border-blue-500 focus-within:bg-white transition-all">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  placeholder={t('ค้นหาเลขที่/ชื่อคำสั่ง...', 'Search order number or title...')}
                  className="bg-transparent border-none outline-hidden w-full text-xs placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Orders Table */}
            <div className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  {t('ไม่พบรายการคำสั่งที่ค้นหา', 'No matching school orders found')}
                </div>
              ) : (
                filteredOrders.map(order => (
                  <div
                    key={order.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2.5 rounded-xl transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                        📄
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-900 text-xs">
                            {order.orderNumber}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({order.signDate})
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-xs leading-snug line-clamp-1">
                          {order.title}
                        </h4>
                        <div className="text-[10px] text-slate-400 truncate">{order.department}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>เปิดดู</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Daily School Operations & Calendar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Section 4.1: Today's Operations Summary (สรุปภารกิจประจำวัน) */}
          <div className="bg-white rounded-3xl p-5 border border-[#e6ebf2] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#0b1f3a] font-bold flex items-center justify-center text-xs">
                  📊
                </div>
                <h3 className="font-bold text-slate-800 text-sm">{t('ภารกิจโรงเรียนวันนี้')}</h3>
              </div>
              <span className="text-[10px] font-bold text-[#0b1f3a] bg-emerald-50 px-2 py-0.5 rounded-full">
                {todayLabel}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between text-slate-700 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-blue-600" /> {t('ครูไปราชการวันนี้', 'Teachers on official duty today')}
                  </span>
                  <span className="font-bold text-blue-700">{todayOfficialDuties.length} {t('ท่าน', 'person(s)')}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {todayOfficialDuties.length > 0
                    ? `${todayOfficialDuties[0].userName} (${todayOfficialDuties[0].title})`
                    : t('ไม่มีรายการไปราชการวันนี้', 'No official duties today')}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between text-slate-700 font-bold">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-teal-600" /> {t('จัดครูสอนแทนวันนี้', 'Substitute teaching today')}
                  </span>
                  <span className="font-bold text-teal-700">{todaySubstitutes.length} {t('คาบ', 'period(s)')}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {todaySubstitutes.length > 0
                    ? `${todaySubstitutes[0].substituteTeacherName} สอนแทน ${todaySubstitutes[0].subjectCode} (${todaySubstitutes[0].gradeLevel})`
                    : t('ไม่มีรายการจัดสอนแทนวันนี้', 'No substitute teaching today')}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between text-slate-700 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-600" /> {t('การใช้ห้องประชุมวันนี้', 'Meeting room bookings today')}
                  </span>
                  <span className="font-bold text-purple-700">{todayRoomBookings.length} {t('รายการ', 'booking(s)')}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {todayRoomBookings.length > 0
                    ? `${todayRoomBookings[0].roomName} (${todayRoomBookings[0].title})`
                    : t('ไม่มีรายการใช้ห้องประชุมวันนี้', 'No meeting room bookings today')}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between text-slate-700 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-amber-600" /> {t('รถส่วนกลางปฏิบัติงาน', 'School vehicles in service')}
                  </span>
                  <span className="font-bold text-amber-700">{todayVehicleBookings.length} {t('คัน', 'vehicle(s)')}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {todayVehicleBookings.length > 0
                    ? `${todayVehicleBookings[0].vehicleName || 'รถที่จัดสรร'} ไป ${todayVehicleBookings[0].destination}`
                    : t('ไม่มีรถส่วนกลางปฏิบัติงานวันนี้', 'No school vehicles in service today')}
                </p>
              </div>
            </div>
          </div>

          {/* Section 4.2: School Calendar & Upcoming Events (ปฏิทินกิจกรรมโรงเรียน) */}
          <div className="bg-white rounded-3xl p-5 border border-[#e6ebf2] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">{t('ปฏิทินกิจกรรมสำคัญ')}</h3>
              </div>
            </div>

            <div className="space-y-2.5">
              {schoolEvents.map(evt => (
                <div
                  key={evt.id}
                  className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-indigo-700 uppercase">
                      {evt.date.split('-')[1] === '08' ? t('ส.ค.', 'Aug') : t('ก.ย.', 'Sep')}
                    </span>
                    <span className="text-xs font-extrabold text-slate-800">
                      {evt.date.split('-')[2]}
                    </span>
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <h4 className="font-bold text-slate-800 text-xs leading-snug line-clamp-1">
                      {evt.title}
                    </h4>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{evt.time || t('ตลอดวัน', 'All day')}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{evt.location || t('โรงเรียนมกุฎเมืองราชวิทยาลัย')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: View News Details */}
      {selectedNews && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${getNewsBadge(selectedNews.category).bg}`}>
                {getNewsBadge(selectedNews.category).label}
              </span>
              <button
                onClick={() => setSelectedNews(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              {selectedNews.imageUrl && (
                <div className="w-full h-56 rounded-2xl overflow-hidden">
                  <img src={selectedNews.imageUrl} alt={selectedNews.title} className="w-full h-full object-cover" />
                </div>
              )}
              <h2 className="text-base font-bold text-slate-800 leading-snug">
                {selectedNews.title}
              </h2>
              <div className="text-slate-400 text-[11px] flex items-center gap-2">
                <span>เผยแพร่เมื่อ: {selectedNews.date}</span>
                <span>· โดย: {selectedNews.author} ({selectedNews.department})</span>
              </div>
              <p className="text-slate-700 leading-relaxed text-sm whitespace-pre-line pt-2">
                {selectedNews.content}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedNews(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Order Details */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  📄
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">{selectedOrder.orderNumber}</h3>
                  <p className="text-xs text-slate-500">คำสั่งโรงเรียนมกุฎเมืองราชวิทยาลัย</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div><strong>เรื่อง:</strong> <span className="font-bold text-slate-800">{selectedOrder.title}</span></div>
                <div><strong>หน่วยงานที่รับผิดชอบ:</strong> {selectedOrder.department}</div>
                <div><strong>วันที่ออกคำสั่ง:</strong> {selectedOrder.signDate}</div>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-bold text-blue-950">{selectedOrder.fileName}</div>
                    <div className="text-[10px] text-blue-600">{selectedOrder.fileSize} · เอกสารราชการฉบับสมบูรณ์</div>
                  </div>
                </div>
                <button
                  onClick={() => window.open(selectedOrder.fileUrl, '_blank', 'noopener,noreferrer')}
                  disabled={!selectedOrder.fileUrl}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>เปิดเอกสาร</span>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Publish News (for Admin/Head) */}
      {showAddNewsModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-800">ประกาศข่าวประชาสัมพันธ์ใหม่</h3>
              </div>
              <button
                onClick={() => setShowAddNewsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNews} className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">หัวข้อข่าวประชาสัมพันธ์</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="เช่น กำหนดการสอบกลางภาคเรียนที่ 1/2567"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">หมวดหมู่ข่าว</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as SchoolNews['category'])}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden"
                  >
                    <option value="academic">งานวิชาการ</option>
                    <option value="personnel">งานบุคคล/ว.PA</option>
                    <option value="activity">กิจกรรมโรงเรียน</option>
                    <option value="general">ข่าวทั่วไป</option>
                    <option value="urgent">ด่วนที่สุด</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ลิงก์รูปภาพประกอบ (ถ้ามี)</label>
                  <input
                    type="url"
                    value={newImage}
                    onChange={(e) => setNewImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">เนื้อหาข่าว / รายละเอียด</label>
                <textarea
                  rows={4}
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="ระบุรายละเอียดข่าวสาร..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddNewsModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                >
                  เผยแพร่ข่าว
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add School Order (for Admin/Head) */}
      {showAddOrderModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-800">เพิ่มคำสั่งโรงเรียน / หนังสือราชการ</h3>
              </div>
              <button
                onClick={() => setShowAddOrderModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="py-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">เลขที่คำสั่ง</label>
                  <input
                    type="text"
                    required
                    value={orderNo}
                    onChange={(e) => setOrderNo(e.target.value)}
                    placeholder="เช่น คำสั่งที่ 185/2567"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">หมวดหมู่งาน</label>
                  <select
                    value={orderCategory}
                    onChange={(e) => setOrderCategory(e.target.value as SchoolOrder['category'])}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden"
                  >
                    <option value="academic_administration">กลุ่มบริหารวิชาการ</option>
                    <option value="personnel_administration">กลุ่มบริหารบุคคล</option>
                    <option value="budget_administration">กลุ่มบริหารงบประมาณ</option>
                    <option value="general_administration">กลุ่มบริหารทั่วไป</option>
                    <option value="executive_office">กลุ่มงานอำนวยการ</option>
                    <option value="english_program">กลุ่มงาน English Program</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">เรื่อง (ชื่อคำสั่ง)</label>
                <input
                  type="text"
                  required
                  value={orderTitle}
                  onChange={(e) => setOrderTitle(e.target.value)}
                  placeholder="เช่น แต่งตั้งคณะกรรมการดำเนินงานจัดกิจกรรม..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">กลุ่มงาน/ฝ่ายที่รับผิดชอบ</label>
                <input
                  type="text"
                  readOnly
                  required
                  value={orderDepartments[orderCategory]}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ไฟล์คำสั่ง / เอกสารแนบ</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                  onChange={(e) => setOrderFile(e.target.files?.[0] ?? null)}
                  className="w-full px-3 py-2 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 outline-hidden file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
                />
                <p className="mt-1 text-[10px] text-slate-500">รองรับ PDF, Word, Excel, PowerPoint และรูปภาพ ขนาดไม่เกิน 15 MB</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddOrderModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                >
                  บันทึกคำสั่ง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
