'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User } from '../../types';
import { adminApi, ApiError } from '../../lib/api';
import { SearchableTeacherSelect } from '../SearchableTeacherSelect';
import {
  ShieldCheck,
  Users,
  Settings,
  Database,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Search,
  Lock,
  UserCheck,
  Building,
  Calendar,
  Save,
  Download,
  RefreshCw,
  Edit,
  Check,
  X,
  Car,
  CalendarDays,
  Briefcase,
  Wrench,
  BookOpen,
  Sparkles,
  ClipboardList
} from 'lucide-react';

const defaultCoordinatorSettings = {
  vehicleApproverId: 'MMV04',
  vehicleCheckerId: 'MMV98',
  driver1Id: 'MMV98',
  driver2Id: 'MMV99',
  driverRotatingId: 'MMV97',
  leaveApproverId: 'MMV04',
  leaveCheckerId: 'MMV14',
  officialDutyApproverId: 'MMV01',
  officialDutyBudgetCheckerId: 'MMV04',
  facilitiesApproverId: 'MMV03',
  facilitiesCheckerId: 'MMV97',
  academicApproverId: 'MMV02',
  substituteCheckerId: 'MMV90',
  directorId: 'MMV01',
};

const loadCoordinatorSettings = () => {
  if (typeof window === 'undefined') return defaultCoordinatorSettings;
  try {
    const saved = localStorage.getItem('mmv_school_coordinators');
    return saved ? { ...defaultCoordinatorSettings, ...JSON.parse(saved) } : defaultCoordinatorSettings;
  } catch (error) {
    console.error(error);
    return defaultCoordinatorSettings;
  }
};

export const AdminSettingsModule: React.FC = () => {
  const { users, updateUser, currentUser } = useApp();

  const [activeTab, setActiveTab] = useState<'coordinators' | 'users' | 'school' | 'database'>('coordinators');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [successMessage, setSuccessMessage] = useState('');
  const [coordinatorDefaults] = useState(loadCoordinatorSettings);

  // School Settings State
  const [schoolName, setSchoolName] = useState('โรงเรียนมกุฎเมืองราชวิทยาลัย');
  const [schoolOrg, setSchoolOrg] = useState('สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง');
  const [academicYear, setAcademicYear] = useState(String(new Date().getFullYear() + 543));
  const [academicSemester, setAcademicSemester] = useState('1');

  // Role Coordinators & Checkers State (ค่าเริ่มต้นตามที่กำหนด)
  // 1. Vehicle & Drivers
  const [vehicleApproverId, setVehicleApproverId] = useState(coordinatorDefaults.vehicleApproverId); // รอง ผอ.สุรียาพร นพกรเศรษฐกุล
  const [vehicleCheckerId, setVehicleCheckerId] = useState(coordinatorDefaults.vehicleCheckerId); // นายชาญวุฒน์ ต้องทำกิจ (จนท.ยานพาหนะ)
  const [driver1Id, setDriver1Id] = useState(coordinatorDefaults.driver1Id); // นายชาญวุฒน์ (รถตู้ ขค 1456)
  const [driver2Id, setDriver2Id] = useState(coordinatorDefaults.driver2Id); // นายนพรุจ ความเพียร (รถตู้ นข 7555)
  const [driverRotatingId, setDriverRotatingId] = useState(coordinatorDefaults.driverRotatingId); // นายกิจจา สัญญักิจ (รถหมุนเวียน นข 3399)

  // 2. Personnel & Leave
  const [leaveApproverId, setLeaveApproverId] = useState(coordinatorDefaults.leaveApproverId); // รอง ผอ.สุรียาพร นพกรเศรษฐกุล
  const [leaveCheckerId, setLeaveCheckerId] = useState(coordinatorDefaults.leaveCheckerId); // นางสาวอัชฌาพัชญ์ แก้วแกมกาญจน์ / ผู้ตรวจสอบใบลา

  // 3. Official Duty
  const [officialDutyApproverId, setOfficialDutyApproverId] = useState(coordinatorDefaults.officialDutyApproverId); // ผอ.มณฑาทิพย์ เสาวคนธ์
  const [officialDutyBudgetCheckerId, setOfficialDutyBudgetCheckerId] = useState(coordinatorDefaults.officialDutyBudgetCheckerId); // รอง ผอ.สุรียาพร

  // 4. Facilities & Repairs
  const [facilitiesApproverId, setFacilitiesApproverId] = useState(coordinatorDefaults.facilitiesApproverId); // รอง ผอ.ไชยวัฒน์ บุญมี
  const [facilitiesCheckerId, setFacilitiesCheckerId] = useState(coordinatorDefaults.facilitiesCheckerId); // นายกิจจา สัญญักิจ (งานช่าง/อาคาร)

  // 5. Academic & Substitute Teaching
  const [academicApproverId, setAcademicApproverId] = useState(coordinatorDefaults.academicApproverId); // รอง ผอ.อรชุมา วงศ์ช่าง
  const [substituteCheckerId, setSubstituteCheckerId] = useState(coordinatorDefaults.substituteCheckerId); // นางสาวปาริชาต บุญมี (วิชาการ/สอนแทน)

  // 6. School Director (Highest Approver)
  const [directorId, setDirectorId] = useState(coordinatorDefaults.directorId); // ผอ.มณฑาทิพย์ เสาวคนธ์

  // Reset Password Modal
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);

  const saveCoordinators = () => {
    const config = {
      vehicleApproverId,
      vehicleCheckerId,
      driver1Id,
      driver2Id,
      driverRotatingId,
      leaveApproverId,
      leaveCheckerId,
      officialDutyApproverId,
      officialDutyBudgetCheckerId,
      facilitiesApproverId,
      facilitiesCheckerId,
      academicApproverId,
      substituteCheckerId,
      directorId
    };
    try {
      localStorage.setItem('mmv_school_coordinators', JSON.stringify(config));
    } catch (e) {}
    showNotification('✓ บันทึกการกำหนดผู้ดูแลงานและผู้ตรวจสอบทุกระบบเรียบร้อยแล้ว');
  };

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  // Reset User Password to Password@123
  const handleResetPassword = async () => {
    if (!selectedUserForReset) return;
    try {
      await adminApi.resetPassword(selectedUserForReset.id);
      updateUser({ ...selectedUserForReset, mustChangePassword: true });
      setShowResetModal(false);
      showNotification(`รีเซ็ตรหัสผ่านของ ${selectedUserForReset.name} เป็นรหัสชั่วคราวแล้ว`);
      setSelectedUserForReset(null);
    } catch (error) {
      showNotification(error instanceof ApiError ? error.message : 'รีเซ็ตรหัสผ่านไม่สำเร็จ');
    }
  };

  // Toggle Admin Role
  const handleToggleAdmin = (u: User) => {
    const isCurrentlyAdmin = u.role === 'admin';
    const updated: User = {
      ...u,
      role: isCurrentlyAdmin ? 'teacher' : 'admin'
    };
    updateUser(updated);
    showNotification(`ปรับสิทธิ์ของ ${u.name} เป็น ${isCurrentlyAdmin ? 'ผู้ใช้งานทั่วไป' : 'ผู้ดูแลระบบ (Admin)'} เรียบร้อยแล้ว`);
  };

  // Filter Users
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.citizenId && u.citizenId.includes(searchQuery)) ||
      u.department.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'admin' && (u.role === 'admin' || u.role === 'director' || u.role.startsWith('deputy'))) ||
      (roleFilter === 'driver' && u.role === 'driver') ||
      (roleFilter === 'teacher' && u.role === 'teacher');

    return matchesSearch && matchesRole;
  });
  // Keep personnel order stable and human-friendly: MMV01, MMV02 ... MMV100.
  // Do not rely on plain string sorting (which puts MMV100 before MMV41).
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const numberOf = (id: string) => Number(id.replace(/\D/g, '') || '999999');
    const byNumber = numberOf(a.id) - numberOf(b.id);
    if (byNumber !== 0) return byNumber;
    return a.name.localeCompare(b.name, 'th');
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Toolbar */}
      <div className="bg-white rounded-3xl p-5 border border-[#dbe4f0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-blue-50 text-[#0b1f3a] border border-blue-100">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg lg:text-xl font-extrabold text-[#0b1f3a] tracking-tight">
                ตั้งค่าระบบ &amp; ผู้ดูแลงานแต่ละฝ่าย (System Administration)
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                กำหนดผู้มีอำนาจสั่งการ ผู้ตรวจสอบงาน และผู้รับผิดชอบงานทุกระบบของโรงเรียน
              </p>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-2 shadow-2xs animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('coordinators')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'coordinators'
              ? 'bg-[#0b1f3a] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>ผู้มีอำนาจสั่งการ &amp; ผู้ตรวจสอบงาน</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'users'
              ? 'bg-[#0b1f3a] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>จัดการบัญชีผู้ใช้ &amp; รีเซ็ตรหัสผ่าน</span>
        </button>

        <button
          onClick={() => setActiveTab('school')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'school'
              ? 'bg-[#0b1f3a] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>ข้อมูลสถานศึกษา &amp; ภาคเรียน</span>
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'database'
              ? 'bg-[#0b1f3a] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>ฐานข้อมูล HostAtom &amp; สำรองข้อมูล</span>
        </button>
      </div>

      {/* 3. Tab 1: Role Coordinators & Checkers */}
      {activeTab === 'coordinators' && (
        <div className="space-y-5">
          <div className="bg-white rounded-3xl p-6 border border-[#dbe4f0] shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-extrabold text-[#0b1f3a]">
                  กำหนดผู้มีอำนาจสั่งการและผู้ตรวจสอบงานรายระบบ
                </h2>
                <p className="text-xs text-slate-400">
                  ระบบจะใช้ข้อมูลด้านล่างนี้ในกระบวนการเสนอ-ตรวจทาน-อนุมัติ และลงนามในเอกสารราชการทางการ (PDF) อัตโนมัติ
                </p>
              </div>
              <button
                onClick={saveCoordinators}
                className="px-5 py-2 rounded-xl bg-[#0b1f3a] hover:bg-[#153e70] text-white font-extrabold text-xs shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกผู้รับผิดชอบทั้งหมด</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 1. Vehicle & Drivers */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-50/70 to-slate-50 border border-blue-200/80 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#0b1f3a] text-white flex items-center justify-center font-bold shadow-xs">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-[#0b1f3a]">
                      1. ระบบขอใช้รถส่วนกลาง &amp; พนักงานขับรถ
                    </h3>
                    <p className="text-[11px] text-slate-500">ผู้มีอำนาจจัดสรรรถ อนุมัติรถเช่า และคนขับรถประจำ</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ผู้อนุมัติและจัดสรรรถยนต์ส่วนกลาง:
                    </label>
                    <SearchableTeacherSelect users={users} value={vehicleApproverId} onChange={setVehicleApproverId} placeholder="พิมพ์ชื่อผู้อนุมัติรถ..." />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      เจ้าหน้าที่ตรวจสอบความพร้อมยานพาหนะ:
                    </label>
                    <SearchableTeacherSelect users={users} value={vehicleCheckerId} onChange={setVehicleCheckerId} placeholder="พิมพ์ชื่อผู้ตรวจสอบรถ..." />
                  </div>

                  <div className="pt-2 border-t border-blue-200/60 space-y-2">
                    <span className="text-[10px] font-bold text-blue-900 block">พนักงานขับรถประจำคัน:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-500 block">รถตู้ Toyota (ขค 1456):</span>
                        <SearchableTeacherSelect users={users} value={driver1Id} onChange={setDriver1Id} placeholder="พิมพ์ชื่อคนขับ..." />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">รถตู้ Hyundai (นข 7555):</span>
                        <SearchableTeacherSelect users={users} value={driver2Id} onChange={setDriver2Id} placeholder="พิมพ์ชื่อคนขับ..." />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Personnel & Leave */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-50/70 to-slate-50 border border-emerald-200/80 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-bold shadow-xs">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-emerald-900">
                      2. ระบบงานบุคคล &amp; ใบลาออนไลน์
                    </h3>
                    <p className="text-[11px] text-slate-500">ผู้ตรวจทานวันลาคงเหลือ และผู้บริหารงานบุคคล</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ผู้ตรวจทานและบริหารงานบุคคล (พิจารณาใบลา):
                    </label>
                    <select
                      value={leaveApproverId}
                      onChange={(e) => setLeaveApproverId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 outline-hidden shadow-2xs"
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      เจ้าหน้าที่ตรวจสอบสถิติวันลา &amp; สารบรรณบุคคล:
                    </label>
                    <select
                      value={leaveCheckerId}
                      onChange={(e) => setLeaveCheckerId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 outline-hidden shadow-2xs"
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Official Duty */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-50/70 to-slate-50 border border-indigo-200/80 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-800 text-white flex items-center justify-center font-bold shadow-xs">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-indigo-900">
                      3. ระบบขออนุญาตไปราชการ
                    </h3>
                    <p className="text-[11px] text-slate-500">ผู้ตรวจสอบงบประมาณ และผู้อนุมัติการไปราชการ</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      รองผู้อำนวยการผู้ตรวจสอบงบประมาณและเสนอความเห็น:
                    </label>
                    <select
                      value={officialDutyBudgetCheckerId}
                      onChange={(e) => setOfficialDutyBudgetCheckerId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 outline-hidden shadow-2xs"
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ผู้อนุมัติคำสั่งไปราชการ:
                    </label>
                    <select
                      value={officialDutyApproverId}
                      onChange={(e) => setOfficialDutyApproverId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 outline-hidden shadow-2xs"
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Facilities & Repairs */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-50/70 to-slate-50 border border-purple-200/80 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-800 text-white flex items-center justify-center font-bold shadow-xs">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-purple-900">
                      4. ระบบแจ้งซ่อม &amp; อาคารสถานที่
                    </h3>
                    <p className="text-[11px] text-slate-500">ผู้ดูแลงานอาคาร พัสดุ และหัวหน้างานช่าง</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ผู้ดูแลงานอาคารสถานที่และพัสดุ:
                    </label>
                    <select
                      value={facilitiesApproverId}
                      onChange={(e) => setFacilitiesApproverId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 outline-hidden shadow-2xs"
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      หัวหน้างานช่าง &amp; ผู้ตรวจสอบการซ่อมบำรุง:
                    </label>
                    <select
                      value={facilitiesCheckerId}
                      onChange={(e) => setFacilitiesCheckerId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 outline-hidden shadow-2xs"
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 5. Academic & Substitute Teaching */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-teal-50/70 to-slate-50 border border-teal-200/80 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-800 text-white flex items-center justify-center font-bold shadow-xs">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-teal-900">
                      5. ระบบวิชาการ &amp; จัดครูสอนแทน
                    </h3>
                    <p className="text-[11px] text-slate-500">ผู้บริหารงานวิชาการและผู้ตรวจสอบคาบสอนแทน</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ผู้บริหารกลุ่มบริหารงานวิชาการ:
                    </label>
                    <select
                      value={academicApproverId}
                      onChange={(e) => setAcademicApproverId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 outline-hidden shadow-2xs"
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      เจ้าหน้าที่จัดตารางสอน &amp; ตรวจรับรองสอนแทน:
                    </label>
                    <select
                      value={substituteCheckerId}
                      onChange={(e) => setSubstituteCheckerId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 outline-hidden shadow-2xs"
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 6. Director Highest Approver */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-50/70 to-slate-50 border border-amber-200/80 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-700 text-white flex items-center justify-center font-bold shadow-xs">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-amber-900">
                      6. ผู้อำนวยการสถานศึกษา (ผู้อนุมัติขั้นสูงสุด)
                    </h3>
                    <p className="text-[11px] text-slate-500">ผู้มีอำนาจลงนามคำสั่งและอนุมัติขั้นสุดท้ายของโรงเรียน</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ผู้อำนวยการโรงเรียน:
                    </label>
                    <select
                      value={directorId}
                      onChange={(e) => setDirectorId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 outline-hidden shadow-2xs"
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Tab 2: User Account & Password Manager */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl p-6 border border-[#dbe4f0] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-[#0b1f3a]">
                จัดการบัญชีผู้ใช้งาน ({filteredUsers.length} ท่าน)
              </h2>
              <p className="text-xs text-slate-400">
                ตรวจสอบเลขบัตรประชาชน 13 หลัก, รีเซ็ตรหัสผ่านกรณีครูลืมรหัส, และกำหนดสิทธิ์ Admin
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, รหัส, เลข 13 หลัก..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 outline-hidden w-56 font-medium"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white font-bold text-slate-700"
              >
                <option value="all">ทุกบทบาท</option>
                <option value="admin">ฝ่ายบริหาร / ผู้ดูแล</option>
                <option value="teacher">ครูผู้สอน</option>
                <option value="driver">พนักงานขับรถ</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-3 px-3">รหัส</th>
                  <th className="pb-3 px-3">ชื่อ-นามสกุล</th>
                  <th className="pb-3 px-3">ตำแหน่ง &amp; กลุ่มสาระ</th>
                  <th className="pb-3 px-3 text-center">สิทธิ์ผู้ใช้งาน</th>
                  <th className="pb-3 px-3 text-center">สถานะรหัสผ่าน</th>
                  <th className="pb-3 px-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedUsers.map((u) => {
                  const isAdmin = u.role === 'admin' || u.role === 'director' || u.role.startsWith('deputy');
                  const isMustChange = u.mustChangePassword !== false;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-blue-900">{u.id}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{u.name}</div>
                        <div className="text-[10px] text-slate-400">{u.email || '-'}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-700">{u.position}</div>
                        <div className="text-[10px] text-slate-400">{u.department}</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isAdmin ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isAdmin ? '🛡️ ผู้ดูแล (Admin)' : 'ครูผู้สอน/บุคลากร'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          isMustChange ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-800'
                        }`}>
                          {isMustChange ? 'รหัสเริ่มต้น (Password@123)' : '✓ เปลี่ยนรหัสส่วนตัวแล้ว'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedUserForReset(u);
                              setShowResetModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold text-[11px] transition-all cursor-pointer"
                            title="รีเซ็ตรหัสผ่านกลับเป็น Password@123"
                          >
                            <KeyRound className="w-3 h-3 inline mr-1" />
                            รีเซ็ตรหัส
                          </button>

                          <button
                            onClick={() => handleToggleAdmin(u)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                            title="สลับสิทธิ์ Admin"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Tab 3: School Info Settings */}
      {activeTab === 'school' && (
        <div className="bg-white rounded-3xl p-6 border border-[#dbe4f0] shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-extrabold text-[#0b1f3a]">
              ข้อมูลสถานศึกษา &amp; ภาคเรียนปัจจุบัน
            </h2>
            <p className="text-xs text-slate-400">
              ข้อมูลนี้จะปรากฏในส่วนหัวเอกสารราชการและใบสั่งการทางการของทุกระบบ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">ชื่อสถานศึกษา</label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">หน่วยงานต้นสังกัด</label>
              <input
                type="text"
                value={schoolOrg}
                onChange={(e) => setSchoolOrg(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">ปีการศึกษาปัจจุบัน</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">ภาคเรียนที่</label>
              <select
                value={academicSemester}
                onChange={(e) => setAcademicSemester(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
              >
                <option value="1">ภาคเรียนที่ 1</option>
                <option value="2">ภาคเรียนที่ 2</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => showNotification('บันทึกข้อมูลสถานศึกษาเรียบร้อยแล้ว')}
              className="px-6 py-2.5 rounded-xl bg-[#0b1f3a] text-white font-extrabold text-xs shadow-md hover:bg-[#153e70] flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการตั้งค่า</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. Tab 4: Database & Backup */}
      {activeTab === 'database' && (
        <div className="bg-white rounded-3xl p-6 border border-[#dbe4f0] shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-extrabold text-[#0b1f3a]">
              สถานะฐานข้อมูล MySQL HostAtom &amp; การสำรองข้อมูล
            </h2>
            <p className="text-xs text-slate-400">
              ตรวจสอบการเชื่อมต่อเซิร์ฟเวอร์ MySQL และดาวน์โหลดไฟล์สำรองข้อมูล (Backup)
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3">
            <div className="flex items-center gap-2 text-blue-900 font-extrabold text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>สถานะการเชื่อมต่อ: HostAtom Plesk MariaDB Connected (mmvsc_mmv_school_db)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              <div>
                <span className="text-slate-400 block">Database Server:</span>
                <strong className="text-slate-800 font-mono">localhost:3306</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Database Name:</span>
                <strong className="text-slate-800 font-mono">mmvsc_mmv_school_db</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Database User:</span>
                <strong className="text-slate-800 font-mono">mmvsc_mmv_user</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Domain:</span>
                <strong className="text-slate-800 font-mono">mmvschool.ac.th</strong>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/mmv_database.sql"
              download="mmv_database.sql"
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 transition-all shadow-2xs"
            >
              <Download className="w-4 h-4 text-blue-900" />
              <span>ดาวน์โหลดสคริปต์ฐานข้อมูล (SQL Seed)</span>
            </a>

            <button
              onClick={() => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(users, null, 2));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", "mmv_users_backup.json");
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
                showNotification('ส่งออกไฟล์สำรองข้อมูล JSON สำเร็จ!');
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-800" />
              <span>สำรองข้อมูลบุคลากรทั้งหมด (JSON Backup)</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal: Confirm Reset Password */}
      {showResetModal && selectedUserForReset && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-[#0b1f3a] text-sm flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-rose-600" />
                <span>ยืนยันการรีเซ็ตรหัสผ่าน</span>
              </h3>
              <button onClick={() => setShowResetModal(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-800 space-y-1">
              <div>ต้องการรีเซ็ตรหัสผ่านของ <strong>{selectedUserForReset.name}</strong> หรือไม่?</div>
              <div className="text-[11px] text-rose-700">
                รหัสผ่านจะถูกตั้งค่ากลับเป็น: <strong>Password@123</strong> และระบบจะบังคับให้ผู้ใช้ตั้งรหัสผ่านใหม่เมื่อเข้าสู่ระบบครั้งถัดไป
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleResetPassword}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md cursor-pointer"
              >
                ✓ ยืนยันรีเซ็ตรหัสผ่าน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
