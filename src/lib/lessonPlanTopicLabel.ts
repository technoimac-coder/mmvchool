/** Display the selected/configured period without shifting semesters or changing storage. */
export function lessonPlanTopicLabel(topic: string, label: string, academicYear: string, semester: string): string {
  if (!/^\d{4}$/.test(academicYear)) return label;
  const semesterTopics = new Set(['lesson_plan_before', 'lesson_plan', 'learner_quality', 'course_plan', 'plc_setup', 'plc']);
  if (semesterTopics.has(topic) && ['1', '2'].includes(semester)) {
    const baseLabel = label.replace(/\s*\([12]\/\d{4}\)$/, '').replace(/\s+[12]\/\d{4}(?=\)$)/, '');
    const period = semester + '/' + academicYear;
    return ['lesson_plan_before', 'lesson_plan'].includes(topic)
      ? baseLabel.replace(/\)$/, ' ' + period + ')')
      : baseLabel + ' (' + period + ')';
  }
  if (topic === 'classroom_research') {
    const baseLabel = label.replace(/\s*\([12]\/\d{4}\)$/, '').replace(/\s+(?:ปีงบประมาณ|Fiscal year)\s+\d{4}$/, '');
    return baseLabel + ' ' + (/[\u0E00-\u0E7F]/.test(label) ? 'ปีงบประมาณ ' : 'Fiscal year ') + academicYear;
  }
  if (topic === 'innovation_report') {
    const baseLabel = label.replace(/\s+(?:ปีการศึกษา\s+\d{4}\s+\(หน้าเดียว\)|Academic year\s+\d{4}\s+\(one page\))$/, '');
    const suffix = label.includes('รายงานนวัตกรรม') ? 'ปีการศึกษา ' + academicYear + ' (หน้าเดียว)' : 'Academic year ' + academicYear + ' (one page)';
    return baseLabel + ' ' + suffix;
  }
  return label;
}
