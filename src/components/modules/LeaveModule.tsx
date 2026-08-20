'use client';

import { SignaturePadModal } from '../SignaturePadModal';

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { LeaveType, LeaveRequest } from '../../types';
import { LeavePrintDocument } from '../LeavePrintDocument';
import {
  LEAVE_APPROVER_BY_STAGE,
  LEAVE_APPROVAL_STAGE_DETAILS,
  LeaveApprovalActionStage,
} from '../../config/approvalWorkflow';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  FileText,
  Filter,
  History,
  Sparkles,
  Table as TableIcon,
  Check,
  Printer
} from 'lucide-react';

export const LeaveModule: React.FC = () => {
  const {
    currentUser,
    leaveRequests,
    addLeaveRequest,
    reviewLeaveByAdmin,
    approveLeaveByDeputy,
    approveLeaveByDirector,
    rejectLeaveAtStage,
    users
  } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [printRequest, setPrintRequest] = useState<LeaveRequest | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [approverSignature, setApproverSignature] = useState<string | undefined>(currentUser.signatureUrl);
  const [showApproverSigModal, setShowApproverSigModal] = useState(false);

  // Form fields according to official government form
  const [writtenAt, setWrittenAt] = useState('โรงเรียนมกุฎเมืองราชวิทยาลัย');
  const [userPosition, setUserPosition] = useState(currentUser.position);
  const [organization, setOrganization] = useState('สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง');
  const [leaveType, setLeaveType] = useState<LeaveType>('personal');
  const [otherLeaveDetails, setOtherLeaveDetails] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalDays, setTotalDays] = useState(1);
  const [reason, setReason] = useState('');
  const [contactAddress, setContactAddress] = useState('บ้านพักครู โรงเรียนมกุฎเมืองราชวิทยาลัย');
  const [contactPhone, setContactPhone] = useState(currentUser.phone);
  const [signatureUrl, setSignatureUrl] = useState<string | undefined>(currentUser.signatureUrl);
  const [showSigModal, setShowSigModal] = useState(false);
  const [substituteTeacherId, setSubstituteTeacherId] = useState('');

  // Auto-fetch last leave record of currentUser from system history
  const lastLeaveRecord = useMemo(() => {
    const userLeaves = leaveRequests.filter(r => r.userId === currentUser.id && r.status === 'approved');
    if (userLeaves.length === 0) return null;
    return userLeaves.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];
  }, [leaveRequests, currentUser.id]);

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) {
      alert('กรุณากรอกข้อมูลวันที่และเหตุผลการลาให้ครบถ้วน');
      return;
    }

    if (leaveType === 'other' && !otherLeaveDetails.trim()) {
      alert('กรุณาระบุประเภทการลาเพิ่มเติม');
      return;
    }

    if (!signatureUrl) {
      alert('กรุณาเซ็นชื่อหรืออัปโหลดรูปลายเซ็นก่อนส่งใบลา');
      setShowSigModal(true);
      return;
    }

    const subTeacher = users.find(u => u.id === substituteTeacherId);
    const pastCount = leaveType === 'sick' ? currentUser.leaveCount?.sick || 0 : currentUser.leaveCount?.personal || 0;
    const pastDays = leaveType === 'sick' ? currentUser.leaveUsed.sick : currentUser.leaveUsed.personal;
    const currentDays = Number(totalDays) || 1;

    const submitted = await addLeaveRequest({
      userId: currentUser.id,
      userName: currentUser.name,
      userPosition: currentUser.position,
      department: currentUser.department,
      organization,
      writtenAt,
      leaveType,
      otherLeaveDetails: leaveType === 'other' ? otherLeaveDetails.trim() : undefined,
      startDate,
      endDate,
      totalDays: currentDays,
      reason,
      contactAddress,
      contactPhone,
      lastLeave: lastLeaveRecord ? {
        hasHistory: true,
        type: lastLeaveRecord.leaveType,
        startDate: lastLeaveRecord.startDate,
        endDate: lastLeaveRecord.endDate,
        days: lastLeaveRecord.totalDays
      } : undefined,
      leaveStats: {
        pastCount,
        pastDays,
        currentDays,
        totalDays: pastDays + currentDays
      },
      signatureUrl,
      substituteTeacherId: subTeacher ? subTeacher.id : undefined,
      substituteTeacherName: subTeacher ? subTeacher.name : undefined,
    });

    if (!submitted) return;
    setShowModal(false);
    setReason('');
    setOtherLeaveDetails('');
    setStartDate('');
    setEndDate('');
    setTotalDays(1);
  };

  const filteredRequests = leaveRequests.filter(req => {
    if (filterType === 'my') return req.userId === currentUser.id;
    if (filterType === 'pending') return req.status === 'pending';
    if (filterType === 'approved') return req.status === 'approved';
    return true;
  });

  const getLeaveTypeLabel = (type: LeaveType, otherText?: string) => {
    switch (type) {
      case 'personal': return { label: 'ลากิจส่วนตัว', bg: 'bg-blue-100 text-blue-800' };
      case 'sick': return { label: 'ลาป่วย', bg: 'bg-emerald-100 text-emerald-800' };
      case 'maternity': return { label: 'ลาคลอดบุตร', bg: 'bg-pink-100 text-pink-800' };
      case 'other': return { label: otherText ? `อื่นๆ: ${otherText}` : 'อื่นๆ (ระบุ)', bg: 'bg-purple-100 text-purple-800' };
      default: return { label: 'ลาอื่นๆ', bg: 'bg-slate-100 text-slate-800' };
    }
  };

  const getStatusBadge = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3.5 h-3.5" /> อนุมัติแล้ว</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800"><XCircle className="w-3.5 h-3.5" /> ไม่อนุมัติ</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><Clock className="w-3.5 h-3.5" /> อยู่ระหว่างเสนอ</span>;
    }
  };

  const activeApprovalStage: LeaveApprovalActionStage | null = selectedRequest?.status === 'pending' &&
    selectedRequest.currentStage in LEAVE_APPROVAL_STAGE_DETAILS &&
    LEAVE_APPROVER_BY_STAGE[selectedRequest.currentStage] === currentUser.id
      ? selectedRequest.currentStage as LeaveApprovalActionStage
      : null;
  const activeApprovalDetails = activeApprovalStage
    ? LEAVE_APPROVAL_STAGE_DETAILS[activeApprovalStage]
    : null;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-6 h-6 text-emerald-200" />
            <h2 className="text-xl font-bold">ระบบลาออนไลน์ (แบบใบลาป่วย ลากิจส่วนตัว ลาคลอดบุตร)</h2>
          </div>
          <p className="text-emerald-100 text-xs sm:text-sm">
            โรงเรียนมกุฎเมืองราชวิทยาลัย สังกัดสำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 bg-white text-emerald-800 px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-50 transition-all shadow-sm active:scale-95 shrink-0"
        >
          <Plus className="w-5 h-5 text-emerald-600" />
          ยื่นแบบใบลาออนไลน์
        </button>
      </div>


      {/* Filter Tabs & Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 uppercase">ตัวกรองรายการ</span>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'all' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
              >
                ทั้งหมด ({leaveRequests.length})
              </button>
              <button
                onClick={() => setFilterType('my')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'my' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
              >
                คำขอของฉัน
              </button>
              <button
                onClick={() => setFilterType('pending')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'pending' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
              >
                รออนุมัติ ({leaveRequests.filter(r => r.status === 'pending').length})
              </button>
              <button
                onClick={() => setFilterType('approved')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'approved' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
              >
                อนุมัติแล้ว
              </button>
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">รหัสคำขอ</th>
                <th className="py-3.5 px-4">ผู้ยื่นคำขอ</th>
                <th className="py-3.5 px-4">ประเภทการลา</th>
                <th className="py-3.5 px-4">ช่วงเวลาลา</th>
                <th className="py-3.5 px-4">จำนวน</th>
                <th className="py-3.5 px-4">สถิติสะสม</th>
                <th className="py-3.5 px-4">สถานะ</th>
                <th className="py-3.5 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    ไม่พบรายการใบลาตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => {
                  const typeInfo = getLeaveTypeLabel(req.leaveType, req.otherLeaveDetails);
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-emerald-700">{req.id}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{req.userName}</div>
                        <div className="text-[11px] text-slate-400">{req.department}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${typeInfo.bg}`}>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>{req.startDate} ถึง {req.endDate}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{req.reason}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">{req.totalDays} วัน</td>
                      <td className="py-3.5 px-4">
                        {req.leaveStats ? (
                          <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            รวม {req.leaveStats.totalDays} วัน
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(req.status)}</td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => setPrintRequest(req)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-slate-700 font-medium transition-colors inline-flex items-center gap-1"
                          title="พิมพ์รายงาน PDF"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-600" />
                          <span>พิมพ์ PDF</span>
                        </button>
                        <button
                          onClick={() => setSelectedRequest(req)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 text-slate-700 font-medium transition-colors inline-flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          พิจารณา
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

      {/* Print PDF Document View */}
      {printRequest && (
        <LeavePrintDocument
          request={printRequest}
          onClose={() => setPrintRequest(null)}
        />
      )}

      {/* Modal: New Leave Request (แบบใบลาป่วย ลากิจส่วนตัว ลาคลอดบุตร) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
                  📄
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    แบบใบลาป่วย ลากิจส่วนตัว ลาคลอดบุตร
                  </h3>
                  <p className="text-xs text-slate-500">
                    ระบบดึงข้อมูลประวัติการลาและข้อมูลผู้ขอให้อัตโนมัติ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLeave} className="space-y-5 mt-5 text-xs text-slate-700">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">เขียนที่</label>
                    <input
                      type="text"
                      value={writtenAt}
                      onChange={(e) => setWrittenAt(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">เรียน</label>
                    <input
                      type="text"
                      disabled
                      value="ผู้อำนวยการโรงเรียนมกุฎเมืองราชวิทยาลัย"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 font-medium text-slate-600 outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">ข้าพเจ้า (ผู้ขอ)</label>
                    <input
                      type="text"
                      disabled
                      value={currentUser.name}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 font-bold text-slate-800 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">ตำแหน่ง (ตำแหน่งครู/วิทยฐานะ)</label>
                    <input
                      type="text"
                      value={userPosition}
                      onChange={(e) => setUserPosition(e.target.value)}
                      placeholder="เช่น ครู, ครูอัตราจ้าง, ครูชำนาญการ, ครูชำนาญการพิเศษ"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 outline-hidden focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">สังกัด</label>
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Leave Type */}
              <div>
                <label className="block font-bold text-slate-800 mb-2">ขอลา (เลือกประเภทการลา):</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2">
                  {[
                    { id: 'sick', label: 'ลาป่วย', desc: 'ป่วยเนื่องจาก...', icon: '🏥' },
                    { id: 'personal', label: 'ลากิจส่วนตัว', desc: 'กิจส่วนตัวเนื่องจาก...', icon: '📋' },
                    { id: 'maternity', label: 'ลาคลอดบุตร', desc: 'คลอดบุตร', icon: '👶' },
                    { id: 'other', label: 'อื่นๆ (ระบุ)', desc: 'ระบุเพิ่มเติม...', icon: '✏️' },
                  ].map(opt => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setLeaveType(opt.id as LeaveType)}
                      className={`p-3 rounded-2xl border text-left font-semibold transition-all flex flex-col justify-between gap-1.5 ${
                        leaveType === opt.id
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xl">{opt.icon}</div>
                      <div>
                        <div className="text-xs font-bold">{opt.label}</div>
                        <div className={`text-[10px] ${leaveType === opt.id ? 'text-emerald-100' : 'text-slate-400'}`}>{opt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {leaveType === 'other' && (
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 mt-2 space-y-1">
                    <label className="block font-bold text-purple-900 text-xs">
                      โปรดระบุประเภทการลาอื่น ๆ (เช่น ลาอุปสมบท, ลาช่วยภริยาคลอดบุตร)
                    </label>
                    <input
                      type="text"
                      required
                      value={otherLeaveDetails}
                      onChange={(e) => setOtherLeaveDetails(e.target.value)}
                      placeholder="ระบุประเภทการลา..."
                      className="w-full px-3 py-2 rounded-lg border border-purple-300 bg-white text-xs outline-hidden"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เนื่องจาก (เหตุผลการลา) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    leaveType === 'sick'
                      ? 'เช่น มีอาการไข้หวัด ปวดศีรษะ และแพทย์ให้พักรักษาตัว'
                      : leaveType === 'personal'
                      ? 'เช่น ไปติดต่อราชการเรื่องโอนกรรมสิทธิ์ที่ดิน ณ สำนักงานที่ดิน'
                      : 'ระบุเหตุผลการลา...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white outline-hidden font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <div>
                  <label className="block font-semibold text-emerald-900 mb-1">ตั้งแต่วันที่</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-white outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-emerald-900 mb-1">ถึงวันที่</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-white outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-emerald-900 mb-1">มีกำหนด (วัน)</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    required
                    value={totalDays}
                    onChange={(e) => setTotalDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-white outline-hidden font-bold text-emerald-800"
                  />
                </div>
              </div>

              {/* Auto-fetched Last Leave */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-blue-950 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-blue-600" />
                    ประวัติการลาครั้งสุดท้าย (ดึงข้อมูลอัตโนมัติจากฐานข้อมูล)
                  </label>
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> ระบบดึงให้อัตโนมัติ
                  </span>
                </div>

                {lastLeaveRecord ? (
                  <div className="p-3 bg-white rounded-xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ข้าพเจ้าเคยลา: <span className="text-blue-700 font-bold">{getLeaveTypeLabel(lastLeaveRecord.leaveType).label}</span>
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        ครั้งสุดท้ายตั้งแต่วันที่ <strong>{lastLeaveRecord.startDate}</strong> ถึง <strong>{lastLeaveRecord.endDate}</strong> (มีกำหนด <strong>{lastLeaveRecord.totalDays} วัน</strong>)
                      </div>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-mono shrink-0">
                      เลขที่ {lastLeaveRecord.id}
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-500 text-xs italic">
                    ✓ ยังไม่มีประวัติการลาที่ได้รับอนุมัติในรอบปีงบประมาณนี้ (ยื่นขอลาเป็นครั้งแรก)
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ในระหว่างการลาจะติดต่อข้าพเจ้าได้ที่ (ที่อยู่/สถานที่)
                  </label>
                  <input
                    type="text"
                    value={contactAddress}
                    onChange={(e) => setContactAddress(e.target.value)}
                    placeholder="เช่น บ้านพักครู รร.มกุฎเมืองราชวิทยาลัย"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    เบอร์โทรศัพท์ติดต่อ
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ครูผู้รับมอบหมายสอนแทน (ถ้ามี)</label>
                <select
                  value={substituteTeacherId}
                  onChange={(e) => setSubstituteTeacherId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden"
                >
                  <option value="">-- ไม่ระบุ --</option>
                  {users.filter(u => u.id !== currentUser.id && (u.role === 'teacher' || u.role === 'head')).map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              {/* Signature Section */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                    <span>✍️ ลายมือชื่อผู้ขอลา (เซ็นสด หรือ อัปโหลดรูปภาพ)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSigModal(true)}
                    className="px-3 py-1 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold transition-all shadow-2xs"
                  >
                    {signatureUrl ? '✏️ เปลี่ยนลายเซ็น' : '+ เซ็นชื่อ / อัปโหลดรูปลายเซ็น'}
                  </button>
                </div>

                {signatureUrl ? (
                  <div className="h-20 bg-white rounded-xl border border-emerald-200 p-2 flex items-center justify-center relative">
                    <img src={signatureUrl} alt="Signature" className="max-h-full object-contain" />
                    <span className="absolute bottom-1 right-2 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                      ✓ มีลายเซ็นแล้ว
                    </span>
                  </div>
                ) : (
                  <div
                    onClick={() => setShowSigModal(true)}
                    className="h-16 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 text-xs cursor-pointer hover:border-emerald-400 hover:bg-white transition-colors"
                  >
                    คลิกที่นี่เพื่อวาดลายเซ็นสด หรืออัปโหลดไฟล์รูปลายเซ็น
                  </div>
                )}
              </div>

              {/* Signature Modal */}
              <SignaturePadModal
                isOpen={showSigModal}
                onClose={() => setShowSigModal(false)}
                onSave={(sig) => setSignatureUrl(sig)}
                initialSignature={signatureUrl}
                title="ลงลายมือชื่อผู้ขอลา (Signature)"
              />

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 shadow-md shadow-emerald-200 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  บันทึกและส่งแบบใบลา
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Details & Approvals */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    แบบใบลาป่วย ลากิจส่วนตัว ลาคลอดบุตร (เลขที่ {selectedRequest.id})
                  </h3>
                  <p className="text-xs text-slate-500">
                    เขียนที่: {selectedRequest.writtenAt} | ยื่นเมื่อ: {selectedRequest.createdAt}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPrintRequest(selectedRequest)}
                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-200"
                >
                  <Printer className="w-3.5 h-3.5" />
                  พิมพ์ PDF
                </button>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="grid grid-cols-2 gap-3 text-slate-700">
                  <div><strong>ข้าพเจ้า:</strong> {selectedRequest.userName} ({selectedRequest.userPosition})</div>
                  <div><strong>สังกัด:</strong> {selectedRequest.organization}</div>
                  <div><strong>ขอลาประเภท:</strong> <span className="font-bold text-emerald-700">{getLeaveTypeLabel(selectedRequest.leaveType, selectedRequest.otherLeaveDetails).label}</span></div>
                  <div><strong>เหตุผลการลา:</strong> {selectedRequest.reason}</div>
                  <div><strong>ระยะเวลาลา:</strong> {selectedRequest.startDate} ถึง {selectedRequest.endDate} ({selectedRequest.totalDays} วัน)</div>
                  <div><strong>เบอร์โทรศัพท์ติดต่อ:</strong> {selectedRequest.contactPhone || '-'}</div>
                  <div className="col-span-2"><strong>สถานที่ติดต่อระหว่างลา:</strong> {selectedRequest.contactAddress || '-'}</div>
                </div>
              </div>

              {/* Approval Track */}
              <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  ประวัติการตรวจสอบและลงนามตามสายงาน
                </h4>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-semibold text-slate-800">1. ผู้ตรวจสอบสถิติวันลา (งานสารบรรณบุคคล)</div>
                  {selectedRequest.adminReview ? (
                    <div className="text-emerald-700 font-medium mt-1">
                      ✓ ตรวจสอบโดย: {selectedRequest.adminReview.approvedBy} ({selectedRequest.adminReview.date})
                    </div>
                  ) : (
                    <div className="text-amber-600 mt-1">⏳ รอการตรวจสอบสถิติวันลา</div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-semibold text-slate-800">2. รองผู้อำนวยการโรงเรียนมกุฎเมืองราชวิทยาลัย</div>
                  {selectedRequest.deputyApproval ? (
                    <div className="text-emerald-700 font-medium mt-1">
                      ✓ ความเห็นชอบโดย: {selectedRequest.deputyApproval.approvedBy} ({selectedRequest.deputyApproval.date})
                    </div>
                  ) : (
                    <div className="text-amber-600 mt-1">⏳ รอ รอง ผอ.โรงเรียน พิจารณา</div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-semibold text-slate-800">3. ผู้อำนวยการโรงเรียนมกุฎเมืองราชวิทยาลัย</div>
                  {selectedRequest.directorApproval ? (
                    <div className="text-emerald-700 font-medium mt-1">
                      ✓ คำสั่งการ: {selectedRequest.status === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'} โดย {selectedRequest.directorApproval.approvedBy} ({selectedRequest.directorApproval.date})
                    </div>
                  ) : (
                    <div className="text-amber-600 mt-1">⏳ รอผู้อำนวยการลงนามคำสั่ง</div>
                  )}
                </div>
              </div>

              {/* Action Buttons for Approver with Digital Signature */}
              {activeApprovalStage && activeApprovalDetails && (
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-3">
                  <div className="font-bold text-indigo-900 flex items-center justify-between">
                    <span>{activeApprovalDetails.title}</span>
                    <span className="text-[11px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-semibold">
                      ผู้ลงนาม: {currentUser.name}
                    </span>
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">{activeApprovalDetails.commentLabel}</label>
                    <input
                      type="text"
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      placeholder={activeApprovalDetails.placeholder}
                      className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white outline-hidden text-xs"
                    />
                  </div>

                  {/* Approver Signature Box */}
                  <div className="p-3 rounded-xl bg-white border border-indigo-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs">ลายมือชื่อผู้อนุมัติ/ผู้ลงนาม ({currentUser.name})</span>
                      <button
                        type="button"
                        onClick={() => setShowApproverSigModal(true)}
                        className="px-3 py-1 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-800 rounded-lg text-xs font-bold transition-all shadow-2xs"
                      >
                        {approverSignature ? '✏️ เปลี่ยนลายเซ็น' : '+ วาดเซ็นชื่อ / อัปโหลดรูปลายเซ็น'}
                      </button>
                    </div>

                    {approverSignature ? (
                      <div className="h-16 bg-slate-50 rounded-lg border border-emerald-300 p-1.5 flex items-center justify-center relative">
                        <img src={approverSignature} alt="Approver Signature" className="max-h-full object-contain" />
                        <span className="absolute bottom-1 right-2 text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1 rounded">
                          ✓ ลงลายมือชื่อแล้ว
                        </span>
                      </div>
                    ) : (
                      <div
                        onClick={() => setShowApproverSigModal(true)}
                        className="h-14 border-2 border-dashed border-indigo-200 rounded-lg flex items-center justify-center text-indigo-600 text-xs cursor-pointer hover:bg-indigo-50/50 transition-colors"
                      >
                        ✍️ คลิกที่นี่เพื่อวาดลายเซ็นสด หรืออัปโหลดรูปลายเซ็นของท่าน
                      </div>
                    )}
                  </div>

                  <SignaturePadModal
                    isOpen={showApproverSigModal}
                    onClose={() => setShowApproverSigModal(false)}
                    onSave={(sig) => setApproverSignature(sig)}
                    initialSignature={approverSignature}
                    title={`ลงลายมือชื่อผู้อนุมัติ (${currentUser.name})`}
                  />

                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      onClick={async () => {
                        if (!approverSignature) {
                          alert('กรุณาลงลายมือชื่อก่อนบันทึกผลการพิจารณา');
                          setShowApproverSigModal(true);
                          return;
                        }
                        const saved = await rejectLeaveAtStage(selectedRequest.id, activeApprovalDetails.rejectionStage, approvalComment, approverSignature);
                        if (!saved) return;
                        setSelectedRequest(null);
                        setApprovalComment('');
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-100 text-rose-800 font-semibold hover:bg-rose-200 transition-colors"
                    >
                      ไม่อนุมัติ
                    </button>
                    <button
                      onClick={async () => {
                        if (!approverSignature) {
                          alert('กรุณาลงลายมือชื่อก่อนอนุมัติ');
                          setShowApproverSigModal(true);
                          return;
                        }
                        let saved = false;
                        if (activeApprovalStage === 'director_approval') {
                          saved = await approveLeaveByDirector(selectedRequest.id, approvalComment, approverSignature);
                        } else if (activeApprovalStage === 'deputy_approval') {
                          saved = await approveLeaveByDeputy(selectedRequest.id, approvalComment, approverSignature);
                        } else {
                          saved = await reviewLeaveByAdmin(selectedRequest.id, approvalComment, approverSignature);
                        }
                        if (!saved) return;
                        setSelectedRequest(null);
                        setApprovalComment('');
                      }}
                      className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200 flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>{activeApprovalDetails.approveLabel}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-900 text-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
