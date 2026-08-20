'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SubstituteTeaching, OfficialDutyRequest } from '../../types';
import {
  GraduationCap,
  Plus,
  CheckCircle2,
  Clock,
  BookOpen,
  Calendar,
  Filter,
  Check,
  Sparkles,
  ArrowRight,
  Briefcase,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

interface SubstituteModuleProps {
  initialPrefillDuty?: OfficialDutyRequest | null;
}

export const SubstituteModule: React.FC<SubstituteModuleProps> = ({ initialPrefillDuty }) => {
  const {
    currentUser,
    substituteLessons,
    addSubstituteLesson,
    acknowledgeSubstitute,
    officialDuties,
    users
  } = useApp();

  const [showModal, setShowModal] = useState(!!initialPrefillDuty);
  const [filterType, setFilterType] = useState('all');
  const [selectedLesson, setSelectedLesson] = useState<SubstituteTeaching | null>(null);

  // Form State
  const [originalTeacherId, setOriginalTeacherId] = useState(initialPrefillDuty ? initialPrefillDuty.userId : currentUser.id);
  const [substituteTeacherId, setSubstituteTeacherId] = useState('');
  const [date, setDate] = useState(initialPrefillDuty ? initialPrefillDuty.startDate : '2026-08-25');
  const [period, setPeriod] = useState(1);
  const [time, setTime] = useState('08:30 - 09:20');
  const [gradeLevel, setGradeLevel] = useState('ม.2/1');
  const [subjectCode, setSubjectCode] = useState('ค22101');
  const [subjectName, setSubjectName] = useState('คณิตศาสตร์พื้นฐาน 3');
  const [leaveReason, setLeaveReason] = useState(initialPrefillDuty ? `ไปราชการ: ${initialPrefillDuty.title}` : 'ลาไปราชการ / ลาป่วย');
  const [officialDutyId, setOfficialDutyId] = useState<string | undefined>(initialPrefillDuty?.id);

  // Incoming duties forwarded from Director approval
  const incomingAcademicDuties = officialDuties.filter(d => d.forwardedToAcademic && !d.substituteScheduled);

  const handleStartScheduleForDuty = (duty: OfficialDutyRequest) => {
    setOfficialDutyId(duty.id);
    setOriginalTeacherId(duty.userId);
    setDate(duty.startDate);
    setLeaveReason(`ไปราชการ: ${duty.title} (${duty.id})`);
    setShowModal(true);
  };

  const handleCreateSubstitute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !substituteTeacherId) {
      alert('กรุณาเลือกครูผู้สอนแทนและกำหนดวันที่ให้ครบถ้วน');
      return;
    }

    const origTeacher = users.find(u => u.id === originalTeacherId) || currentUser;
    const subTeacher = users.find(u => u.id === substituteTeacherId);
    if (!subTeacher) return;

    addSubstituteLesson({
      officialDutyId,
      originalTeacherId: origTeacher.id,
      originalTeacherName: origTeacher.name,
      substituteTeacherId: subTeacher.id,
      substituteTeacherName: subTeacher.name,
      date,
      period: Number(period),
      time,
      gradeLevel,
      subjectCode,
      subjectName,
      status: 'pending',
      leaveReason
    });

    setShowModal(false);
    setOfficialDutyId(undefined);
  };

  const filteredLessons = substituteLessons.filter(s => {
    if (filterType === 'pending_me') return s.substituteTeacherId === currentUser.id && s.stage === 'pending_ack';
    if (filterType === 'my_sub') return s.substituteTeacherId === currentUser.id;
    if (filterType === 'my_origin') return s.originalTeacherId === currentUser.id;
    return true;
  });

  const getStageBadge = (stage: SubstituteTeaching['stage']) => {
    if (stage === 'pending_ack') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 animate-pulse">
          <Clock className="w-3.5 h-3.5" /> 1. รอครูผู้สอนแทนรับทราบ
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
        <CheckCircle2 className="w-3.5 h-3.5" /> 2. ครูผู้สอนแทนรับทราบแล้ว
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-600 via-emerald-700 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="w-6 h-6 text-teal-200" />
            <h2 className="text-xl font-bold">ระบบจัดครูสอนแทน (จัดสอนแทน ➔ แจ้งครูรับทราบ ➔ แจ้ง รอง ผอ.วิชาการ)</h2>
          </div>
          <p className="text-teal-100 text-xs sm:text-sm">
            เส้นทางสายงาน: <strong>จัดสอนแทน ➔ แจ้งเตือนครูผู้สอนแทน ➔ ครูผู้สอนแทนกดยืนยันรับทราบ ➔ แจ้งผล รอง ผอ.กลุ่มบริหารวิชาการ</strong>
          </p>
        </div>
        <button
          onClick={() => {
            setOfficialDutyId(undefined);
            setShowModal(true);
          }}
          className="flex items-center justify-center gap-2 bg-white text-teal-900 px-5 py-2.5 rounded-xl font-semibold hover:bg-teal-50 transition-all shadow-sm active:scale-95 shrink-0 text-xs sm:text-sm"
        >
          <Plus className="w-5 h-5 text-teal-600" />
          จัดครูสอนแทน
        </button>
      </div>

      {/* Incoming Requests Box (Forwarded from Approved Official Duties) */}
      {incomingAcademicDuties.length > 0 && (
        <div className="p-5 rounded-3xl bg-amber-50 border-2 border-amber-300 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
              <h3 className="font-bold text-amber-950 text-sm flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-amber-700" />
                รายการขอไปราชการที่ ผอ. อนุมัติแล้ว (ส่งมายังฝ่ายวิชาการจัดสอนแทน {incomingAcademicDuties.length} รายการ)
              </h3>
            </div>
            <span className="text-xs font-semibold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full">
              รอดำเนินการ
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {incomingAcademicDuties.map(duty => (
              <div
                key={duty.id}
                className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-indigo-700 font-mono">{duty.id}</span>
                    <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                      ✓ ผอ. ลงนามอนุมัติแล้ว
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs line-clamp-1">{duty.title}</h4>
                  <div className="text-[11px] text-slate-500 mt-1">
                    ครูผู้เดินทาง: <strong>{duty.userName}</strong> ({duty.department})
                  </div>
                  <div className="text-[11px] text-amber-800 font-medium">
                    วันที่เดินทาง: {duty.startDate} ถึง {duty.endDate} ({duty.totalDays} วัน)
                  </div>
                </div>

                <button
                  onClick={() => handleStartScheduleForDuty(duty)}
                  className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl font-semibold text-xs hover:from-emerald-700 hover:to-teal-800 shadow-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>จัดตารางครูสอนแทนสำหรับคำขอนี้</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 uppercase">ตัวกรอง</span>
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'all' ? 'bg-white shadow-xs text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                ทั้งหมด ({substituteLessons.length})
              </button>
              <button
                onClick={() => setFilterType('pending_me')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'pending_me' ? 'bg-white shadow-xs text-amber-700 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                🔔 รอฉันรับทราบ
              </button>
              <button
                onClick={() => setFilterType('my_sub')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'my_sub' ? 'bg-white shadow-xs text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                ฉันเป็นผู้สอนแทน
              </button>
              <button
                onClick={() => setFilterType('my_origin')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'my_origin' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
              >
                ครูประจำวิชา (ฉันลา/ไปราชการ)
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">วันที่ / คาบ</th>
                <th className="py-3.5 px-4">ครูประจำวิชา (ผู้ลา/ไปราชการ)</th>
                <th className="py-3.5 px-4">ครูผู้สอนแทน</th>
                <th className="py-3.5 px-4">วิชา / ระดับชั้น</th>
                <th className="py-3.5 px-4">ขั้นตอน</th>
                <th className="py-3.5 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLessons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    ไม่พบรายการจัดสอนแทน
                  </td>
                </tr>
              ) : (
                filteredLessons.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{item.date}</div>
                      <div className="text-[11px] text-teal-700 font-medium">คาบที่ {item.period} ({item.time})</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-rose-700">{item.originalTeacherName}</div>
                      <div className="text-[11px] text-slate-400">{item.leaveReason}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-teal-700">{item.substituteTeacherName}</div>
                      <div className="text-[11px] text-slate-400">ผู้รับมอบหมายสอนแทน</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{item.subjectName} ({item.subjectCode})</div>
                      <div className="text-[11px] text-indigo-600 font-semibold">ห้อง {item.gradeLevel}</div>
                    </td>
                    <td className="py-3.5 px-4">{getStageBadge(item.stage)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {item.substituteTeacherId === currentUser.id && item.stage === 'pending_ack' ? (
                          <button
                            onClick={() => acknowledgeSubstitute(item.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-200 active:scale-95 transition-all flex items-center gap-1"
                          >
                            <Check className="w-4 h-4" />
                            <span>รับทราบ</span>
                          </button>
                        ) : null}
                        <button
                          onClick={() => setSelectedLesson(item)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 text-slate-700 font-medium transition-colors"
                        >
                          ดูรายละเอียด
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

      {/* Modal: New Substitute */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                  👨‍🏫
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {officialDutyId ? `จัดครูสอนแทนสำหรับคำขอ ${officialDutyId}` : 'บันทึกการจัดครูสอนแทน'}
                  </h3>
                  <p className="text-xs text-slate-500">ระบบจะส่งการแจ้งเตือนตรงไปยังครูผู้รับสอนแทนทันที</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubstitute} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ครูประจำวิชา (ผู้ลา/ไปราชการ)</label>
                  <select
                    value={originalTeacherId}
                    onChange={(e) => setOriginalTeacherId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-hidden font-medium"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-teal-900 mb-1">ครูผู้รับมอบหมายสอนแทน <span className="text-rose-500">*</span></label>
                  <select
                    required
                    value={substituteTeacherId}
                    onChange={(e) => setSubstituteTeacherId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-teal-300 bg-white outline-hidden font-bold text-teal-900 focus:ring-2 focus:ring-teal-400"
                  >
                    <option value="">-- กรุณาเลือกครูผู้สอนแทน --</option>
                    {users.filter(u => u.id !== originalTeacherId && (u.role === 'teacher' || u.role === 'head' || u.role === 'academic_affairs')).map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">วันที่สอนแทน <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">คาบเรียนที่ <span className="text-rose-500">*</span></label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden font-bold text-teal-900"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                      <option key={p} value={p}>คาบที่ {p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ช่วงเวลา</label>
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="เช่น 08:30 - 09:20"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ระดับชั้น / ห้อง <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    placeholder="เช่น ม.2/1"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">รหัสวิชา <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value)}
                    placeholder="เช่น ค22101"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชื่อวิชา <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="เช่น คณิตศาสตร์พื้นฐาน"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden font-medium"
                  />
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
                  className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 shadow-md shadow-teal-200 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>บันทึก & ส่งแจ้งเตือนถึงครูผู้สอนแทน</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Details */}
      {selectedLesson && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-50 text-teal-800">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    รายละเอียดการจัดสอนแทน (รหัส {selectedLesson.id})
                  </h3>
                  <p className="text-xs text-slate-500">สถานะ: {getStageBadge(selectedLesson.stage)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLesson(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-slate-700">
                <div className="grid grid-cols-2 gap-2">
                  <div><strong>ครูประจำวิชา:</strong> {selectedLesson.originalTeacherName}</div>
                  <div><strong>ครูผู้สอนแทน:</strong> <span className="font-bold text-teal-800">{selectedLesson.substituteTeacherName}</span></div>
                  <div><strong>วันที่สอนแทน:</strong> {selectedLesson.date} (คาบ {selectedLesson.period}: {selectedLesson.time})</div>
                  <div><strong>ห้องเรียน / ระดับชั้น:</strong> {selectedLesson.gradeLevel}</div>
                  <div className="col-span-2"><strong>วิชา:</strong> {selectedLesson.subjectName} ({selectedLesson.subjectCode})</div>
                  <div className="col-span-2"><strong>สาเหตุการสอนแทน:</strong> {selectedLesson.leaveReason}</div>
                </div>
              </div>

              {/* Status Notice */}
              <div className={`p-3.5 rounded-2xl border ${
                selectedLesson.stage === 'acknowledged'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}>
                {selectedLesson.stage === 'acknowledged' ? (
                  <div className="space-y-0.5">
                    <div className="font-bold flex items-center gap-1 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ครูผู้สอนแทน ({selectedLesson.substituteTeacherName}) กดยืนยันรับทราบเรียบร้อยแล้ว</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      ยืนยันเมื่อ: {selectedLesson.acknowledgedAt || '2026-08-18 09:00'} (ระบบได้แจ้งผลไปยังฝ่ายวิชาการแล้ว)
                    </div>
                  </div>
                ) : (
                  <div className="font-bold flex items-center gap-1 text-amber-800">
                    <Clock className="w-4 h-4" />
                    <span>รอครูผู้สอนแทน ({selectedLesson.substituteTeacherName}) กดรับทราบ</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedLesson(null)}
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
