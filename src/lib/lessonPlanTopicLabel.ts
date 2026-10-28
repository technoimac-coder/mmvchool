/** Labels describe the required teaching artifact period; storage period is unchanged. */
export function lessonPlanTopicLabel(topic: string, label: string, academicYear: string, semester: string): string {
  if (!/^\d{4}$/.test(academicYear)) return label;
  if (topic === 'lesson_plan_before' && ['1', '2'].includes(semester)) {
    return label.replace(/\)$/, ` ${semester}/${academicYear})`);
  }
  const previousSemesterTopics = new Set(['lesson_plan', 'learner_quality', 'plc']);
  if (previousSemesterTopics.has(topic) && ['1', '2'].includes(semester)) {
    const targetSemester = semester === '1' ? '2' : '1';
    const targetYear = semester === '1' ? String(Number(academicYear) - 1) : academicYear;
    return label.replace(/\)$/, ` ${targetSemester}/${targetYear})`);
  }
  const fixedSemester: Record<string, string> = {
    course_plan: '2',
    classroom_research: '2',
    plc_setup: '2',
  };
  if (fixedSemester[topic]) {
    const baseLabel = label.replace(/\s+\([^()]*\/\d{4}\)$/, '');
    return `${baseLabel} (${fixedSemester[topic]}/${academicYear})`;
  }
  if (topic === 'innovation_report') {
    const baseLabel = label.replace(/\s+ปีการศึกษา\s+\d{4}\s+\(หน้าเดียว\)$/, '');
    const suffix = label.includes('รายงานนวัตกรรม') ? `ปีการศึกษา ${academicYear} (หน้าเดียว)` : `Academic year ${academicYear} (one page)`;
    return `${baseLabel} ${suffix}`;
  }
  return label;
}