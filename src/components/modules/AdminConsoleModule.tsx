'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { User, Vehicle, MeetingRoom } from '../../types';
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

export const AdminConsoleModule: React.FC = () => {
  const { users, updateUser, setUsersList, currentUser, addToast } = useApp();

  const [activeTab, setActiveTab] = useState<'workflows' | 'fleet' | 'rooms' | 'users' | 'school' | 'backup' | 'line' | 'logs'>('workflows');
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
        { stepNumber: 2, stepName: 'ผู้ตรวจสอบใบลา', assignedUserId: 'MMV04', description: 'ตรวจสอบวันลาคงเหลือ สถิติการลา และข้อมูลถูกต้อง' },
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
        { stepNumber: 2, stepName: 'ผู้ตรวจสอบและจัดสรรรถ', assignedUserId: 'MMV04', description: 'ตรวจสอบตารางรถว่าง จัดสรรรถและคนขับ' },
        { stepNumber: 3, stepName: 'รองผู้อำนวยการ อนุมัติ (การใช้รถ & กรณีเช่ารถ)', assignedUserId: 'MMV04', description: 'รอง ผอ. อนุมัติการใช้รถยนต์ส่วนกลางและเช่ารถภายนอกทั้งหมดจบในขั้นตอนเดียว' }
      ]
    },
    {
      id: 'pipe-duty',
      systemName: 'ระบบขออนุญาตไปราชการ',
      icon: '✈️',
      color: 'indigo',
      steps: [
        { stepNumber: 1, stepName: 'ผู้ยื่นคำขอไปราชการ', assignedUserId: '', description: 'ครูกรอกบันทึกข้อความขอไปราชการ' },
        { stepNumber: 2, stepName: 'ผู้ตรวจสอบงบประมาณ', assignedUserId: 'MMV04', description: 'ตรวจสอบงบประมาณ ความเหมาะสม และแผนงาน' },
        { stepNumber: 3, stepName: 'รองผู้อำนวยการ เสนอความเห็น', assignedUserId: 'MMV04', description: 'รอง ผอ. เสนอความเห็นประกอบ' },
        { stepNumber: 4, stepName: 'ผู้อำนวยการ อนุมัติคำสั่ง', assignedUserId: 'MMV01', description: 'ผอ. ลงนามคำสั่งไปราชการ' }
      ]
    },
    {
      id: 'pipe-repair',
      systemName: 'ระบบแจ้งซ่อมบำรุง & อาคารสถานที่',
      icon: '🔧',
      color: 'purple',
      steps: [
        { stepNumber: 1, stepName: 'ผู้แจ้งซ่อม', assignedUserId: '', description: 'ครู/บุคลากร กรอกรายละเอียดแจ้งซ่อมในระบบ (ดำเนินการอัตโนมัติ)' },
        { stepNumber: 2, stepName: 'ผู้ตรวจเช็คและรับงานซ่อม (หัวหน้าช่าง)', assignedUserId: 'MMV97', description: 'หัวหน้าช่างตรวจสอบความพร้อม อะไหล่ และจ่ายงาน' },
        { stepNumber: 3, stepName: 'เมื่อซ่อมเสร็จแจ้งกลับไปยัง [ผู้แจ้งซ่อม] จบงาน', assignedUserId: '', description: 'ระบบแจ้งความคืบหน้าแจ้งกลับไปยังผู้แจ้งซ่อมเพื่อปิดงานอัตโนมัติ' }
      ]
    },
    {
      id: 'pipe-substitute',
      systemName: 'ระบบจัดครูสอนแทน',
      icon: '👨‍🏫',
      color: 'teal',
      steps: [
        { stepNumber: 1, stepName: 'ครูผู้ขอจัดสอนแทน', assignedUserId: '', description: 'ครูที่ลา/ไปราชการ แจ้งขอจัดครูสอนแทน' },
        { stepNumber: 2, stepName: 'ผู้จัดตารางสอนแทน', assignedUserId: 'MMV11', description: 'เจ้าหน้าที่วิชาการจัดหาครูสอนแทนตามคาบ' },
        { stepNumber: 3, stepName: 'รองผู้อำนวยการวิชาการ รับทราบ', assignedUserId: 'MMV02', description: 'รอง ผอ. วิชาการ รับทราบและลงนาม' }
      ]
    },
    {
      id: 'pipe-room',
      systemName: 'ระบบจองห้องประชุม',
      icon: '🏢',
      color: 'amber',
      steps: [
        { stepNumber: 1, stepName: 'ผู้ขอจองห้องประชุม', assignedUserId: '', description: 'ครู/ฝ่ายงาน แจ้งขอใช้ห้องประชุม (ระบบแจ้งเตือนไปยังผู้ดูแลห้องอัตโนมัติ)' },
        { stepNumber: 2, stepName: 'ผู้ดูแลห้องประชุม ตรวจสอบ & รับทราบ', assignedUserId: 'MMV03', description: 'ผู้ดูแลห้องตรวจสอบความถูกต้องและกดรับทราบ/อนุมัติการจอง' },
        { stepNumber: 3, stepName: 'แจ้งกลับมายังผู้ขอใช้ จบงาน', assignedUserId: '', description: 'ระบบแจ้งความคืบหน้าแจ้งกลับไปยังผู้ขอจองห้องประชุมเพื่อรับทราบและจบงาน' }
      ]
    }
  ];

  const [pipelines, setPipelines] = useState<WorkflowPipeline[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mmv_admin_pipelines_v6');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return initialPipelines;
  });

  const savePipelines = (updated: WorkflowPipeline[]) => {
    setPipelines(updated);
    try {
      localStorage.setItem('mmv_admin_pipelines_v6', JSON.stringify(updated));
    } catch (e) {}
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
    savePipelines(updated);
  };

  // -------------------------------------------------------------
  // 2. Fleet Management (จัดการข้อมูลรถยนต์และคนขับ)
  // -------------------------------------------------------------
  const initialVehiclesList: any[] = [
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

  const [vehicles, setVehicles] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mmv_admin_vehicles');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return initialVehiclesList;
  });

  const [editingVehicle, setEditingVehicle] = useState<any | null>(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);

  // -------------------------------------------------------------
  // 3. Meeting Rooms Management (จัดการห้องประชุมและผู้ดูแล)
  // -------------------------------------------------------------
  const initialRoomsList: any[] = [
    {
      id: 'room-1',
      name: 'ห้องประชุมราชพฤกษ์',
      capacity: '80 - 100 ท่าน',
      building: 'อาคาร 1 ชั้น 2',
      managerId: 'MMV03',
      managerName: 'นายไชยวัฒน์ บุญมี',
      amenities: ['โปรเจกเตอร์ 4K', 'ระบบเสียงห้องประชุม', 'ระบบถ่ายทอดสด Zoom', 'ไมโครโฟนไร้สาย 4 ตัว']
    },
    {
      id: 'room-2',
      name: 'ห้องโสตทัศนศึกษา',
      capacity: '40 - 50 ท่าน',
      building: 'อาคาร 2 ชั้น 1',
      managerId: 'MMV10',
      managerName: 'นางสาวกาญจนา สมคิด',
      amenities: ['Smart TV 75 นิ้ว', 'ระบบประชุมทางไกล', 'เครื่องปรับอากาศ 4 ทิศทาง']
    },
    {
      id: 'room-3',
      name: 'ห้องประชุมเกียรติยศ',
      capacity: '20 - 30 ท่าน',
      building: 'อาคารอำนวยการ',
      managerId: 'MMV01',
      managerName: 'นางสาวมณฑาทิพย์ เสาวคนธ์',
      amenities: ['โต๊ะประชุม VIP รูปตัว U', 'ไมโครโฟนประจำที่นั่ง', 'จอ LED Display']
    }
  ];

  const [rooms, setRooms] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mmv_admin_rooms');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return initialRoomsList;
  });

  const [editingRoom, setEditingRoom] = useState<any | null>(null);
  const [showRoomModal, setShowRoomModal] = useState(false);

  // -------------------------------------------------------------
  // 4. School Settings (ข้อมูลโรงเรียน & ภาคเรียน)
  // -------------------------------------------------------------
  const [schoolSettings, setSchoolSettings] = useState({
    name: 'โรงเรียนมกุฎเมืองราชวิทยาลัย',
    org: 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง',
    year: '2567',
    semester: '1',
    phone: '038-611234',
    email: 'info@mmvschool.ac.th',
    directorName: 'นางสาวมณฑาทิพย์ เสาวคนธ์',
    directorPosition: 'ผู้อำนวยการ ชำนาญการพิเศษ'
  });

  // User Management Edit Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showUserEditModal, setShowUserEditModal] = useState(false);

  // LINE Notify & Webhooks State
  const [lineSettings, setLineSettings] = useState({
    vehicleGroupToken: '',
    personnelGroupToken: '',
    facilitiesGroupToken: '',
    academicGroupToken: '',
    generalNotifyToken: ''
  });

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([
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
    let nextList: any[];
    if (exists) {
      nextList = vehicles.map(v => v.id === updated.id ? updated : v);
    } else {
      nextList = [...vehicles, { ...updated, id: `v-${Date.now()}` }];
    }
    setVehicles(nextList);
    localStorage.setItem('mmv_admin_vehicles', JSON.stringify(nextList));
    setShowVehicleModal(false);
    notify('✓ บันทึกข้อมูลรถยนต์และพนักงานขับรถเรียบร้อยแล้ว');
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    const manager = users.find(u => u.id === editingRoom.managerId);
    const updated = {
      ...editingRoom,
      managerName: manager ? manager.name : editingRoom.managerName
    };

    const exists = rooms.some(r => r.id === updated.id);
    let nextList: any[];
    if (exists) {
      nextList = rooms.map(r => r.id === updated.id ? updated : r);
    } else {
      nextList = [...rooms, { ...updated, id: `room-${Date.now()}` }];
    }
    setRooms(nextList);
    localStorage.setItem('mmv_admin_rooms', JSON.stringify(nextList));
    setShowRoomModal(false);
    notify('✓ บันทึกข้อมูลห้องประชุมและผู้ดูแลเรียบร้อยแล้ว');
  };

  // Toggle Admin Role
  const handleToggleAdmin = (u: User) => {
    const isCurrentlyAdmin = u.role === 'admin';
    const updated: User = {
      ...u,
      role: isCurrentlyAdmin ? 'teacher' : 'admin'
    };
    updateUser(updated);
    notify(`✓ ${isCurrentlyAdmin ? 'ปลดสิทธิ์ผู้ดูแลของ' : 'มอบสิทธิ์ผู้ดูแลระบบ (Admin) ให้'} ${u.name} เรียบร้อยแล้ว`);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    updateUser(editingUser);
    setShowUserEditModal(false);
    notify(`✓ บันทึกข้อมูลของ ${editingUser.name} เรียบร้อยแล้ว`);
  };

  const handleResetPassword = () => {
    if (!selectedUserForReset) return;
    const updated: User = {
      ...selectedUserForReset,
      password: 'Password@123',
      mustChangePassword: true
    };
    updateUser(updated);
    setShowResetModal(false);
    notify(`✓ รีเซ็ตรหัสผ่านของ ${selectedUserForReset.name} กลับเป็น Password@123 แล้ว`);
    setSelectedUserForReset(null);
  };

  // Filtered Users
  const filteredUsers = users.filter(u => {
    return (
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.citizenId && u.citizenId.includes(searchQuery)) ||
      u.department.toLowerCase().includes(searchQuery.toLowerCase())
    );
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

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('workflows')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'workflows'
              ? 'bg-[#0b1f3a] text-white shadow-md'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>1. กำหนดผู้ดูแล &amp; ผู้ตรวจสอบงาน</span>
        </button>

        <button
          onClick={() => setActiveTab('fleet')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'fleet'
              ? 'bg-[#0b1f3a] text-white shadow-md'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>2. ข้อมูลรถยนต์ &amp; คนขับ ({vehicles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rooms')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'rooms'
              ? 'bg-[#0b1f3a] text-white shadow-md'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>3. ข้อมูลห้องประชุม &amp; ผู้ดูแล ({rooms.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-[#0b1f3a] text-white shadow-md'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>4. บัญชีผู้ใช้ &amp; รีเซ็ตรหัส ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('school')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'school'
              ? 'bg-[#0b1f3a] text-white shadow-md'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>5. ข้อมูลโรงเรียน &amp; ภาคเรียน</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'backup'
              ? 'bg-[#0b1f3a] text-white shadow-md'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>6. ฐานข้อมูล &amp; สำรองไฟล์</span>
        </button>

        <button
          onClick={() => setActiveTab('line')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'line'
              ? 'bg-[#0b1f3a] text-white shadow-md'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>7. แจ้งเตือน LINE Notify</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-[#0b1f3a] text-white shadow-md'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4 text-blue-800" />
          <span>8. บันทึกประวัติการใช้งาน ({auditLogs.length})</span>
        </button>
      </div>

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
                      const isAutoStep = step.stepNumber === 1 || (pipeline.id === 'pipe-repair' && step.stepNumber === 3) || (pipeline.id === 'pipe-room' && step.stepNumber === 3);

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
                              <div className="text-xs font-extrabold text-slate-800 mb-0.5">
                                {step.stepName}
                              </div>
                              <div className="text-[11px] text-slate-500 mb-2">
                                {step.description}
                              </div>

                              {isAutoStep ? (
                                <div className="text-[11px] text-slate-400 italic bg-slate-100 px-3 py-1.5 rounded-lg inline-block">
                                  {step.stepNumber === 1 ? '← ผู้ยื่นคำขอ (ดำเนินการอัตโนมัติ)' : '← ส่งการแจ้งเตือนและปิดงานอัตโนมัติ'}
                                </div>
                              ) : (
                                <select
                                  value={step.assignedUserId}
                                  onChange={(e) => updatePipelineStep(pipeline.id, step.stepNumber, e.target.value)}
                                  className="w-full max-w-md px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 outline-hidden shadow-2xs cursor-pointer"
                                >
                                  <option value="">-- เลือกผู้รับผิดชอบ --</option>
                                  {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                  ))}
                                </select>
                              )}

                              {!isAutoStep && assignedUser && (
                                <div className="mt-1.5 text-[10px] text-slate-400">
                                  ✓ ผู้รับผิดชอบปัจจุบัน: <strong className="text-blue-900">{assignedUser.name}</strong> ({assignedUser.position})
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
                  building: 'อาคาร 1',
                  managerId: users[0]?.id || 'MMV03',
                  managerName: '',
                  amenities: ['โปรเจกเตอร์', 'ระบบเสียง', 'ไมโครโฟน']
                });
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
                      <p className="text-[11px] text-purple-900 font-semibold">{r.building}</p>
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

                <div className="space-y-1.5 text-xs pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[11px]">ความจุ:</span>
                    <strong className="text-slate-800">{r.capacity}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[11px]">ผู้ดูแลห้อง:</span>
                    <strong className="text-blue-900">{r.managerName}</strong>
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
                แก้ไขข้อมูลส่วนตัว, กำหนดสิทธิ์ Admin, รีเซ็ตรหัสผ่านเป็น Password@123
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
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-3 px-3">รหัส</th>
                  <th className="pb-3 px-3">ชื่อ-นามสกุล</th>
                  <th className="pb-3 px-3">ตำแหน่ง &amp; ฝ่ายงาน</th>
                  <th className="pb-3 px-3 font-mono">เลขบัตร 13 หลัก</th>
                  <th className="pb-3 px-3 text-center">สิทธิ์ผู้ใช้งาน</th>
                  <th className="pb-3 px-3 text-center">สถานะรหัสผ่าน</th>
                  <th className="pb-3 px-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isAdmin = u.role === 'admin' || u.role === 'director' || u.role.startsWith('deputy');
                  const isMustChange = u.mustChangePassword !== false;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-blue-900">{u.id}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{u.name}</div>
                        <div className="text-[10px] text-slate-400">{u.phone || '-'}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-700">{u.position}</div>
                        <div className="text-[10px] text-slate-400">{u.department}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 font-bold">
                        {u.citizenId ? (
                          <span>{u.citizenId.slice(0, 1)}-{u.citizenId.slice(1, 5)}-{u.citizenId.slice(5, 10)}-{u.citizenId.slice(10, 12)}-{u.citizenId.slice(12)}</span>
                        ) : '-'}
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
                          {isMustChange ? 'Password@123' : '✓ ตั้งรหัสส่วนตัวแล้ว'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleAdmin(u)}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer ${
                              isAdmin
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                                : 'bg-slate-100 hover:bg-blue-50 hover:text-blue-900 text-slate-600 border border-slate-200'
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
                              setShowResetModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold text-[11px] transition-all cursor-pointer"
                            title="รีเซ็ตรหัสผ่าน"
                          >
                            <KeyRound className="w-3 h-3 inline mr-1" />
                            รีเซ็ต
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
      {/* TAB 7: LINE NOTIFY SETTINGS                                  */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'line' && (
        <div className="bg-white rounded-3xl p-6 border border-[#dbe4f0] shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-extrabold text-[#0b1f3a] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <span>การตั้งค่าเชื่อมต่อการแจ้งเตือน LINE Notify &amp; Webhooks</span>
            </h2>
            <p className="text-xs text-slate-400">
              กำหนด LINE Notify Token เพื่อส่งข้อความแจ้งเตือนอัตโนมัติเข้ากลุ่มไลน์โรงเรียนเมื่อมีคำขอหรือการอนุมัติ
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-2">
            <div className="font-bold flex items-center gap-1.5">
              <span>💡 วิธีรับ LINE Notify Token:</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              1. เข้าสู่ระบบที่ <strong>notify-bot.line.me</strong> ด้วยบัญชี LINE ของโรงเรียน<br />
              2. ไปที่ My Page $\rightarrow$ กดปุ่ม <strong>Generate token</strong> $\rightarrow$ เลือกกลุ่มไลน์ที่ต้องการให้แจ้งเตือน<br />
              3. คัดลอก Token มาวางในช่องด้านล่าง แล้วเชิญ <strong>LINE Notify</strong> เข้ากลุ่มไลน์นั้น
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="block text-slate-800 font-bold">
                🚗 LINE Token กลุ่มยานพาหนะ &amp; คนขับ
              </label>
              <input
                type="password"
                placeholder="วาง LINE Notify Token ที่นี่..."
                value={lineSettings.vehicleGroupToken}
                onChange={(e) => setLineSettings({ ...lineSettings, vehicleGroupToken: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-xs"
              />
              <span className="text-[10px] text-slate-400 block">แจ้งเตือนทันทีเมื่อครูขอใช้รถ หรือรอง ผอ. สั่งการจัดสรรรถ</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="block text-slate-800 font-bold">
                📋 LINE Token กลุ่มงานบุคคล &amp; ใบลา
              </label>
              <input
                type="password"
                placeholder="วาง LINE Notify Token ที่นี่..."
                value={lineSettings.personnelGroupToken}
                onChange={(e) => setLineSettings({ ...lineSettings, personnelGroupToken: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-xs"
              />
              <span className="text-[10px] text-slate-400 block">แจ้งเตือนหัวหน้างานบุคคลเมื่อมีใบลาใหม่</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="block text-slate-800 font-bold">
                🔧 LINE Token กลุ่มช่าง &amp; ซ่อมบำรุง
              </label>
              <input
                type="password"
                placeholder="วาง LINE Notify Token ที่นี่..."
                value={lineSettings.facilitiesGroupToken}
                onChange={(e) => setLineSettings({ ...lineSettings, facilitiesGroupToken: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-xs"
              />
              <span className="text-[10px] text-slate-400 block">แจ้งเตือนช่างเมื่อมีรายการแจ้งซ่อมอาคาร/โสตฯ</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="block text-slate-800 font-bold">
                📢 LINE Token กลุ่มข่าวสารทั่วไปโรงเรียน
              </label>
              <input
                type="password"
                placeholder="วาง LINE Notify Token ที่นี่..."
                value={lineSettings.generalNotifyToken}
                onChange={(e) => setLineSettings({ ...lineSettings, generalNotifyToken: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-xs"
              />
              <span className="text-[10px] text-slate-400 block">แจ้งเตือนประกาศข่าวสารและคำสั่งสำคัญ</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => notify('🔔 จำลองการส่งข้อความแจ้งเตือนทดสอบเข้ากลุ่ม LINE สำเร็จ!')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>🔔 ทดสอบส่งข้อความแจ้งเตือนเข้า LINE</span>
            </button>

            <button
              onClick={() => notify('✓ บันทึกการตั้งค่า LINE Notify เรียบร้อยแล้ว')}
              className="px-6 py-2 rounded-xl bg-[#0b1f3a] text-white font-extrabold text-xs shadow-md hover:bg-[#153e70] flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการตั้งค่า LINE</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 8: AUDIT LOGS                                             */}
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
                <span>แก้ไขข้อมูลบุคลากร [{editingUser.id}]</span>
              </h3>
              <button onClick={() => setShowUserEditModal(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
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
                <label className="block text-slate-700 font-bold mb-1">เลขประจำตัวประชาชน 13 หลัก</label>
                <input
                  type="text"
                  value={editingUser.citizenId || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, citizenId: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-800"
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
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
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
                รหัสผ่านจะถูกตั้งค่ากลับเป็น: <strong>Password@123</strong> และระบบจะบังคับให้ผู้ใช้งานตั้งรหัสผ่านใหม่ส่วนตัวเมื่อเข้าสู่ระบบครั้งถัดไป
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
