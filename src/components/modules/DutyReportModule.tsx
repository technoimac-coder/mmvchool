'use client';
import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { officialDutiesApi } from '../../lib/api';
import { OfficialDutyRequest } from '../../types';

export const DutyReportModule: React.FC = () => {
  const { users, addToast } = useApp();
  const [duties, setDuties] = useState<OfficialDutyRequest[]>([]);
  const [viewStartDate, setViewStartDate] = useState('');
  const [viewEndDate, setViewEndDate] = useState('');
  const [status, setStatus] = useState('approved');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; officialDutiesApi.report().then(rows => { if (active) setDuties(rows); }).catch(() => { if (active) setError('ไม่สามารถโหลดรายงานได้ กรุณาลองใหม่'); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  const hasInvalidViewDateRange = Boolean(viewStartDate && viewEndDate && viewStartDate > viewEndDate);
  const filteredDuties = duties.filter(d => (status === 'all' || d.status === status) && !hasInvalidViewDateRange && (!viewEndDate || d.startDate <= viewEndDate) && (!viewStartDate || d.endDate >= viewStartDate));
  const exportDutyReport = () => {
    if (hasInvalidViewDateRange || filteredDuties.length === 0) {
      addToast(hasInvalidViewDateRange ? 'กรุณาตรวจสอบช่วงวันที่' : 'ไม่มีรายการสำหรับส่งออกรายงาน', 'error');
      return;
    }
    const headers = ['ลำดับที่', 'ชื่อ - สกุล', 'ตำแหน่ง', 'เรื่อง', 'ตั้งแต่วันที่', 'ถึงวันที่', 'จำนวนวัน', 'สถานที่', 'หน่วยงานที่จัดโครงการ'];
    const escape = (value: unknown) => String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    const thaiDate = (date: string) => {
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date || '');
      if (!match) return date || '';
      return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))));
    };
    const cell = (value: unknown, style = 'Body', mergeDown = 0, index?: number) => `<Cell ss:StyleID="${style}"${mergeDown ? ` ss:MergeDown="${mergeDown}"` : ''}${index ? ` ss:Index="${index}"` : ''}><Data ss:Type="${typeof value === 'number' && Number.isFinite(value) ? 'Number' : 'String'}">${escape(value)}</Data></Cell>`;
    const tableRows = [...filteredDuties].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id)).map((duty, index) => {
      const names = [...new Set([duty.userName, ...(duty.participants || [])].map(name => name.trim()).filter(name => name && name !== '-'))];
      if (!names.length) names.push('');
      const extra = names.length - 1;
      return names.map((name, personIndex) => {
        const matches = users.filter(user => user.name.trim() === name);
        const position = personIndex === 0 ? duty.userPosition : matches.length === 1 ? matches[0].position : '';
        const first = personIndex === 0;
        return `<Row>${first ? cell(index + 1, 'Body', extra) : ''}${cell(name, 'Body', 0, first ? undefined : 2)}${cell(position)}${first ? [duty.title, thaiDate(duty.startDate), thaiDate(duty.endDate), duty.totalDays, duty.location, duty.organizer].map(value => cell(value, 'Body', extra)).join('') : ''}</Row>`;
      }).join('');
    }).join('');
    const rangeLabel = `${viewStartDate || viewEndDate ? `ช่วงวันที่ ${viewStartDate ? thaiDate(viewStartDate) : 'เริ่มต้น'} ถึง ${viewEndDate ? thaiDate(viewEndDate) : 'ล่าสุด'}` : 'ทุกวันที่ตามตัวกรอง'} — ${status === 'approved' ? 'อนุมัติแล้ว' : status === 'pending' ? 'รอดำเนินการ' : status === 'rejected' ? 'ไม่อนุมัติ / ส่งกลับ' : 'ทุกสถานะ'}`;
    const workbook = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Body"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="TH Sarabun New" ss:Size="16"/></Style><Style ss:ID="Header" ss:Parent="Body"><Font ss:FontName="TH Sarabun New" ss:Size="16" ss:Bold="1"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style><Style ss:ID="Title"><Font ss:FontName="TH Sarabun New" ss:Size="18" ss:Bold="1"/><Alignment ss:Horizontal="Center"/></Style></Styles><Worksheet ss:Name="รายงานไปราชการ"><Table>${[45,150,120,220,95,95,65,150,160].map(width => `<Column ss:Width="${width}"/>`).join('')}<Row><Cell ss:MergeAcross="8" ss:StyleID="Title"><Data ss:Type="String">แบบสรุปรายการไปราชการของข้าราชการครูและบุคลากรทางการศึกษา</Data></Cell></Row><Row><Cell ss:MergeAcross="8" ss:StyleID="Title"><Data ss:Type="String">โรงเรียนมกุฎเมืองราชวิทยาลัย ${escape(rangeLabel)}</Data></Cell></Row><Row>${headers.map(value => cell(value, 'Header')).join('')}</Row>${tableRows}</Table></Worksheet></Workbook>`;
    const url = URL.createObjectURL(new Blob(['\ufeff', workbook], { type: 'application/vnd.ms-excel;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `รายงานไปราชการ-${viewStartDate || 'เริ่มต้น'}-${viewEndDate || 'ล่าสุด'}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return <div className="space-y-5"><div className="rounded-2xl bg-indigo-900 p-6 text-white"><h2 className="text-xl font-bold">รายงานการไปราชการ</h2><p className="mt-1 text-sm text-indigo-100">เลือกช่วงวันที่เดินทาง แล้วส่งออกรายงานตามรายการที่แสดง</p></div><div className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-end gap-3"><label className="text-sm font-bold">ตั้งแต่วันที่<input className="mt-1 block rounded-lg border p-2" type="date" value={viewStartDate} onChange={e => setViewStartDate(e.target.value)}/></label><label className="text-sm font-bold">ถึงวันที่<input className="mt-1 block rounded-lg border p-2" type="date" value={viewEndDate} onChange={e => setViewEndDate(e.target.value)}/></label><label className="text-sm font-bold">สถานะ<select className="mt-1 block rounded-lg border p-2" value={status} onChange={e => setStatus(e.target.value)}><option value="approved">อนุมัติแล้ว</option><option value="pending">รอดำเนินการ</option><option value="rejected">ไม่อนุมัติ / ส่งกลับ</option><option value="all">ทุกสถานะ</option></select></label><button type="button" onClick={exportDutyReport} disabled={loading || hasInvalidViewDateRange || !filteredDuties.length} className="rounded-lg bg-emerald-700 px-4 py-2 font-bold text-white disabled:opacity-50">ส่งออก Excel</button></div>{hasInvalidViewDateRange && <p className="mt-3 text-red-700">วันที่เริ่มต้นต้องไม่อยู่หลังวันที่สิ้นสุด</p>}{error && <p className="mt-3 text-red-700">{error}</p>}<p className="my-4 text-sm">{loading ? 'กำลังโหลดรายงาน…' : 'พบ ' + filteredDuties.length + ' รายการ'}</p><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead><tr className="border-b"><th className="p-2">ผู้ขอ</th><th className="p-2">เรื่อง</th><th className="p-2">วันที่เดินทาง</th><th className="p-2">สถานที่</th><th className="p-2">สถานะ</th></tr></thead><tbody>{filteredDuties.map(d => <tr key={d.id} className="border-b"><td className="p-2">{d.userName}</td><td className="p-2">{d.title}</td><td className="p-2">{d.startDate} ถึง {d.endDate}</td><td className="p-2">{d.location}</td><td className="p-2">{d.status === 'approved' ? 'อนุมัติแล้ว' : d.status === 'rejected' ? 'ไม่อนุมัติ / ส่งกลับ' : 'รอดำเนินการ'}</td></tr>)}</tbody></table></div></div></div>;
};
