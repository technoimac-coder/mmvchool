'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LessonPlan } from '../../types';
import {
  BookOpen,
  Plus,
  CheckCircle2,
  FileText,
  Filter,
  Upload,
  Download,
  ExternalLink,
  Search,
  CheckCheck,
  FolderArchive
} from 'lucide-react';

export const LessonPlanModule: React.FC = () => {
  const { currentUser, lessonPlans, addLessonPlan } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);

  // Form State
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('มัธยมศึกษาปีที่ 1');
  const [semester, setSemester] = useState<'1' | '2'>('1');
  const [academicYear, setAcademicYear] = useState('2567');
  const [fileName, setFileName] = useState('');

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectCode || !subjectName) {
      alert('กรุณากรอกรายวิชาและรหัสวิชาให้ครบถ้วน');
      return;
    }

    addLessonPlan({
      userId: currentUser.id,
      userName: currentUser.name,
      department: currentUser.department,
      title: `${subjectName} (${subjectCode})`,
      subjectCode,
      subjectName,
      gradeLevel,
      semester,
      academicYear,
      fileUrl: '#',
      fileName: fileName || `แผนการจัดการเรียนรู้_${subjectCode}_${currentUser.name}.pdf`,
      fileSize: '3.8 MB'
    });

    setShowModal(false);
    setSubjectCode('');
    setSubjectName('');
    setFileName('');
  };

  // Role Check: ฝ่ายบริหารงานวิชาการ / ผู้อำนวยการ / ผู้ดูแลระบบ จะเห็นของทุกคน
  const isAcademicStaff = 
    currentUser.role === 'academic_affairs' || 
    currentUser.role === 'director' || 
    currentUser.role === 'admin' || 
    currentUser.role === 'head' ||
    currentUser.department.includes('วิชาการ') ||
    currentUser.position.includes('วิชาการ');

  const filteredPlans = lessonPlans.filter(p => {
    // ครูทั่วไปเห็นเฉพาะของตัวเองเท่านั้น
    if (!isAcademicStaff) {
      if (p.userId !== currentUser.id) return false;
    } else {
      // ฝ่ายวิชาการสามารถเลือกดูทั้งหมด หรือดูเฉพาะของตนเองได้
      if (filterType === 'my' && p.userId !== currentUser.id) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubject = p.subjectName.toLowerCase().includes(q) || p.subjectCode.toLowerCase().includes(q);
      const matchTeacher = p.userName.toLowerCase().includes(q) || p.department.toLowerCase().includes(q);
      if (!matchSubject && !matchTeacher) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-sky-600 via-blue-700 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FolderArchive className="w-6 h-6 text-sky-200" />
            <h2 className="text-xl font-bold">คลังเก็บแผนการจัดการเรียนรู้ (ส่งฝ่ายบริหารงานวิชาการ)</h2>
          </div>
          <p className="text-sky-100 text-xs sm:text-sm">
            {isAcademicStaff
              ? '👑 สิทธิ์ฝ่ายวิชาการ/ผู้บริหาร: สามารถดูและดาวน์โหลดแผนการสอนของครูทุกคนในโรงเรียน'
              : '🔒 สิทธิ์ครูผู้สอน: ส่งมอบแผนการสอนเข้าคลังวิชาการ และเรียกดูเฉพาะแผนการสอนของตนเอง'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 bg-white text-sky-900 px-5 py-2.5 rounded-xl font-semibold hover:bg-sky-50 transition-all shadow-sm active:scale-95 shrink-0 text-xs sm:text-sm"
        >
          <Upload className="w-5 h-5 text-sky-600" />
          ส่งแผนการสอนเข้าคลัง
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">แผนการสอนทั้งหมดในคลัง</div>
            <div className="text-2xl font-extrabold text-slate-800 mt-1">{lessonPlans.length} <span className="text-xs font-normal text-slate-400">รายวิชา</span></div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 text-xl font-bold">
            📚
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">แผนการสอนของฉัน</div>
            <div className="text-2xl font-extrabold text-sky-700 mt-1">
              {lessonPlans.filter(p => p.userId === currentUser.id).length} <span className="text-xs font-normal text-slate-400">วิชา</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 text-xl font-bold">
            👨‍🏫
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">สถานะการจัดเก็บ</div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">
              ครบถ้วน <span className="text-xs font-normal text-slate-400">พร้อมใช้งาน</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 text-xl font-bold">
            ✅
          </div>
        </div>
      </div>

      {/* Table of Lesson Plans */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            {isAcademicStaff ? (
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'all' ? 'bg-white shadow-xs text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  แผนของทุกคน ({lessonPlans.length})
                </button>
                <button
                  onClick={() => setFilterType('my')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === 'my' ? 'bg-white shadow-xs text-sky-700 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  แผนที่ฉันส่งเอง ({lessonPlans.filter(p => p.userId === currentUser.id).length})
                </button>
              </div>
            ) : (
              <div className="px-3 py-1 rounded-xl bg-sky-50 text-sky-800 text-xs font-bold border border-sky-200">
                🔒 แสดงเฉพาะแผนการสอนของคุณ ({lessonPlans.filter(p => p.userId === currentUser.id).length} รายการ)
              </div>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหารายวิชา, รหัสวิชา, ครูผู้ส่ง..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white outline-hidden"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">รหัสแผน</th>
                <th className="py-3.5 px-4">ครูผู้จัดทำ (กลุ่มสาระฯ)</th>
                <th className="py-3.5 px-4">รายวิชา (รหัสวิชา)</th>
                <th className="py-3.5 px-4">ระดับชั้น / ภาคเรียน</th>
                <th className="py-3.5 px-4">ไฟล์แผนการสอน</th>
                <th className="py-3.5 px-4">วันที่ส่งมอบ</th>
                <th className="py-3.5 px-4">สถานะ</th>
                <th className="py-3.5 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    ไม่พบรายการแผนการสอนในคลัง
                  </td>
                </tr>
              ) : (
                filteredPlans.map(plan => (
                  <tr key={plan.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-sky-700">{plan.id}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{plan.userName}</div>
                      <div className="text-[11px] text-slate-400">{plan.department}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-slate-800 text-sm">{plan.subjectName}</div>
                      <div className="text-[11px] text-sky-700 font-semibold font-mono">รหัสวิชา {plan.subjectCode}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{plan.gradeLevel}</div>
                      <div className="text-[11px] text-sky-700 font-medium">ภาคเรียน {plan.semester}/{plan.academicYear}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          alert(`เปิดดูไฟล์แผนการสอน: ${plan.fileName}`);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-[11px] font-medium transition-colors"
                        title="คลิกเพื่อเปิดดูไฟล์แผนการสอน"
                      >
                        <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate max-w-[140px]">{plan.fileName}</span>
                      </a>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {plan.createdAt || '2026-08-14'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        <CheckCheck className="w-3.5 h-3.5" /> ส่งวิชาการแล้ว
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedPlan(plan)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 text-slate-700 font-medium transition-colors"
                      >
                        ดูข้อมูล
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Submit New Lesson Plan */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  📚
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">ส่งแผนการจัดการเรียนรู้เข้าคลังวิชาการ</h3>
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

            <form onSubmit={handleCreatePlan} className="space-y-4 mt-4 text-xs">
              {/* 1. Subject Name & Subject Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">รายวิชา (ชื่อวิชา) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="เช่น คณิตศาสตร์พื้นฐาน, วิทยาการคำนวณ"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sky-300 bg-white focus:ring-2 focus:ring-sky-400 outline-hidden font-bold text-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">รหัสวิชา <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value)}
                    placeholder="เช่น ค22101, ว31103, ท21101"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sky-300 bg-white focus:ring-2 focus:ring-sky-400 outline-hidden font-bold text-sky-900 font-mono text-xs"
                  />
                </div>
              </div>

              {/* 2. Grade & Semester */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ระดับชั้น <span className="text-rose-500">*</span></label>
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden font-medium"
                  >
                    <option value="มัธยมศึกษาปีที่ 1">มัธยมศึกษาปีที่ 1</option>
                    <option value="มัธยมศึกษาปีที่ 2">มัธยมศึกษาปีที่ 2</option>
                    <option value="มัธยมศึกษาปีที่ 3">มัธยมศึกษาปีที่ 3</option>
                    <option value="มัธยมศึกษาปีที่ 4">มัธยมศึกษาปีที่ 4</option>
                    <option value="มัธยมศึกษาปีที่ 5">มัธยมศึกษาปีที่ 5</option>
                    <option value="มัธยมศึกษาปีที่ 6">มัธยมศึกษาปีที่ 6</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ภาคเรียนที่ <span className="text-rose-500">*</span></label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value as LessonPlan['semester'])}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden font-medium"
                  >
                    <option value="1">ภาคเรียนที่ 1</option>
                    <option value="2">ภาคเรียนที่ 2</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ปีการศึกษา <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden font-medium"
                  />
                </div>
              </div>

              {/* 3. Attach File */}
              <div className="p-4 border-2 border-dashed border-sky-200 rounded-2xl bg-sky-50/50 text-center space-y-2">
                <Upload className="w-7 h-7 text-sky-600 mx-auto" />
                <div className="text-xs font-bold text-slate-700">แนบไฟล์แผนการจัดการเรียนรู้ (PDF/DOCX หรือลิงก์)</div>
                <input
                  type="text"
                  placeholder="ระบุชื่อไฟล์ เช่น แผนการสอน_ค22101_สมศรี.pdf"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full max-w-sm px-3 py-2 rounded-xl border border-sky-200 bg-white text-xs text-center outline-hidden font-medium"
                />
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
                  className="px-5 py-2.5 rounded-xl bg-sky-600 text-white font-bold hover:bg-sky-700 shadow-md shadow-sky-200 flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>ส่งแผนเข้าคลังวิชาการ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Details */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-700">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    ข้อมูลแผนการสอน ({selectedPlan.id})
                  </h3>
                  <p className="text-xs text-slate-500">จัดเก็บในคลังฝ่ายบริหารงานวิชาการ</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlan(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-slate-700">
                <div className="font-bold text-slate-800 text-base">{selectedPlan.subjectName} ({selectedPlan.subjectCode})</div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                  <div><strong>ครูผู้จัดทำ:</strong> {selectedPlan.userName}</div>
                  <div><strong>กลุ่มสาระฯ:</strong> {selectedPlan.department}</div>
                  <div><strong>ระดับชั้น:</strong> {selectedPlan.gradeLevel}</div>
                  <div><strong>ภาคเรียน:</strong> {selectedPlan.semester}/{selectedPlan.academicYear}</div>
                  <div className="col-span-2">
                    <strong>ไฟล์แผนการสอน:</strong> <span className="font-mono text-sky-700 font-semibold">{selectedPlan.fileName}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-950 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold">ส่งมอบเข้าคลังฝ่ายวิชาการเรียบร้อยแล้ว</span>
                </div>
                <span className="text-[11px] text-emerald-700 font-medium">วันที่ส่ง: {selectedPlan.createdAt || '2026-08-14'}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedPlan(null)}
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
