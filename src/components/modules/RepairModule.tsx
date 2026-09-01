'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RepairTicket, RepairCategory } from '../../types';
import { getPipelineAssignee } from '../../config/approvalWorkflow';
import {
  Wrench,
  Plus,
  Clock,
  FileText,
  Filter,
  Check,
  Building,
  CheckCheck,
  UserCheck,
  Zap,
  Droplets,
  Tv,
  HelpCircle,
  Armchair,
  Monitor,
  Bell,
  MapPin,
  Image as ImageIcon,
  Upload,
  X,
  Eye,
  AlertCircle
} from 'lucide-react';

export const RepairModule: React.FC = () => {
  const {
    currentUser,
    repairTickets,
    addRepairTicket,
    acknowledgeAndAssignRepair,
    submitRepairReportByTechnician,
    confirmRepairByUser,
    users,
    pipelinesConfig,
    markRelatedNotificationsAsRead,
  } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<RepairTicket | null>(null);

  React.useEffect(() => {
    if (selectedTicket) markRelatedNotificationsAsRead('repair', selectedTicket.id);
  }, [selectedTicket, markRelatedNotificationsAsRead]);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);

  // Form State (Clean 3-field structure)
  const [category, setCategory] = useState<RepairCategory>('audio_visual');
  const [location, setLocation] = useState('');
  const [issueDetails, setIssueDetails] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string>('');

  // Action State
  const [assignedTechnicianId, setAssignedTechnicianId] = useState('');
  const [headComment, setHeadComment] = useState('');

  // Technician Report State
  const [repairDetails, setRepairDetails] = useState('');
  const [repairPhotoUrl, setRepairPhotoUrl] = useState('');

  // Confirmation State
  const [rating, setRating] = useState<number>(5);
  const [feedback, setFeedback] = useState('');

  const technicians = users.filter(u => u.role === 'technician' || u.role === 'head');

  const isAV = category === 'audio_visual' || category === 'computer_network';

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim() || !issueDetails.trim()) {
      alert('กรุณาระบุห้อง/สถานที่ และรายการอาการที่ชำรุดให้ครบถ้วน');
      return;
    }

    addRepairTicket({
      userId: currentUser.id,
      userName: currentUser.name,
      userPhone: currentUser.phone,
      department: currentUser.department,
      category,
      title: issueDetails.trim(),
      description: issueDetails.trim(),
      building: '',
      floor: '',
      roomNumber: location.trim(),
      location: location.trim(),
      photoUrl: photoUrl || undefined,
      urgency: 'medium'
    });

    setShowModal(false);
    setLocation('');
    setIssueDetails('');
    setPhotoUrl('');
  };

  const getAssignedManagerId = (cat: RepairCategory) => {
    const isAudioVisual = cat === 'audio_visual' || cat === 'computer_network';
    const defaultId = isAudioVisual ? 'MMV96' : 'MMV03';
    const pipelineId = isAudioVisual ? 'pipe-repair-av' : 'pipe-repair-build';
    return getPipelineAssignee(pipelinesConfig, pipelineId, 2, defaultId);
  };

  const handleRepairPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('รูปภาพต้องมีขนาดไม่เกิน 5 MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setRepairPhotoUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const getAssignedManagerName = (cat: RepairCategory) => {
    const isAudioVisual = cat === 'audio_visual' || cat === 'computer_network';
    const defaultHandler = isAudioVisual ? 'ผู้ดูแลงานโสตทัศนูปกรณ์และไอที' : 'หัวหน้างานอาคารสถานที่';
    const user = users.find(candidate => candidate.id === getAssignedManagerId(cat));
    return user?.name || defaultHandler;
  };

  const getRepairAssignerId = (cat: RepairCategory) => {
    return getAssignedManagerId(cat);
  };

  const getCategoryInfo = (cat: RepairCategory) => {
    const handlerName = getAssignedManagerName(cat);
    switch (cat) {
      case 'audio_visual':
        return { label: 'โสตทัศนูปกรณ์ / โปรเจกเตอร์ / ลำโพง', icon: Tv, bg: 'bg-purple-100 text-purple-800', isAV: true, handler: handlerName };
      case 'computer_network':
        return { label: 'คอมพิวเตอร์ / อุปกรณ์ไอที / เครือข่าย', icon: Monitor, bg: 'bg-cyan-100 text-cyan-800', isAV: true, handler: handlerName };
      case 'electricity':
        return { label: 'งานไฟฟ้า / หลอดไฟ / ปลั๊กไฟ', icon: Zap, bg: 'bg-amber-100 text-amber-800', isAV: false, handler: handlerName };
      case 'plumbing':
        return { label: 'งานประปา / ก๊อกน้ำ / สุขภัณฑ์', icon: Droplets, bg: 'bg-blue-100 text-blue-800', isAV: false, handler: handlerName };
      case 'furniture':
        return { label: 'ครุภัณฑ์และเฟอร์นิเจอร์', icon: Armchair, bg: 'bg-indigo-100 text-indigo-800', isAV: false, handler: handlerName };
      case 'building':
        return { label: 'อาคารสถานที่ / ประตูหน้าต่าง', icon: Building, bg: 'bg-emerald-100 text-emerald-800', isAV: false, handler: handlerName };
      default:
        return { label: 'งานซ่อมบำรุงอื่นๆ', icon: HelpCircle, bg: 'bg-slate-100 text-slate-800', isAV: false, handler: handlerName };
    }
  };

  const getStageBadge = (stage: RepairTicket['repairStage'], cat: RepairCategory) => {
    const handlerTitle = getAssignedManagerName(cat);

    switch (stage) {
      case 'reported':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> 1. รอ{handlerTitle}รับแจ้ง
          </span>
        );
      case 'head_acknowledged':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 flex items-center gap-1">
            <Wrench className="w-3.5 h-3.5" /> 2. กำลังดำเนินการซ่อม
          </span>
        );
      case 'repaired_pending_confirm':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> 3. ซ่อมเสร็จแล้ว (รอผู้แจ้งยืนยัน)
          </span>
        );
      case 'user_confirmed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 flex items-center gap-1">
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> 4. ตรวจรับงานเสร็จสมบูรณ์
          </span>
        );
      default:
        return null;
    }
  };

  const filteredTickets = repairTickets.filter(t => {
    if (filterType === 'my') return t.userId === currentUser.id;
    if (filterType === 'av') return t.category === 'audio_visual' || t.category === 'computer_network';
    if (filterType === 'facilities') return t.category !== 'audio_visual' && t.category !== 'computer_network';
    if (filterType === 'reported') return t.repairStage === 'reported';
    if (filterType === 'in_progress') return t.repairStage === 'head_acknowledged';
    if (filterType === 'pending_confirm') return t.repairStage === 'repaired_pending_confirm';
    if (filterType === 'completed') return t.repairStage === 'user_confirmed';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-rose-600 via-pink-600 to-purple-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="w-6 h-6 text-rose-200" />
            <h2 className="text-xl font-bold">ระบบแจ้งซ่อมบำรุงและโสตทัศนูปกรณ์</h2>
          </div>
          <p className="text-rose-100 text-xs sm:text-sm">
            ฟอร์มกระชับ กรอกง่าย ส่งตรงถึงผู้รับผิดชอบ 2 สายงาน (โสตทัศนูปกรณ์/ไอที และ อาคารสถานที่)
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 bg-white text-rose-900 px-5 py-2.5 rounded-xl font-semibold hover:bg-rose-50 transition-all shadow-sm active:scale-95 shrink-0"
        >
          <Plus className="w-5 h-5 text-rose-600" />
          แจ้งซ่อมบำรุง
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 uppercase">ตัวกรองรายการ</span>
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'all' ? 'bg-white shadow-xs text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                ทั้งหมด ({repairTickets.length})
              </button>
              <button
                onClick={() => setFilterType('av')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'av' ? 'bg-purple-600 shadow-xs text-white font-bold' : 'text-purple-700 hover:bg-purple-50'}`}
              >
                🖥️ งานโสตฯ & ไอที ({repairTickets.filter(t => t.category === 'audio_visual' || t.category === 'computer_network').length})
              </button>
              <button
                onClick={() => setFilterType('facilities')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'facilities' ? 'bg-emerald-600 shadow-xs text-white font-bold' : 'text-emerald-700 hover:bg-emerald-50'}`}
              >
                🏛️ อาคาร & ไฟฟ้า/ประปา ({repairTickets.filter(t => t.category !== 'audio_visual' && t.category !== 'computer_network').length})
              </button>
              <button
                onClick={() => setFilterType('reported')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'reported' ? 'bg-white shadow-xs text-amber-700 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                รอรับแจ้ง ({repairTickets.filter(t => t.repairStage === 'reported').length})
              </button>
              <button
                onClick={() => setFilterType('my')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'my' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
              >
                ของฉัน
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">รหัสแจ้งซ่อม</th>
                <th className="py-3.5 px-4">หมวดหมู่ & ผู้รับแจ้ง</th>
                <th className="py-3.5 px-4">รายการและอาการที่ชำรุด</th>
                <th className="py-3.5 px-4">ห้อง / สถานที่</th>
                <th className="py-3.5 px-4">รูปถ่าย</th>
                <th className="py-3.5 px-4">ผู้แจ้ง</th>
                <th className="py-3.5 px-4">ผู้รับผิดชอบ</th>
                <th className="py-3.5 px-4">สถานะ</th>
                <th className="py-3.5 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    ไม่พบรายการแจ้งซ่อมตามเงื่อนไข
                  </td>
                </tr>
              ) : (
                filteredTickets.map(t => {
                  const catInfo = getCategoryInfo(t.category);
                  const CatIcon = catInfo.icon;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-rose-700">{t.id}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold inline-flex items-center gap-1 ${catInfo.bg}`}>
                          <CatIcon className="w-3.5 h-3.5" />
                          {catInfo.label}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          🔔 {catInfo.handler}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-800 line-clamp-2">{t.title}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="font-bold text-rose-900">{t.location}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {t.photoUrl ? (
                          <button
                            onClick={() => setPreviewImageModal(t.photoUrl!)}
                            className="relative group w-9 h-9 rounded-xl overflow-hidden border border-slate-200 shadow-2xs hover:scale-105 transition-transform"
                          >
                            <img src={t.photoUrl} alt="รูปจุดชำรุด" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] transition-opacity">
                              <Eye className="w-3.5 h-3.5" />
                            </div>
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{t.userName}</div>
                        <div className="text-[11px] text-slate-400">{t.department}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {t.assignedTechnician ? (
                          <span className="text-slate-800 font-medium">{t.assignedTechnician}</span>
                        ) : (
                          <span className="text-amber-600 italic">ยังไม่มอบหมาย</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">{getStageBadge(t.repairStage, t.category)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedTicket(t)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-700 font-medium transition-colors inline-flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          ดูรายละเอียด
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Repair Ticket (Consolidated Single Issue Field) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                  🔧
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">แจ้งซ่อมบำรุงและโสตทัศนูปกรณ์</h3>
                  <p className="text-xs text-slate-500">กรอกข้อมูล 3 ขั้นตอนง่าย ๆ แล้วกดส่งได้ทันที</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 mt-4 text-xs">
              {/* 1. Category */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">หัวข้องานซ่อม</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as RepairCategory)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-800"
                >
                  <option value="audio_visual">🖥️ งานโสตฯ — {getAssignedManagerName('audio_visual')}</option>
                  <option value="building">🏛️ งานอาคารสถานที่</option>
                </select>
              </div>

              {/* Dynamic Notification Routing Alert Box */}
              <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                isAV ? 'bg-purple-50 border-purple-200 text-purple-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <div className="flex items-center gap-2">
                  <Bell className={`w-4 h-4 shrink-0 ${isAV ? 'text-purple-600' : 'text-emerald-600'}`} />
                  <div>
                    <span className="font-bold">ระบบจะส่งการแจ้งเตือนไปยัง: </span>
                    <strong className="underline underline-offset-2">
                      {isAV 
                        ? getAssignedManagerName(category) 
                        : `${getAssignedManagerName(category)} (รองผู้อำนวยการฝ่ายทั่วไป)`}
                    </strong>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/80 shrink-0">
                  {isAV ? '🖥️ ฝ่ายโสตฯ/ไอที' : '🏛️ ฝ่ายอาคาร'}
                </span>
              </div>

              {/* 2. Room / Location */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  ระบุห้อง / สถานที่ที่ชำรุด <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="เช่น ห้อง 324 อาคาร 3, ห้อง Lab วิทย์ ชั้น 2, หอประชุมราชพฤกษ์, โรงฝึกงานช่าง"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-rose-300 bg-rose-50/30 outline-hidden font-medium text-slate-800 focus:bg-white focus:border-rose-500 transition-colors"
                  />
                  <MapPin className="w-4 h-4 text-rose-500 absolute left-3 top-3" />
                </div>
              </div>

              {/* 3. Consolidated Issue & Symptoms */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  รายการและอาการที่ชำรุด <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={issueDetails}
                  onChange={(e) => setIssueDetails(e.target.value)}
                  placeholder={
                    isAV
                      ? 'เช่น โปรเจกเตอร์เปิดติดแต่ภาพไม่ฉายบนจอ มีเสียงพัดลมดัง, ไมโครโฟนไร้สายไม่มีเสียง'
                      : 'เช่น หลอดไฟ LED หน้าห้องกระพริบไม่หยุด, ก๊อกน้ำอ่างล้างมือรั่วปิดไม่สนิท, ประตูล็อคไม่ได้'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-hidden font-medium text-slate-800 focus:bg-white focus:border-rose-500 transition-colors"
                />
              </div>

              {/* 4. Photo Upload Attachment */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-slate-500" />
                    แนบรูปถ่ายจุดที่ชำรุด (ถ้ามี)
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">JPG, PNG</span>
                </label>

                {photoUrl ? (
                  <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-slate-200 group bg-slate-900">
                    <img src={photoUrl} alt="รูปจุดชำรุด" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700 transition-colors"
                      title="ลบรูปภาพ"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-rose-400 bg-slate-50/50 hover:bg-rose-50/30 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors text-center">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="font-bold text-slate-700 text-xs">คลิกเพื่ออัปโหลดรูปภาพ</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 shadow-md shadow-rose-200"
                >
                  ส่งแจ้งซ่อม
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Details & Actions */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-800">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    รายการแจ้งซ่อม (เลขที่ {selectedTicket.id})
                  </h3>
                  <p className="text-xs text-slate-500">สถานะ: {getStageBadge(selectedTicket.repairStage, selectedTicket.category)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-slate-700">
                <div className="grid grid-cols-2 gap-2">
                  <div><strong>ผู้แจ้ง:</strong> {selectedTicket.userName} ({selectedTicket.department})</div>
                  <div><strong>เบอร์โทร:</strong> {selectedTicket.userPhone || '-'}</div>
                  <div className="col-span-2">
                    <strong>หมวดหมู่ & ผู้รับแจ้ง:</strong> <span className="font-bold text-indigo-700">{getCategoryInfo(selectedTicket.category).label}</span> (ส่งถึงผู้รับผิดชอบ 1 คน: {getCategoryInfo(selectedTicket.category).handler})
                  </div>
                  <div className="col-span-2">
                    <strong>ห้อง / สถานที่:</strong> <span className="font-bold text-rose-700">{selectedTicket.location}</span>
                  </div>
                  <div className="col-span-2">
                    <strong>รายการและอาการที่ชำรุด:</strong>
                    <div className="mt-1 p-2.5 rounded-xl bg-white border border-slate-200 font-medium text-slate-800">
                      {selectedTicket.title}
                    </div>
                  </div>
                  <div><strong>วันที่แจ้ง:</strong> {selectedTicket.createdAt}</div>
                </div>

                {/* Attached Photo Display */}
                {selectedTicket.photoUrl && (
                  <div className="pt-2 border-t border-slate-200">
                    <strong className="block text-slate-700 mb-1.5">รูปถ่ายจุดที่ชำรุด:</strong>
                    <div
                      onClick={() => setPreviewImageModal(selectedTicket.photoUrl!)}
                      className="w-full max-h-56 rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center cursor-pointer group relative"
                    >
                      <img src={selectedTicket.photoUrl} alt="รูปจุดที่ชำรุด" className="max-h-56 w-auto object-contain" />
                      <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                        <Eye className="w-4 h-4" /> คลิกเพื่อดูรูปขนาดเต็ม
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Approval Track History */}
              <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  ประวัติการปฏิบัติงานตามสายงาน
                </h4>

                {/* Stage 1: Head / AV Officer */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-semibold text-slate-800">
                    1. {getCategoryInfo(selectedTicket.category).handler}รับแจ้ง
                  </div>
                  {selectedTicket.headReview ? (
                    <div className="text-emerald-700 mt-1">
                      {getCategoryInfo(selectedTicket.category).isAV ? (
                        <>✓ รับแจ้งและเริ่มดำเนินการโดย: <strong>{selectedTicket.headReview.approvedBy}</strong> ({selectedTicket.headReview.date})</>
                      ) : (
                        <>✓ รับแจ้งและมอบหมายให้: <strong>{selectedTicket.headReview.assignedTechnicianName}</strong> โดย {selectedTicket.headReview.approvedBy} ({selectedTicket.headReview.date})</>
                      )}
                    </div>
                  ) : (
                    <div className="text-amber-600 mt-1">
                      ⏳ รอ{getCategoryInfo(selectedTicket.category).handler}รับแจ้ง{getCategoryInfo(selectedTicket.category).isAV ? '' : 'และมอบหมายเจ้าหน้าที่'}
                    </div>
                  )}
                </div>

                {/* Stage 2: Technician Report */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-semibold text-slate-800">2. บันทึกผลการซ่อมของ{getCategoryInfo(selectedTicket.category).isAV ? 'ผู้ดูแล' : 'ช่าง/เจ้าหน้าที่'}</div>
                  {selectedTicket.technicianReport ? (
                    <div className="text-slate-700 mt-1 space-y-0.5">
                      <div className="text-emerald-700 font-medium">✓ ดำเนินการเสร็จแล้วโดย: {selectedTicket.technicianReport.technicianName} ({selectedTicket.technicianReport.date})</div>
                      <div><strong>การดำเนินการ:</strong> {selectedTicket.technicianReport.repairDetails}</div>
                      {selectedTicket.technicianReport.repairPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewImageModal(selectedTicket.technicianReport!.repairPhotoUrl!)}
                          className="mt-2 block overflow-hidden rounded-xl border border-emerald-200 bg-white"
                        >
                          <img src={selectedTicket.technicianReport.repairPhotoUrl} alt="รูปงานที่ดำเนินการแก้ไข" className="max-h-56 w-auto object-contain" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-400 mt-1">
                      {selectedTicket.repairStage === 'head_acknowledged' ? '⏳ กำลังดำเนินการซ่อมบำรุง' : '- ยังไม่ถึงขั้นตอนนี้'}
                    </div>
                  )}
                </div>

                {/* Stage 3: Requester Confirmation */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-semibold text-slate-800">3. ผู้แจ้งกดยืนยันและตรวจรับงาน</div>
                  {selectedTicket.userConfirmation ? (
                    <div className="text-emerald-700 mt-1 space-y-0.5">
                      <div>✓ ตรวจรับงานเรียบร้อยโดย: {selectedTicket.userConfirmation.confirmedBy} ({selectedTicket.userConfirmation.date})</div>
                      <div className="flex items-center gap-1 text-amber-500 font-bold">
                        <span>คะแนนความพึงพอใจ:</span>
                        {'★'.repeat(selectedTicket.userConfirmation.rating || 5)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 mt-1">
                      {selectedTicket.repairStage === 'repaired_pending_confirm' ? '⏳ รอผู้แจ้งตรวจรับงานและให้คะแนนความพึงพอใจ' : '-'}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Form 1: Assign Technician */}
              {currentUser.id === getRepairAssignerId(selectedTicket.category) && selectedTicket.repairStage === 'reported' && (
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-3">
                  <div className="font-bold text-indigo-900">
                    การดำเนินการในบทบาท: {selectedTicket.category === 'audio_visual' || selectedTicket.category === 'computer_network' ? getCategoryInfo(selectedTicket.category).handler : 'รองผู้อำนวยการฝ่ายทั่วไป'} ({currentUser.name})
                  </div>
                  {!getCategoryInfo(selectedTicket.category).isAV && (
                    <div>
                      <label className="block text-slate-700 mb-1 font-semibold">มอบหมายเจ้าหน้าที่รับผิดชอบ</label>
                      <select
                        value={assignedTechnicianId}
                        onChange={(e) => setAssignedTechnicianId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white"
                      >
                        <option value="">-- เลือกเจ้าหน้าที่/ช่างผู้รับผิดชอบ --</option>
                        {technicians.filter(t => selectedTicket.category === 'computer_network' || t.id === 'MMV20').map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.position})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">ความเห็น/คำสั่งการ</label>
                    <input
                      type="text"
                      value={headComment}
                      onChange={(e) => setHeadComment(e.target.value)}
                      placeholder={getCategoryInfo(selectedTicket.category).isAV ? 'เช่น รับเรื่องและเริ่มตรวจสอบอุปกรณ์ทันที' : 'เช่น รับเรื่อง มอบหมายเจ้าหน้าที่เข้าตรวจสอบทันที'}
                      className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={async () => {
                        const fixedBuildingTechId = 'MMV20';
                        const isSingleAvHandler = getCategoryInfo(selectedTicket.category).isAV;
                        const selectedTechId = isSingleAvHandler ? currentUser.id : fixedBuildingTechId;
                        const tech = technicians.find(t => t.id === selectedTechId);
                        const techName = isSingleAvHandler ? currentUser.name : (tech ? tech.name : (getCategoryInfo(selectedTicket.category).isAV ? 'ผู้ดูแลงานไอที' : 'นายอนุชา โสลำภา'));
                        const techId = isSingleAvHandler ? currentUser.id : (tech ? tech.id : fixedBuildingTechId);
                        const saved = await acknowledgeAndAssignRepair(selectedTicket.id, {
                          technicianId: techId,
                          technicianName: techName,
                          comment: headComment
                        });
                        if (saved) setSelectedTicket(null);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-md"
                    >
                      {getCategoryInfo(selectedTicket.category).isAV ? '✓ รับแจ้ง & เริ่มดำเนินการ' : '✓ รับแจ้ง & มอบหมายผู้รับผิดชอบ'}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Form 2: Technician Reports Completion */}
              {currentUser.id === selectedTicket.assignedTechnicianId && selectedTicket.repairStage === 'head_acknowledged' && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                  <div className="font-bold text-amber-900">
                    การบันทึกผลงาน: ({currentUser.name})
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">รายละเอียดการดำเนินการแก้ไข</label>
                    <textarea
                      rows={2}
                      value={repairDetails}
                      onChange={(e) => setRepairDetails(e.target.value)}
                      placeholder="เช่น ตรวจสอบและเปลี่ยนสายสัญญาณ HDMI ใหม่ ทดสอบภาพและเสียงคมชัดปกติ"
                      className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">
                      แนบรูปงานที่ดำเนินการแก้ไข <span className="text-rose-600">*</span>
                    </label>
                    {repairPhotoUrl ? (
                      <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-white p-2">
                        <img src={repairPhotoUrl} alt="รูปงานที่ดำเนินการแก้ไข" className="mx-auto max-h-52 object-contain" />
                        <button type="button" onClick={() => setRepairPhotoUrl('')} className="absolute right-2 top-2 rounded-lg bg-rose-600 p-1.5 text-white">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-300 bg-white px-4 py-6 font-semibold text-amber-800 hover:bg-amber-50">
                        <Upload className="h-5 w-5" /> เลือกรูปหลังดำเนินการแก้ไข
                        <input type="file" accept="image/*" className="hidden" onChange={handleRepairPhotoUpload} />
                      </label>
                    )}
                    <div className="mt-1 text-[10px] text-slate-500">รองรับ JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB</div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={async () => {
                        if (!repairPhotoUrl) {
                          alert('กรุณาแนบรูปงานที่ดำเนินการแก้ไข');
                          return;
                        }
                        const saved = await submitRepairReportByTechnician(selectedTicket.id, {
                          repairDetails: repairDetails || 'ดำเนินการซ่อมแซมและทดสอบเรียบร้อยแล้ว',
                          repairPhotoUrl
                        });
                        if (saved) {
                          setRepairDetails('');
                          setRepairPhotoUrl('');
                          setSelectedTicket(null);
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 shadow-md"
                    >
                      ✓ บันทึกผลสำเร็จ ➔ ส่งต่อผู้แจ้งยืนยันตรวจรับ
                    </button>
                  </div>
                </div>
              )}

              {/* Action Form 3: Requester Confirms Completion */}
              {selectedTicket.repairStage === 'repaired_pending_confirm' && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                  <div className="font-bold text-emerald-900">
                    การตรวจรับงานโดยผู้แจ้งซ่อม: ({selectedTicket.userName})
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">ให้คะแนนความพึงพอใจ</label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setRating(star)}
                          className={`text-2xl transition-transform ${star <= rating ? 'text-amber-500 scale-110' : 'text-slate-300'}`}
                        >
                          ★
                        </button>
                      ))}
                      <span className="text-xs font-bold text-slate-600 ml-2">({rating} จาก 5 ดาว)</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">ข้อคิดเห็นเพิ่มเติม (ถ้ามี)</label>
                    <input
                      type="text"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="เช่น อุปกรณ์ใช้งานได้สมบูรณ์ บริการรวดเร็วมาก"
                      className="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-white"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        confirmRepairByUser(selectedTicket.id, { rating, comment: feedback });
                        setSelectedTicket(null);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 shadow-md shadow-emerald-200 flex items-center gap-1.5"
                    >
                      <CheckCheck className="w-4 h-4" />
                      <span>ผู้แจ้งกดยืนยันตรวจรับงาน (ปิดงานสมบูรณ์)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-900 text-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Image Preview Modal */}
      {previewImageModal && (
        <div
          onClick={() => setPreviewImageModal(null)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-60 flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
        >
          <div className="relative max-w-3xl max-h-[85vh] p-2 bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <img src={previewImageModal} alt="รูปขยายจุดชำรุด" className="max-h-[80vh] w-auto rounded-2xl object-contain" />
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
