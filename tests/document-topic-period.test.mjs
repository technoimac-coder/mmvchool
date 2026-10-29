import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/lessonPlanTopicLabel.ts', import.meta.url), 'utf8');
const context = vm.createContext({ exports: {} });
vm.runInContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, context);
const labelFor = context.exports.lessonPlanTopicLabel;
const semesterLabels = [
  ['lesson_plan_before', 'แผนการสอน (ก่อนบันทึกหลังแผน)', period => `แผนการสอน (ก่อนบันทึกหลังแผน ${period})`],
  ['lesson_plan', 'แผนการสอน (หลังบันทึกหลังแผน)', period => `แผนการสอน (หลังบันทึกหลังแผน ${period})`],
  ['learner_quality', 'รายงานพัฒนาคุณภาพผู้เรียน', period => `รายงานพัฒนาคุณภาพผู้เรียน (${period})`],
  ['course_plan', 'โครงการสอน', period => `โครงการสอน (${period})`],
  ['plc_setup', 'บันทึกจัดตั้งกลุ่ม PLC', period => `บันทึกจัดตั้งกลุ่ม PLC (${period})`],
  ['plc', 'รายงานกิจกรรมชุมนุมการเรียนรู้ทางวิชาชีพ PLC', period => `รายงานกิจกรรมชุมนุมการเรียนรู้ทางวิชาชีพ PLC (${period})`],
];

for (const [year, semester] of [['2569', '1'], ['2569', '2'], ['2570', '1']]) {
  test(`all semester document types use ${semester}/${year} without shifting terms`, () => {
    for (const [topic, label, expected] of semesterLabels) assert.equal(labelFor(topic, label, year, semester), expected(`${semester}/${year}`));
  });
}

test('research groups the requested academic term pairs into the same fiscal years', () => {
  const fiscal = context.exports.fiscalYearForAcademicTerm;
  for (const [year, semester, expected] of [['2569', '2', '2570'], ['2570', '1', '2570'], ['2568', '2', '2569'], ['2569', '1', '2569']]) {
    assert.equal(fiscal(year, semester), expected);
    assert.equal(labelFor('classroom_research', 'วิจัยในชั้นเรียน', year, semester), 'วิจัยในชั้นเรียน ปีงบประมาณ ' + expected);
    assert.equal(labelFor('classroom_research', 'Classroom research', year, semester), 'Classroom research Fiscal year ' + expected);
  }
});

test('unknown or all-period selections do not invent a fiscal year', () => {
  const fiscal = context.exports.fiscalYearForAcademicTerm;
  for (const [year, semester] of [['all', '1'], ['2569', 'all'], ['', ''], ['invalid', '2']]) {
    assert.equal(fiscal(year, semester), '');
    assert.equal(labelFor('classroom_research', 'วิจัยในชั้นเรียน', year, semester), 'วิจัยในชั้นเรียน');
  }
});

test('innovation keeps academic year wording while unrelated types remain unchanged', () => {
  assert.equal(labelFor('innovation_report', 'รายงานนวัตกรรม', '2570', '1'), 'รายงานนวัตกรรม ปีการศึกษา 2570 (หน้าเดียว)');
  for (const [topic, label] of [['substitute_report', 'รายงานการจัดสอนแทน'], ['id_plan', 'ID PLAN'], ['sar', 'SAR รายบุคคล'], ['other', 'อื่น ๆ']]) assert.equal(labelFor(topic, label, '2569', '1'), label);
});

test('period changes replace old suffixes without duplicating labels; all-period filters stay neutral', () => {
  for (const [topic, label, expected] of semesterLabels) {
    const previous = labelFor(topic, label, '2569', '2');
    assert.equal(labelFor(topic, previous, '2570', '1'), expected('1/2570'));
    assert.equal(labelFor(topic, label, 'all', '1'), label);
    assert.equal(labelFor(topic, label, '2569', 'all'), label);
  }
  assert.equal(labelFor('classroom_research', 'วิจัยในชั้นเรียน ปีงบประมาณ 2569', '2570', '1'), 'วิจัยในชั้นเรียน ปีงบประมาณ 2570');
});
