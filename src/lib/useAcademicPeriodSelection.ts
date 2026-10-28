'use client';

import { useState } from 'react';

type SemesterFilter = 'all' | '1' | '2';
type AcademicPeriod = { academicYear: string; semester: '1' | '2' };

/** Keep manual history filters within the configured school period that selected them. */
export function useAcademicPeriodSelection(period: AcademicPeriod, defaultSemester: SemesterFilter = period.semester) {
  const periodKey = `${period.academicYear}-${period.semester}`;
  const defaults = { periodKey, academicYear: period.academicYear, semester: defaultSemester };
  const [selection, setSelection] = useState(defaults);
  if (selection.periodKey !== periodKey) setSelection(defaults);
  const activeSelection = selection.periodKey === periodKey ? selection : defaults;

  const setAcademicYear = (academicYear: string) => setSelection(previous => ({
    ...(previous.periodKey === periodKey ? previous : defaults),
    academicYear,
  }));
  const setSemester = (semester: SemesterFilter) => setSelection(previous => ({
    ...(previous.periodKey === periodKey ? previous : defaults),
    semester,
  }));

  return { academicYear: activeSelection.academicYear, semester: activeSelection.semester, setAcademicYear, setSemester };
}