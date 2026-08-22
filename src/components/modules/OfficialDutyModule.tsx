'use client';

import { SignaturePadModal } from '../SignaturePadModal';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { OfficialDutyRequest } from '../../types';
import { OfficialDutyPrintDocument } from '../OfficialDutyPrintDocument';
import { getOfficialDutyApprover } from '../../config/approvalWorkflow';
import {
  Briefcase,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  DollarSign,
  Car,
  FileText,
  Filter,
  Printer,
  Users,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  Search,
  Check,
  X,
  UserPlus
} from 'lucide-react';

interface OfficialDutyModuleProps {
  onNavigateToSubstitute?: (duty?: OfficialDutyRequest) => void;
}

export const OfficialDutyModule: React.FC<OfficialDutyModuleProps> = ({ onNavigateToSubstitute }) => {
  const {
    currentUser,
    officialDuties,
    addOfficialDuty,
    approveOfficialDutyByDeputy,
    approveOfficialDutyByDirector,
    rejectOfficialDutyAtStage,
    users,
    vehicles,
    pipelinesConfig,
  } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedDuty, setSelectedDuty] = useState<OfficialDutyRequest | null>(null);
  const [printDuty, setPrintDuty] = useState<OfficialDutyRequest | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [approverSignature, setApproverSignature] = useState<string | undefined>(currentUser.signatureUrl);
  const [showApproverSigModal, setShowApproverSigModal] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | undefined>(currentUser.signatureUrl);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalDays, setTotalDays] = useState(1);

  // Searchable Participants State
  const [participantsList, setParticipantsList] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Vehicle State (Referencing School Vehicles)
  const [vehicleType, setVehicleType] = useState<OfficialDutyRequest['vehicleType']>('school_vehicle');
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.id || '');
  const [supervisorName, setSupervisorName] = useState(currentUser.name);
  const [personalLicensePlate, setPersonalLicensePlate] = useState('');

  // Budget State (Flexible input)
  const [budgetType, setBudgetType] = useState<OfficialDutyRequest['budgetType']>('school_budget');
  const [budgetAmount, setBudgetAmount] = useState<number>(0);
  const [budgetCustomText, setBudgetCustomText] = useState('งบประมาณของโรงเรียนมกุฎเมืองราชวิทยาลัย');

  const teachers = users.filter(u => u.id !== currentUser.id && (u.role === 'teacher' || u.role === 'head' || u.role === 'academic_affairs'));

  // Filter teachers based on search query
  const filteredTeachers = teachers.filter(t => 
    !participantsList.includes(t.name) && 
    (t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     t.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddParticipant = (name: string) => {
    if (!name.trim()) return;
    if (!participantsList.includes(name.trim())) {
      setParticipantsList(prev => [...prev, name.trim()]);
    }
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleRemoveParticipant = (index: number) => {
    setParticipantsList(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateDuty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !location || !startDate || !endDate) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (!signatureUrl) {
      alert('กรุณาลงลายมือชื่อผู้ขอไปราชการก่อนส่งคำขอ');
      return;
    }

    const selectedVeh = vehicles.find(v => v.id === selectedVehicleId) || vehicles[0];

    const saved = await addOfficialDuty({
      userId: currentUser.id,
      userName: currentUser.name,
      userPosition: currentUser.position,
      department: currentUser.department,
      title,
      location,
      organizer,
      startDate,
      endDate,
      totalDays: Number(totalDays) || 1,
      participants: participantsList.length > 0 ? participantsList : ['-'],
      vehicleType,
      vehicleId: vehicleType === 'school_vehicle' ? selectedVeh?.id : undefined,
      vehicleName: vehicleType === 'school_vehicle' ? selectedVeh?.name : undefined,
      licensePlate: vehicleType === 'school_vehicle' ? selectedVeh?.licensePlate : undefined,
      driverName: vehicleType === 'school_vehicle' ? selectedVeh?.driverName : undefined,
      supervisorName: vehicleType === 'school_vehicle' ? supervisorName : undefined,
      personalLicensePlate: vehicleType === 'personal_car' ? personalLicensePlate : undefined,
      budgetType,
      budgetAmount: Number(budgetAmount) || 0,
      budgetCustomText: budgetType === 'none' ? undefined : (budgetCustomText.trim() || undefined),
      signatureUrl
    });

    if (!saved) return;

    setShowModal(false);
    setTitle('');
    setLocation('');
    setOrganizer('');
    setStartDate('');
    setEndDate('');
    setParticipantsList([]);
    setSearchQuery('');
    setBudgetAmount(0);
  };

  const isCurrentDutyApprover = (duty: OfficialDutyRequest) => {
    if (duty.currentStage === 'deputy_approval') return currentUser.id === getOfficialDutyApprover(pipelinesConfig, 'deputy_approval');
    if (duty.currentStage === 'director_approval') return currentUser.id === getOfficialDutyApprover(pipelinesConfig, 'director_approval');
    return false;
  };

  const isAdmin = currentUser.role === 'admin';
  const isAcademicManager = currentUser.id === 'MMV02' || currentUser.role === 'academic_affairs';
  const canManageDutyWorkflow = isAdmin
    || [
      getOfficialDutyApprover(pipelinesConfig, 'deputy_approval'),
      getOfficialDutyApprover(pipelinesConfig, 'director_approval'),
    ].includes(currentUser.id)
    || isAcademicManager;
  const ownDuties = officialDuties.filter(d => d.userId === currentUser.id);
  const dutiesWaitingForMe = isAdmin
    ? officialDuties.filter(d => d.status === 'pending' || (d.currentStage === 'academic_substitute' && !d.substituteScheduled))
    : officialDuties.filter(d =>
        (d.status === 'pending' && isCurrentDutyApprover(d)) ||
        (isAcademicManager && d.currentStage === 'academic_substitute' && !d.substituteScheduled)
      );
  const canViewAllDutyRecords = isAdmin || canManageDutyWorkflow;
  const reportDuties = canViewAllDutyRecords ? officialDuties : ownDuties;
  const academicDuties = (isAdmin || isAcademicManager)
    ? officialDuties.filter(d => d.forwardedToAcademic)
    : [];
  const filteredDuties = filterType === 'pending_me'
    ? dutiesWaitingForMe
    : filterType === 'academic_ready'
      ? academicDuties
      : filterType === 'my'
        ? ownDuties
        : reportDuties;

  const getStageBadge = (stage: OfficialDutyRequest['currentStage'], status: OfficialDutyRequest['status']) => {
    if (status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
          <XCircle className="w-3.5 h-3.5" /> ไม่อนุมัติ
        </span>
      );
    }

    switch (stage) {
      case 'admin_review':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><Clock className="w-3.5 h-3.5" /> 1. รอ รอง ผอ. ตรวจสอบและเสนอความเห็น</span>;
      case 'deputy_approval':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><Clock className="w-3.5 h-3.5" /> 1. รอ รอง ผอ. ตรวจสอบและเสนอความเห็น</span>;
      case 'director_approval':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800"><Clock className="w-3.5 h-3.5" /> 2. รอ ผอ. อนุมัติ</span>;
      case 'academic_substitute':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 animate-pulse"><GraduationCap className="w-3.5 h-3.5" /> 3. ส่งต่อวิชาการจัดสอนแทน</span>;
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800"><CheckCircle2 className="w-3.5 h-3.5" /> สมบูรณ์ครบถ้วน</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">รอดำเนินการ</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="w-6 h-6 text-blue-200" />
            <h2 className="text-xl font-bold">ระบบขออนุญาตไปราชการ (พิจารณา 2 ลำดับขั้น & ส่งต่อฝ่ายวิชาการ)</h2>
          </div>
          <p className="text-blue-100 text-xs sm:text-sm">
            เส้นทางเอกสาร: <strong>รอง ผอ. ตรวจสอบงบประมาณและเสนอความเห็น ➔ ผู้อำนวยการ ➔ ฝ่ายวิชาการจัดตารางสอนแทน</strong>
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 bg-white text-blue-900 px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-50 transition-all shadow-sm active:scale-95 shrink-0"
        >
          <Plus className="w-5 h-5 text-blue-600" />
          ยื่นขอไปราชการ
        </button>
      </div>

      {/* Workflow Step Diagram */}
      <div className="bg-white p-4 lg:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          สายการอนุมัติและการแจกจ่ายเอกสารราชการ (Multi-stage Approval & Academic Dispatch)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-xs shrink-0">1</div>
            <div>
              <div className="font-bold text-amber-900">รองผู้อำนวยการ</div>
              <div className="text-[11px] text-slate-600 mt-0.5">ตรวจสอบงบประมาณ ความเหมาะสม และเสนอความเห็น</div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs shrink-0">2</div>
            <div>
              <div className="font-bold text-purple-900">ผู้อำนวยการโรงเรียน</div>
              <div className="text-[11px] text-slate-600 mt-0.5">พิจารณาลงนามอนุมัติขั้นสุดท้าย</div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0">3</div>
            <div>
              <div className="font-bold text-emerald-900">ฝ่ายบริหารงานวิชาการ</div>
              <div className="text-[11px] text-slate-600 mt-0.5">จัดตารางสอนแทนรายคาบอัตโนมัติ</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 uppercase">ตัวกรองคำขอ</span>
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'all' ? 'bg-white shadow-xs text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {isAdmin ? 'ทั้งหมดในระบบ' : 'รายการของฉัน'} ({reportDuties.length})
              </button>
              {canManageDutyWorkflow && (
                <button
                  onClick={() => setFilterType('pending_me')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'pending_me' ? 'bg-white shadow-xs text-indigo-700 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  🔔 รอฉันพิจารณา / จัดการ ({dutiesWaitingForMe.length})
                </button>
              )}
              {(isAdmin || isAcademicManager) && (
                <button
                  onClick={() => setFilterType('academic_ready')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'academic_ready' ? 'bg-white shadow-xs text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  ส่งต่อฝ่ายวิชาการแล้ว ({academicDuties.length})
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setFilterType('my')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'my' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  คำขอของฉัน
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">เลขที่คำขอ</th>
                <th className="py-3.5 px-4">ผู้ขอไปราชการ</th>
                <th className="py-3.5 px-4">หัวข้อราชการ / โครงการ</th>
                <th className="py-3.5 px-4">วันที่เดินทาง</th>
                <th className="py-3.5 px-4">ขั้นตอนปัจจุบัน</th>
                <th className="py-3.5 px-4">การจัดสอนแทน</th>
                <th className="py-3.5 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDuties.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    ไม่พบรายการขอไปราชการ
                  </td>
                </tr>
              ) : (
                filteredDuties.map(duty => (
                  <tr key={duty.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-blue-700">{duty.id}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{duty.userName}</div>
                      <div className="text-[11px] text-slate-400">{duty.department}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-medium text-slate-800 line-clamp-1">{duty.title}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-rose-500" />
                        <span className="truncate">{duty.location}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div>{duty.startDate} ถึง {duty.endDate}</div>
                      <div className="text-[11px] text-slate-400">({duty.totalDays} วัน)</div>
                    </td>
                    <td className="py-3.5 px-4">{getStageBadge(duty.currentStage, duty.status)}</td>
                    <td className="py-3.5 px-4">
                      {duty.substituteScheduled ? (
                        <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 font-semibold text-[11px]">
                          ✓ จัดสอนแทนแล้ว
                        </span>
                      ) : duty.forwardedToAcademic ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold text-[11px] animate-pulse">
                          ⏳ รอวิชาการจัดสอนแทน
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => setPrintDuty(duty)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-slate-700 font-medium transition-colors inline-flex items-center gap-1 text-[11px]"
                          title="พิมพ์แบบขออนุญาตไปราชการ (A4)"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-600" />
                          พิมพ์ PDF
                        </button>
                        <button
                          onClick={() => setSelectedDuty(duty)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-slate-700 font-medium transition-colors inline-flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          ดูขั้นตอน
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Official Duty Form */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                  🏢
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">ยื่นแบบขออนุญาตไปราชการ</h3>
                  <p className="text-xs text-slate-500">โรงเรียนมกุฎเมืองราชวิทยาลัย</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDuty} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">หัวข้อราชการ / ชื่องาน / โครงการ <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น อบรมเชิงปฏิบัติการพัฒนาหลักสูตร AI ทางการศึกษา, พานักเรียนแข่งขันหุ่นยนต์ระดับภาค"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-hidden font-medium text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">สถานที่ไปราชการ <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="เช่น โรงแรมนิคมระยอง / มหาวิทยาลัยบูรพา"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-hidden font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">หน่วยงานผู้จัด</label>
                  <input
                    type="text"
                    value={organizer}
                    onChange={(e) => setOrganizer(e.target.value)}
                    placeholder="เช่น สพฐ. / สพม.ชลบุรี ระยอง"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-hidden font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ตั้งแต่วันที่ <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ถึงวันที่ <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">รวมจำนวน (วัน)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={totalDays}
                    onChange={(e) => setTotalDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-center font-bold"
                  />
                </div>
              </div>

              {/* 1. Searchable Teacher & Participant Picker */}
              <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-2.5">
                <label className="block font-bold text-blue-950">
                  ผู้ร่วมเดินทางไปด้วย (ในช่อง &ldquo;พร้อมด้วย...............&rdquo;)
                </label>

                {/* Selected Participants Chips/Tags */}
                {participantsList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-blue-200">
                    {participantsList.map((name, index) => (
                      <span
                        key={index}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-2xs"
                      >
                        <span>{name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(index)}
                          className="hover:bg-blue-700 p-0.5 rounded-full text-blue-200 hover:text-white transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Search & Autocomplete Input */}
                <div className="relative" ref={dropdownRef}>
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddParticipant(searchQuery);
                        }
                      }}
                      placeholder="พิมพ์ตัวอักษรเพื่อค้นหาชื่อครู หรือพิมพ์ชื่อนักเรียนแล้วกดเพิ่ม..."
                      className="w-full pl-9 pr-20 py-2.5 rounded-xl border border-blue-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:border-blue-500"
                    />
                    {searchQuery.trim() && (
                      <button
                        type="button"
                        onClick={() => handleAddParticipant(searchQuery)}
                        className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition-colors"
                      >
                        + เพิ่ม
                      </button>
                    )}
                  </div>

                  {/* Autocomplete Dropdown List */}
                  {showDropdown && searchQuery.trim() && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-slate-200 max-h-48 overflow-y-auto p-1.5 space-y-0.5">
                      {filteredTeachers.length > 0 ? (
                        filteredTeachers.map(t => (
                          <div
                            key={t.id}
                            onClick={() => handleAddParticipant(t.name)}
                            className="p-2 rounded-xl hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px]">
                                {t.name.charAt(0)}
                              </span>
                              <div>
                                <span className="font-bold text-slate-800 text-xs">{t.name}</span>
                                <span className="text-[10px] text-slate-400 ml-1.5">({t.position})</span>
                              </div>
                            </div>
                            <span className="text-[10px] text-blue-600 font-semibold px-2 py-0.5 bg-blue-100 rounded-md">
                              + เลือก
                            </span>
                          </div>
                        ))
                      ) : (
                        <div
                          onClick={() => handleAddParticipant(searchQuery)}
                          className="p-2.5 rounded-xl hover:bg-blue-50 cursor-pointer text-blue-700 font-medium text-xs flex items-center gap-1.5"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>เพิ่ม &ldquo;<strong>{searchQuery}</strong>&rdquo; เป็นผู้ร่วมเดินทาง</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 block">
                  💡 พิมพ์ชื่อเพื่อค้นหาครู หรือพิมพ์ชื่อนักเรียนตัวแทนแล้วกด <strong>+ เพิ่ม</strong>
                </span>
              </div>

              {/* 2. Transportation Options (Referencing School Vehicles) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <label className="block font-bold text-slate-800">
                  พาหนะเดินทาง (การเดินทางไปราชการครั้งนี้ ขออนุญาตเดินทางโดยพาหนะ)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setVehicleType('school_vehicle')}
                    className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                      vehicleType === 'school_vehicle'
                        ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-sm">🚐 รถยนต์ราชการ</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">รถส่วนกลางโรงเรียน</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVehicleType('personal_car')}
                    className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                      vehicleType === 'personal_car'
                        ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-sm">🚗 รถยนต์ส่วนตัว</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">ระบุทะเบียนรถส่วนตัว</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVehicleType('public_transport')}
                    className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                      vehicleType === 'public_transport'
                        ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-sm">🚌 พาหนะอื่น ๆ</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">รถโดยสาร/รับจ้าง</div>
                  </button>
                </div>

                {/* Sub-form when School Vehicle is chosen */}
                {vehicleType === 'school_vehicle' && (
                  <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        เลือกรถยนต์ราชการที่ได้รับอนุมัติใช้งาน (อ้างอิงจากรถโรงเรียน):
                      </label>
                      <select
                        value={selectedVehicleId}
                        onChange={(e) => setSelectedVehicleId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                      >
                        {vehicles.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name} (ทะเบียน {v.licensePlate}) - พนักงานขับรถ: {v.driverName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">พนักงานขับรถยนต์</label>
                        <input
                          type="text"
                          readOnly
                          value={vehicles.find(v => v.id === selectedVehicleId)?.driverName || ''}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">ชื่อผู้ควบคุมรถยนต์</label>
                        <input
                          type="text"
                          value={supervisorName}
                          onChange={(e) => setSupervisorName(e.target.value)}
                          placeholder="ชื่อครูผู้ควบคุม"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-blue-200 bg-white text-slate-800 font-medium"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-form when Personal Car is chosen */}
                {vehicleType === 'personal_car' && (
                  <div className="p-3 bg-white rounded-xl border border-blue-200">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      หมายเลขทะเบียนรถยนต์ส่วนตัว:
                    </label>
                    <input
                      type="text"
                      required
                      value={personalLicensePlate}
                      onChange={(e) => setPersonalLicensePlate(e.target.value)}
                      placeholder="เช่น กข-1234 ระยอง"
                      className="w-full px-3 py-2 rounded-xl border border-blue-200 bg-white font-bold text-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* 3. Budget Details (Flexible Input for Teacher) */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-2.5">
                <label className="block font-bold text-emerald-950">
                  การขอเบิกงบประมาณ (๒. โดยขออนุมัติเบิกค่าใช้จ่ายในการเดินทางไปราชการจากเงินงบประมาณ)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBudgetType('school_budget');
                      setBudgetCustomText('งบประมาณของโรงเรียนมกุฎเมืองราชวิทยาลัย');
                    }}
                    className={`p-2 rounded-xl border text-center font-medium transition-all ${
                      budgetType === 'school_budget'
                        ? 'bg-emerald-600 text-white font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    💵 ขอเบิกงบโรงเรียน
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBudgetType('organizer_budget');
                      setBudgetCustomText('งบประมาณจากหน่วยงานผู้จัด');
                    }}
                    className={`p-2 rounded-xl border text-center font-medium transition-all ${
                      budgetType === 'organizer_budget'
                        ? 'bg-emerald-600 text-white font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🏢 เบิกงบหน่วยงานผู้จัด
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBudgetType('none');
                      setBudgetCustomText('');
                      setBudgetAmount(0);
                    }}
                    className={`p-2 rounded-xl border text-center font-medium transition-all ${
                      budgetType === 'none'
                        ? 'bg-emerald-600 text-white font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🚫 ไม่ขอเบิกค่าใช้จ่าย
                  </button>
                </div>

                {budgetType !== 'none' && (
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        ข้อความระบุเงินงบประมาณที่ขอเบิก (จะพิมพ์ลงบนเส้นประข้อ ๒ ในใบขอไปราชการ):
                      </label>
                      <input
                        type="text"
                        required
                        value={budgetCustomText}
                        onChange={(e) => setBudgetCustomText(e.target.value)}
                        placeholder="เช่น งบประมาณของโรงเรียนมกุฎเมืองราชวิทยาลัย หรือ งบประมาณจาก สพฐ."
                        className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white font-medium text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        จำนวนเงินงบประมาณที่ขอเบิก (บาท):
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={budgetAmount}
                        onChange={(e) => setBudgetAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white font-bold text-emerald-950"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-bold text-blue-950">✍️ ลายมือชื่อผู้ขอไปราชการ</span>
                  <button
                    type="button"
                    onClick={() => setShowSignatureModal(true)}
                    className="px-4 py-2 rounded-xl bg-white border border-blue-300 text-blue-700 font-bold hover:bg-blue-50"
                  >
                    {signatureUrl ? '✏️ เปลี่ยนลายเซ็น' : '+ เซ็นชื่อ / อัปโหลดรูปลายเซ็น'}
                  </button>
                </div>
                <div className="h-24 rounded-xl border-2 border-dashed border-blue-200 bg-white flex items-center justify-center overflow-hidden">
                  {signatureUrl
                    ? <img src={signatureUrl} alt="ลายมือชื่อผู้ขอไปราชการ" className="max-h-full max-w-full object-contain" />
                    : <span className="text-xs text-slate-400">กรุณาลงลายมือชื่อก่อนส่งคำขอ</span>}
                </div>
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
                  className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-md shadow-blue-200"
                >
                  ส่งคำขอไปราชการ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Details & Multi-stage Approvals */}
      {selectedDuty && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    บันทึกข้อความขออนุมัติไปราชการ (เลขที่ {selectedDuty.id})
                  </h3>
                  <p className="text-xs text-slate-500">สถานะขั้นตอน: {getStageBadge(selectedDuty.currentStage, selectedDuty.status)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDuty(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              {/* Memo Document Details */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800 text-sm">{selectedDuty.title}</div>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div><strong>ผู้ขอไปราชการ:</strong> {selectedDuty.userName} ({selectedDuty.department})</div>
                  <div><strong>สถานที่:</strong> {selectedDuty.location}</div>
                  <div><strong>วันที่เดินทาง:</strong> {selectedDuty.startDate} ถึง {selectedDuty.endDate} ({selectedDuty.totalDays} วัน)</div>
                  <div><strong>งบประมาณ:</strong> {selectedDuty.budgetCustomText || (selectedDuty.budgetAmount > 0 ? `${selectedDuty.budgetAmount.toLocaleString()} บาท` : 'ไม่มีค่าใช้จ่าย')}</div>
                  <div className="col-span-2"><strong>ผู้ร่วมเดินทาง:</strong> {selectedDuty.participants.join(', ')}</div>
                  {selectedDuty.vehicleType === 'school_vehicle' && (
                    <div className="col-span-2">
                      <strong>พาหนะ:</strong> รถยนต์ราชการ {selectedDuty.vehicleName || ''} (ทะเบียน {selectedDuty.licensePlate || ''}) | คนขับ: {selectedDuty.driverName || ''} | ผู้ควบคุม: {selectedDuty.supervisorName || selectedDuty.userName}
                    </div>
                  )}
                  {selectedDuty.vehicleType === 'personal_car' && (
                    <div className="col-span-2">
                      <strong>พาหนะ:</strong> รถยนต์ส่วนตัว ทะเบียน {selectedDuty.personalLicensePlate || 'กข-1234 ระยอง'}
                    </div>
                  )}
                </div>
              </div>

              {/* Consolidated approval timeline */}
              <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  ประวัติการตรวจสอบและลงนามอนุมัติตามลำดับขั้น
                </h4>

                <div className="space-y-2.5">
                  {/* Step 1: Consolidated deputy review */}
                  <div className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                    selectedDuty.deputyApproval ? 'bg-amber-50/60 border-amber-200 text-amber-950' : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}>
                    <div>
                      <div className="font-bold text-xs">1. รองผู้อำนวยการตรวจสอบงบประมาณและเสนอความเห็น</div>
                      {selectedDuty.deputyApproval ? (
                        <div className="text-[11px] mt-0.5">
                          ✓ ตรวจสอบและเสนอความเห็นโดย: <strong>{selectedDuty.deputyApproval.approvedBy}</strong> ({selectedDuty.deputyApproval.date})
                          {selectedDuty.deputyApproval.comment && (
                            <div className="text-slate-600 mt-0.5">ความเห็น: {selectedDuty.deputyApproval.comment}</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-[11px] text-amber-600 mt-0.5">⏳ รอ รอง ผอ. ตรวจสอบงบประมาณ ความเหมาะสม และเสนอความเห็น</div>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Director Approval */}
                  <div className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                    selectedDuty.directorApproval ? 'bg-purple-50/60 border-purple-200 text-purple-950' : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}>
                    <div>
                      <div className="font-bold text-xs">2. ผู้อำนวยการโรงเรียน (อนุมัติขั้นสุดท้าย)</div>
                      {selectedDuty.directorApproval ? (
                        <div className="text-[11px] mt-0.5">
                          ✓ ลงนามอนุมัติโดย: <strong>{selectedDuty.directorApproval.approvedBy}</strong> ({selectedDuty.directorApproval.date})
                          {selectedDuty.directorApproval.comment && (
                            <div className="text-slate-600 mt-0.5">คำสั่งการ: {selectedDuty.directorApproval.comment}</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-[11px] text-amber-600 mt-0.5">⏳ รอผู้อำนวยการโรงเรียนลงนามอนุมัติ</div>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Academic Affairs Dispatch */}
                  <div className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                    selectedDuty.forwardedToAcademic ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}>
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <span>3. การแจกจ่ายไปยังฝ่ายบริหารงานวิชาการเพื่อจัดตารางสอนแทน</span>
                        {selectedDuty.substituteScheduled && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-extrabold">
                            ✓ จัดสอนแทนเรียบร้อย
                          </span>
                        )}
                      </div>
                      {selectedDuty.forwardedToAcademic ? (
                        <div className="text-[11px] text-emerald-800 mt-0.5">
                          ✓ เอกสารถูกส่งต่อเข้าคลังงานฝ่ายวิชาการแล้ว ระบบแจ้งเตือนหัวหน้าฝ่ายวิชาการ ({selectedDuty.substituteScheduled ? 'จัดครูสอนแทนครบถ้วน' : 'กำลังจัดตารางสอนแทน'})
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          (จะส่งต่อไปยังฝ่ายวิชาการโดยอัตโนมัติเมื่อผู้อำนวยการอนุมัติ)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {selectedDuty.status === 'pending' && isCurrentDutyApprover(selectedDuty) && (
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-bold text-indigo-950">ลายมือชื่อผู้พิจารณา ({currentUser.name})</span>
                    <button
                      type="button"
                      onClick={() => setShowApproverSigModal(true)}
                      className="px-4 py-2 rounded-xl bg-white border border-indigo-300 text-indigo-700 font-bold hover:bg-indigo-100"
                    >
                      {approverSignature ? '✏️ เปลี่ยนลายเซ็น' : '+ วาด/อัปโหลดรูปลายเซ็น'}
                    </button>
                  </div>
                  <div className="h-20 rounded-xl border-2 border-dashed border-indigo-200 bg-white flex items-center justify-center overflow-hidden">
                    {approverSignature
                      ? <img src={approverSignature} alt="ลายมือชื่อผู้พิจารณา" className="max-h-full max-w-full object-contain" />
                      : <span className="text-xs text-slate-400">กรุณาลงลายมือชื่อก่อนบันทึกผลการพิจารณา</span>}
                  </div>
                </div>
              )}

              {/* 1. Consolidated deputy review action */}
              {currentUser.id === getOfficialDutyApprover(pipelinesConfig, 'deputy_approval') && selectedDuty.currentStage === 'deputy_approval' && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                  <div className="font-bold text-amber-900">ตรวจสอบงบประมาณและเสนอความเห็น — ผู้ลงนาม: {currentUser.name}</div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">ผลการตรวจสอบงบประมาณและความเห็นประกอบ</label>
                    <input
                      type="text"
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      placeholder="เช่น ตรวจสอบงบประมาณและแผนงานแล้ว เห็นควรอนุมัติตามเสนอ"
                      className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white outline-hidden"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={async () => {
                        if (!approverSignature) {
                          alert('กรุณาลงลายมือชื่อก่อนบันทึกผลการพิจารณา');
                          return;
                        }
                        if (await rejectOfficialDutyAtStage(selectedDuty.id, 'deputy', approvalComment, approverSignature)) {
                          setSelectedDuty(null);
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-100 text-rose-800 font-semibold hover:bg-rose-200"
                    >
                      ไม่อนุมัติ
                    </button>
                    <button
                      onClick={async () => {
                        if (!approverSignature) {
                          alert('กรุณาลงลายมือชื่อก่อนบันทึกผลการพิจารณา');
                          return;
                        }
                        if (await approveOfficialDutyByDeputy(selectedDuty.id, approvalComment, approverSignature)) {
                          setSelectedDuty(null);
                        }
                      }}
                      className="px-5 py-2 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 shadow-md shadow-amber-200 flex items-center gap-1.5"
                    >
                      <span>เห็นชอบ ➔ เสนอผู้อำนวยการ</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* 2. Director Final Approval Action */}
              {currentUser.id === getOfficialDutyApprover(pipelinesConfig, 'director_approval') && selectedDuty.currentStage === 'director_approval' && (
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-3">
                  <div className="font-bold text-purple-900">พิจารณาอนุมัติขั้นสุดท้าย — ผู้ลงนาม: {currentUser.name}</div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">คำสั่งการของผู้อำนวยการ</label>
                    <input
                      type="text"
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      placeholder="เช่น อนุมัติ ให้เบิกจ่ายตามระเบียบ และส่งต่อฝ่ายวิชาการจัดสอนแทน"
                      className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white outline-hidden"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={async () => {
                        if (!approverSignature) {
                          alert('กรุณาลงลายมือชื่อก่อนบันทึกผลการพิจารณา');
                          return;
                        }
                        if (await rejectOfficialDutyAtStage(selectedDuty.id, 'director', approvalComment, approverSignature)) {
                          setSelectedDuty(null);
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-100 text-rose-800 font-semibold hover:bg-rose-200"
                    >
                      ไม่อนุมัติ
                    </button>
                    <button
                      onClick={async () => {
                        if (!approverSignature) {
                          alert('กรุณาลงลายมือชื่อก่อนอนุมัติ');
                          return;
                        }
                        if (await approveOfficialDutyByDirector(selectedDuty.id, approvalComment, approverSignature)) {
                          setSelectedDuty(null);
                        }
                      }}
                      className="px-5 py-2 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 shadow-md shadow-purple-200 flex items-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>ลงนามอนุมัติ ➔ แจกต่อไปฝ่ายวิชาการ</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 4. Academic Affairs Shortcut Button */}
              {selectedDuty.forwardedToAcademic && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-emerald-950">
                    <div className="font-bold flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-emerald-700" />
                      คำขอนี้ได้รับการอนุมัติแล้ว และส่งถึงฝ่ายวิชาการเรียบร้อย
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {selectedDuty.substituteScheduled
                        ? 'ได้จัดครูสอนแทนเรียบร้อยแล้ว'
                        : 'คลิกเพื่อไปยังหน้าโมดูลจัดครูสอนแทนสำหรับคำขอนี้'}
                    </div>
                  </div>
                  {onNavigateToSubstitute && (
                    <button
                      onClick={() => {
                        const target = selectedDuty;
                        setSelectedDuty(null);
                        onNavigateToSubstitute(target);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 shadow-sm shrink-0 flex items-center gap-1 text-xs"
                    >
                      <span>ไปยังระบบจัดครูสอนแทน</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setPrintDuty(selectedDuty);
                }}
                className="px-4 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold inline-flex items-center gap-1.5 text-xs shadow-xs"
              >
                <Printer className="w-4 h-4 text-emerald-600" />
                พิมพ์แบบขออนุญาตไปราชการ (PDF)
              </button>
              <button
                onClick={() => setSelectedDuty(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-900 text-xs"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Document Modal */}
      {printDuty && (
        <OfficialDutyPrintDocument
          duty={printDuty}
          onClose={() => setPrintDuty(null)}
        />
      )}

      {showSignatureModal && (
        <SignaturePadModal
          isOpen={showSignatureModal}
          initialSignature={signatureUrl}
          title="ลงลายมือชื่อผู้ขอไปราชการ"
          onSave={(value) => {
            setSignatureUrl(value);
            setShowSignatureModal(false);
          }}
          onClose={() => setShowSignatureModal(false)}
        />
      )}

      {showApproverSigModal && (
        <SignaturePadModal
          isOpen={showApproverSigModal}
          initialSignature={approverSignature}
          title={`ลงลายมือชื่อผู้พิจารณา (${currentUser.name})`}
          onSave={(value) => {
            setApproverSignature(value);
            setShowApproverSigModal(false);
          }}
          onClose={() => setShowApproverSigModal(false)}
        />
      )}
    </div>
  );
};
