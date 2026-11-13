<?php
declare(strict_types=1);
require_once __DIR__.'/../api/leave-schedule.php';
require_once __DIR__.'/../api/pending-request-edit.php';
$schedule = [
    ['date'=>'2026-11-13', 'period'=>'morning'],
    ['date'=>'2026-11-14', 'period'=>'none'],
    ['date'=>'2026-11-15', 'period'=>'none'],
    ['date'=>'2026-11-16', 'period'=>'full'],
];
if (leave_schedule_validate($schedule, '2026-11-13', '2026-11-16')['total'] !== 1.5) throw new RuntimeException('Wrong half-day total');
class LeaveTestPdo extends PDO { public function __construct() {} }
$changed = pending_request_changes(new LeaveTestPdo(), 'leave', ['signature_url'=>'/storage/test.png'], [
    'leaveType'=>'personal', 'startDate'=>'2026-11-13', 'endDate'=>'2026-11-16', 'reason'=>'test',
    'signatureUrl'=>'/storage/test.png', 'leaveSchedule'=>$schedule, 'totalDays'=>1.5,
]);
if ($changed['total_days'] !== 1.5 || json_decode($changed['leave_schedule'], true) !== $schedule) throw new RuntimeException('Edit did not preserve schedule');
$schedule[1]['period'] = 'full';
try { leave_schedule_validate($schedule, '2026-11-13', '2026-11-16'); throw new RuntimeException('Weekend should have failed'); }
catch (InvalidArgumentException $expected) {}
echo "Leave schedule validation passed.\n";
