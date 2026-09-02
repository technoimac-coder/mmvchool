<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/line-notifier.php';

$database = require_database();
$currentUser = require_user();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
try { $database->exec("ALTER TABLE substitute_teachings ADD COLUMN academic_year varchar(10) NULL"); } catch (Throwable $ignored) { /* column already exists */ }
try { $database->exec("ALTER TABLE substitute_teachings ADD COLUMN semester varchar(1) NULL"); } catch (Throwable $ignored) { /* column already exists */ }
try { $database->exec("ALTER TABLE substitute_teachings ADD COLUMN rejected_at datetime NULL"); } catch (Throwable $ignored) { /* column already exists */ }
try { $database->exec("ALTER TABLE substitute_teachings ADD COLUMN rejection_reason text NULL"); } catch (Throwable $ignored) { /* column already exists */ }
$database->exec("UPDATE substitute_teachings SET academic_year = CASE WHEN MONTH(teaching_date) < 5 THEN YEAR(teaching_date) + 542 ELSE YEAR(teaching_date) + 543 END, semester = CASE WHEN MONTH(teaching_date) BETWEEN 5 AND 10 THEN '1' ELSE '2' END WHERE academic_year IS NULL OR semester IS NULL");

function can_manage_substitutes(array $user): bool
{
    $role = $user['role'] ?? '';
    return $role === 'admin'
        || (string) $user['id'] === workflow_assignee('pipe-substitute', 1, 'MMV90');
}

function can_view_all_substitutes(array $user): bool
{
    return can_manage_substitutes($user)
        || in_array((string) ($user['role'] ?? ''), ['director', 'deputy_personnel', 'deputy_budget', 'academic_affairs'], true);
}

function substitute_payload(array $row): array
{
    $payload = [
        'id' => (string) $row['id'],
        'originalTeacherId' => (string) $row['original_teacher_id'],
        'originalTeacherName' => (string) $row['original_teacher_name'],
        'substituteTeacherId' => (string) $row['substitute_teacher_id'],
        'substituteTeacherName' => (string) $row['substitute_teacher_name'],
        'date' => (string) $row['teaching_date'],
        'period' => (int) $row['period'],
        'time' => (string) $row['teaching_time'],
        'gradeLevel' => (string) $row['grade_level'],
        'subjectCode' => (string) $row['subject_code'],
        'subjectName' => (string) $row['subject_name'],
        'status' => (string) $row['status'],
        'stage' => (string) $row['stage'],
        'createdAt' => substr((string) $row['created_at'], 0, 10),
        'academicYear' => (string) ($row['academic_year'] ?? ''),
        'semester' => (string) ($row['semester'] ?? ''),
    ];
    foreach (['official_duty_id' => 'officialDutyId', 'leave_request_id' => 'leaveRequestId', 'assigned_work' => 'assignedWork', 'leave_reason' => 'leaveReason', 'rejection_reason' => 'rejectionReason'] as $column => $key) {
        if (!empty($row[$column])) $payload[$key] = (string) $row[$column];
    }
    if (!empty($row['acknowledged_at'])) $payload['acknowledgedAt'] = substr((string) $row['acknowledged_at'], 0, 16);
    if (!empty($row['rejected_at'])) $payload['rejectedAt'] = substr((string) $row['rejected_at'], 0, 16);
    return $payload;
}

function find_substitute(PDO $database, string $id): array
{
    $statement = $database->prepare('SELECT * FROM substitute_teachings WHERE id = ? LIMIT 1');
    $statement->execute([$id]);
    $row = $statement->fetch();
    if (!$row) api_error('ไม่พบรายการสอนแทน', 404, 'substitute_not_found');
    return $row;
}

function active_user(PDO $database, string $id): array
{
    $statement = $database->prepare("SELECT id, name FROM users WHERE id = ? AND status = 'active' LIMIT 1");
    $statement->execute([$id]);
    $row = $statement->fetch();
    if (!$row) api_error('ไม่พบบุคลากรที่เลือกหรือบัญชีไม่พร้อมใช้งาน', 422, 'invalid_user');
    return $row;
}

function substitute_role_user_ids(PDO $database, array $roles): array
{
    $placeholders = implode(',', array_fill(0, count($roles), '?'));
    $statement = $database->prepare("SELECT id FROM users WHERE status = 'active' AND role IN ($placeholders)");
    $statement->execute($roles);
    return array_map(static fn(array $row): string => (string) $row['id'], $statement->fetchAll());
}

function notify_substitute_users(PDO $database, array $userIds, string $title, array $fields, string $relatedId): void
{
    $userIds = array_values(array_unique(array_filter($userIds)));
    $message = implode(' • ', array_map(
        static fn(string $label, mixed $value): string => $label . ': ' . (string) $value,
        array_keys($fields),
        array_values($fields)
    ));
    $statement = $database->prepare(
        'INSERT INTO notifications (user_id, title, message, module, related_id) VALUES (?, ?, ?, ?, ?)'
    );
    foreach ($userIds as $userId) $statement->execute([$userId, $title, $message, 'substitute', $relatedId]);
    line_notify_linked_users($database, $userIds, $title, $fields);
}

if ($method === 'GET') {
    if (can_view_all_substitutes($currentUser)) {
        $rows = $database->query('SELECT * FROM substitute_teachings ORDER BY teaching_date DESC, period ASC, created_at DESC LIMIT 500')->fetchAll();
    } else {
        $statement = $database->prepare(
            'SELECT * FROM substitute_teachings
             WHERE original_teacher_id = ? OR substitute_teacher_id = ?
             ORDER BY teaching_date DESC, period ASC, created_at DESC LIMIT 500'
        );
        $statement->execute([$currentUser['id'], $currentUser['id']]);
        $rows = $statement->fetchAll();
    }
    api_respond(['status' => 'success', 'data' => array_map('substitute_payload', $rows)]);
}

require_method('POST');
require_csrf();
$input = json_body();
$action = (string) ($input['action'] ?? '');

if ($action === 'create_batch') {
    if (!can_manage_substitutes($currentUser)) api_error('เฉพาะผู้รับผิดชอบงานวิชาการหรือผู้ดูแลระบบเท่านั้น', 403, 'forbidden');
    $lessons = $input['lessons'] ?? null;
    if (!is_array($lessons) || count($lessons) < 1 || count($lessons) > 16) {
        api_error('กรุณาระบุคาบสอนอย่างน้อย 1 คาบ และไม่เกิน 16 คาบต่อครั้ง', 422, 'validation_error');
    }

    $academicPeriod = current_academic_period($database);
    $database->beginTransaction();
    try {
        $insert = $database->prepare(
            'INSERT INTO substitute_teachings
             (id, official_duty_id, leave_request_id, original_teacher_id, original_teacher_name,
              substitute_teacher_id, substitute_teacher_name, teaching_date, period, teaching_time,
              grade_level, subject_code, subject_name, assigned_work, leave_reason, academic_year, semester)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $created = [];
        $dutyIds = [];
        foreach ($lessons as $lesson) {
            if (!is_array($lesson)) api_error('ข้อมูลคาบสอนไม่ถูกต้อง', 422, 'validation_error');
            foreach (['originalTeacherId', 'substituteTeacherId', 'date', 'gradeLevel', 'subjectCode', 'subjectName'] as $field) {
                if (trim((string) ($lesson[$field] ?? '')) === '') api_error('กรุณากรอกข้อมูลทุกคาบให้ครบถ้วน', 422, 'validation_error');
            }
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $lesson['date'])) api_error('วันที่สอนแทนไม่ถูกต้อง', 422, 'invalid_date');
            $period = (int) ($lesson['period'] ?? 0);
            if ($period < 1 || $period > 8) api_error('คาบเรียนต้องอยู่ระหว่างคาบที่ 1 ถึง 8', 422, 'invalid_period');
            $original = active_user($database, (string) $lesson['originalTeacherId']);
            $substitute = active_user($database, (string) $lesson['substituteTeacherId']);
            if ($original['id'] === $substitute['id']) api_error('ครูประจำวิชาและครูผู้สอนแทนต้องเป็นคนละคนกัน', 422, 'same_teacher');

            $id = 'SUB-' . date('Y') . '-' . strtoupper(bin2hex(random_bytes(4)));
            $officialDutyId = trim((string) ($lesson['officialDutyId'] ?? '')) ?: null;
            $leaveRequestId = trim((string) ($lesson['leaveRequestId'] ?? '')) ?: null;
            $insert->execute([
                $id, $officialDutyId, $leaveRequestId, $original['id'], $original['name'],
                $substitute['id'], $substitute['name'], $lesson['date'], $period,
                trim((string) ($lesson['time'] ?? '')), trim((string) $lesson['gradeLevel']),
                trim((string) $lesson['subjectCode']), trim((string) $lesson['subjectName']),
                trim((string) ($lesson['assignedWork'] ?? '')) ?: null,
                trim((string) ($lesson['leaveReason'] ?? '')) ?: null,
                $academicPeriod['academicYear'], $academicPeriod['semester'],
            ]);
            if ($officialDutyId !== null) $dutyIds[] = $officialDutyId;
            $row = find_substitute($database, $id);
            $created[] = $row;
            notify_substitute_users($database, [(string) $substitute['id']], 'มีคำขอสอนแทน กรุณาตรวจสอบความสะดวก', [
                'ครูประจำวิชา' => $original['name'], 'วิชา' => $row['subject_name'], 'ห้อง' => $row['grade_level'],
                'วันที่' => $row['teaching_date'], 'คาบ' => $row['period'] . ' (' . $row['teaching_time'] . ')',
                'ดำเนินการ' => 'กรุณากดรับทราบหรือปฏิเสธในระบบ',
            ], $id);
        }
        if ($dutyIds) {
            $dutyIds = array_values(array_unique($dutyIds));
            $placeholders = implode(',', array_fill(0, count($dutyIds), '?'));
            $statement = $database->prepare(
                "UPDATE official_duty_requests SET substitute_scheduled = 1, current_stage = 'completed' WHERE id IN ($placeholders)"
            );
            $statement->execute($dutyIds);
        }
        $database->commit();
        api_respond(['status' => 'success', 'data' => array_map('substitute_payload', $created)], 201);
    } catch (Throwable $exception) {
        if ($database->inTransaction()) $database->rollBack();
        if ($exception instanceof PDOException && $exception->getCode() === '23000') {
            api_error('มีรายการสอนแทนคาบนี้อยู่แล้ว กรุณาตรวจสอบข้อมูล', 409, 'duplicate_lesson');
        }
        throw $exception;
    }
}

if ($action === 'reject') {
    $lesson = find_substitute($database, (string) ($input['lessonId'] ?? ''));
    if ((string) $lesson['substitute_teacher_id'] !== (string) $currentUser['id']) {
        api_error('รายการนี้ไม่ได้มอบหมายให้คุณสอนแทน', 403, 'forbidden');
    }
    if (($lesson['stage'] ?? '') !== 'pending_ack') api_error('รายการนี้มีการตอบรับแล้ว', 409, 'already_responded');
    $reason = trim((string) ($input['reason'] ?? '')) ?: 'ไม่สะดวกสอนแทนในคาบดังกล่าว';
    $statement = $database->prepare(
        "UPDATE substitute_teachings SET stage = 'rejected', status = 'rejected', rejected_at = NOW(), rejection_reason = ?
         WHERE id = ? AND substitute_teacher_id = ? AND stage = 'pending_ack'"
    );
    $statement->execute([$reason, $lesson['id'], $currentUser['id']]);
    if ($statement->rowCount() !== 1) api_error('สถานะรายการถูกเปลี่ยนไปแล้ว', 409, 'stale_substitute');

    notify_substitute_users($database, [workflow_assignee('pipe-substitute', 1, 'MMV90')], 'ครูผู้รับสอนแทนปฏิเสธ กรุณาเลือกครูท่านอื่น', [
        'ครูผู้ปฏิเสธ' => $currentUser['name'], 'ครูประจำวิชา' => $lesson['original_teacher_name'],
        'วิชา' => $lesson['subject_name'], 'ห้อง' => $lesson['grade_level'],
        'วันที่' => $lesson['teaching_date'], 'คาบ' => $lesson['period'], 'เหตุผล' => $reason,
    ], (string) $lesson['id']);
    api_respond(['status' => 'success', 'data' => substitute_payload(find_substitute($database, (string) $lesson['id']))]);
}

if ($action === 'reassign') {
    if (!can_manage_substitutes($currentUser)) api_error('เฉพาะผู้จัดตารางสอนแทนหรือผู้ดูแลระบบเท่านั้น', 403, 'forbidden');
    $lesson = find_substitute($database, (string) ($input['lessonId'] ?? ''));
    if (($lesson['stage'] ?? '') !== 'rejected') api_error('เลือกครูคนใหม่ได้เมื่อครูเดิมปฏิเสธแล้วเท่านั้น', 409, 'not_rejected');
    $substitute = active_user($database, trim((string) ($input['substituteTeacherId'] ?? '')));
    if ((string) $substitute['id'] === (string) $lesson['original_teacher_id']) api_error('ครูประจำวิชาและครูผู้สอนแทนต้องเป็นคนละคนกัน', 422, 'same_teacher');
    if ((string) $substitute['id'] === (string) $lesson['substitute_teacher_id']) api_error('กรุณาเลือกครูผู้สอนแทนคนใหม่', 422, 'same_rejected_teacher');

    try {
        $statement = $database->prepare(
            "UPDATE substitute_teachings SET substitute_teacher_id = ?, substitute_teacher_name = ?,
             stage = 'pending_ack', status = 'pending', acknowledged_at = NULL, rejected_at = NULL, rejection_reason = NULL
             WHERE id = ? AND stage = 'rejected'"
        );
        $statement->execute([$substitute['id'], $substitute['name'], $lesson['id']]);
    } catch (PDOException $exception) {
        if ($exception->getCode() === '23000') api_error('ครูที่เลือกมีรายการสอนแทนในคาบนี้แล้ว', 409, 'duplicate_lesson');
        throw $exception;
    }
    if ($statement->rowCount() !== 1) api_error('สถานะรายการถูกเปลี่ยนไปแล้ว', 409, 'stale_substitute');
    $updated = find_substitute($database, (string) $lesson['id']);
    notify_substitute_users($database, [(string) $substitute['id']], 'มีคำขอสอนแทนใหม่ กรุณาตรวจสอบความสะดวก', [
        'ครูประจำวิชา' => $updated['original_teacher_name'], 'วิชา' => $updated['subject_name'], 'ห้อง' => $updated['grade_level'],
        'วันที่' => $updated['teaching_date'], 'คาบ' => $updated['period'] . ' (' . $updated['teaching_time'] . ')',
        'ดำเนินการ' => 'กรุณากดรับทราบหรือปฏิเสธในระบบ',
    ], (string) $updated['id']);
    api_respond(['status' => 'success', 'data' => substitute_payload($updated)]);
}

if ($action === 'acknowledge') {
    $lesson = find_substitute($database, (string) ($input['lessonId'] ?? ''));
    if ((string) $lesson['substitute_teacher_id'] !== (string) $currentUser['id']) {
        api_error('รายการนี้ไม่ได้มอบหมายให้คุณสอนแทน', 403, 'forbidden');
    }
    if (($lesson['stage'] ?? '') !== 'pending_ack') api_error('รายการนี้รับทราบแล้ว', 409, 'already_acknowledged');
    $statement = $database->prepare(
        "UPDATE substitute_teachings SET stage = 'acknowledged', status = 'completed', acknowledged_at = NOW()
         WHERE id = ? AND substitute_teacher_id = ? AND stage = 'pending_ack'"
    );
    $statement->execute([$lesson['id'], $currentUser['id']]);
    if ($statement->rowCount() !== 1) api_error('สถานะรายการถูกเปลี่ยนไปแล้ว', 409, 'stale_substitute');

    // Notify only the configured workflow assignees; do not broadcast to every admin.
    $recipients = [
        workflow_assignee('pipe-substitute', 1, 'MMV90'),
        workflow_assignee('pipe-substitute', 3, 'MMV02'),
    ];
    notify_substitute_users($database, $recipients, 'ครูผู้สอนแทนรับทราบแล้ว', [
        'ครูผู้สอนแทน' => $currentUser['name'], 'วิชา' => $lesson['subject_name'], 'ห้อง' => $lesson['grade_level'],
        'วันที่' => $lesson['teaching_date'], 'คาบ' => $lesson['period'],
    ], (string) $lesson['id']);
    api_respond(['status' => 'success', 'data' => substitute_payload(find_substitute($database, (string) $lesson['id']))]);
}

api_error('ไม่รู้จักคำสั่งที่ร้องขอ', 400, 'unknown_action');
