'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PortfolioCategory, StaffPortfolio } from '../../types';
import { Award, Calendar, Eye, FileText, Filter, FolderOpen, Image as ImageIcon, Paperclip, Plus, Printer, UserRound, X } from 'lucide-react';

const categoryInfo: Record<PortfolioCategory, { label: string; icon: string; color: string }> = {
  award: { label: 'รางวัล', icon: '🏆', color: 'bg-amber-50 text-amber-800' },
  training: { label: 'อบรม', icon: '📚', color: 'bg-blue-50 text-blue-800' },
  work: { label: 'ผลงาน', icon: '💡', color: 'bg-purple-50 text-purple-800' },
  certificate: { label: 'เกียรติบัตร', icon: '📜', color: 'bg-emerald-50 text-emerald-800' },
};

const formatDate = (date: string) => date
  ? new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T00:00:00`))
  : '-';

const formatSize = (size: number) => size >= 1024 * 1024
  ? `${(size / 1024 / 1024).toFixed(1)} MB`
  : `${Math.max(1, Math.round(size / 1024))} KB`;

const today = new Date();
const fallbackSemester: '1' | '2' = today.getMonth() >= 4 && today.getMonth() <= 9 ? '1' : '2';
const fallbackAcademicYear = String(today.getFullYear() + 543 - (today.getMonth() < 4 ? 1 : 0));

export const PortfolioModule: React.FC = () => {
  const { currentUser, portfolios, addPortfolio, markRelatedNotificationsAsRead, academicPeriod } = useApp();
  const currentSemester = academicPeriod.semester || fallbackSemester;
  const currentAcademicYear = academicPeriod.academicYear || fallbackAcademicYear;
  const [showModal, setShowModal] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState<StaffPortfolio | null>(null);
  const [filterCategory, setFilterCategory] = useState<'all' | PortfolioCategory>('all');
  const [filterOwner, setFilterOwner] = useState('all');
  const [filterAcademicYear, setFilterAcademicYear] = useState(currentAcademicYear);
  const [filterSemester, setFilterSemester] = useState<'all' | '1' | '2'>(currentSemester);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PortfolioCategory>('award');
  const [semester, setSemester] = useState<'1' | '2'>(currentSemester);
  const [academicYear, setAcademicYear] = useState(currentAcademicYear);
  const [dateReceived, setDateReceived] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  React.useEffect(() => {
    if (selectedPortfolio) markRelatedNotificationsAsRead('portfolio', selectedPortfolio.id);
  }, [selectedPortfolio, markRelatedNotificationsAsRead]);

  React.useEffect(() => {
    setFilterAcademicYear(currentAcademicYear);
    setFilterSemester(currentSemester);
    setAcademicYear(currentAcademicYear);
    setSemester(currentSemester);
  }, [currentAcademicYear, currentSemester]);

  const owners = useMemo(() => Array.from(new Map(
    portfolios.map(item => [item.userId, { id: item.userId, name: item.userName, department: item.department }]),
  ).values()).sort((a, b) => a.name.localeCompare(b.name, 'th')), [portfolios]);

  const academicYears = useMemo(() => Array.from(new Set([
    currentAcademicYear,
    ...portfolios.map(item => item.academicYear),
  ])).sort((a, b) => Number(b) - Number(a)), [portfolios]);

  const filteredPortfolios = portfolios.filter(item =>
    (filterCategory === 'all' || item.category === filterCategory) &&
    (filterOwner === 'all' || item.userId === filterOwner) &&
    (filterAcademicYear === 'all' || item.academicYear === filterAcademicYear) &&
    (filterSemester === 'all' || item.semester === filterSemester),
  );

  const returnToCurrentSemester = () => {
    setFilterAcademicYear(currentAcademicYear);
    setFilterSemester(currentSemester);
  };

  const resetForm = () => {
    setTitle(''); setCategory('award'); setSemester(currentSemester);
    setAcademicYear(currentAcademicYear);
    setDateReceived(''); setOrganizer(''); setDescription(''); setAttachments([]);
  };

  const handleCreatePortfolio = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !academicYear.trim() || !dateReceived || !organizer.trim() || !description.trim()) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน'); return;
    }
    if (attachments.length > 10 || attachments.some(file => file.size > 10 * 1024 * 1024)) {
      alert('แนบได้ไม่เกิน 10 ไฟล์ และแต่ละไฟล์ต้องไม่เกิน 10 MB'); return;
    }
    setSubmitting(true);
    const saved = await addPortfolio({ title, category, semester, academicYear, dateReceived, organizer, description }, attachments);
    setSubmitting(false);
    if (saved) { setShowModal(false); resetForm(); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-500 via-yellow-600 to-amber-700 rounded-2xl p-5 sm:p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-start gap-2 mb-1"><Award className="w-6 h-6 text-yellow-200 shrink-0" /><h2 className="text-lg sm:text-xl font-bold">7. ระบบทะเบียนผลงานและรางวัลบุคลากร (Staff Portfolio &amp; ว.PA)</h2></div>
          <p className="text-yellow-100 text-sm">แฟ้มผลงานรายบุคคลสำหรับรางวัล อบรม ผลงาน และเกียรติบัตร ซึ่งบุคลากรทุกคนเปิดดูได้</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center justify-center gap-2 bg-white text-amber-900 px-5 py-2.5 rounded-xl font-semibold hover:bg-yellow-50 shadow-sm shrink-0"><Plus className="w-5 h-5 text-amber-600" /> บันทึกผลงานใหม่</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Summary label="ผลงานทั้งหมดในระบบ" value={`${portfolios.length} รายการ`} icon="🏆" />
        <Summary label="แฟ้มบุคลากร" value={`${owners.length} คน`} icon="📁" />
        <Summary label="รายการของฉัน" value={`${portfolios.filter(item => item.userId === currentUser.id).length} รายการ`} icon="👤" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-amber-900">กำลังแสดงข้อมูล</p>
            <p className="text-sm font-bold text-slate-800">
              {filterAcademicYear === 'all' ? 'ทุกปีการศึกษา' : `ปีการศึกษา ${filterAcademicYear}`}
              {' · '}
              {filterSemester === 'all' ? 'ทุกภาคเรียน' : `ภาคเรียนที่ ${filterSemester}`}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select aria-label="เลือกปีการศึกษา" value={filterAcademicYear} onChange={event => setFilterAcademicYear(event.target.value)} className="px-3 py-2 rounded-xl border border-amber-200 text-xs bg-white">
              <option value="all">ทุกปีการศึกษา</option>
              {academicYears.map(year => <option key={year} value={year}>ปีการศึกษา {year}</option>)}
            </select>
            <select aria-label="เลือกภาคเรียน" value={filterSemester} onChange={event => setFilterSemester(event.target.value as 'all' | '1' | '2')} className="px-3 py-2 rounded-xl border border-amber-200 text-xs bg-white">
              <option value="all">ทุกภาคเรียน</option>
              <option value="1">ภาคเรียนที่ 1</option>
              <option value="2">ภาคเรียนที่ 2</option>
            </select>
            <button type="button" onClick={returnToCurrentSemester} className="px-3 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700">กลับสู่ {currentSemester}/{currentAcademicYear}</button>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            {(['all', 'award', 'training', 'work', 'certificate'] as const).map(value => <button key={value} onClick={() => setFilterCategory(value)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filterCategory === value ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{value === 'all' ? `ทั้งหมด (${portfolios.length})` : `${categoryInfo[value].icon} ${categoryInfo[value].label}`}</button>)}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <select value={filterOwner} onChange={event => setFilterOwner(event.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white min-w-52"><option value="all">แฟ้มบุคลากรทุกคน</option>{owners.map(owner => <option key={owner.id} value={owner.id}>{owner.name} — {owner.department}</option>)}</select>
            <button onClick={() => window.print()} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-slate-50"><Printer className="w-4 h-4" /> พิมพ์รายงาน</button>
          </div>
        </div>

        {filteredPortfolios.length === 0 ? <div className="py-14 text-center text-slate-500"><FolderOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" /><p className="font-semibold">ยังไม่มีข้อมูลในแฟ้มนี้</p><p className="text-xs mt-1">เลือก “บันทึกผลงานใหม่” เพื่อเพิ่มข้อมูลและเอกสารประกอบ</p></div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{filteredPortfolios.map(item => {
            const info = categoryInfo[item.category];
            const firstImage = item.attachments.find(file => file.type === 'image');
            return <article key={item.id} className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow bg-white">
              {firstImage && <img src={firstImage.url} alt={item.title} className="w-full h-40 object-cover" />}
              <div className="p-4 space-y-3"><div className="flex items-center justify-between gap-2"><span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${info.color}`}>{info.icon} {info.label}</span><span className="text-[11px] text-slate-500">ภาคเรียน {item.semester}/{item.academicYear}</span></div><h3 className="font-bold text-slate-800 leading-snug">{item.title}</h3><p className="text-xs text-slate-600 line-clamp-2">{item.description}</p><div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs"><div className="flex items-start gap-2"><UserRound className="w-4 h-4 text-slate-400 shrink-0" /><span><b>{item.userName}</b><br />{item.department}</span></div><div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" /><span>{formatDate(item.dateReceived)}</span></div><div className="flex items-center gap-2"><Paperclip className="w-4 h-4 text-slate-400" /><span>{item.attachments.length} ไฟล์แนบ</span></div></div><button onClick={() => setSelectedPortfolio(item)} className="w-full py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 hover:bg-slate-800"><Eye className="w-4 h-4" /> เปิดดูรายละเอียดและเอกสาร</button></div>
            </article>;
          })}</div>
        )}
      </div>

      {showModal && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4"><div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl max-h-[94vh] overflow-y-auto"><div className="sticky top-0 bg-white z-10 flex items-center justify-between p-5 border-b border-slate-100 rounded-t-3xl"><div><h3 className="font-bold text-slate-800">บันทึกผลงานและรางวัลบุคลากร</h3><p className="text-xs text-slate-500">จัดเก็บในแฟ้มของ {currentUser.name}</p></div><button type="button" onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleCreatePortfolio} className="p-5 space-y-4 text-xs">
          <Field label="ชื่อผลงาน / รางวัล / หลักสูตร"><input required value={title} onChange={e => setTitle(e.target.value)} className="form-input" placeholder="ระบุชื่อรายการ" /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Field label="ประเภทผลงาน"><select value={category} onChange={e => setCategory(e.target.value as PortfolioCategory)} className="form-input">{(Object.keys(categoryInfo) as PortfolioCategory[]).map(value => <option key={value} value={value}>{categoryInfo[value].icon} {categoryInfo[value].label}</option>)}</select></Field><Field label="ภาคเรียนปัจจุบัน"><input readOnly value={`ภาคเรียนที่ ${semester}`} className="form-input opacity-75" /></Field></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Field label="ปีการศึกษาปัจจุบัน"><input readOnly value={academicYear} className="form-input opacity-75" /></Field><Field label="วัน เดือน ปี ที่ได้รับ"><input required type="date" value={dateReceived} onChange={e => setDateReceived(e.target.value)} className="form-input" /></Field></div>
          <Field label="หน่วยงานที่มอบรางวัล / ผู้จัด"><input required value={organizer} onChange={e => setOrganizer(e.target.value)} className="form-input" placeholder="ระบุชื่อหน่วยงาน" /></Field>
          <Field label="รายละเอียด"><textarea required rows={4} value={description} onChange={e => setDescription(e.target.value)} className="form-input resize-y" placeholder="อธิบายรายละเอียดและผลลัพธ์ที่ได้รับ" /></Field>
          <Field label="แนบรูปภาพและเอกสาร (ไม่เกิน 10 ไฟล์ ไฟล์ละ 10 MB)"><label className="border-2 border-dashed border-slate-200 rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-amber-400 hover:bg-amber-50/40"><Paperclip className="w-6 h-6 text-amber-600" /><span className="font-semibold">เลือกไฟล์รูปภาพหรือเอกสาร</span><span className="text-[11px] text-slate-500">JPG, PNG, WEBP, PDF, Word, Excel, PowerPoint</span><input type="file" multiple accept="image/jpeg,image/png,image/webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={e => setAttachments(Array.from(e.target.files ?? []))} className="hidden" /></label>{attachments.length > 0 && <div className="mt-2 space-y-1">{attachments.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"><span className="truncate pr-3">{file.name}</span><span className="text-slate-400 shrink-0">{formatSize(file.size)}</span></div>)}</div>}</Field>
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2"><button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl border border-slate-200">ยกเลิก</button><button disabled={submitting} type="submit" className="px-5 py-2.5 rounded-xl bg-amber-600 text-white font-semibold disabled:opacity-60">{submitting ? 'กำลังบันทึก...' : 'บันทึกผลงาน'}</button></div>
        </form></div></div>}

      {selectedPortfolio && <PortfolioDetail item={selectedPortfolio} onClose={() => setSelectedPortfolio(null)} />}
      <style jsx global>{`.form-input{width:100%;border:1px solid #e2e8f0;border-radius:.75rem;background:#f8fafc;padding:.65rem .8rem;outline:none}.form-input:focus{background:white;border-color:#f59e0b;box-shadow:0 0 0 2px rgba(245,158,11,.15)}`}</style>
    </div>
  );
};

const Summary = ({ label, value, icon }: { label: string; value: string; icon: string }) => <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between"><div><div className="text-xs text-slate-500">{label}</div><div className="text-2xl font-extrabold text-slate-800 mt-1">{value}</div></div><div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-xl">{icon}</div></div>;
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <div><label className="block font-semibold text-slate-700 mb-1.5">{label}</label>{children}</div>;

const PortfolioDetail = ({ item, onClose }: { item: StaffPortfolio; onClose: () => void }) => {
  const info = categoryInfo[item.category];
  return <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4"><div className="bg-white rounded-2xl max-w-3xl w-full max-h-[94vh] overflow-y-auto shadow-2xl"><div className="sticky top-0 bg-white p-5 border-b flex items-start justify-between gap-3"><div><span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${info.color}`}>{info.icon} {info.label}</span><h3 className="font-bold text-lg text-slate-800 mt-2">{item.title}</h3></div><button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button></div><div className="p-5 space-y-5"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-slate-50 rounded-2xl p-4"><p><b>เจ้าของแฟ้ม:</b> {item.userName}</p><p><b>กลุ่มงาน:</b> {item.department}</p><p><b>ภาคเรียน/ปีการศึกษา:</b> {item.semester}/{item.academicYear}</p><p><b>วันที่ได้รับ:</b> {formatDate(item.dateReceived)}</p><p className="sm:col-span-2"><b>หน่วยงานที่มอบ:</b> {item.organizer}</p></div><div><h4 className="font-bold text-slate-800 mb-2">รายละเอียด</h4><p className="text-sm text-slate-700 whitespace-pre-wrap">{item.description}</p></div><div><h4 className="font-bold text-slate-800 mb-3">รูปภาพและเอกสารแนบ ({item.attachments.length})</h4>{item.attachments.length === 0 ? <p className="text-sm text-slate-400">ไม่มีไฟล์แนบ</p> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{item.attachments.map((file, index) => <a key={`${file.url}-${index}`} href={file.url} target="_blank" rel="noreferrer" className="border rounded-xl p-3 flex items-center gap-3 hover:border-amber-400 hover:bg-amber-50"><div className="w-10 h-10 rounded-lg bg-white border flex items-center justify-center shrink-0">{file.type === 'image' ? <ImageIcon className="w-5 h-5 text-blue-600" /> : <FileText className="w-5 h-5 text-rose-600" />}</div><div className="min-w-0"><p className="text-xs font-semibold truncate">{file.name}</p><p className="text-[11px] text-slate-400">{formatSize(file.size)} · เปิดไฟล์</p></div></a>)}</div>}</div></div></div></div>;
};
