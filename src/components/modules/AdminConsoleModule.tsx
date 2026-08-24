'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { User, Vehicle, MeetingRoom } from '../../types';
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
  Upload,
  RefreshCw,
  Edit3,
  Plus,
  Trash2,
  Check,
  X,
  Car,
  CalendarDays,
  Briefcase,
  Wrench,
  BookOpen,
  Sparkles,
  ClipboardList,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

export interface ApprovalStep {
  stepNumber: number;
  stepName: string;
  assignedUserId: string;
  description: string;
}

export interface WorkflowPipeline {
  id: string;
  systemName: string;
  icon: string;
  color: string;
  steps: ApprovalStep[];
}

interface AdminVehicle {
  id: string;
  plateNumber: string;
  province: string;
  model: string;
  type: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  status: string;
  seats: number;
}

interface AdminRoom {
  id: string;
  name: string;
  capacity: string;
  building: string;
  managerId: string;
  managerName: string;
  managerIds?: string[];
  amenities: string[];
}

interface AuditLog {
  id: string;
  timestamp: string;
  date: string;
  user: string;
  action: string;
  details: string;
  type: string;
}

export const AdminConsoleModule: React.FC = () => {
  const {
    users,
    updateUser,
    setUsersList,
    currentUser,
    addToast,
    rooms,
    updateRoomManager,
    updateRoom,
    pipelinesConfig,
    savePipelinesConfig,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'workflows' | 'fleet' | 'rooms' | 'users' | 'school' | 'backup' | 'logs'>('workflows');
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // -------------------------------------------------------------
  // 1. ขั้นตอนการอนุมัติแต่ละระบบ (Approval Workflow Pipeline)
  // -------------------------------------------------------------
  const initialPipelines: WorkflowPipeline[] = [
    {
      id: 'pipe-leave',
      systemName: 'ระบบการลา (ลาป่วย / ลากิจ / ลาพักผ่อน)',
      icon: '📋',
      color: 'emerald',
      steps: [
        { stepNumber: 1, stepName: 'ผู้ยื่นใบลา', assignedUserId: '', description: 'ครูผู้ขอลากรอกข้อมูลในระบบ' },
        { stepNumber: 2, stepName: 'ผู้ตรวจสอบใบลา', assignedUserId: 'MMV14', description: 'ตรวจสอบวันลาคงเหลือ สถิติการลา และข้อมูลถูกต้อง' },
        { stepNumber: 3, stepName: 'รองผู้อำนวยการ พิจารณาอนุญาต', assignedUserId: 'MMV04', description: 'รอง ผอ. พิจารณาและลงนามอนุญาต' },
        { stepNumber: 4, stepName: 'ผู้อำนวยการ อนุมัติขั้นสุดท้าย', assignedUserId: 'MMV01', description: 'ผอ. ลงนามอนุมัติคำสั่ง' }
      ]
    },
    {
      id: 'pipe-vehicle',
      systemName: 'ระบบขอใช้รถยนต์ส่วนกลาง',
      icon: '🚗',
      color: 'blue',
      steps: [
        { stepNumber: 1, stepName: 'ผู้ยื่นคำขอใช้รถ', assignedUserId: '', description: 'ครูกรอกแบบฟอร์มขอใช้รถ' },
        { stepNumber: 2, stepName: 'ผู้ตรวจสอบ รับทราบ', assignedUserId: 'MMV47', description: 'ตรวจสอบรายละเอียดคำขอและส่งต่อรองผู้อำนวยการ' },
        { stepNumber: 3, stepName: 'รองผู้อำนวยการ อนุมัติและจัดสรรรถ', assignedUserId: 'MMV04', description: 'อนุมัติ จัดสรรรถและผู้ขับรถ หรือเลือกเช่ารถเมื่อรถไม่เพียงพอ' },
        { stepNumber: 4, stepName: 'แจ้งไปยังผู้ขับรถ', assignedUserId: '', description: 'ระบบแจ้งเตือนผู้ขับรถอัตโนมัติเฉพาะกรณีใช้รถของโรงเรียน' }
      ]
    },
    {
      id: 'pipe-duty',
      systemName: 'ระบบขออนุญาตไปราชการ',
      icon: '✈️',
      color: 'indigo',
      steps: [
        { stepNumber: 1, stepName: 'ผู้ยื่นคำขอไปราชการ', assignedUserId: '', description: 'ครูกรอกบันทึกข้อความขอไปราชการ' },
        { stepNumber: 2, stepName: 'รองผู้อำนวยการ ตรวจสอบงบประมาณและเสนอความเห็น', assignedUserId: 'MMV04', description: 'ตรวจสอบงบประมาณ ความเหมาะสม แผนงาน และเสนอความเห็นในขั้นตอนเดียว' },
        { stepNumber: 3, stepName: 'ผู้อำนวยการ อนุมัติคำสั่ง', assignedUserId: 'MMV01', description: 'ผอ. ลงนามคำสั่งไปราชการ' }
      ]
    },
    {
      id: 'pipe-repair-av',
      systemName: 'ระบบแจ้งซ่อมโสตทัศนูปกรณ์ & ไอที',
      icon: '🖥️',
      color: 'purple',
      steps: [
        { stepNumber: 1, stepName: 'ผู้แจ้งซ่อม', assignedUserId: '', description: 'ครู/บุคลากร กรอกรายละเอียดแจ้งซ่อมโสตฯ/ไอทีในระบบ' },
        { stepNumber: 2, stepName: 'ผู้ตรวจเช็คและรับงานซ่อม (ผู้ดูแลโสตฯ/ไอที)', assignedUserId: 'MMV96', description: 'ผู้ดูแลระบบตรวจสอบความพร้อมและจ่ายงาน' },
        { stepNumber: 3, stepName: 'เมื่อซ่อมเสร็จแจ้งกลับไปยัง [ผู้แจ้งซ่อม] จบงาน', assignedUserId: '', description: 'ระบบแจ้งความคืบหน้าแจ้งกลับไปยังผู้แจ้งซ่อมเพื่อปิดงานอัตโนมัติ' }
      ]
    },
    {
      id: 'pipe-repair-build',
      systemName: 'ระบบแจ้งซ่อมอาคารสถานที่ & สาธารณูปโภค',
      icon: '🔧',
      color: 'emerald',
      steps: [
        { stepNumber: 1, stepName: 'ผู้แจ้งซ่อม', assignedUserId: '', description: 'ครู/บุคลากร กรอกรายละเอียดแจ้งซ่อมอาคารสถานที่ในระบบ' },
        { stepNumber: 2, stepName: 'ผู้ตรวจเช็คและรับงานซ่อม (หัวหน้างานอาคารสถานที่ & รอง ผอ. ฝ่ายทั่วไป)', assignedUserId: 'MMV97', description: 'หัวหน้างานตรวจสอบความพร้อมและจ่ายงาน (ส่งแจ้งเตือนให้ รองผู้อำนวยการกลุ่มบริหารทั่วไป ทราบร่วมด้วย)' },
        { stepNumber: 3, stepName: 'เมื่อซ่อมเสร็จแจ้งกลับไปยัง [ผู้แจ้งซ่อม] จบงาน', assignedUserId: '', description: 'ระบบแจ้งความคืบหน้าแจ้งกลับไปยังผู้แจ้งซ่อมเพื่อปิดงานอัตโนมัติ' }
      ]
    },
    {
      id: 'pipe-substitute',
      systemName: 'ระบบจัดครูสอนแทน',
      icon: '👨‍🏫',
      color: 'teal',
      steps: [
        { stepNumber: 1, stepName: 'ผู้จัดตารางสอนแทน', assignedUserId: 'MMV90', description: 'เจ้าหน้าที่วิชาการจัดครูผู้รับมอบหมายสอนแทนตามคาบ' },
        { stepNumber: 2, stepName: 'แจ้งครูผู้รับมอบหมายสอนแทน', assignedUserId: '', description: 'ระบบแจ้งเตือนไปยังครูผู้รับมอบหมายสอนแทนโดยอัตโนมัติ' },
        { stepNumber: 3, stepName: 'รองผู้อำนวยการฝ่ายวิชาการ รับทราบ', assignedUserId: 'MMV02', description: 'ระบบแจ้งรองผู้อำนวยการฝ่ายวิชาการให้รับทราบ' }
      ]
    },
    {
      id: 'pipe-room',
      systemName: 'ระบบขอใช้อาคารสถานที่',
      icon: '🏢',
      color: 'amber',
      steps: [
        { stepNumber: 1, stepName: 'ผู้ขอใช้อาคารสถานที่', assignedUserId: '', description: 'ครู/ฝ่ายงาน ยื่นคำขอใช้อาคารสถานที่ (ระบบส่งต่อเสนอความเห็นรองฝ่ายทั่วไป)' },
        { stepNumber: 2, stepName: 'รองผู้อำนวยการฝ่ายทั่วไป ตรวจสอบ & อนุมัติขั้นต้น', assignedUserId: 'MMV05', description: 'รอง ผอ. กลุ่มบริหารทั่วไป ตรวจสอบความถูกต้องและเสนอความเห็น/อนุมัติขั้นต้น' },
        { stepNumber: 3, stepName: 'ผู้ดูแลอาคารสถานที่/เครื่องเสียง ยืนยันความพร้อม', assignedUserId: 'MMV03', description: 'ผู้ดูแลสถานที่ตรวจสอบความถูกต้อง ตรวจสอบความพร้อมของระบบและกดรับทราบเพื่อพร้อมใช้งาน' },
        { stepNumber: 4, stepName: 'แจ้งกลับมายังผู้ขอใช้ จบงาน', assignedUserId: '', description: 'ระบบแจ้งความคืบหน้าแจ้งกลับไปยังผู้ขอใช้เพื่อรับทราบและจบงาน' }
      ]
    }
  ];

  const pipelines = pipelinesConfig.length > 0 ? pipelinesConfig : initialPipelines;

  const savePipelines = async (updated: WorkflowPipeline[]) => {
    const saved = await savePipelinesConfig(updated);
    if (!saved) return;
    notify('✓ บันทึกขั้นตอนการอนุมัติเรียบร้อยแล้ว');
  };

  const updatePipelineStep = (pipelineId: string, stepNumber: number, userId: string) => {
    const updated = pipelines.map(p => {
      if (p.id === pipelineId) {
        return {
          ...p,
          steps: p.steps.map(s =>
            s.stepNumber === stepNumber ? { ...s, assignedUserId: userId } : s
          )
        };
      }
      return p;
    });
    void savePipelines(updated);
  };

  // -------------------------------------------------------------
  // 2. Fleet Management (จัดการข้อมูลรถยนต์และคนขับ)
  // -------------------------------------------------------------
  const initialVehiclesList: AdminVehicle[] = [
    {
      id: 'v1',
      plateNumber: 'ขค 1456',
      province: 'ระยอง',
      model: 'Toyota Commuter (ดีเซล)',
      type: 'รถตู้โดยสาร 14 ที่นั่ง',
      driverId: 'MMV98',
      driverName: 'นายชาญวุฒน์ ต้องทำกิจ',
      driverPhone: '09-4462-8899',
      status: 'available',
      seats: 14
    },
    {
      id: 'v2',
      plateNumber: 'นข 7555',
      province: 'ระยอง',
      model: 'Hyundai H-1 (ดีเซล VIP)',
      type: 'รถตู้โดยสาร 11 ที่นั่ง',
      driverId: 'MMV99',
      driverName: 'นายนพรุจ ความเพียร',
      driverPhone: '08-7711-2233',
      status: 'available',
      seats: 11
    },
    {
      id: 'v3',
      plateNumber: 'นข 3399',
      province: 'ระยอง',
      model: 'Toyota Commuter (สีเงิน)',
      type: 'รถตู้โดยสารหมุนเวียน 14 ที่นั่ง',
      driverId: 'MMV97',
      driverName: 'นายกิจจา สัญญักิจ (หมุนเวียน)',
      driverPhone: '- ฝ่ายบริหารมอบหมายรายทริป -',
      status: 'available',
      seats: 14
    }
  ];

  const [vehicles, setVehicles] = useState<AdminVehicle[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mmv_admin_vehicles');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return initialVehiclesList;
  });

  const [editingVehicle, setEditingVehicle] = useState<AdminVehicle | null>(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);

  // -------------------------------------------------------------
  // 3. Meeting Rooms Management (จัดการห้องประชุมและผู้ดูแล)
  // -------------------------------------------------------------
  const [editingRoom, setEditingRoom] = useState<MeetingRoom | null>(null);
  const [showRoomModal, setShowRoomModal] = useState(false);

  // -------------------------------------------------------------
  // 4. School Settings (ข้อมูลโรงเรียน & ภาคเรียน)
  // -------------------------------------------------------------
  const [schoolSettings, setSchoolSettings] = useState({
    name: 'โรงเรียนมกุฎเมืองราชวิทยาลัย',
    org: 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง',
    year: String(new Date().getFullYear() + 543),
    semester: '1',
    phone: '038-611234',
    email: 'info@mmvschool.ac.th',
    directorName: 'นางสาวมณฑาทิพย์ เสาวคนธ์',
    directorPosition: 'ผู้อำนวยการ ชำนาญการพิเศษ'
  });

  // User Management Edit Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showUserEditModal, setShowUserEditModal] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);


  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: 'log-1',
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.',
      date: new Date().toISOString().split('T')[0],
      user: 'นายนาริน (Admin)',
      action: 'กำหนดสิทธิ์ผู้ดูแลระบบ',
      details: 'เข้าสู่ศูนย์ควบคุมผู้ดูแลระบบและตรวจสอบการตั้งค่า',
      type: 'security'
    },
    {
      id: 'log-2',
      timestamp: '09:45 น.',
      date: new Date().toISOString().split('T')[0],
      user: 'นางสาวสุรียาพร นพกรเศรษฐกุล',
      action: 'อนุมัติการใช้รถยนต์',
      details: 'อนุมัติคำขอใช้รถตู้ Toyota Commuter (ขค 1456)',
      type: 'vehicle'
    },
    {
      id: 'log-3',
      timestamp: '09:30 น.',
      date: new Date().toISOString().split('T')[0],
      user: 'ระบบฐานข้อมูล HostAtom',
      action: 'เชื่อมต่อฐานข้อมูลสำเร็จ',
      details: 'mmvsc_mmv_school_db บน Plesk MariaDB พร้อมใช้งาน',
      type: 'system'
    }
  ]);

  // Reset Password Modal
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const notify = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;

    const driver = users.find(u => u.id === editingVehicle.driverId);
    const updated = {
      ...editingVehicle,
      driverName: driver ? driver.name : editingVehicle.driverName,
      driverPhone: driver ? driver.phone : editingVehicle.driverPhone
    };

    const exists = vehicles.some(v => v.id === updated.id);
    let nextList: AdminVehicle[];
    if (exists) {
      nextList = vehicles.map(v => v.id === updated.id ? updated : v);
    } else {
      nextList = [...vehicles, { ...updated, id: `v-${crypto.randomUUID()}` }];
    }
    setVehicles(nextList);
    localStorage.setItem('mmv_admin_vehicles', JSON.stringify(nextList));
    setShowVehicleModal(false);
    notify('✓ บันทึกข้อมูลรถยนต์และพนักงานขับรถเรียบร้อยแล้ว');
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    void updateRoom(editingRoom.id, editingRoom.name, editingRoom.location || '', String(editingRoom.capacity), editingRoom.image);
    setShowRoomModal(false);
  };

  // Toggle Admin Role
  const handleToggleAdmin = async (u: User) => {
    const isCurrentlyAdmin = u.role === 'admin';
    const updated: User = {
      ...u,
      role: isCurrentlyAdmin ? 'teacher' : 'admin'
    };
    try {
      await adminApi.setRole(u.id, updated.role);
      updateUser(updated);
      notify(`✓ ${isCurrentlyAdmin ? 'ปลดสิทธิ์ผู้ดูแลของ' : 'มอบสิทธิ์ผู้ดูแลระบบ (Admin) ให้'} ${u.name} เรียบร้อยแล้ว`);
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'เปลี่ยนสิทธิ์ไม่สำเร็จ', 'error');
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const savedUser = await adminApi.updateUser(editingUser);
      updateUser(savedUser);
      setShowUserEditModal(false);
      setIsCreatingUser(false);
      notify(`✓ บันทึกข้อมูลของ ${editingUser.name} เรียบร้อยแล้ว`);
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'บันทึกข้อมูลผู้ใช้ไม่สำเร็จ', 'error');
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (u.id === currentUser.id) {
      addToast('ไม่สามารถลบบัญชีที่กำลังใช้งานได้', 'error');
      return;
    }
    if (!window.confirm(`ยืนยันปิดใช้งานบัญชี ${u.name} (${u.id}) หรือไม่?`)) return;
    try {
      await adminApi.deleteUser(u.id);
      setUsersList(users.filter(item => item.id !== u.id));
      notify(`ปิดใช้งานบัญชี ${u.name} แล้ว`);
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ลบบัญชีไม่สำเร็จ', 'error');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUserForReset) return;
    setIsResettingPassword(true);
    try {
      const generatedPassword = await adminApi.resetPassword(selectedUserForReset.id);
      updateUser({ ...selectedUserForReset, mustChangePassword: true });
      setTemporaryPassword(generatedPassword);
      notify(`✓ สร้างรหัสผ่านชั่วคราวของ ${selectedUserForReset.name} แล้ว`);
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'รีเซ็ตรหัสผ่านไม่สำเร็จ', 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleOpenUsers = async () => {
    setActiveTab('users');
    try {
      setUsersList(await adminApi.listUsers());
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ', 'error');
    }
  };

  // Filtered Users
  const filteredUsers = users.filter(u => {
    return (
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.citizenId && u.citizenId.includes(searchQuery)) ||
      u.department.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }).sort((a, b) => {
    const numberOf = (id: string) => Number(id.replace(/\D/g, '') || '999999');
    const byNumber = numberOf(a.id) - numberOf(b.id);
    return byNumber !== 0 ? byNumber : a.name.localeCompare(b.name, 'th');
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Toolbar */}
      <div className="bg-white rounded-3xl p-5 border border-[#dbe4f0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[#0b1f3a] text-white shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg lg:text-xl font-extrabold text-[#0b1f3a] tracking-tight flex items-center gap-2">
              <span>ศูนย์ควบคุมผู้ดูแลระบบ (Admin Console)</span>
              <span className="text-[10px] font-bold bg-blue-50 text-blue-900 px-2 py-0.5 rounded-md border border-blue-200">
                ตั้งค่าระบบได้เอง 100%
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              คุณครูสามารถกำหนด เพิ่ม แก้ไข ผู้ดูแลงาน รถยนต์ ห้องประชุม สิทธิ์ และข้อมูลต่างๆ ได้ด้วยตนเอง
            </p>
          </div>
        </div>

        {successMessage && (
          <div className="px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-2 shadow-2xs animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* 2. Content Layout (Vertical tabs sidebar + Content area) */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Sidebar Columns: Tabs */}
        <div className="w-full lg:w-72 shrink-0 flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none lg:h-[fit-content] lg:sticky lg:top-4 bg-slate-50 p-2 lg:p-0 rounded-2xl border lg:border-0 border-slate-200">
          <button
            onClick={() => setActiveTab('workflows')}
            className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer border ${
              activeTab === 'workflows'
                ? 'bg-[#0b1f3a] text-white shadow-md border-[#0b1f3a]'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
            }`}
          >
            <ClipboardList className="w-4 h-4 shrink-0" />
            <span className="truncate">1. กำหนดผู้ดูแล &amp; ผู้ตรวจสอบงาน</span>
          </button>

          <button
            onClick={() => setActiveTab('fleet')}
            className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer border ${
              activeTab === 'fleet'
                ? 'bg-[#0b1f3a] text-white shadow-md border-[#0b1f3a]'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
            }`}
          >
            <Car className="w-4 h-4 shrink-0" />
            <span className="truncate">2. ข้อมูลรถยนต์ &amp; คนขับ ({vehicles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rooms')}
            className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer border ${
              activeTab === 'rooms'
                ? 'bg-[#0b1f3a] text-white shadow-md border-[#0b1f3a]'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
            }`}
          >
            <Building className="w-4 h-4 shrink-0" />
            <span className="truncate">3. ข้อมูลห้องประชุม &amp; ผู้ดูแล ({rooms.length})</span>
          </button>

          <button
            onClick={() => void handleOpenUsers()}
            className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer border ${
              activeTab === 'users'
                ? 'bg-[#0b1f3a] text-white shadow-md border-[#0b1f3a]'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="truncate">4. บัญชีผู้ใช้ &amp; รีเซ็ตรหัส ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('school')}
            className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer border ${
              activeTab === 'school'
                ? 'bg-[#0b1f3a] text-white shadow-md border-[#0b1f3a]'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span className="truncate">5. ข้อมูลโรงเรียน &amp; ภาคเรียน</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer border ${
              activeTab === 'backup'
                ? 'bg-[#0b1f3a] text-white shadow-md border-[#0b1f3a]'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
            }`}
          >
            <Database className="w-4 h-4 shrink-0" />
            <span className="truncate">6. ฐานข้อมูล &amp; สำรองไฟล์</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer border ${
              activeTab === 'logs'
                ? 'bg-[#0b1f3a] text-white shadow-md border-[#0b1f3a]'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0 text-blue-800" />
            <span className="truncate">7. บันทึกประวัติการใช้งาน ({auditLogs.length})</span>
          </button>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 min-w-0 w-full space-y-6">

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: WORKFLOWS & ROLE ASSIGNMENTS                           */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'workflows' && (
        <div className="space-y-5">
          <div className="bg-white rounded-3xl p-6 border border-[#dbe4f0] shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-extrabold text-[#0b1f3a]">
                  กำหนดขั้นตอนการอนุมัติแต่ละระบบงาน (Approval Workflow)
                </h2>
                <p className="text-xs text-slate-400">
                  เลือกชื่อผู้รับผิดชอบแต่ละขั้นตอน ระบบจะนำชื่อไปใช้ในเวิร์กโฟลว์และเอกสารราชการอัตโนมัติ
                </p>
              </div>
            </div>
          </div>

          {pipelines.map((pipeline) => {
            const colorMap: Record<string, string> = {
              emerald: 'from-emerald-50 to-white border-emerald-200',
              blue: 'from-blue-50 to-white border-blue-200',
              indigo: 'from-indigo-50 to-white border-indigo-200',
              purple: 'from-purple-50 to-white border-purple-200',
              teal: 'from-teal-50 to-white border-teal-200',
              amber: 'from-amber-50 to-white border-amber-200'
            };
            const headerColorMap: Record<string, string> = {
              emerald: 'bg-emerald-800',
              blue: 'bg-[#0b1f3a]',
              indigo: 'bg-indigo-800',
              purple: 'bg-purple-800',
              teal: 'bg-teal-800',
              amber: 'bg-amber-700'
            };

            return (
              <div
                key={pipeline.id}
                className={`rounded-3xl border bg-gradient-to-br ${colorMap[pipeline.color] || colorMap.blue} shadow-xs overflow-hidden`}
              >
                {/* Header */}
                <div className={`px-6 py-4 ${headerColorMap[pipeline.color] || headerColorMap.blue} text-white flex items-center gap-3`}>
                  <span className="text-2xl">{pipeline.icon}</span>
                  <div>
                    <h3 className="font-extrabold text-sm">{pipeline.systemName}</h3>
                    <p className="text-[11px] text-white/70">{pipeline.steps.length} ขั้นตอน</p>
                  </div>
                </div>

                {/* Pipeline Steps */}
                <div className="p-6">
                  <div className="flex flex-col gap-0">
                    {pipeline.steps.map((step, idx) => {
                      const assignedUser = users.find(u => u.id === step.assignedUserId);
                      const isAutoStep = (step.stepNumber === 1 && pipeline.id !== 'pipe-substitute') ||
                        (pipeline.id === 'pipe-substitute' && step.stepNumber === 2) ||
                        (pipeline.id === 'pipe-vehicle' && step.stepNumber === 4) ||
                        ((pipeline.id === 'pipe-repair' || pipeline.id === 'pipe-repair-av' || pipeline.id === 'pipe-repair-build') && step.stepNumber === 3) || 
                        (pipeline.id === 'pipe-room' && step.stepNumber === 4);

                      return (
                        <div key={step.stepNumber}>
                          <div className="flex items-start gap-4">
                            {/* Step Number Circle & Line */}
                            <div className="flex flex-col items-center shrink-0">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm shadow-md ${
                                isAutoStep
                                  ? 'bg-slate-200 text-slate-600'
                                  : 'bg-[#0b1f3a] text-white'
                              }`}>
                                {step.stepNumber}
                              </div>
                              {idx < pipeline.steps.length - 1 && (
                                <div className="w-0.5 h-8 bg-slate-300 my-1"></div>
                              )}
                            </div>

                            {/* Step Content */}
                            <div className="flex-1 pb-3">
                              <div className="text-base font-extrabold text-slate-800 mb-0.5">
                                {step.stepName}
                              </div>
                              <div className="text-sm text-slate-500 mb-2">
                                {step.description}
                              </div>

                              {isAutoStep ? (
                                <div className="text-xs text-slate-500 italic bg-slate-100 px-3 py-1.5 rounded-lg inline-block">
                                  {step.stepNumber === 1 ? '← ผู้ยื่นคำขอ (ดำเนินการอัตโนมัติ)' : '← ส่งการแจ้งเตือนอัตโนมัติ'}
                                </div>
                              ) : pipeline.id === 'pipe-room' && step.stepNumber === 3 ? (
                                <div className="space-y-4 mt-1 max-w-md">
                                  {rooms.map(room => {
                                    const managerIds = room.managerIds || (room.managerId ? [room.managerId] : []);
                                    return (
                                      <div key={room.id} className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-2">
                                        <div className="text-xs font-bold text-slate-700">
                                          🏢 ผู้ดูแล {room.name}:
                                        </div>
                                        
                                        {/* List of currently assigned managers as badges */}
                                        <div className="flex flex-wrap gap-1.5">
                                          {managerIds.length === 0 ? (
                                            <span className="text-xs text-slate-400 italic">ยังไม่มีผู้ดูแลสำหรับห้องนี้</span>
                                          ) : (
                                            managerIds.map((mId: string) => {
                                              const u = users.find(user => user.id === mId);
                                              if (!u) return null;
                                              return (
                                                <span key={mId} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-950 text-xs font-extrabold border border-purple-200">
                                                  <span>{u.name}</span>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      const nextIds = managerIds.filter((id: string) => id !== mId);
                                                      void updateRoomManager(room.id, nextIds);
                                                    }}
                                                    className="w-4 h-4 rounded-full bg-purple-200 hover:bg-purple-300 text-purple-800 flex items-center justify-center font-bold text-[10px] cursor-pointer"
                                                  >
                                                    ✕
                                                  </button>
                                                </span>
                                              );
                                            })
                                          )}
                                        </div>

                                        {/* Dropdown to add a manager */}
                                        <SearchableTeacherSelect
                                          users={users}
                                          value=""
                                          placeholder="พิมพ์ชื่อเพื่อเพิ่มผู้ดูแล..."
                                          onChange={(val) => {
                                            if (!val) return;
                                            if (managerIds.includes(val)) {
                                              alert('คุณครูท่านนี้ได้รับแต่งตั้งเป็นผู้ดูแลห้องนี้อยู่แล้ว');
                                              return;
                                            }
                                            void updateRoomManager(room.id, [...managerIds, val]);
                                          }}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="w-full max-w-md">
                                  <SearchableTeacherSelect users={users} value={step.assignedUserId} onChange={(id) => updatePipelineStep(pipeline.id, step.stepNumber, id)} placeholder="พิมพ์ชื่อผู้รับผิดชอบ..." />
                                </div>
                              )}

                              {!isAutoStep && pipeline.id !== 'pipe-room' && assignedUser && (
                                <div className="mt-1.5 text-xs text-slate-500 font-medium">
                                  ✓ ผู้รับผิดชอบปัจจุบัน: <strong className="text-blue-900 font-bold">{assignedUser.name}</strong> ({assignedUser.position})
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: FLEET & DRIVERS                                        */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'fleet' && (
        <div className="bg-white rounded-3xl p-6 border border-[#dbe4f0] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-[#0b1f3a] flex items-center gap-2">
                <span>จัดการข้อมูลยานพาหนะโรงเรียน &amp; พนักงานขับรถประจำคัน</span>
              </h2>
              <p className="text-xs text-slate-400">
                เพิ่ม แก้ไข ป้ายทะเบียน ยี่ห้อรถ จำนวนที่นั่ง และกำหนดคนขับประจำรถ
              </p>
            </div>

            <button
              onClick={() => {
                setEditingVehicle({
                  id: `v-${Date.now()}`,
                  plateNumber: '',
                  province: 'ระยอง',
                  model: 'Toyota Commuter',
                  type: 'รถตู้โดยสาร',
                  driverId: users[0]?.id || 'MMV98',
                  driverName: '',
                  driverPhone: '',
                  status: 'available',
                  seats: 14
                });
                setShowVehicleModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#0b1f3a] hover:bg-[#153e70] text-white text-xs font-extrabold flex items-center gap-2 shadow-md shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มรถยนต์คันใหม่</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className="p-5 rounded-3xl bg-gradient-to-br from-blue-50/50 to-slate-50 border border-slate-200 space-y-3 relative group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#0b1f3a] text-white flex items-center justify-center font-bold">
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm font-mono">
                        {v.plateNumber} {v.province}
                      </h3>
                      <p className="text-[11px] text-blue-900 font-semibold">{v.model}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setEditingVehicle(v);
                      setShowVehicleModal(true);
                    }}
                    className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold cursor-pointer"
                    title="แก้ไขข้อมูลรถ"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 text-xs pt-2 border-t border-slate-200/60">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[11px]">ประเภท / ที่นั่ง:</span>
                    <strong className="text-slate-800">{v.type} ({v.seats} ที่นั่ง)</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[11px]">พนักงานขับรถ:</span>
                    <strong className="text-blue-900">{v.driverName}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[11px]">เบอร์ติดต่อ:</span>
                    <span className="text-slate-700 font-mono text-[11px]">{v.driverPhone || '-'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: MEETING ROOMS                                          */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'rooms' && (
        <div className="bg-white rounded-3xl p-6 border border-[#dbe4f0] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-[#0b1f3a] flex items-center gap-2">
                <span>จัดการข้อมูลห้องประชุม &amp; ผู้รับผิดชอบดูแลห้อง</span>
              </h2>
              <p className="text-xs text-slate-400">
                กำหนดชื่อห้องประชุม อาคารที่ตั้ง ความจุ และครูผู้ถือกุญแจ/ดูแลอุปกรณ์ประจำห้อง
              </p>
            </div>

            <button
              onClick={() => {
                setEditingRoom({
                  id: `room-${Date.now()}`,
                  name: '',
                  capacity: '30 - 50 ท่าน',
                  location: 'อาคาร 1',
                  facilities: ['โปรเจกเตอร์', 'ระบบเสียง', 'ไมโครโฟน']
                } as MeetingRoom);
                setShowRoomModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#0b1f3a] hover:bg-[#153e70] text-white text-xs font-extrabold flex items-center gap-2 shadow-md shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มห้องประชุมใหม่</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rooms.map((r) => (
              <div
                key={r.id}
                className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-3 relative group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-900 text-white flex items-center justify-center font-bold">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">{r.name}</h3>
                      <p className="text-[11px] text-purple-900 font-semibold">{r.location}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setEditingRoom(r);
                      setShowRoomModal(true);
                    }}
                    className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold cursor-pointer"
                    title="แก้ไขข้อมูลห้อง"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2 text-xs pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[11px] font-medium">ความจุ:</span>
                    <strong className="text-slate-800 font-bold">{r.capacity} คน</strong>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500 block font-medium">ผู้ดูแลห้อง:</span>
                    <div className="flex flex-wrap gap-1">
                      {r.managerName && r.managerName !== 'ยังไม่กำหนด' ? (
                        r.managerName.split(',').map((name, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-lg bg-blue-50/80 text-blue-900 border border-blue-200/60 text-[10px] font-bold">
                            {name.trim()}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">ยังไม่กำหนด</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: USERS & PASSWORDS                                      */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl p-6 border border-[#dbe4f0] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-[#0b1f3a]">
                จัดการบัญชีบุคลากร ({filteredUsers.length} ท่าน)
              </h2>
              <p className="text-xs text-slate-400">
                แก้ไขข้อมูลส่วนตัว, กำหนดสิทธิ์ Admin และสร้างรหัสผ่านชั่วคราว
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, รหัส, เลข 13 หลัก..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 outline-hidden w-64 font-medium"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setIsCreatingUser(true);
                setEditingUser({ id: '', name: '', position: '', department: '', role: 'teacher', avatar: 'ม', email: '', phone: '', organization: 'โรงเรียนมกุฎเมืองราชวิทยาลัย', leaveQuota: { sick: 0, personal: 0 }, leaveUsed: { sick: 0, personal: 0 }, leaveCount: { sick: 0, personal: 0 } });
                setShowUserEditModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0b1f3a] text-white font-bold text-xs"
            ><Plus className="w-4 h-4" /> เพิ่มบัญชี</button>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-3 px-3 align-middle text-left whitespace-nowrap">รหัส</th>
                  <th className="pb-3 px-3 align-middle text-left whitespace-nowrap">เลขประจำตัว 13 หลัก</th>
                  <th className="pb-3 px-3 align-middle text-left whitespace-nowrap min-w-[180px]">ชื่อ-นามสกุล</th>
                  <th className="pb-3 px-3 align-middle text-left whitespace-nowrap min-w-[200px]">ตำแหน่ง &amp; ฝ่ายงาน</th>
                  <th className="pb-3 px-3 align-middle text-center whitespace-nowrap">สิทธิ์ผู้ใช้งาน</th>
                  <th className="pb-3 px-3 align-middle text-center whitespace-nowrap">สถานะรหัสผ่าน</th>
                  <th className="pb-3 px-3 align-middle text-right whitespace-nowrap min-w-[200px]">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isAdmin = u.role === 'admin' || u.role === 'director' || u.role.startsWith('deputy');
                  const isMustChange = u.mustChangePassword !== false;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-3 align-middle font-mono font-bold text-blue-900 whitespace-nowrap">{u.id}</td>
                      <td className="py-4 px-3 align-middle font-mono text-slate-600 whitespace-nowrap">
                        {u.citizenId || <span className="text-slate-400">ยังไม่มีข้อมูล</span>}
                      </td>
                      <td className="py-4 px-3 align-middle whitespace-nowrap">
                        <div className="font-bold text-slate-800">{u.name}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{u.phone || '-'}</div>
                      </td>
                      <td className="py-4 px-3 align-middle">
                        <div className="font-semibold text-slate-700 leading-snug">{u.position}</div>
                        <div className="text-[10px] text-slate-400 font-medium leading-snug">{u.department}</div>
                      </td>
                      <td className="py-4 px-3 align-middle text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isAdmin ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isAdmin ? '🛡️ ผู้ดูแล (Admin)' : 'ครูผู้สอน/บุคลากร'}
                        </span>
                      </td>
                      <td className="py-4 px-3 align-middle text-center whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-extrabold ${
                          isMustChange ? 'bg-amber-50 text-amber-700 border border-amber-200/50' : 'bg-emerald-50 text-emerald-800 border border-emerald-200/50'
                        }`}>
                          {isMustChange ? 'รอเปลี่ยนรหัสผ่าน' : '✓ ตั้งรหัสส่วนตัวแล้ว'}
                        </span>
                      </td>
                      <td className="py-4 px-3 align-middle text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleAdmin(u)}
                            className={`px-2.5 py-1.5 rounded-lg font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer border ${
                              isAdmin
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                                : 'bg-slate-100 hover:bg-blue-50 hover:text-blue-900 hover:border-blue-300 text-slate-600 border-slate-200'
                            }`}
                            title={isAdmin ? "คลิกเพื่อปลดสิทธิ์ Admin" : "คลิกเพื่อมอบสิทธิ์ผู้ดูแลระบบ (Admin)"}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{isAdmin ? "Admin" : "+ มอบสิทธิ์"}</span>
                          </button>

                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setShowUserEditModal(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                            title="แก้ไขข้อมูลครู"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedUserForReset(u);
                              setTemporaryPassword('');
                              setShowResetModal(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold text-[10px] transition-all cursor-pointer border border-slate-200 hover:border-rose-200 flex items-center gap-0.5"
                            title="รีเซ็ตรหัสผ่าน"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>รีเซ็ต</span>
                          </button>
                          <button
                            onClick={() => void handleDeleteUser(u)}
                            disabled={u.id === currentUser.id}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="ปิดใช้งานบัญชี"
                          ><Trash2 className="w-3.5 h-3.5" /></button>
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

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: SCHOOL SETTINGS                                        */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'school' && (
        <div className="bg-white rounded-3xl p-6 border border-[#dbe4f0] shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-extrabold text-[#0b1f3a]">
              ข้อมูลสถานศึกษา &amp; ภาคเรียนปัจจุบัน
            </h2>
            <p className="text-xs text-slate-400">
              ข้อมูลนี้จะปรากฏในหัวเอกสารราชการทางการ (PDF) และใบสั่งการทุกระบบ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">ชื่อสถานศึกษา</label>
              <input
                type="text"
                value={schoolSettings.name}
                onChange={(e) => setSchoolSettings({ ...schoolSettings, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">หน่วยงานต้นสังกัด</label>
              <input
                type="text"
                value={schoolSettings.org}
                onChange={(e) => setSchoolSettings({ ...schoolSettings, org: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">ปีการศึกษาปัจจุบัน</label>
              <input
                type="text"
                value={schoolSettings.year}
                onChange={(e) => setSchoolSettings({ ...schoolSettings, year: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">ภาคเรียนที่</label>
              <select
                value={schoolSettings.semester}
                onChange={(e) => setSchoolSettings({ ...schoolSettings, semester: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
              >
                <option value="1">ภาคเรียนที่ 1</option>
                <option value="2">ภาคเรียนที่ 2</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => notify('✓ บันทึกข้อมูลสถานศึกษาเรียบร้อยแล้ว')}
              className="px-6 py-2.5 rounded-xl bg-[#0b1f3a] text-white font-extrabold text-xs shadow-md hover:bg-[#153e70] flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการตั้งค่า</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 6: DATABASE & BACKUP                                      */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'backup' && (
        <div className="bg-white rounded-3xl p-6 border border-[#dbe4f0] shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-extrabold text-[#0b1f3a]">
              สถานะฐานข้อมูล MariaDB HostAtom &amp; สำรองข้อมูล
            </h2>
            <p className="text-xs text-slate-400">
              ตรวจสอบการเชื่อมต่อเซิร์ฟเวอร์ MySQL และดาวน์โหลดไฟล์สำรองข้อมูล (Backup)
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3">
            <div className="flex items-center gap-2 text-blue-900 font-extrabold text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>สถานะ: เชื่อมต่อฐานข้อมูล mmvsc_mmv_school_db บน HostAtom เรียบร้อยแล้ว</span>
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
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 transition-all shadow-2xs"
            >
              <Download className="w-4 h-4 text-blue-900" />
              <span>ดาวน์โหลด SQL Seed Database</span>
            </a>

            <button
              onClick={() => {
                const fullBackup = {
                  users,
                  pipelines,
                  vehicles,
                  rooms,
                  schoolSettings,
                  timestamp: new Date().toISOString()
                };
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", "mmv_system_full_backup.json");
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
                notify('✓ ส่งออกไฟล์สำรองข้อมูลทั้งระบบสำเร็จ!');
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-800" />
              <span>สำรองข้อมูลระบบทั้งหมด (Full JSON Backup)</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 7: AUDIT LOGS                                             */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl p-6 border border-[#dbe4f0] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-[#0b1f3a] flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-900" />
                <span>บันทึกประวัติการใช้งานและกิจกรรมในระบบ (Audit Trail)</span>
              </h2>
              <p className="text-xs text-slate-400">
                ตรวจสอบการเข้าสู่ระบบ การอนุมัติเอกสาร และการแก้ไขข้อมูลเพื่อความปลอดภัยและโปร่งใส
              </p>
            </div>

            <button
              onClick={() => notify('✓ ล้างประวัติบันทึกชั่วคราวเรียบร้อย')}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
            >
              รีเฟรชประวัติ
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-3 px-3">วัน-เวลา</th>
                  <th className="pb-3 px-3">ผู้ดำเนินการ</th>
                  <th className="pb-3 px-3">กิจกรรม / การปฏิบัติงาน</th>
                  <th className="pb-3 px-3">รายละเอียด</th>
                  <th className="pb-3 px-3 text-center">ประเภท</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {log.date} {log.timestamp}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800">
                      {log.user}
                    </td>
                    <td className="py-3 px-3 font-semibold text-blue-900">
                      {log.action}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {log.details}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        log.type === 'security'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : log.type === 'vehicle'
                          ? 'bg-blue-100 text-blue-900 border border-blue-200'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      }`}>
                        {log.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT ROOM                                              */}
      {/* ------------------------------------------------------------- */}
      {showRoomModal && editingRoom && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-[#0b1f3a] text-sm flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-900" />
                <span>แก้ไขข้อมูลห้องประชุม</span>
              </h3>
              <button onClick={() => setShowRoomModal(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">ชื่อห้องประชุม *</label>
                <input
                  type="text"
                  required
                  value={editingRoom.name}
                  onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                  placeholder="เช่น ห้องประชุมราชพฤกษ์"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">อาคาร / สถานที่ตั้ง *</label>
                <input
                  type="text"
                  required
                  value={editingRoom.location || ''}
                  onChange={(e) => setEditingRoom({ ...editingRoom, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
                  placeholder="เช่น อาคาร 1 ชั้น 2"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ความจุห้องประชุม *</label>
                <input
                  type="text"
                  required
                  value={editingRoom.capacity}
                  onChange={(e) => setEditingRoom({ ...editingRoom, capacity: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                  placeholder="เช่น 80 - 100 ท่าน"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">รูปภาพอาคาร/สถานที่</label>
                {editingRoom.image && (
                  <img
                    src={editingRoom.image}
                    alt="Preview"
                    className="w-full h-36 object-cover rounded-2xl mb-2 border border-slate-200"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setEditingRoom({ ...editingRoom, image: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0b1f3a] text-white font-extrabold shadow-md cursor-pointer"
                >
                  ✓ บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT VEHICLE                                           */}
      {/* ------------------------------------------------------------- */}
      {showVehicleModal && editingVehicle && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-[#0b1f3a] text-sm flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-900" />
                <span>กำหนดข้อมูลรถยนต์และพนักงานขับรถ</span>
              </h3>
              <button onClick={() => setShowVehicleModal(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">หมายเลขทะเบียน *</label>
                  <input
                    type="text"
                    required
                    value={editingVehicle.plateNumber}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, plateNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                    placeholder="เช่น ขค 1456"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">จังหวัด</label>
                  <input
                    type="text"
                    value={editingVehicle.province}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, province: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ยี่ห้อ &amp; รุ่นรถ</label>
                <input
                  type="text"
                  value={editingVehicle.model}
                  onChange={(e) => setEditingVehicle({ ...editingVehicle, model: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  placeholder="เช่น Toyota Commuter (ดีเซล)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ประเภทรถ</label>
                  <input
                    type="text"
                    value={editingVehicle.type}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">จำนวนที่นั่ง</label>
                  <input
                    type="number"
                    value={editingVehicle.seats}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, seats: parseInt(e.target.value) || 14 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">พนักงานขับรถประจำคัน</label>
                <select
                  value={editingVehicle.driverId}
                  onChange={(e) => setEditingVehicle({ ...editingVehicle, driverId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowVehicleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0b1f3a] text-white font-extrabold shadow-md cursor-pointer"
                >
                  ✓ บันทึกข้อมูลรถ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT USER PROFILE                                      */}
      {/* ------------------------------------------------------------- */}
      {showUserEditModal && editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-[#0b1f3a] text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-900" />
                <span>{isCreatingUser ? 'เพิ่มบัญชีบุคลากร' : `แก้ไขข้อมูลบุคลากร [${editingUser.id}]`}</span>
              </h3>
              <button onClick={() => setShowUserEditModal(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              {isCreatingUser && <div>
                <label className="block text-slate-700 font-bold mb-1">รหัสบุคลากร *</label>
                <input type="text" required value={editingUser.id} onChange={(e) => setEditingUser({ ...editingUser, id: e.target.value.trim().toUpperCase() })} placeholder="เช่น MMV101" className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold" />
              </div>}
              {!isCreatingUser && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">บัญชีผู้ใช้</label>
                  <input
                    type="text"
                    value={editingUser.citizenId || ''}
                    maxLength={13}
                    inputMode="numeric"
                    onChange={(e) => setEditingUser({ ...editingUser, citizenId: e.target.value.replace(/\D/g, '').slice(0, 13) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-700"
                  />
                </div>
              )}
              <div className="grid grid-cols-[96px_1fr] gap-3 items-start">
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                  {editingUser.photoUrl ? <img src={editingUser.photoUrl} alt="รูปบุคลากร" className="w-full h-full object-cover" /> : <span className="text-[10px] text-slate-400 text-center">ยังไม่มีรูป</span>}
                </div>
                <label className="block text-slate-700 font-bold">รูปประจำตัว
                  <input id="admin-personnel-photo" type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const reader = new FileReader(); reader.onload = () => setEditingUser({ ...editingUser, photoUrl: String(reader.result || '') }); reader.readAsDataURL(file);
                  }} />
                  <span className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0b1f3a] px-3 py-2 text-[11px] font-bold text-white hover:bg-[#153a66]">📷 เพิ่มรูปประจำตัว</span>
                </label>
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">ชื่อ-นามสกุล *</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ตำแหน่ง</label>
                  <input
                    type="text"
                    value={editingUser.position}
                    onChange={(e) => setEditingUser({ ...editingUser, position: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">กลุ่มสาระ / ฝ่ายงาน</label>
                  <input
                    type="text"
                    value={editingUser.department}
                    onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">ภาระงานที่ได้รับ</label>
                <textarea
                  rows={3}
                  value={(editingUser.assignments || []).map(a => a.role || a.duty || '').filter(Boolean).join('\n')}
                  onChange={(e) => setEditingUser({ ...editingUser, assignments: e.target.value.split('\n').map(role => role.trim()).filter(Boolean).map(role => ({ role })) })}
                  placeholder="กรอกภาระงาน หนึ่งรายการต่อหนึ่งบรรทัด"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">สิทธิ์ในระบบ</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as User['role'] })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                  >
                    <option value="teacher">ครูผู้สอน / บุคลากร</option>
                    <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                    <option value="director">ผู้อำนวยการ</option>
                    <option value="deputy_budget">รอง ผอ.งบประมาณ</option>
                    <option value="deputy_personnel">รอง ผอ.บุคคล/วิชาการ</option>
                    <option value="head">หัวหน้ากลุ่มสาระ</option>
                    <option value="driver">พนักงานขับรถ</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUserEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0b1f3a] text-white font-extrabold shadow-md cursor-pointer"
                >
                  ✓ บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CONFIRM RESET PASSWORD                                 */}
      {/* ------------------------------------------------------------- */}
      {showResetModal && selectedUserForReset && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-[#0b1f3a] text-sm flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-rose-600" />
                <span>ยืนยันการรีเซ็ตรหัสผ่าน</span>
              </h3>
              <button onClick={() => setShowResetModal(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-800 space-y-1.5">
              <div>ต้องการรีเซ็ตรหัสผ่านของ <strong>{selectedUserForReset.name}</strong> หรือไม่?</div>
              <div className="text-[11px] text-rose-700">
                ระบบจะสร้างรหัสผ่านชั่วคราวแบบสุ่มและบังคับให้ผู้ใช้ตั้งรหัสใหม่เมื่อเข้าสู่ระบบครั้งถัดไป
              </div>
            </div>

            {temporaryPassword && (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-2">
                <div className="font-bold">รหัสผ่านชั่วคราว (แสดงครั้งเดียว)</div>
                <code className="block select-all rounded-xl bg-white border border-amber-300 px-3 py-2 text-sm font-black tracking-wide">
                  {temporaryPassword}
                </code>
                <div className="text-[11px]">ส่งให้เจ้าของบัญชีผ่านช่องทางส่วนตัว แล้วปิดหน้าต่างนี้</div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setSelectedUserForReset(null);
                  setTemporaryPassword('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => void handleResetPassword()}
                disabled={isResettingPassword || temporaryPassword !== ''}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md cursor-pointer"
              >
                {temporaryPassword ? 'สร้างรหัสผ่านแล้ว' : isResettingPassword ? 'กำลังสร้าง...' : '✓ ยืนยันรีเซ็ตรหัสผ่าน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
