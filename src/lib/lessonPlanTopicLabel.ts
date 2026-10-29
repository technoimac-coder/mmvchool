/** Thai fiscal years run October–September, using Bangkok time for date instants. */
export function thaiFiscalYear(value: string | Date = new Date()): string {
  let year: number;
  let month: number;
  const civil = typeof value === 'string' ? value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)?$/) : null;
  if (civil) {
    year = Number(civil[1]); month = Number(civil[2]);
    const day = Number(civil[3]);
    const checked = new Date(Date.UTC(year, month - 1, day));
    if (checked.getUTCFullYear() !== year || checked.getUTCMonth() + 1 !== month || checked.getUTCDate() !== day) return '';
  } else {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (!Number.isFinite(date.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Bangkok', year: 'numeric', month: 'numeric' }).formatToParts(date);
    year = Number(parts.find(part => part.type === 'year')?.value);
    month = Number(parts.find(part => part.type === 'month')?.value);
  }
  return String(year + 543 + (month >= 10 ? 1 : 0));
}

/** Display the selected/configured period without shifting semesters or changing storage. */
export function lessonPlanTopicLabel(topic: string, label: string, academicYear: string, semester: string, referenceDate: string | Date = new Date()): string {
  if (topic === 'classroom_research') {
    const baseLabel = label.replace(/\s*\([12]\/\d{4}\)$/, '').replace(/\s+(?:ปีงบประมาณ|Fiscal year)\s+\d{4}$/, '');
    const fiscalYear = thaiFiscalYear(referenceDate);
    return fiscalYear ? baseLabel + ' ' + (/[\u0E00-\u0E7F]/.test(label) ? 'ปีงบประมาณ ' : 'Fiscal year ') + fiscalYear : baseLabel;
  }

  if (!/^\d{4}$/.test(academicYear)) return label;
  const semesterTopics = new Set(['lesson_plan_before', 'lesson_plan', 'learner_quality', 'course_plan', 'plc_setup', 'plc']);
  if (semesterTopics.has(topic) && ['1', '2'].includes(semester)) {
    const baseLabel = label.replace(/\s*\([12]\/\d{4}\)$/, '').replace(/\s+[12]\/\d{4}(?=\)$)/, '');
    const period = semester + '/' + academicYear;
    return ['lesson_plan_before', 'lesson_plan'].includes(topic)
      ? baseLabel.replace(/\)$/, ' ' + period + ')')
      : baseLabel + ' (' + period + ')';
  }
  if (topic === 'innovation_report') {
    const baseLabel = label.replace(/\s+(?:ปีการศึกษา\s+\d{4}\s+\(หน้าเดียว\)|Academic year\s+\d{4}\s+\(one page\))$/, '');
    const suffix = label.includes('รายงานนวัตกรรม') ? 'ปีการศึกษา ' + academicYear + ' (หน้าเดียว)' : 'Academic year ' + academicYear + ' (one page)';
    return baseLabel + ' ' + suffix;
  }
  return label;
}
