'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { RoomBooking, MeetingRoom } from '../../types';
import {
  Users,
  Plus,
  CheckCircle2,
  Clock,
  Coffee,
  FileText,
  Filter,
  Check,
  Building,
  CheckCheck,
  XCircle,
  AlertTriangle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  ExternalLink,
  Settings,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export const RoomBookingModule: React.FC = () => {
  const {
    currentUser,
    rooms,
    updateRoomManager,
    roomBookings,
    addRoomBooking,
    approveRoomBookingByManager,
    completeRoomUsage,
    rejectRoomBooking,
    users
  } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [showManagerSettingsModal, setShowManagerSettingsModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<RoomBooking | null>(null);

  const getRoomManagerNames = (room?: MeetingRoom) => {
    if (!room) return 'ผู้ดูแลห้อง';
    const ids = room.managerIds || (room.managerId ? [room.managerId] : []);
    if (ids.length === 0) return 'ยังไม่กำหนด';
    return ids.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(', ');
  };
  const [approvalComment, setApprovalComment] = useState('');

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 19)); // สิงหาคม 2569
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);

  // Form State (Auto-filled from logged-in user)
  const [applicantName, setApplicantName] = useState(currentUser.name);
  const [applicantPosition, setApplicantPosition] = useState(currentUser.position);
  const [department, setDepartment] = useState(currentUser.department);
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id || 'r1');
  const [title, setTitle] = useState('');
  const [attendeeCount, setAttendeeCount] = useState(30);
  const [date, setDate] = useState('2026-08-25');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [layoutStyle, setLayoutStyle] = useState<RoomBooking['layoutStyle']>('classroom');
  
  // Specific Requested AV Equipment State
  const [equipmentRequired, setEquipmentRequired] = useState<string[]>([
    'โปรเจกเตอร์ / จอ Interactive',
    'ไมโครโฟน',
    'ระบบเครื่องเสียง'
  ]);
  const [snackRequired, setSnackRequired] = useState(false);
  const [snackDetails, setSnackDetails] = useState('');

  // Automatic Conflict Detection
  const hasConflict = useMemo(() => {
    if (!date || !selectedRoomId || !startTime || !endTime) return false;
    return roomBookings.some(b => {
      if (b.status === 'rejected' || b.bookingStage === 'completed') return false;
      if (b.roomId !== selectedRoomId || b.date !== date) return false;
      return (startTime < b.endTime && endTime > b.startTime);
    });
  }, [roomBookings, selectedRoomId, date, startTime, endTime]);

  const conflictingBooking = useMemo(() => {
    if (!hasConflict) return null;
    return roomBookings.find(b => {
      if (b.status === 'rejected' || b.bookingStage === 'completed') return false;
      if (b.roomId !== selectedRoomId || b.date !== date) return false;
      return (startTime < b.endTime && endTime > b.startTime);
    });
  }, [hasConflict, roomBookings, selectedRoomId, date, startTime, endTime]);

  const handleEquipmentToggle = (item: string) => {
    setEquipmentRequired(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !selectedRoomId) {
      alert('กรุณากรอกข้อมูลการจองห้องประชุมให้ครบถ้วน');
      return;
    }

    if (hasConflict) {
      alert(`ไม่สามารถจองได้ เนื่องจากช่วงเวลาชนกับการจอง: ${conflictingBooking?.title} (${conflictingBooking?.startTime} - ${conflictingBooking?.endTime} น.)`);
      return;
    }

    const room = rooms.find(r => r.id === selectedRoomId);
    if (!room) return;

    const saved = await addRoomBooking({
      userId: currentUser.id,
      userName: applicantName || currentUser.name,
      userPhone: currentUser.phone,
      department: department || currentUser.department,
      roomId: room.id,
      roomName: room.name,
      title,
      attendeeCount: Number(attendeeCount),
      date,
      startTime,
      endTime,
      layoutStyle,
      equipmentRequired,
      snackRequired,
      snackDetails: snackRequired ? snackDetails : undefined
    });

    if (saved) {
      setShowModal(false);
      setTitle('');
      setDate('');
    }
  };

  // Google Calendar Integration URL generator
  const getGoogleCalendarUrl = (booking: RoomBooking) => {
    const startIso = `${booking.date.replace(/-/g, '')}T${booking.startTime.replace(/:/g, '')}00`;
    const endIso = `${booking.date.replace(/-/g, '')}T${booking.endTime.replace(/:/g, '')}00`;
    const titleEncoded = encodeURIComponent(`[ขอใช้ห้อง] ${booking.title} (${booking.roomName})`);
    const detailsEncoded = encodeURIComponent(`ผู้ขอใช้ห้อง: ${booking.userName} (${booking.department})\nจำนวนผู้เข้าร่วม: ${booking.attendeeCount} คน\nอุปกรณ์ที่ขอใช้: ${booking.equipmentRequired.join(', ')}\nระบบ School MIS`);
    const locationEncoded = encodeURIComponent(`${booking.roomName}, โรงเรียนมกุฎเมืองราชวิทยาลัย`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titleEncoded}&dates=${startIso}/${endIso}&details=${detailsEncoded}&location=${locationEncoded}`;
  };

  // Calendar Helpers
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const filteredBookings = roomBookings.filter(b => {
    if (selectedDateFilter && b.date !== selectedDateFilter) return false;
    if (filterType === 'my') return b.userId === currentUser.id;
    if (filterType === 'pending_me') {
      const room = rooms.find(r => r.id === b.roomId);
      const isRoomManager = room?.managerId === currentUser.id || currentUser.role === 'admin';
      return b.bookingStage === 'pending_manager' && isRoomManager;
    }
    if (filterType === 'pending') return b.bookingStage === 'pending_manager';
    if (filterType === 'approved') return b.bookingStage === 'approved_ready';
    return true;
  });

  const getStageBadge = (stage: RoomBooking['bookingStage'], status: RoomBooking['status']) => {
    if (status === 'rejected') {
      return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> ไม่อนุมัติ</span>;
    }
    switch (stage) {
      case 'pending_manager':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 1. รอผู้ดูแลห้องอนุมัติ</span>;
      case 'approved_ready':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> 2. อนุมัติแล้ว (พร้อมใช้งาน)</span>;
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 flex items-center gap-1"><CheckCheck className="w-3.5 h-3.5 text-slate-500" /> จบการใช้ห้องแล้ว</span>;
      default:
        return null;
    }
  };

  const getRoomColorBadge = (roomName: string) => {
    if (roomName.includes('ราชพฤกษ์')) return 'bg-purple-100 text-purple-900 border-purple-200';
    if (roomName.includes('รวงผึ้ง')) return 'bg-amber-100 text-amber-900 border-amber-200';
    return 'bg-blue-100 text-blue-900 border-blue-200';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-6 h-6 text-blue-200" />
            <h2 className="text-xl font-bold">ระบบขอใช้ห้องประชุม (กำหนดผู้ดูแลห้องรายบุคคล & ซิงก์ Google ปฏิทิน)</h2>
          </div>
          <p className="text-blue-100 text-xs sm:text-sm">
            ห้องประชุมราชพฤกษ์, ห้องประชุมรวงผึ้ง, ห้องประชุมโสตทัศนูปกรณ์ | เส้นทาง: <strong>ผู้ขอ ➔ ผู้ดูแลห้องประจำที่กำหนดอนุมัติ ➔ บันทึก Google Calendar แจ้งเตือน</strong>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowManagerSettingsModal(true)}
            className="flex items-center justify-center gap-1.5 bg-indigo-900/60 hover:bg-indigo-900 text-white px-4 py-2.5 rounded-xl font-semibold border border-indigo-400/40 transition-all shadow-sm text-xs sm:text-sm"
            title="กำหนดผู้ดูแลประจำแต่ละห้องประชุม"
          >
            <Settings className="w-4 h-4 text-indigo-300" />
            กำหนดผู้ดูแลห้อง
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 bg-white text-indigo-900 px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-50 transition-all shadow-sm active:scale-95 shrink-0 text-xs sm:text-sm"
          >
            <Plus className="w-5 h-5 text-indigo-600" />
            ขอใช้ห้องประชุม
          </button>
        </div>
      </div>

      {/* 3 Main Meeting Rooms Showcase with Manager Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rooms.map(r => (
          <div key={r.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
            <div className="h-28 overflow-hidden relative">
              <img src={r.image} alt={r.name} className="w-full h-full object-cover" />
              <span className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                พร้อมใช้งาน
              </span>
            </div>
            <div className="p-4 space-y-2">
              <h4 className="font-bold text-slate-800 text-base text-center">{r.name}</h4>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                <span className="text-slate-400">ผู้ดูแลห้อง:</span>
                <span className="font-semibold text-indigo-700 inline-flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                  {getRoomManagerNames(r)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Room Booking Calendar */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Calendar Header */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-800">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                ตารางปฏิทินการใช้ห้องประชุมประจำเดือน ({thaiMonths[month]} พ.ศ. {year + 543})
              </h3>
              <p className="text-[11px] text-slate-500">
                เช็คคิวว่างเพื่อป้องกันเวลาจองชนกัน หรือคลิกดูรายละเอียดการประชุม
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedDateFilter && (
              <button
                onClick={() => setSelectedDateFilter(null)}
                className="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1"
              >
                <span>ล้างตัวกรองวันที่: {selectedDateFilter}</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={prevMonth}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date(2026, 7, 19))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
            >
              วันนี้
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-500 mb-2">
            <span className="text-rose-500 py-1">อา.</span>
            <span className="py-1">จ.</span>
            <span className="py-1">อ.</span>
            <span className="py-1">พ.</span>
            <span className="py-1">พฤ.</span>
            <span className="py-1">ศ.</span>
            <span className="text-blue-500 py-1">ส.</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[95px] rounded-2xl bg-slate-50/40 border border-transparent p-1.5" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNumber = i + 1;
              const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
              const isSelectedDate = selectedDateFilter === dateString;
              const isToday = dayNumber === 19 && month === 7;

              const dayBookings = roomBookings.filter(b => b.date === dateString && b.status !== 'rejected');

              return (
                <div
                  key={`day-${dayNumber}`}
                  onClick={() => {
                    if (dayBookings.length > 0) {
                      setSelectedDateFilter(isSelectedDate ? null : dateString);
                    }
                  }}
                  className={`min-h-[105px] rounded-2xl p-2 border transition-all flex flex-col justify-between cursor-pointer ${
                    isSelectedDate
                      ? 'border-indigo-500 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-400'
                      : isToday
                      ? 'border-blue-400 bg-blue-50/40 font-bold'
                      : dayBookings.length > 0
                      ? 'border-indigo-200 bg-white hover:border-indigo-300 hover:shadow-2xs'
                      : 'border-slate-100 bg-white hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday ? 'bg-blue-600 text-white' : isSelectedDate ? 'bg-indigo-600 text-white' : 'text-slate-700'
                    }`}>
                      {dayNumber}
                    </span>
                    {dayBookings.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-indigo-100 text-indigo-800">
                        {dayBookings.length} รายการ
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 mt-1 flex-1">
                    {dayBookings.slice(0, 2).map(b => (
                      <div
                        key={b.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBooking(b);
                        }}
                        className={`p-1 rounded-lg text-[10px] font-medium leading-tight truncate flex items-center gap-1 shadow-2xs border ${getRoomColorBadge(b.roomName)}`}
                        title={`${b.roomName}: ${b.title} (${b.startTime}-${b.endTime} น.)`}
                      >
                        <span className="font-bold shrink-0">{b.startTime}</span>
                        <span className="truncate">{b.roomName.replace('ห้องประชุม', '')}</span>
                      </div>
                    ))}
                    {dayBookings.length > 2 && (
                      <span className="text-[9px] text-slate-400 block font-bold text-center">
                        +{dayBookings.length - 2} รายการ
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 uppercase">ตัวกรองรายการจองห้อง</span>
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'all' ? 'bg-white shadow-xs text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                ทั้งหมด ({roomBookings.length})
              </button>
              <button
                onClick={() => setFilterType('pending_me')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'pending_me' ? 'bg-white shadow-xs text-indigo-700 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                🔔 รอฉันอนุมัติในฐานะผู้ดูแลห้อง
              </button>
              <button
                onClick={() => setFilterType('approved')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'approved' ? 'bg-white shadow-xs text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                ✓ อนุมัติพร้อมใช้
              </button>
              <button
                onClick={() => setFilterType('my')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'my' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
              >
                คำขอของฉัน
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">รหัสการจอง</th>
                <th className="py-3.5 px-4">ห้องประชุม / ผู้ดูแลห้อง</th>
                <th className="py-3.5 px-4">หัวข้อการประชุม / กิจกรรม</th>
                <th className="py-3.5 px-4">ผู้จอง / กลุ่มงาน</th>
                <th className="py-3.5 px-4">วันและเวลา</th>
                <th className="py-3.5 px-4">ผู้เข้าร่วม</th>
                <th className="py-3.5 px-4">สถานะ</th>
                <th className="py-3.5 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    ไม่พบรายการจองห้องประชุมตามเงื่อนไข
                  </td>
                </tr>
              ) : (
                filteredBookings.map(b => {
                  const room = rooms.find(r => r.id === b.roomId);
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-indigo-700">{b.id}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{b.roomName}</div>
                        <div className="text-[11px] text-indigo-600">ผู้ดูแล: {getRoomManagerNames(room)}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-medium text-slate-800 truncate">{b.title}</div>
                        <div className="text-[10px] text-slate-400">{b.equipmentRequired.join(', ')}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{b.userName}</div>
                        <div className="text-[11px] text-slate-400">{b.department}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>{b.date}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{b.startTime} - {b.endTime} น.</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">{b.attendeeCount} คน</td>
                      <td className="py-3.5 px-4">{getStageBadge(b.bookingStage, b.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <a
                            href={getGoogleCalendarUrl(b)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium transition-colors inline-flex items-center gap-1 text-[11px]"
                            title="เพิ่มลง Google ปฏิทิน เพื่อรับการแจ้งเตือน"
                          >
                            <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
                            <span>Google Cal</span>
                          </a>
                          <button
                            onClick={() => setSelectedBooking(b)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-700 font-medium transition-colors inline-flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            ดูขั้นตอน
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Room Manager Configuration (กำหนดผู้ดูแลห้องรายบุคคล) */}
      {showManagerSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-800">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">กำหนดผู้ดูแลห้องประชุม</h3>
                  <p className="text-xs text-slate-500">เลือกบุคลากรผู้รับผิดชอบการอนุมัติและดูแลแต่ละห้อง</p>
                </div>
              </div>
              <button
                onClick={() => setShowManagerSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              {rooms.map(room => (
                <div key={room.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-sm">{room.name}</span>
                    <span className="text-[11px] text-indigo-600 font-medium">ปัจจุบัน: {getRoomManagerNames(room)}</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      เลือกผู้ดูแลห้องจากรายชื่อบุคลากร:
                    </label>
                    <select
                      value={room.managerId || ''}
                      onChange={(e) => updateRoomManager(room.id, e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 outline-hidden"
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.position} - {u.department})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowManagerSettingsModal(false)}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md shadow-indigo-200"
              >
                บันทึกการตั้งค่า
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Room Booking */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                  🏛️
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">แบบฟอร์มขอใช้ห้องประชุม</h3>
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

            <form onSubmit={handleCreateBooking} className="space-y-4 mt-4 text-xs">
              {/* 1. Auto-filled User Profile */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">ชื่อ-นามสกุล ผู้ขอ</label>
                  <input
                    type="text"
                    readOnly
                    value={applicantName}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">ตำแหน่ง</label>
                  <input
                    type="text"
                    readOnly
                    value={applicantPosition}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">กลุ่มงาน / ฝ่าย / กลุ่มสาระ</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-white font-medium text-indigo-900 text-xs"
                  />
                </div>
              </div>

              {/* 2. Room Selector (3 main rooms - Names Only) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">เลือกห้องประชุม <span className="text-rose-500">*</span></label>
                  <span className="text-[10px] text-indigo-600 font-semibold">
                    ผู้ดูแลห้อง: {getRoomManagerNames(rooms.find(r => r.id === selectedRoomId))}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {rooms.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRoomId(r.id)}
                      className={`py-3 px-4 rounded-2xl border text-center font-bold text-xs transition-all ${
                        selectedRoomId === r.id
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-300'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Title & Attendee Count */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">หัวข้อการประชุม / กิจกรรม <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="เช่น ประชุมคณะกรรมการสถานศึกษาขั้นพื้นฐาน, อบรมเชิงปฏิบัติการ PLC"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-hidden font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">จำนวนผู้เข้าร่วม (คน)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={attendeeCount}
                    onChange={(e) => setAttendeeCount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-center font-bold text-indigo-900"
                  />
                </div>
              </div>

              {/* 4. Date & Time Selection */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-indigo-950 text-xs">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>วันและเวลาที่ขอใช้ห้อง</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">วันที่</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">เวลาเริ่มต้น</label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">เวลาสิ้นสุด</label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Conflict Alert */}
              {hasConflict && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-2xl flex items-start gap-2 text-rose-800 text-xs animate-shake">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">เวลาชนกัน (Time Conflict!):</strong>
                    <div className="mt-0.5">
                      ห้องนี้มีการจองไว้แล้วในเวลา <strong>{conflictingBooking?.startTime} - {conflictingBooking?.endTime} น.</strong> หัวข้อ: &ldquo;{conflictingBooking?.title}&rdquo; โดย {conflictingBooking?.userName}
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Specific Requested AV & Media Equipment */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">อุปกรณ์และสื่อโสตฯ ที่ต้องการ:</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    'โปรเจกเตอร์ / จอ Interactive',
                    'ไมโครโฟน',
                    'ระบบเครื่องเสียง'
                  ].map(eq => (
                    <label
                      key={eq}
                      className={`p-3 rounded-xl border text-left cursor-pointer flex items-center gap-2.5 transition-all ${
                        equipmentRequired.includes(eq)
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={equipmentRequired.includes(eq)}
                        onChange={() => handleEquipmentToggle(eq)}
                        className="rounded text-indigo-600 w-4 h-4"
                      />
                      <span className="text-xs">{eq}</span>
                    </label>
                  ))}
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
                  disabled={hasConflict}
                  className={`px-6 py-2.5 rounded-xl text-white font-bold transition-all shadow-md ${
                    hasConflict ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                  }`}
                >
                  ส่งคำขอใช้ห้องประชุม
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Details & Actions */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-800">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    รายการขอใช้ห้องประชุม (เลขที่ {selectedBooking.id})
                  </h3>
                  <p className="text-xs text-slate-500">สถานะ: {getStageBadge(selectedBooking.bookingStage, selectedBooking.status)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-slate-700">
                <div className="grid grid-cols-2 gap-2">
                  <div><strong>ห้องประชุม:</strong> <span className="font-bold text-indigo-700">{selectedBooking.roomName}</span></div>
                  <div><strong>ผู้จอง:</strong> {selectedBooking.userName} ({selectedBooking.department})</div>
                  <div><strong>วันและเวลา:</strong> {selectedBooking.date} ({selectedBooking.startTime} - {selectedBooking.endTime} น.)</div>
                  <div><strong>ผู้เข้าร่วม:</strong> {selectedBooking.attendeeCount} คน</div>
                  <div className="col-span-2"><strong>หัวข้อการประชุม:</strong> {selectedBooking.title}</div>
                  <div className="col-span-2">
                    <strong>อุปกรณ์โสตฯ ที่ขอใช้:</strong> {selectedBooking.equipmentRequired.join(', ') || 'ไม่มี'}
                  </div>
                </div>
              </div>

              {/* Google Calendar Sync Card */}
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-blue-900 flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-blue-600" />
                    <span>บันทึกข้อมูลลง Google ปฏิทิน เพื่อแจ้งเตือน</span>
                  </div>
                  <div className="text-[11px] text-blue-700 mt-0.5">
                    ซิงก์เข้า Google Calendar เพื่อรับการแจ้งเตือนบนมือถือเมื่อใกล้ถึงเวลาประชุม
                  </div>
                </div>
                <a
                  href={getGoogleCalendarUrl(selectedBooking)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold inline-flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>เพิ่มลง Google Cal</span>
                </a>
              </div>

              {/* Approval History */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <div className="font-bold text-slate-800">ประวัติการอนุมัติรับทราบโดยผู้ดูแลห้อง:</div>
                {selectedBooking.managerReview ? (
                  <div className="text-emerald-700">
                    ✓ อนุมัติรับทราบโดย: <strong>{selectedBooking.managerReview.approvedBy}</strong> ({selectedBooking.managerReview.date})
                    {selectedBooking.managerReview.comment && (
                      <div className="text-slate-500 mt-0.5">บันทึก: {selectedBooking.managerReview.comment}</div>
                    )}
                  </div>
                ) : (
                  <div className="text-amber-600">⏳ รอผู้ดูแลห้องอนุมัติรับทราบ ({getRoomManagerNames(rooms.find(r => r.id === selectedBooking.roomId))})</div>
                )}
              </div>

              {/* Action Buttons for Manager / Admin */}
              {((rooms.find(r => r.id === selectedBooking.roomId)?.managerId === currentUser.id) || currentUser.role === 'admin') && selectedBooking.bookingStage === 'pending_manager' && (
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-3">
                  <div className="font-bold text-indigo-900">การดำเนินการในบทบาท: ผู้ดูแลห้องประจำ ({currentUser.name})</div>
                  <div>
                    <label className="block text-slate-700 mb-1">ความเห็น/บันทึกการจัดเตรียมห้อง</label>
                    <input
                      type="text"
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      placeholder="เช่น จัดเตรียมห้องและทดสอบระบบโสตทัศนูปกรณ์เรียบร้อยแล้ว"
                      className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white outline-hidden"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={async () => {
                        if (await rejectRoomBooking(selectedBooking.id, approvalComment)) setSelectedBooking(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-100 text-rose-800 font-semibold hover:bg-rose-200"
                    >
                      ไม่อนุมัติ
                    </button>
                    <button
                      onClick={async () => {
                        if (await approveRoomBookingByManager(selectedBooking.id, approvalComment)) setSelectedBooking(null);
                      }}
                      className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 shadow-md shadow-emerald-200 flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>ผู้ดูแลห้องอนุมัติรับทราบ ➔ ห้องพร้อมใช้งาน</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Button: Complete Meeting Usage */}
              {selectedBooking.bookingStage === 'approved_ready' && (
                <div className="p-3 rounded-2xl bg-slate-100 flex items-center justify-between">
                  <span className="text-slate-600">การประชุมเสร็จสิ้นแล้วหรือไม่?</span>
                  <button
                    onClick={async () => {
                      if (await completeRoomUsage(selectedBooking.id)) setSelectedBooking(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-900 transition-all text-xs"
                  >
                    ✓ จบการใช้ห้อง (คืนสถานะห้องว่าง)
                  </button>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-900 text-xs"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
