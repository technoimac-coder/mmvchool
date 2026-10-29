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

test('research fiscal year follows its submission date, independently of academic settings', () => {
  for (const year of ['2568', '2569', '2575', 'all']) for (const semester of ['1', '2', 'all']) {
    assert.equal(labelFor('classroom_research', 'วิจัยในชั้นเรียน', year, semester, '2026-10-29'), 'วิจัยในชั้นเรียน ปีงบประมาณ 2570');
    assert.equal(labelFor('classroom_research', 'Classroom research', year, semester, '2026-09-30'), 'Classroom research Fiscal year 2569');
  }
  assert.equal(labelFor('classroom_research', 'วิจัยในชั้นเรียน (2/2569)', '2570', '1', '2026-10-01'), 'วิจัยในชั้นเรียน ปีงบประมาณ 2570');
});

test('fiscal rollover uses Bangkok midnight for instants and local SQL dates', () => {
  const fiscal = context.exports.thaiFiscalYear;
  assert.equal(fiscal('2026-09-30 23:59:59'), '2569');
  assert.equal(fiscal('2026-10-01 00:00:00'), '2570');
  assert.equal(fiscal('2026-09-30T16:59:59Z'), '2569');
  assert.equal(fiscal('2026-09-30T17:00:00Z'), '2570');
  assert.equal(fiscal('2027-09-30'), '2570');
  assert.equal(fiscal('2027-10-01'), '2571');
  assert.equal(fiscal('2026-02-30'), '');
  assert.equal(fiscal('invalid'), '');
  assert.equal(labelFor('classroom_research', 'วิจัยในชั้นเรียน', '2569', '1', ''), 'วิจัยในชั้นเรียน');
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
  assert.equal(labelFor('classroom_research', 'วิจัยในชั้นเรียน ปีงบประมาณ 2569', '2570', '1', '2026-10-01'), 'วิจัยในชั้นเรียน ปีงบประมาณ 2570');
});
