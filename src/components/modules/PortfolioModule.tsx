'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StaffPortfolio, PortfolioCategory } from '../../types';
import {
  Award,
  Plus,
  CheckCircle2,
  Clock,
  BookOpen,
  Calendar,
  Filter,
  Medal,
  Star,
  FileCheck,
  Printer,
  Sparkles
} from 'lucide-react';

export const PortfolioModule: React.FC = () => {
  const { currentUser, portfolios, addPortfolio } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedPortfolio, setSelectedPortfolio] = useState<StaffPortfolio | null>(null);

  // Form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PortfolioCategory>('teaching_award');
  const [awardLevel, setAwardLevel] = useState<StaffPortfolio['awardLevel']>('national');
  const [academicYear, setAcademicYear] = useState('2567');
  const [dateReceived, setDateReceived] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [hoursPLC, setHoursPLC] = useState(0);
  const [description, setDescription] = useState('');

  const handleCreatePortfolio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dateReceived || !organizer) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    addPortfolio({
      userId: currentUser.id,
      userName: currentUser.name,
      department: currentUser.department,
      title,
      category,
      awardLevel,
      academicYear,
      dateReceived,
      organizer,
      hoursPLC: Number(hoursPLC) || 0,
      description
    });

    setShowModal(false);
    // Reset
    setTitle('');
    setDescription('');
    setDateReceived('');
    setOrganizer('');
    setHoursPLC(0);
  };

  const filteredPortfolios = portfolios.filter(p => {
    if (filterCategory === 'all') return true;
    return p.category === filterCategory;
  });

  const getCategoryInfo = (cat: PortfolioCategory) => {
    switch (cat) {
      case 'teaching_award': return { label: 'รางวัลครูผู้สอนดีเด่น', icon: '🏆', color: 'bg-yellow-50 text-yellow-800' };
      case 'innovation': return { label: 'นวัตกรรมและสื่อการสอน', icon: '💡', color: 'bg-purple-50 text-purple-800' };
      case 'training_plc': return { label: 'การอบรมและชั่วโมง PLC', icon: '📚', color: 'bg-blue-50 text-blue-800' };
      case 'academic': return { label: 'งานวิจัย/วิชาการ', icon: '📑', color: 'bg-emerald-50 text-emerald-800' };
      case 'student_mentoring': return { label: 'พานักเรียนแข่งขัน', icon: '🥇', color: 'bg-rose-50 text-rose-800' };
      default: return { label: 'ผลงานอื่นๆ', icon: '✨', color: 'bg-slate-50 text-slate-800' };
    }
  };

  const getLevelBadge = (lvl?: StaffPortfolio['awardLevel']) => {
    switch (lvl) {
      case 'international': return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-white">ระดับนานาชาติ</span>;
      case 'national': return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-600 text-white">ระดับประเทศ</span>;
      case 'regional': return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500 text-white">ระดับภูมิภาค/ภาค</span>;
      case 'provincial': return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white">ระดับจังหวัด</span>;
      case 'district': return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-600 text-white">ระดับเขตพื้นที่ (สพฐ.)</span>;
      default: return <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-200 text-slate-700">ระดับสถานศึกษา</span>;
    }
  };

  const totalPLCHours = portfolios.filter(p => p.userId === currentUser.id).reduce((sum, p) => sum + (p.hoursPLC || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-yellow-600 to-amber-700 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-6 h-6 text-yellow-200" />
            <h2 className="text-xl font-bold">7. ระบบทะเบียนผลงานและรางวัลบุคลากร (Staff Portfolio & ว.PA)</h2>
          </div>
          <p className="text-yellow-100 text-sm">
            บันทึกผลงานดีเด่น รางวัล เกียรติบัตร และสะสมชั่วโมงการอบรม/PLC เพื่อใช้ประเมินวิทยฐานะ
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 bg-white text-amber-900 px-5 py-2.5 rounded-xl font-semibold hover:bg-yellow-50 transition-all shadow-sm active:scale-95 shrink-0"
        >
          <Plus className="w-5 h-5 text-amber-600" />
          บันทึกผลงานใหม่
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">ผลงาน/รางวัลทั้งหมดในระบบ</div>
            <div className="text-2xl font-extrabold text-slate-800 mt-1">{portfolios.length} <span className="text-xs font-normal text-slate-400">รายการ</span></div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-600 font-bold">
            🏆
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">ชั่วโมงอบรม/PLC สะสมของฉัน</div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">
              {totalPLCHours} <span className="text-xs font-normal text-slate-400">ชั่วโมง (ผ่านเกณฑ์ ว.PA)</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold">
            ⭐
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">ผลงานระดับชาติ/ภูมิภาค</div>
            <div className="text-2xl font-extrabold text-indigo-600 mt-1">
              {portfolios.filter(p => p.awardLevel === 'national' || p.awardLevel === 'regional' || p.awardLevel === 'international').length} <span className="text-xs font-normal text-slate-400">รางวัล</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
            🥇
          </div>
        </div>
      </div>

      {/* Grid Portfolio Cards */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 uppercase">หมวดหมู่ผลงาน</span>
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterCategory === 'all' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
              >
                ทั้งหมด ({portfolios.length})
              </button>
              <button
                onClick={() => setFilterCategory('teaching_award')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterCategory === 'teaching_award' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
              >
                รางวัลครูผู้สอน
              </button>
              <button
                onClick={() => setFilterCategory('innovation')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterCategory === 'innovation' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
              >
                นวัตกรรม/สื่อ
              </button>
              <button
                onClick={() => setFilterCategory('training_plc')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterCategory === 'training_plc' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
              >
                อบรม & PLC
              </button>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            พิมพ์รายงานสรุปผลงาน (ว.PA)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPortfolios.map(item => {
            const cat = getCategoryInfo(item.category);
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 ${cat.color}`}>
                      <span>{cat.icon}</span> {cat.label}
                    </span>
                    {getLevelBadge(item.awardLevel)}
                  </div>

                  <h3 className="font-bold text-slate-800 text-sm leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-500">
                  <div className="flex items-center justify-between">
                    <span>เจ้าของผลงาน:</span>
                    <span className="font-bold text-slate-800">{item.userName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>หน่วยงานที่มอบ:</span>
                    <span className="text-slate-700 truncate max-w-[170px]">{item.organizer}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>ปีการศึกษา:</span>
                    <span className="font-mono font-medium text-indigo-700">{item.academicYear} (เมื่อ {item.dateReceived})</span>
                  </div>
                  {item.hoursPLC ? (
                    <div className="flex items-center justify-between text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded-md">
                      <span>ชั่วโมงอบรมสะสม:</span>
                      <span>{item.hoursPLC} ชั่วโมง</span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: New Portfolio */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold">
                  🏆
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">บันทึกผลงานและรางวัลบุคลากร</h3>
                  <p className="text-xs text-slate-500">จัดเก็บประวัติผลงาน รางวัล และเกียรติบัตรเพื่อใช้ประเมิน</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePortfolio} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อผลงาน / รางวัล / หลักสูตรการอบรม</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น รางวัลชนะเลิศ นวัตกรรมการจัดการเรียนรู้เชิงรุก (Active Learning)"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-yellow-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ประเภทผลงาน</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as StaffPortfolio['category'])}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-hidden"
                  >
                    <option value="teaching_award">🏆 รางวัลครูผู้สอนดีเด่น</option>
                    <option value="innovation">💡 นวัตกรรมและสื่อการสอน</option>
                    <option value="training_plc">📚 การอบรม / ชุมชน PLC</option>
                    <option value="academic">📑 งานวิจัย / ผลงานวิชาการ</option>
                    <option value="student_mentoring">🥇 พานักเรียนแข่งขันได้รางวัล</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ระดับของรางวัล</label>
                  <select
                    value={awardLevel}
                    onChange={(e) => setAwardLevel(e.target.value as NonNullable<StaffPortfolio['awardLevel']>)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-hidden"
                  >
                    <option value="national">ระดับประเทศ</option>
                    <option value="international">ระดับนานาชาติ</option>
                    <option value="regional">ระดับภาค / ภูมิภาค</option>
                    <option value="provincial">ระดับจังหวัด</option>
                    <option value="district">ระดับเขตพื้นที่การศึกษา (สพม./สพป.)</option>
                    <option value="school">ระดับสถานศึกษา / โรงเรียน</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ปีการศึกษา</label>
                  <input
                    type="text"
                    required
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">วันที่ได้รับรางวัล/ผ่านการอบรม</label>
                  <input
                    type="date"
                    required
                    value={dateReceived}
                    onChange={(e) => setDateReceived(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">จำนวนชั่วโมง PLC / อบรม (ถ้ามี)</label>
                  <input
                    type="number"
                    min="0"
                    value={hoursPLC}
                    onChange={(e) => setHoursPLC(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">หน่วยงานที่มอบรางวัล / ผู้จัด</label>
                <input
                  type="text"
                  required
                  value={organizer}
                  onChange={(e) => setOrganizer(e.target.value)}
                  placeholder="เช่น สพฐ., คุรุสภา, สสวท."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">รายละเอียดและสรุปผลงาน</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="อธิบายจุดเด่นของผลงาน ประโยชน์ที่ได้รับ และผลลัพธ์เชิงประจักษ์"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden"
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
                  className="px-5 py-2 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 shadow-md shadow-amber-200"
                >
                  บันทึกผลงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
