'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { VehicleBooking, Vehicle } from '../../types';
import { getPipelineAssignee } from '../../config/approvalWorkflow';
import {
  Car,
  Plus,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar as CalendarIcon,
  Users,
  AlertCircle,
  FileText,
  Filter,
  ShieldCheck,
  ArrowRight,
  UserCheck,
  Check,
  Sparkles,
  Phone,
  DollarSign,
  X,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  List,
  LayoutGrid,
  Printer,
  Search,
  Fuel,
  Gauge,
  Navigation,
  Trash2,
  Eye,
  Info
} from 'lucide-react';

export const VehicleModule: React.FC = () => {
  const {
    currentUser,
    vehicles,
    vehicleBookings,
    addVehicleBooking,
    reviewVehicleByAdmin,
    allocateVehicleByDeputyBudget,
    acknowledgeByDriver,
    rejectVehicleBooking,
    users,
    pipelinesConfig,
  } = useApp();

  const vehicleReviewerId = getPipelineAssignee(pipelinesConfig, 'pipe-vehicle', 2, 'MMV47');
  const vehicleDeputyId = getPipelineAssignee(pipelinesConfig, 'pipe-vehicle', 3, 'MMV04');
  const canReviewVehicle = currentUser.id === vehicleReviewerId;
  const canApproveVehicle = currentUser.id === vehicleDeputyId;

  // Active Tab View
  const [activeTab, setActiveTab] = useState<'requests' | 'calendar' | 'fleet' | 'driver'>('requests');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<VehicleBooking | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showDriverLogModal, setShowDriverLogModal] = useState(false);

  // Approval Form State
  const [isRental, setIsRental] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.id || '');
  const [selectedDriverId, setSelectedDriverId] = useState(
    users.find(u => u.role === 'driver')?.id || 'MMV98'
  );
  const selectedVehicle = vehicles.find(vehicle => vehicle.id === selectedVehicleId);
  const fixedDriverId = selectedVehicle && (
    selectedVehicle.id === 'v1' || selectedVehicle.licensePlate.includes('1456')
      ? 'MMV98'
      : selectedVehicle.id === 'v2' || selectedVehicle.licensePlate.includes('7555')
        ? 'MMV99'
        : ''
  );
  const fixedDriver = fixedDriverId ? users.find(user => user.id === fixedDriverId) : undefined;
  const [approvalComment, setApprovalComment] = useState('');

  // Driver Trip Log State
  const [startOdo, setStartOdo] = useState<number>(0);
  const [endOdo, setEndOdo] = useState<number>(0);
  const [fuelExpense, setFuelExpense] = useState<number>(0);

  // New Request Form State
  const [applicantName, setApplicantName] = useState(currentUser.name);
  const [applicantPosition, setApplicantPosition] = useState(currentUser.position);
  const [applicantDept, setApplicantDept] = useState(currentUser.department);
  const [applicantPhone, setApplicantPhone] = useState(currentUser.phone || '081-234-5678');
  const [purpose, setPurpose] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState('17:00');
  const [approvalLetterNo, setApprovalLetterNo] = useState('');
  const [requesterTravels, setRequesterTravels] = useState<boolean>(true);

  // Searchable Personnel Select States
  const [driverSearchQuery, setDriverSearchQuery] = useState('');
  const [isDriverDropdownOpen, setIsDriverDropdownOpen] = useState(false);

  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);

  // Companion Lists
  const [teachersList, setTeachersList] = useState<Array<{ name: string; position: string }>>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [studentsList, setStudentsList] = useState<string[]>([]);
  const [studentNameInput, setStudentNameInput] = useState('');

  // Calendar State
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date()); // ปัจจุบัน

  // Add teacher companion from real personnel list
  const handleAddTeacher = () => {
    if (!selectedTeacherId) return;
    const t = users.find(u => u.id === selectedTeacherId);
    if (t && !teachersList.some(item => item.name === t.name)) {
      setTeachersList(prev => [...prev, { name: t.name, position: t.position }]);
      setSelectedTeacherId('');
    }
  };

  const handleRemoveTeacher = (index: number) => {
    setTeachersList(prev => prev.filter((_, i) => i !== index));
  };

  // Add student passenger
  const handleAddStudent = () => {
    if (!studentNameInput.trim() || studentsList.includes(studentNameInput.trim())) return;
    setStudentsList(prev => [...prev, studentNameInput.trim()]);
    setStudentNameInput('');
  };

  const handleRemoveStudent = (index: number) => {
    setStudentsList(prev => prev.filter((_, i) => i !== index));
  };

  // Total passengers: (requesterTravels ? 1 : 0) + Teachers + Students
  const totalPassengers = (requesterTravels ? 1 : 0) + teachersList.length + studentsList.length;

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose || !destination || !startDate || !endDate) return;

    const saved = await addVehicleBooking({
      userId: currentUser.id,
      userName: applicantName,
      userPhone: applicantPhone,
      department: applicantDept,
      purpose,
      destination,
      startDate,
      startTime,
      endDate,
      endTime,
      passengerCount: totalPassengers,
      teachersList: teachersList.map(t => `${t.name} (${t.position})`),
      studentsList: [...studentsList],
      approvalLetterNo: approvalLetterNo || undefined
    });

    if (!saved) return;

    // Reset Form
    setPurpose('');
    setDestination('');
    setApprovalLetterNo('');
    setTeachersList([]);
    setStudentsList([]);
    setShowCreateModal(false);
  };

  // Execute Approval / Allocation
  const handleExecuteApproval = async () => {
    if (!selectedBooking) return;
    if (!isRental && !fixedDriverId && !selectedDriverId) {
      alert('กรุณาพิมพ์ค้นหาและเลือกบุคลากรผู้ขับรถหมุนเวียน');
      return;
    }

    const saved = await allocateVehicleByDeputyBudget(selectedBooking.id, {
      isRental,
      vehicleId: isRental ? undefined : selectedVehicleId,
      rentalDetails: undefined,
      rentalCost: undefined,
      driverId: isRental ? undefined : (fixedDriverId || selectedDriverId),
      comment: approvalComment
    });
    if (!saved) return;

    setShowApprovalModal(false);
    setSelectedBooking(null);
    setApprovalComment('');
  };

  // Filter bookings
  const filteredBookings = vehicleBookings.filter(b => {
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus || b.bookingStage === filterStatus;
    const matchesSearch =
      b.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Calculate top statistics
  const totalBookingsCount = vehicleBookings.length;
  const readyTripsCount = vehicleBookings.filter(b => b.bookingStage === 'completed' || b.bookingStage === 'driver_ack').length;
  const pendingApprovalsCount = vehicleBookings.filter(b => b.status === 'pending').length;
  const availableVehiclesCount = vehicles.filter(v => v.status === 'available').length;

  // Calendar Helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const calendarYear = currentCalendarDate.getFullYear();
  const calendarMonth = currentCalendarDate.getMonth();
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
  const monthNamesThai = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Toolbar */}
      <div className="bg-white rounded-3xl p-5 border border-[#dbe4f0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-blue-50 text-[#0b1f3a]">
              <Car className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg lg:text-xl font-extrabold text-[#0b1f3a] tracking-tight">
                ระบบขอใช้รถและยานพาหนะโรงเรียน (Vehicle Booking & Fleet Dispatch)
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                โรงเรียนมกุฎเมืองราชวิทยาลัย · จัดสรรรถตู้ รถกระบะ และรถบัสส่วนกลาง
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-[#0b1f3a] hover:bg-[#14355f] text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ ยื่นคำขอใช้รถยนต์</span>
          </button>
        </div>
      </div>

      {/* 2. Top Stats Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-[#dbe4f0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-bold">คำขอใช้รถทั้งหมด</p>
            <h3 className="text-xl font-extrabold text-[#0b1f3a] mt-0.5">{totalBookingsCount} รายการ</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#dbe4f0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] text-amber-600 font-bold">รอการอนุมัติ / ตรวจสอบ</p>
            <h3 className="text-xl font-extrabold text-amber-700 mt-0.5">{pendingApprovalsCount} รายการ</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#dbe4f0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] text-emerald-600 font-bold">ภารกิจที่อนุมัติแล้ว</p>
            <h3 className="text-xl font-extrabold text-emerald-700 mt-0.5">{readyTripsCount} ทริป</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#dbe4f0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] text-blue-600 font-bold">ยานพาหนะพร้อมใช้งาน</p>
            <h3 className="text-xl font-extrabold text-blue-900 mt-0.5">{availableVehiclesCount} / {vehicles.length} คัน</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold">
            <Car className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Navigation View Tabs */}
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="overflow-x-auto">
          <div className="flex min-w-max items-center gap-2">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'bg-[#0b1f3a] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>รายการคำขอทั้งหมด</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'calendar'
                ? 'bg-[#0b1f3a] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>ปฏิทินตารางการใช้รถ</span>
          </button>

          <button
            onClick={() => setActiveTab('fleet')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'fleet'
                ? 'bg-[#0b1f3a] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>ยานพาหนะของโรงเรียน</span>
          </button>

          <button
            onClick={() => setActiveTab('driver')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'driver'
                ? 'bg-[#0b1f3a] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>งานพนักงานขับรถ</span>
          </button>
          </div>
        </div>

        {activeTab === 'requests' && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1 lg:flex-none">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="ค้นหาผู้ขอ / ปลายทาง / รหัส..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white outline-hidden lg:w-52"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold text-slate-700 outline-hidden"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="pending">รออนุมัติ</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="rejected">ไม่อนุมัติ</option>
            </select>
          </div>
        )}
      </div>

      {/* 4. Tab 1: Requests Table & List */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-3xl p-6 border border-[#dbe4f0] shadow-xs space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-3 px-3">รหัสคำขอ</th>
                  <th className="pb-3 px-3">ผู้ขอใช้รถ</th>
                  <th className="pb-3 px-3">วัตถุประสงค์ & สถานที่</th>
                  <th className="pb-3 px-3">วันและเวลาเดินทาง</th>
                  <th className="pb-3 px-3 text-center">ผู้โดยสาร</th>
                  <th className="pb-3 px-3">ยานพาหนะ / คนขับ</th>
                  <th className="pb-3 px-3 text-center">สถานะ</th>
                  <th className="pb-3 px-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0b1f3a] flex items-center justify-center shadow-2xs">
                          <Car className="w-7 h-7" />
                        </div>
                        <p className="font-extrabold text-slate-700 text-sm">ยังไม่มีรายการคำขอใช้รถยนต์ในขณะนี้</p>
                        <p className="text-xs text-slate-400 max-w-sm">
                          กดปุ่ม <strong className="text-[#0b1f3a] font-bold">+ ยื่นคำขอใช้รถยนต์</strong> ด้านบน เพื่อเริ่มต้นสร้างคำขอใหม่
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((b) => {
                  const assignedVehicle = vehicles.find(v => v.id === b.vehicleId);
                  const isPending = b.status === 'pending';
                  const isApproved = b.status === 'approved';
                  const isRejected = b.status === 'rejected';

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3 font-mono font-bold text-blue-900">
                        {b.id}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-800">{b.userName}</div>
                        <div className="text-[10px] text-slate-400">{b.department}</div>
                      </td>
                      <td className="py-3.5 px-3 max-w-xs">
                        <div className="font-bold text-slate-800 truncate" title={b.purpose}>
                          {b.purpose}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                          <span>{b.destination}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="text-slate-700 font-medium">
                          📅 {b.startDate} ({b.startTime} น.)
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ถึง {b.endDate} ({b.endTime} น.)
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 font-bold text-slate-700 text-[11px]">
                          👥 {b.passengerCount} คน
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        {b.isExternalRental ? (
                          <div className="text-amber-700 font-bold text-xs">
                            🚐 รถเช่าภายนอก
                          </div>
                        ) : assignedVehicle ? (
                          <div>
                            <div className="font-bold text-[#0b1f3a]">{assignedVehicle.licensePlate}</div>
                            <div className="text-[10px] text-slate-500">👤 {b.assignedDriverName || assignedVehicle.driverName || 'รอจัดคนขับ'}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">- ยังไม่จัดสรร -</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {isPending && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                            ⏳ {b.bookingStage === 'admin_review' ? 'รอผู้ตรวจสอบรับทราบ' : 'รอรองผู้อำนวยการอนุมัติและจัดสรรรถ'}
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                            ✓ {b.bookingStage === 'completed' ? 'พนักงานขับรถรับทราบแล้ว' : b.bookingStage === 'driver_ack' ? 'แจ้งพนักงานขับรถแล้ว' : 'อนุมัติแล้ว'}
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                            ✕ ไม่อนุมัติ
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedBooking(b);
                              setShowDetailModal(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                            title="ดูรายละเอียด"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedBooking(b);
                              setShowPrintModal(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-900"
                            title="พิมพ์ใบขอใช้รถทางการ"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {isPending && b.bookingStage === 'deputy_budget_allocation' && canApproveVehicle && (
                            <button
                              onClick={() => {
                                setSelectedBooking(b);
                                setShowApprovalModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#0b1f3a] text-white font-bold text-[11px] shadow-2xs hover:bg-[#173a66]"
                            >
                              พิจารณา
                            </button>
                          )}
                          {isPending && b.bookingStage === 'admin_review' && canReviewVehicle && (
                            <button
                              onClick={() => void reviewVehicleByAdmin(b.id, 'ตรวจสอบรายละเอียดคำขอใช้รถแล้ว')}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[11px] shadow-2xs hover:bg-blue-700"
                            >
                              ตรวจสอบและรับทราบ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Tab 2: Calendar View */}
      {activeTab === 'calendar' && (
        <div className="bg-white rounded-3xl p-6 border border-[#dbe4f0] shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-[#0b1f3a]">
                ปฏิทินการใช้รถยนต์ประจำเดือน {monthNamesThai[calendarMonth]} {calendarYear + 543}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentCalendarDate(new Date(calendarYear, calendarMonth - 1, 1))}
                className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={() => setCurrentCalendarDate(new Date())}
                className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                วันนี้
              </button>
              <button
                onClick={() => setCurrentCalendarDate(new Date(calendarYear, calendarMonth + 1, 1))}
                className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500">
            {['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'].map((d, i) => (
              <div key={i} className="py-2 bg-slate-50 rounded-xl text-slate-600 font-extrabold">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-24 p-2 rounded-2xl bg-slate-50/40 border border-slate-100"></div>
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const yyyy = calendarYear;
              const mm = String(calendarMonth + 1).padStart(2, '0');
              const dd = String(day).padStart(2, '0');
              const dateString = `${yyyy}-${mm}-${dd}`;
              const dayTrips = vehicleBookings.filter(b => b.startDate === dateString);
              
              const todayObj = new Date();
              const isToday = day === todayObj.getDate() && calendarMonth === todayObj.getMonth() && calendarYear === todayObj.getFullYear();

              return (
                <div
                  key={day}
                  className={`min-h-24 p-2 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                    isToday
                      ? 'border-blue-500 bg-blue-50/30'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-extrabold ${isToday ? 'text-blue-900 bg-blue-100 px-2 py-0.5 rounded-full' : 'text-slate-700'}`}>
                      {day}
                    </span>
                    {dayTrips.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-md">
                        {dayTrips.length} ทริป
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 mt-1">
                    {dayTrips.slice(0, 2).map((t, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedBooking(t);
                          setShowDetailModal(true);
                        }}
                        className="p-1 rounded-lg bg-[#0b1f3a] text-white text-[9px] font-medium truncate cursor-pointer hover:bg-[#173a66]"
                        title={`${t.userName}: ${t.purpose} (${t.destination})`}
                      >
                        🚗 {t.destination}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Tab 3: Fleet Status */}
      {activeTab === 'fleet' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {vehicles.map((v) => {
            const isAvail = v.status === 'available';
            const isBusy = v.status === 'in_use';
            const activeBooking = vehicleBookings.find(b => b.vehicleId === v.id && b.status === 'approved');

            return (
              <div key={v.id} className="bg-white rounded-3xl p-5 border border-[#dbe4f0] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    isAvail ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    isBusy ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    ● {isAvail ? 'สถานะ: พร้อมใช้งาน' : isBusy ? 'ติดภารกิจเดินทาง' : 'ซ่อมบำรุง'}
                  </span>
                  <span className="text-xs font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-lg">
                    {v.licensePlate}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-[#1b4378] to-[#102a4e] text-white flex items-center justify-center shadow-xs">
                    <Car className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#0b1f3a] text-sm">{v.name}</h3>
                    <p className="text-xs text-slate-400 font-medium">{v.type === 'van' ? 'รถตู้' : v.type === 'bus' ? 'รถบัส' : 'รถกระบะ'}</p>
                    <p className="text-xs text-blue-900 font-bold mt-0.5">👥 จุผู้โดยสาร {v.capacity} ที่นั่ง</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">พนักงานขับรถประจำ:</span>
                    <strong className="text-slate-800 font-semibold flex items-center gap-1">
                      <span>👤</span>
                      <span>{v.driverName || 'หมุนเวียน'}</span>
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">เบอร์โทรศัพท์:</span>
                    {v.driverPhone ? (
                      <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        📞 {v.driverPhone}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">
                        - ฝ่ายบริหารมอบหมายรายทริป -
                      </span>
                    )}
                  </div>
                  {activeBooking && (
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 mt-2 text-[11px]">
                      <div className="font-bold text-amber-900">กำลังเดินทางไป: {activeBooking.destination}</div>
                      <div className="text-amber-700">ผู้ขอ: {activeBooking.userName}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 7. Tab 4: Driver Dashboard */}
      {activeTab === 'driver' && (
        <div className="bg-white rounded-3xl p-6 border border-[#dbe4f0] shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-[#0b1f3a]">
                งานที่ได้รับมอบหมายสำหรับพนักงานขับรถ (Driver Mission Logs)
              </h2>
              <p className="text-xs text-slate-400">
                พนักงานขับรถสามารถกดยืนยันรับทราบงาน และบันทึกเลขไมล์เดินทางได้ที่นี่
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {vehicleBookings.filter(b => b.status === 'approved').map(b => (
              <div key={b.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-900 text-sm">{b.id}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold text-[10px]">
                      {b.bookingStage === 'completed' ? '✓ พนักงานขับรถรับทราบงานแล้ว' : b.bookingStage === 'driver_ack' ? '🔔 แจ้งพนักงานขับรถแล้ว · รอรับทราบ' : '⏳ รอพนักงานขับรถรับทราบ'}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    {b.purpose} ➔ <span className="text-rose-600">{b.destination}</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    ผู้ขอ: {b.userName} ({b.department}) · ผู้โดยสาร: {b.passengerCount} คน
                  </p>
                  <p className="text-xs text-slate-500">
                    วันเวลาเดินทาง: {b.startDate} {b.startTime} น. - {b.endDate} {b.endTime} น.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {b.bookingStage === 'driver_ack' && b.assignedDriverId === currentUser.id && (
                    <button
                      onClick={() => acknowledgeByDriver(b.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>กดรับทราบงาน</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Create Vehicle Booking Request */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <p className="text-[10px] font-extrabold text-blue-900 uppercase tracking-wider">
                  VEHICLE DISPATCH SYSTEM
                </p>
                <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
                  แบบฟอร์มขออนุญาตใช้รถยนต์ส่วนกลาง
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="py-4 space-y-4 text-xs">
              {/* Applicant Info */}
              <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#0b1f3a] text-xs">ข้อมูลผู้ขอใช้รถ (ผู้รับผิดชอบการเดินทาง)</h4>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-1 rounded-xl border border-blue-200 shadow-2xs hover:bg-blue-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={requesterTravels}
                      onChange={(e) => setRequesterTravels(e.target.checked)}
                      className="w-3.5 h-3.5 accent-[#0b1f3a] rounded"
                    />
                    <span className="text-[11px] font-bold text-[#0b1f3a]">
                      ผู้ขอใช้รถร่วมเดินทางไปด้วย
                    </span>
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1">ชื่อ-นามสกุล</label>
                    <input
                      type="text"
                      disabled
                      value={applicantName}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1">ตำแหน่ง</label>
                    <input
                      type="text"
                      disabled
                      value={applicantPosition}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1">กลุ่มสาระ / ฝ่ายงาน</label>
                    <input
                      type="text"
                      disabled
                      value={applicantDept}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Trip Purpose & Destination */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">วัตถุประสงค์ในการขอใช้รถ *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น พานักเรียนเข้าร่วมการแข่งขันศิลปหัตถกรรมนักเรียน..."
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">สถานที่ปลายทาง *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">📅 วันและเวลาเดินทางไป</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                    />
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">📅 วันและเวลากลับถึงโรงเรียน</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                    />
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Passengers Section (Teachers & Students) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-700" />
                    <span>รายชื่อผู้ร่วมเดินทางทั้งหมด ({totalPassengers} คน)</span>
                  </h4>
                  <span className="text-[10px] text-blue-900 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    {requesterTravels ? 'ผู้ขอ 1 ท่าน + ' : ''}ครู {teachersList.length} ท่าน + นร. {studentsList.length} คน
                  </span>
                </div>

                {/* Teacher Companion Input */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2">
                  <label className="block text-[10px] text-slate-500 font-bold">เพิ่มครู/บุคลากรผู้ร่วมเดินทาง (พิมพ์ค้นหาชื่อ-นามสกุล)</label>
                  <div className="relative flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="พิมพ์ค้นหาชื่อครู เช่น มณฑาทิพย์, ปาริชาต..."
                        value={teacherSearchQuery}
                        onChange={(e) => {
                          setTeacherSearchQuery(e.target.value);
                          if (!isTeacherDropdownOpen) setIsTeacherDropdownOpen(true);
                        }}
                        onFocus={() => setIsTeacherDropdownOpen(true)}
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium outline-hidden"
                      />

                      {isTeacherDropdownOpen && (
                        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                          {users
                            .filter(u =>
                              u.name.toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
                              u.id.toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
                              u.department.toLowerCase().includes(teacherSearchQuery.toLowerCase())
                            )
                            .slice(0, 10)
                            .map(u => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => {
                                  if (!teachersList.some(item => item.name === u.name)) {
                                    setTeachersList(prev => [...prev, { name: u.name, position: u.position }]);
                                  }
                                  setTeacherSearchQuery('');
                                  setIsTeacherDropdownOpen(false);
                                }}
                                className="w-full px-3 py-2 text-left text-xs font-bold text-slate-800 hover:bg-blue-50 hover:text-blue-900 transition-colors"
                              >
                                {u.name}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {teachersList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {teachersList.map((t, idx) => (
                        <span key={idx} className="px-2 py-1 rounded-lg bg-blue-50 text-blue-900 text-xs font-bold border border-blue-100 flex items-center gap-1">
                          👤 {t.name}
                          <button type="button" onClick={() => handleRemoveTeacher(idx)} className="text-rose-500 hover:text-rose-700">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Student Passenger Input (Without Class dropdown) */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2">
                  <label className="block text-[10px] text-slate-500 font-bold">เพิ่มนักเรียนผู้ร่วมเดินทาง</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="ชื่อ-นามสกุลนักเรียน เช่น เด็กชายภาคิน ใจกล้า"
                      value={studentNameInput}
                      onChange={(e) => setStudentNameInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddStudent(); } }}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleAddStudent}
                      className="px-4 py-1.5 rounded-xl bg-blue-700 text-white font-bold text-xs hover:bg-blue-800 shrink-0 shadow-2xs"
                    >
                      + เพิ่ม นร.
                    </button>
                  </div>

                  {studentsList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {studentsList.map((s, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
                          🎓 {s}
                          <button type="button" onClick={() => handleRemoveStudent(idx)} className="text-rose-500 hover:text-rose-700">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Prominent Total Passenger Summary Box */}
                <div className="p-3 bg-gradient-to-r from-blue-50 via-sky-50 to-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-[#0b1f3a] text-white flex items-center justify-center font-bold">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-[#0b1f3a] block">
                        รวมผู้ร่วมเดินทางทั้งหมด:
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        ({requesterTravels ? 'ผู้ขอ 1 ท่าน + ' : ''}ครู {teachersList.length} ท่าน + นักเรียน {studentsList.length} คน)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-3.5 py-1.5 bg-[#0b1f3a] text-white font-extrabold text-sm rounded-xl shadow-xs">
                      {totalPassengers} คน
                    </span>
                  </div>
                </div>
              </div>

              {/* Note / Approval Letter */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">หนังสือขออนุมัติ / คำสั่งอ้างอิง (ถ้ามี)</label>
                <input
                  type="text"
                  placeholder="เช่น ศธ 04298.43/348"
                  value={approvalLetterNo}
                  onChange={(e) => setApprovalLetterNo(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-[#0b1f3a] hover:bg-[#163e70] text-white font-extrabold text-xs shadow-md"
                >
                  ✓ ส่งคำขอใช้รถยนต์
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Approval / Allocate Vehicle by Deputy Director */}
      {showApprovalModal && selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-[#0b1f3a] text-base">
                พิจารณาและจัดสรรยานพาหนะ ({selectedBooking.id}) · รองผู้อำนวยการกลุ่มบริหารงบประมาณ
              </h3>
              <button onClick={() => setShowApprovalModal(false)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div>ผู้ขอ: <strong>{selectedBooking.userName}</strong> ({selectedBooking.department})</div>
                <div>วัตถุประสงค์: <strong>{selectedBooking.purpose}</strong></div>
                <div>ปลายทาง: <strong className="text-rose-600">{selectedBooking.destination}</strong></div>
                <div>ผู้โดยสาร: <strong>{selectedBooking.passengerCount} คน</strong></div>
              </div>

              <div className="space-y-2.5">
                <label className="font-bold text-slate-800">เลือกประเภทยานพาหนะและการจัดสรร:</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all ${
                    !isRental
                      ? 'bg-blue-50/80 border-blue-300 shadow-2xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="vehicleType"
                      checked={!isRental}
                      onChange={() => setIsRental(false)}
                      className="mt-0.5"
                    />
                    <div>
                      <strong className="block text-xs text-[#0b1f3a]">ใช้รถยนต์ของโรงเรียน</strong>
                      <span className="text-[10px] text-slate-500">นข 1456 / นข 7555 / นข 3399</span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all ${
                    isRental
                      ? 'bg-amber-50/80 border-amber-300 shadow-2xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="vehicleType"
                      checked={isRental}
                      onChange={() => setIsRental(true)}
                      className="mt-0.5"
                    />
                    <div>
                      <strong className="block text-xs text-amber-900">จ้างเหมารถเช่าภายนอก</strong>
                      <span className="text-[10px] text-amber-700">ไม่ต้องกรอกรายละเอียดเพิ่มเติม</span>
                    </div>
                  </label>
                </div>
              </div>

              {!isRental ? (
                <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">เลือกยานพาหนะ</label>
                    <select
                      value={selectedVehicleId}
                      onChange={(e) => {
                        const vehicleId = e.target.value;
                        setSelectedVehicleId(vehicleId);
                        const vehicle = vehicles.find(item => item.id === vehicleId);
                        if (vehicle?.id === 'v1' || vehicle?.licensePlate.includes('1456')) setSelectedDriverId('MMV98');
                        else if (vehicle?.id === 'v2' || vehicle?.licensePlate.includes('7555')) setSelectedDriverId('MMV99');
                        else setSelectedDriverId('');
                        setDriverSearchQuery('');
                        setIsDriverDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                    >
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.licensePlate} ({v.name} - {v.capacity} ที่นั่ง)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={`relative ${fixedDriverId ? 'hidden' : ''}`}>
                    <label className="block text-slate-700 font-bold mb-1">
                      มอบหมายพนักงานขับรถ (พิมพ์ค้นหาชื่อ-นามสกุล)
                    </label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="พิมพ์เพื่อค้นหา เช่น ชาญวุฒน์, นพรุจ..."
                        value={
                          isDriverDropdownOpen
                            ? driverSearchQuery
                            : (() => {
                                const d = users.find(u => u.id === selectedDriverId);
                                return d ? d.name : '';
                              })()
                        }
                        onChange={(e) => {
                          setDriverSearchQuery(e.target.value);
                          if (!isDriverDropdownOpen) setIsDriverDropdownOpen(true);
                        }}
                        onFocus={() => {
                          setDriverSearchQuery('');
                          setIsDriverDropdownOpen(true);
                        }}
                        className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs outline-hidden shadow-2xs"
                      />
                      {selectedDriverId && (
                        <button
                          type="button"
                          onClick={() => {
                            setDriverSearchQuery('');
                            setIsDriverDropdownOpen(!isDriverDropdownOpen);
                          }}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isDriverDropdownOpen ? 'rotate-90' : ''}`} />
                        </button>
                      )}
                    </div>

                    {/* Filtered Dropdown List */}
                    {isDriverDropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                        {/* Section 1: Professional Drivers */}
                        <div className="p-1.5 bg-slate-50 text-[10px] font-extrabold text-blue-900 uppercase">
                          🚗 พนักงานขับรถประจำโรงเรียน
                        </div>
                        {users
                          .filter(u => (u.id === 'MMV98' || u.id === 'MMV99' || u.role === 'driver' || u.position.includes('ขับรถ')) &&
                            (u.name.toLowerCase().includes(driverSearchQuery.toLowerCase()) ||
                             u.id.toLowerCase().includes(driverSearchQuery.toLowerCase()) ||
                             u.department.toLowerCase().includes(driverSearchQuery.toLowerCase()))
                          )
                          .map(d => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => {
                                setSelectedDriverId(d.id);
                                setIsDriverDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-xs font-bold transition-colors ${
                                selectedDriverId === d.id
                                  ? 'bg-blue-50 text-blue-900 font-extrabold'
                                  : 'text-slate-800 hover:bg-blue-50'
                              }`}
                            >
                              {d.name}
                            </button>
                          ))}

                        {/* Section 2: Other Staff / Teachers */}
                        <div className="p-1.5 bg-slate-50 text-[10px] font-extrabold text-slate-500 uppercase">
                          👨‍🏫 คณะครูและบุคลากรอื่นๆ (กรณีขับเอง)
                        </div>
                        {users
                          .filter(u => u.id !== 'MMV98' && u.id !== 'MMV99' && u.role !== 'driver' && !u.position.includes('ขับรถ') &&
                            (u.name.toLowerCase().includes(driverSearchQuery.toLowerCase()) ||
                             u.id.toLowerCase().includes(driverSearchQuery.toLowerCase()) ||
                             u.department.toLowerCase().includes(driverSearchQuery.toLowerCase()))
                          )
                          .slice(0, 15)
                          .map(u => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setSelectedDriverId(u.id);
                                setIsDriverDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-xs font-bold transition-colors ${
                                selectedDriverId === u.id
                                  ? 'bg-blue-50 text-blue-900 font-extrabold'
                                  : 'text-slate-800 hover:bg-slate-50'
                              }`}
                            >
                              {u.name}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  {fixedDriverId && (
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">พนักงานขับรถประจำคัน</label>
                      <div className="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 font-bold">
                        ✓ {fixedDriver?.name || (fixedDriverId === 'MMV98' ? 'นายชาญวุฒน์ ต้องทำกิจ' : 'นายนพรุจ ความเพียร')}
                        <div className="text-[10px] text-emerald-700 font-medium mt-0.5">ระบบกำหนดอัตโนมัติตามรถที่เลือก</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-200 text-xs text-amber-800 font-medium">
                  เลือกใช้รถเช่าภายนอกแล้ว สามารถอนุมัติได้ทันทีโดยไม่ต้องกรอกรายละเอียดเพิ่มเติม
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">ความเห็น / คำสั่งการของฝ่ายบริหาร</label>
                <textarea
                  rows={2}
                  placeholder="เช่น อนุมัติให้ใช้รถยนต์ส่วนกลางตามที่ขอ และให้พนักงานขับรถตรวจเช็คความพร้อมก่อนออกเดินทาง..."
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (await rejectVehicleBooking(selectedBooking.id, 'deputy', approvalComment)) {
                      setShowApprovalModal(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs"
                >
                  ไม่อนุมัติ
                </button>
                <button
                  type="button"
                  onClick={handleExecuteApproval}
                  className="px-6 py-2 rounded-xl bg-[#0b1f3a] text-white font-bold text-xs"
                >
                  ✓ อนุมัติและจัดสรรรถ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detail View */}
      {showDetailModal && selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-[#0b1f3a] text-base">
                รายละเอียดคำขอใช้รถ ({selectedBooking.id})
              </h3>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-2xl">
                <div>ผู้ขอใช้รถ: <strong>{selectedBooking.userName}</strong></div>
                <div>สังกัด: <strong>{selectedBooking.department}</strong></div>
                <div>วัตถุประสงค์: <strong>{selectedBooking.purpose}</strong></div>
                <div>สถานที่ปลายทาง: <strong className="text-rose-600">{selectedBooking.destination}</strong></div>
                <div>วันเดินทาง: <strong>{selectedBooking.startDate} ({selectedBooking.startTime} น.)</strong></div>
                <div>วันกลับ: <strong>{selectedBooking.endDate} ({selectedBooking.endTime} น.)</strong></div>
                <div>ผู้โดยสารทั้งหมด: <strong>{selectedBooking.passengerCount} คน</strong></div>
                <div>สถานะ: <strong>{selectedBooking.status}</strong></div>
              </div>

              {selectedBooking.teachersList && selectedBooking.teachersList.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-800 mb-1">คณะครูผู้ร่วมเดินทาง:</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedBooking.teachersList.map((t, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 text-[11px] font-semibold">
                        👤 {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedBooking.studentsList && selectedBooking.studentsList.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-800 mb-1">นักเรียนผู้ร่วมเดินทาง:</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedBooking.studentsList.map((s, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 text-[11px] font-semibold">
                        🎓 {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Official PDF Printable Form */}
      {showPrintModal && selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-8 shadow-2xl border border-slate-200 max-h-[95vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-400">แบบพิมพ์เอกสารราชการทางการ</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-xl bg-[#0b1f3a] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์เอกสาร (Print PDF)</span>
                </button>
                <button onClick={() => setShowPrintModal(false)} className="text-slate-400 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Official Document Paper Preview */}
            <div className="p-8 border border-slate-300 rounded-xl bg-white shadow-inner font-serif text-slate-900 space-y-6 text-sm leading-relaxed">
              <div className="text-center space-y-1">
                <img src="/school-logo.png" alt="ตราโรงเรียนมกุฎเมืองราชวิทยาลัย" className="w-16 h-16 object-contain mx-auto mb-2" />
                <div className="text-xl font-bold font-sans tracking-wide">โรงเรียนมกุฎเมืองราชวิทยาลัย</div>
                <div className="text-sm font-semibold">ใบขออนุญาตใช้รถยนต์ส่วนกลาง</div>
                <div className="text-xs text-slate-500 font-mono">เลขที่คำขอ: {selectedBooking.id}</div>
              </div>

              <div className="text-right text-xs">
                วันที่ <strong>{selectedBooking.startDate}</strong>
              </div>

              <div className="space-y-2 text-xs">
                <p>
                  เรียน <strong>ผู้อำนวยการโรงเรียนมกุฎเมืองราชวิทยาลัย</strong>
                </p>
                <p className="indent-8">
                  ข้าพเจ้า <strong>{selectedBooking.userName}</strong> สังกัด <strong>{selectedBooking.department}</strong> มีความประสงค์ขอใช้รถยนต์ส่วนกลางของโรงเรียน เพื่อ <strong>{selectedBooking.purpose}</strong> ณ <strong>{selectedBooking.destination}</strong>
                </p>
                <p className="indent-8">
                  โดยออกเดินทางวันที่ <strong>{selectedBooking.startDate}</strong> เวลา <strong>{selectedBooking.startTime} น.</strong> และเดินทางกลับถึงโรงเรียนในวันที่ <strong>{selectedBooking.endDate}</strong> เวลา <strong>{selectedBooking.endTime} น.</strong> มีผู้ร่วมเดินทางรวมทั้งสิ้น <strong>{selectedBooking.passengerCount}</strong> คน
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-6 text-xs text-center">
                <div className="space-y-8">
                  <p>ลงชื่อ.......................................................... ผู้ขอใช้รถ</p>
                  <p>({selectedBooking.userName})</p>
                </div>
                <div className="space-y-8">
                  <p>ลงชื่อ.......................................................... ผู้มีอำนาจสั่งการ</p>
                  <p>(นางสาวสุรียาพร นพกรเศรษฐกุล)<br/>รองผู้อำนวยการกลุ่มบริหารงบประมาณ</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
