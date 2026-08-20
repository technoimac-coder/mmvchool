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

export interface WorkflowRoleConfig {
  id: string;
  category: string;
  taskName: string;
  approverId: string;
  approverTitle: string;
  checkerId: string;
  checkerTitle: string;
  operatorId?: string;
  operatorTitle?: string;
  description?: string;
}

export const AdminConsoleModule: React.FC = () => {
  const { users, updateUser, setUsersList, currentUser, addToast } = useApp();

  const [activeTab, setActiveTab] = useState<'workflows' | 'fleet' | 'rooms' | 'users' | 'school' | 'backup'>('workflows');
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // -------------------------------------------------------------
  // 1. Workflow & Role Assignments (ผู้ดูแลและผู้ตรวจสอบงานแต่ละฝ่าย)
  // -------------------------------------------------------------
  const initialWorkflows: WorkflowRoleConfig[] = [
    {
      id: 'wf-1',
      category: 'ยานพาหนะ',
      taskName: 'การขอใช้รถยนต์ส่วนกลาง & จัดสรรรถ',
      approverId: 'MMV04',
      approverTitle: 'ผู้อนุมัติ & จัดสรรรถ (รอง ผอ.งบประมาณ)',
      checkerId: 'MMV98',
      checkerTitle: 'ผู้ตรวจสอบความพร้อมรถยนต์',
      operatorId: 'MMV98',
      operatorTitle: 'พนักงานขับรถประจำ'
    },
    {
      id: 'wf-2',
      category: 'งานบุคคล',
      taskName: 'การลาป่วย ลากิจ และการลาคลอด/พักผ่อน',
      approverId: 'MMV04',
      approverTitle: 'ผู้บริหารงานบุคคล / ผู้อนุมัติการลา',
      checkerId: 'MMV02',
      checkerTitle: 'เจ้าหน้าที่ตรวจสอบสถิติวันลา & สารบรรณ',
      operatorId: 'MMV02',
      operatorTitle: 'เจ้าหน้าที่บันทึกการลา'
    },
    {
      id: 'wf-3',
      category: 'ไปราชการ',
      taskName: 'การขออนุมัติเดินทางไปราชการ / พัฒนาวิชาชีพ',
      approverId: 'MMV01',
      approverTitle: 'ผู้อนุมัติขั้นสุดท้าย (ผู้อำนวยการโรงเรียน)',
      checkerId: 'MMV04',
      checkerTitle: 'ผู้ตรวจสอบงบประมาณ & แผนงาน',
      operatorId: 'MMV04',
      operatorTitle: 'เจ้าหน้าที่ตรวจสอบคำสั่ง'
    },
    {
      id: 'wf-4',
      category: 'อาคารสถานที่',
      taskName: 'การแจ้งซ่อมบำรุง อาคารสถานที่ โสตทัศนูปกรณ์',
      approverId: 'MMV03',
      approverTitle: 'ผู้บริหารงานทั่วไป / ผู้อนุมัติซ่อมบำรุง',
      checkerId: 'MMV97',
      checkerTitle: 'หัวหน้างานช่าง & ผู้ตรวจรับงาน',
      operatorId: 'MMV97',
      operatorTitle: 'ช่างผู้ปฏิบัติงานซ่อม'
    },
    {
      id: 'wf-5',
      category: 'วิชาการ',
      taskName: 'การจัดตารางสอนแทน & บันทึกการสอนแทน',
      approverId: 'MMV02',
      approverTitle: 'ผู้บริหารกลุ่มวิชาการ (รอง ผอ.วิชาการ)',
      checkerId: 'MMV11',
      checkerTitle: 'หัวหน้ากลุ่มสาระ / ผู้ตรวจรับรองสอนแทน',
      operatorId: 'MMV11',
      operatorTitle: 'เจ้าหน้าที่จัดตารางสอน'
    },
    {
      id: 'wf-6',
      category: 'ห้องประชุม',
      taskName: 'การจองใช้ห้องประชุม & โสตทัศนศึกษา',
      approverId: 'MMV03',
      approverTitle: 'ผู้บริหารงานทั่วไป (รอง ผอ.ทั่วไป)',
      checkerId: 'MMV10',
      checkerTitle: 'เจ้าหน้าที่ดูแลห้อง & กุญแจโสตฯ',
      operatorId: 'MMV10',
      operatorTitle: 'ผู้ควบคุมระบบเสียง/ภาพ'
    }
  ];

  const [workflows, setWorkflows] = useState<WorkflowRoleConfig[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mmv_admin_workflows');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return initialWorkflows;
  });

  // Edit Workflow Modal
  const [editingWf, setEditingWf] = useState<WorkflowRoleConfig | null>(null);
  const [showWfModal, setShowWfModal] = useState(false);

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

  // Reset Password Modal
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);

  const notify = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Save Handlers
  const handleSaveWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWf) return;

    const exists = workflows.some(w => w.id === editingWf.id);
    let nextList: WorkflowRoleConfig[];
    if (exists) {
      nextList = workflows.map(w => w.id === editingWf.id ? editingWf : w);
    } else {
      nextList = [...workflows, { ...editingWf, id: `wf-${Date.now()}` }];
    }
    setWorkflows(nextList);
    localStorage.setItem('mmv_admin_workflows', JSON.stringify(nextList));
    setShowWfModal(false);
    notify('✓ บันทึกการกำหนดผู้ดูแลและผู้ตรวจสอบภารกิจเรียบร้อยแล้ว');
  };

  const handleDeleteWorkflow = (id: string) => {
    const nextList = workflows.filter(w => w.id !== id);
    setWorkflows(nextList);
    localStorage.setItem('mmv_admin_workflows', JSON.stringify(nextList));
    notify('✓ ลบรายการภารกิจเรียบร้อยแล้ว');
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
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: WORKFLOWS & ROLE ASSIGNMENTS                           */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'workflows' && (
        <div className="bg-white rounded-3xl p-6 border border-[#dbe4f0] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-[#0b1f3a] flex items-center gap-2">
                <span>ตารางกำหนดผู้ดูแล ผู้อนุมัติ และผู้ตรวจสอบงานรายระบบ</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200">
                  {workflows.length} รายการ
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                คุณครูสามารถคลิกแก้ไขเพื่อเปลี่ยนผู้ดูแล หรือกดเพิ่มภารกิจงานใหม่ได้ตลอดเวลา
              </p>
            </div>

            <button
              onClick={() => {
                setEditingWf({
                  id: `wf-${Date.now()}`,
                  category: 'งานทั่วไป',
                  taskName: '',
                  approverId: users[0]?.id || 'MMV01',
                  approverTitle: 'ผู้อนุมัติงาน',
                  checkerId: users[1]?.id || 'MMV02',
                  checkerTitle: 'ผู้ตรวจสอบงาน',
                  operatorId: users[2]?.id || 'MMV03',
                  operatorTitle: 'เจ้าหน้าที่ผู้ปฏิบัติงาน'
                });
                setShowWfModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#0b1f3a] hover:bg-[#153e70] text-white text-xs font-extrabold flex items-center gap-2 shadow-md shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มภารกิจงานใหม่</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workflows.map((wf) => {
              const approver = users.find(u => u.id === wf.approverId);
              const checker = users.find(u => u.id === wf.checkerId);
              const operator = users.find(u => u.id === wf.operatorId);

              return (
                <div
                  key={wf.id}
                  className="p-5 rounded-3xl bg-slate-50/70 border border-slate-200/80 hover:border-blue-300 hover:bg-white hover:shadow-md transition-all space-y-4 relative group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-[#0b1f3a] text-white">
                        {wf.category}
                      </span>
                      <h3 className="font-extrabold text-slate-800 text-sm leading-snug">
                        {wf.taskName}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingWf(wf);
                          setShowWfModal(true);
                        }}
                        className="p-2 rounded-xl bg-white hover:bg-blue-50 text-blue-900 border border-slate-200 hover:border-blue-300 text-xs font-bold shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                        title="แก้ไขผู้รับผิดชอบ"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>แก้ไข</span>
                      </button>

                      <button
                        onClick={() => handleDeleteWorkflow(wf.id)}
                        className="p-2 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 text-xs transition-all cursor-pointer"
                        title="ลบรายการ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs pt-1">
                    {/* Approver */}
                    <div className="p-3 rounded-2xl bg-white border border-slate-200/70 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-amber-800 block">
                          👑 {wf.approverTitle || 'ผู้มีอำนาจสั่งการ / ผู้อนุมัติ'}:
                        </span>
                        <div className="font-bold text-slate-800 truncate">
                          {approver ? approver.name : `[${wf.approverId}]`}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {approver?.position} ({approver?.department})
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-blue-900 bg-blue-50 px-2 py-1 rounded-lg shrink-0">
                        {wf.approverId}
                      </span>
                    </div>

                    {/* Checker */}
                    <div className="p-3 rounded-2xl bg-white border border-slate-200/70 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-blue-900 block">
                          🔍 {wf.checkerTitle || 'ผู้ตรวจสอบ / ผู้ตรวจทาน'}:
                        </span>
                        <div className="font-bold text-slate-800 truncate">
                          {checker ? checker.name : `[${wf.checkerId}]`}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {checker?.position} ({checker?.department})
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-blue-900 bg-blue-50 px-2 py-1 rounded-lg shrink-0">
                        {wf.checkerId}
                      </span>
                    </div>

                    {/* Operator */}
                    {wf.operatorId && (
                      <div className="p-3 rounded-2xl bg-white border border-slate-200/70 flex items-center justify-between gap-2 shadow-2xs">
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-slate-600 block">
                            ⚙️ {wf.operatorTitle || 'เจ้าหน้าที่ผู้ปฏิบัติงาน'}:
                          </span>
                          <div className="font-bold text-slate-800 truncate">
                            {operator ? operator.name : `[${wf.operatorId}]`}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {operator?.position}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-blue-900 bg-blue-50 px-2 py-1 rounded-lg shrink-0">
                          {wf.operatorId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
                  workflows,
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
      {/* MODAL: EDIT WORKFLOW                                          */}
      {/* ------------------------------------------------------------- */}
      {showWfModal && editingWf && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-[#0b1f3a] text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-900" />
                <span>กำหนดผู้รับผิดชอบและผู้ตรวจสอบภารกิจ</span>
              </h3>
              <button onClick={() => setShowWfModal(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWorkflow} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">หมวดหมู่งาน</label>
                  <input
                    type="text"
                    required
                    value={editingWf.category}
                    onChange={(e) => setEditingWf({ ...editingWf, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                    placeholder="เช่น ยานพาหนะ, บุคคล..."
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ชื่องาน / ภารกิจ</label>
                  <input
                    type="text"
                    required
                    value={editingWf.taskName}
                    onChange={(e) => setEditingWf({ ...editingWf, taskName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                    placeholder="เช่น ขอใช้รถส่วนกลาง..."
                  />
                </div>
              </div>

              {/* Approver Select */}
              <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                <label className="block text-amber-900 font-bold">
                  👑 ผู้มีอำนาจสั่งการ / ผู้อนุมัติงาน (Approver) *
                </label>
                <select
                  value={editingWf.approverId}
                  onChange={(e) => setEditingWf({ ...editingWf, approverId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      [{u.id}] {u.name} - {u.position} ({u.department})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={editingWf.approverTitle}
                  onChange={(e) => setEditingWf({ ...editingWf, approverTitle: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px]"
                  placeholder="บทบาท เช่น ผู้อนุมัติและจัดสรรรถยนต์..."
                />
              </div>

              {/* Checker Select */}
              <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2">
                <label className="block text-blue-900 font-bold">
                  🔍 ผู้ตรวจสอบ / ผู้ตรวจทานงาน (Checker / Reviewer) *
                </label>
                <select
                  value={editingWf.checkerId}
                  onChange={(e) => setEditingWf({ ...editingWf, checkerId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      [{u.id}] {u.name} - {u.position} ({u.department})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={editingWf.checkerTitle}
                  onChange={(e) => setEditingWf({ ...editingWf, checkerTitle: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px]"
                  placeholder="บทบาท เช่น เจ้าหน้าที่ตรวจความพร้อมรถ..."
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWfModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0b1f3a] text-white font-extrabold shadow-md cursor-pointer"
                >
                  ✓ บันทึกการตั้งค่า
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
                      [{u.id}] {u.name} - {u.position}
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
