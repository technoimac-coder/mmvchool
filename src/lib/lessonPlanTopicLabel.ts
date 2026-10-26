/** Labels describe the teaching period; the submission's storage period stays unchanged. */
export function lessonPlanTopicLabel(topic: string, label: string, academicYear: string, semester: string): string {
  if (topic !== 'lesson_plan_before' && topic !== 'lesson_plan') return label;
  if (!/^\d{4}$/.test(academicYear) || !['1', '2'].includes(semester)) return label;
  const targetSemester = topic === 'lesson_plan' ? (semester === '1' ? '2' : '1') : semester;
  const targetYear = topic === 'lesson_plan' && semester === '1' ? String(Number(academicYear) - 1) : academicYear;
  return label.replace(/\)$/, ` ${targetSemester}/${targetYear})`);
}
