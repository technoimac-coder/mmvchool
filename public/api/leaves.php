<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/line-notifier.php';

$database = require_database();
$currentUser = require_user();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

const LEAVE_APPROVERS = [
    'admin_review' => 'MMV14',
    'deputy_approval' => 'MMV04',
    'director_approval' => 'MMV01',
];

function leave_json(?string $value): ?array
{
    if (!$value) return null;
    $decoded = json_decode($value, true);
    return is_array($decoded) ? $decoded : null;
}

function leave_payload(array $row): array
{
    $payload = [
        'id' => (string) $row['id'], 'userId' => (string) $row['user_id'], 'userName' => (string) $row['user_name'],
        'userPosition' => (string) $row['user_position'], 'department' => (string) $row['department'],
        'organization' => (string) $row['organization'], 'writtenAt' => (string) $row['written_at'],
        'leaveType' => (string) $row['leave_type'], 'startDate' => (string) $row['start_date'],
        'endDate' => (string) $row['end_date'], 'totalDays' => (int) $row['total_days'],
        'reason' => (string) $row['reason'], 'contactAddress' => (string) ($row['contact_address'] ?? ''),
        'contactPhone' => (string) ($row['contact_phone'] ?? ''), 'status' => (string) $row['status'],
        'currentStage' => (string) $row['current_stage'], 'createdAt' => substr((string) $row['created_at'], 0, 10),
    ];
    foreach (['other_leave_details' => 'otherLeaveDetails', 'signature_url' => 'signatureUrl'] as $column => $key) {
        if (!empty($row[$column])) $payload[$key] = (string) $row[$column];
    }
    foreach (['leave_stats' => 'leaveStats', 'admin_review' => 'adminReview', 'deputy_approval' => 'deputyApproval', 'director_approval' => 'directorApproval'] as $column => $key) {
        $value = leave_json($row[$column] ?? null);
        if ($value !== null) $payload[$key] = $value;
    }
    return $payload;
}

function find_leave(PDO $database, string $id): array
{
    $statement = $database->prepare('SELECT * FROM leave_requests WHERE id = ? LIMIT 1');
    $statement->execute([$id]);
    $row = $statement->fetch();
    if (!$row) api_error('ไม่พบใบลา', 404, 'leave_not_found');
    return $row;
}

function add_workflow_notification(PDO $database, string $userId, string $title, string $message, string $relatedId): void
{
    $statement = $database->prepare('INSERT INTO notifications (user_id, title, message, module, related_id) VALUES (?, ?, ?, ?, ?)');
    $statement->execute([$userId, $title, $message, 'leave', $relatedId]);
}

function notify_leave_user(PDO $database, string $userId, string $title, array $fields, string $relatedId): void
{
    $parts = [];
    foreach ($fields as $label => $value) $parts[] = $label . ': ' . $value;
    add_workflow_notification($database, $userId, $title, implode(' • ', $parts), $relatedId);
    if (!line_notify_linked_users($database, [$userId], $title, $fields)) line_notify_event($title, $fields);
}

if ($method === 'GET') {
    $isApprover = in_array($currentUser['id'], array_values(LEAVE_APPROVERS), true);
    if ($isApprover) {
        $rows = $database->query('SELECT * FROM leave_requests ORDER BY created_at DESC LIMIT 200')->fetchAll();
    } else {
        $statement = $database->prepare('SELECT * FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 200');
        $statement->execute([$currentUser['id']]);
        $rows = $statement->fetchAll();
    }
    api_respond(['status' => 'success', 'data' => array_map('leave_payload', $rows)]);
}

require_method('POST');
require_csrf();
$input = json_body();
$action = (string) ($input['action'] ?? '');

if ($action === 'create') {
    foreach (['leaveType', 'startDate', 'endDate', 'reason'] as $field) {
        if (trim((string) ($input[$field] ?? '')) === '') api_error('กรุณากรอกข้อมูลใบลาให้ครบถ้วน', 422, 'validation_error');
    }
    $id = 'LR-' . date('Y') . '-' . strtoupper(bin2hex(random_bytes(3)));
    $statement = $database->prepare(
        'INSERT INTO leave_requests
         (id, user_id, user_name, user_position, department, organization, written_at, leave_type,
          other_leave_details, start_date, end_date, total_days, reason, contact_address, contact_phone,
          leave_stats, signature_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $statement->execute([
        $id, $currentUser['id'], $currentUser['name'], $currentUser['position'] ?? '', $currentUser['department'] ?? '',
        trim((string) ($input['organization'] ?? '')), trim((string) ($input['writtenAt'] ?? '')),
        $input['leaveType'], trim((string) ($input['otherLeaveDetails'] ?? '')) ?: null,
        $input['startDate'], $input['endDate'], max(1, (int) ($input['totalDays'] ?? 1)), trim((string) $input['reason']),
        trim((string) ($input['contactAddress'] ?? '')), trim((string) ($input['contactPhone'] ?? '')),
        json_encode($input['leaveStats'] ?? null, JSON_UNESCAPED_UNICODE), $input['signatureUrl'] ?? null,
    ]);
    $created = find_leave($database, $id);
    notify_leave_user($database, LEAVE_APPROVERS['admin_review'], 'มีใบลาใหม่รอตรวจสอบ', [
        'เลขที่' => $id, 'ผู้ยื่น' => $currentUser['name'], 'ประเภท' => $input['leaveType'],
        'วันที่' => $input['startDate'] . ' ถึง ' . $input['endDate'], 'จำนวน' => max(1, (int) ($input['totalDays'] ?? 1)) . ' วัน',
    ], $id);
    api_respond(['status' => 'success', 'data' => leave_payload($created)], 201);
}

if (in_array($action, ['review', 'approve_deputy', 'approve_director', 'reject'], true)) {
    $leave = find_leave($database, (string) ($input['leaveId'] ?? ''));
    $expectedStage = $action === 'review' ? 'admin_review' : ($action === 'approve_deputy' ? 'deputy_approval' : ($action === 'approve_director' ? 'director_approval' : (string) ($input['stage'] ?? '')));
    if (($leave['status'] ?? '') !== 'pending' || ($leave['current_stage'] ?? '') !== $expectedStage) api_error('สถานะใบลาถูกเปลี่ยนไปแล้ว', 409, 'stale_leave');
    if (($currentUser['id'] ?? '') !== (LEAVE_APPROVERS[$expectedStage] ?? '')) api_error('รายการนี้ไม่ใช่ขั้นตอนลงนามของคุณ', 403, 'forbidden');
    $review = json_encode([
        'approvedBy' => $currentUser['name'], 'approverRole' => $currentUser['position'] ?? '', 'date' => date('Y-m-d'),
        'comment' => trim((string) ($input['comment'] ?? '')), 'status' => $action === 'reject' ? 'rejected' : 'approved',
        'signatureUrl' => $input['signatureUrl'] ?? null,
    ], JSON_UNESCAPED_UNICODE);
    $column = $expectedStage === 'admin_review' ? 'admin_review' : ($expectedStage === 'deputy_approval' ? 'deputy_approval' : 'director_approval');
    if ($action === 'reject') {
        $sql = "UPDATE leave_requests SET $column = ?, status = 'rejected', current_stage = 'rejected' WHERE id = ? AND status = 'pending' AND current_stage = ?";
        $database->prepare($sql)->execute([$review, $leave['id'], $expectedStage]);
        notify_leave_user($database, (string) $leave['user_id'], 'ใบลาไม่ได้รับการอนุมัติ', [
            'เลขที่' => $leave['id'], 'ผู้ยื่น' => $leave['user_name'], 'ประเภท' => $leave['leave_type'],
            'จำนวน' => $leave['total_days'] . ' วัน', 'วันที่' => $leave['start_date'] . ' ถึง ' . $leave['end_date'],
            'ดำเนินการโดย' => $currentUser['name'],
        ], (string) $leave['id']);
    } else {
        $nextStage = $expectedStage === 'admin_review' ? 'deputy_approval' : ($expectedStage === 'deputy_approval' ? 'director_approval' : 'academic_substitute');
        $status = $expectedStage === 'director_approval' ? 'approved' : 'pending';
        $sql = "UPDATE leave_requests SET $column = ?, status = ?, current_stage = ? WHERE id = ? AND status = 'pending' AND current_stage = ?";
        $database->prepare($sql)->execute([$review, $status, $nextStage, $leave['id'], $expectedStage]);
        $recipient = $expectedStage === 'director_approval' ? (string) $leave['user_id'] : (string) LEAVE_APPROVERS[$nextStage];
        $title = $expectedStage === 'director_approval' ? 'ใบลาได้รับการอนุมัติแล้ว' : 'มีใบลารอลงนามขั้นถัดไป';
        notify_leave_user($database, $recipient, $title, [
            'เลขที่' => $leave['id'], 'ผู้ยื่น' => $leave['user_name'], 'ประเภท' => $leave['leave_type'],
            'จำนวน' => $leave['total_days'] . ' วัน', 'วันที่' => $leave['start_date'] . ' ถึง ' . $leave['end_date'],
            'ดำเนินการโดย' => $currentUser['name'],
        ], (string) $leave['id']);
    }
    api_respond(['status' => 'success', 'data' => leave_payload(find_leave($database, (string) $leave['id']))]);
}

api_error('ไม่รู้จักคำสั่งที่ร้องขอ', 400, 'unknown_action');
