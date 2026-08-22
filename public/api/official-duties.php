<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/line-notifier.php';

$database = require_database();
$currentUser = require_user();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$dutyApprovers = [
    // Legacy admin_review requests are migrated to the consolidated deputy step.
    'admin_review' => workflow_assignee('pipe-duty', 2, 'MMV04'),
    'deputy_approval' => workflow_assignee('pipe-duty', 2, 'MMV04'),
    'director_approval' => workflow_assignee('pipe-duty', 3, 'MMV01'),
];

const DUTY_ACADEMIC_MANAGER_IDS = ['MMV02'];

function duty_json(?string $value): ?array
{
    if (!$value) return null;
    $decoded = json_decode($value, true);
    return is_array($decoded) ? $decoded : null;
}

function duty_payload(array $row): array
{
    $payload = [
        'id' => (string) $row['id'], 'userId' => (string) $row['user_id'],
        'userName' => (string) $row['user_name'], 'userPosition' => (string) $row['user_position'],
        'department' => (string) $row['department'], 'title' => (string) $row['title'],
        'location' => (string) $row['location'], 'organizer' => (string) ($row['organizer'] ?? ''),
        'startDate' => (string) $row['start_date'], 'endDate' => (string) $row['end_date'],
        'totalDays' => (int) $row['total_days'], 'participants' => duty_json($row['participants'] ?? null) ?? [],
        'vehicleType' => (string) $row['vehicle_type'], 'budgetType' => (string) $row['budget_type'],
        'budgetAmount' => (float) $row['budget_amount'], 'status' => (string) $row['status'],
        'currentStage' => (string) $row['current_stage'],
        'forwardedToAcademic' => (bool) $row['forwarded_to_academic'],
        'substituteScheduled' => (bool) $row['substitute_scheduled'],
        'createdAt' => substr((string) $row['created_at'], 0, 10),
    ];
    foreach ([
        'vehicle_id' => 'vehicleId', 'vehicle_name' => 'vehicleName', 'license_plate' => 'licensePlate',
        'driver_name' => 'driverName', 'supervisor_name' => 'supervisorName',
        'personal_license_plate' => 'personalLicensePlate', 'budget_custom_text' => 'budgetCustomText',
        'signature_url' => 'signatureUrl',
    ] as $column => $key) {
        if (!empty($row[$column])) $payload[$key] = (string) $row[$column];
    }
    foreach ([
        'admin_review' => 'adminReview', 'deputy_approval' => 'deputyApproval',
        'director_approval' => 'directorApproval',
    ] as $column => $key) {
        $value = duty_json($row[$column] ?? null);
        if ($value !== null) $payload[$key] = $value;
    }
    return $payload;
}

function find_duty(PDO $database, string $id): array
{
    $statement = $database->prepare('SELECT * FROM official_duty_requests WHERE id = ? LIMIT 1');
    $statement->execute([$id]);
    $row = $statement->fetch();
    if (!$row) api_error('ไม่พบคำขอไปราชการ', 404, 'duty_not_found');
    return $row;
}

function duty_web_notification(PDO $database, string $userId, string $title, array $fields, string $relatedId): void
{
    if ($userId === '') return;
    $parts = [];
    foreach ($fields as $label => $value) $parts[] = $label . ': ' . $value;
    $statement = $database->prepare(
        'INSERT INTO notifications (user_id, title, message, module, related_id) VALUES (?, ?, ?, ?, ?)'
    );
    $statement->execute([$userId, $title, implode(' • ', $parts), 'official_duty', $relatedId]);
}

function duty_role_user_ids(PDO $database, array $roles): array
{
    $placeholders = implode(',', array_fill(0, count($roles), '?'));
    $statement = $database->prepare("SELECT id FROM users WHERE status = 'active' AND role IN ($placeholders)");
    $statement->execute($roles);
    return array_values(array_unique(array_map(static fn(array $row): string => (string) $row['id'], $statement->fetchAll())));
}

function notify_duty_users(PDO $database, array $userIds, string $title, array $fields, string $relatedId): void
{
    $userIds = array_values(array_unique(array_filter($userIds)));
    if ($userIds) {
        $placeholders = implode(',', array_fill(0, count($userIds), '?'));
        $statement = $database->prepare("SELECT id FROM users WHERE status = 'active' AND id IN ($placeholders)");
        $statement->execute($userIds);
        $userIds = array_map(static fn(array $row): string => (string) $row['id'], $statement->fetchAll());
    }
    foreach ($userIds as $userId) duty_web_notification($database, $userId, $title, $fields, $relatedId);
    line_notify_linked_users($database, $userIds, $title, $fields);
}

if ($method === 'GET') {
    if (($currentUser['role'] ?? '') === 'admin') {
        $rows = $database->query('SELECT * FROM official_duty_requests ORDER BY created_at DESC')->fetchAll();
    } else {
        $conditions = ['user_id = ?', 'user_name = ?'];
        $parameters = [$currentUser['id'], $currentUser['name']];
        $assignedStages = array_keys(array_filter(
            $dutyApprovers,
            static fn(string $userId): bool => $userId === (string) $currentUser['id']
        ));
        if ($assignedStages) {
            // ผู้รับผิดชอบตาม Pipeline ต้องเห็นประวัติไปราชการทั้งระบบ
            $conditions = ['1 = 1'];
            $parameters = [];
        }
        if (in_array((string) $currentUser['id'], DUTY_ACADEMIC_MANAGER_IDS, true)
            || ($currentUser['role'] ?? '') === 'academic_affairs') {
            $conditions[] = "(current_stage = 'academic_substitute' AND forwarded_to_academic = 1 AND substitute_scheduled = 0)";
        }
        $statement = $database->prepare(
            'SELECT * FROM official_duty_requests WHERE ' . implode(' OR ', $conditions) .
            ' ORDER BY created_at DESC'
        );
        $statement->execute($parameters);
        $rows = $statement->fetchAll();
    }
    api_respond(['status' => 'success', 'data' => array_map('duty_payload', $rows)]);
}

require_method('POST');
require_csrf();
$input = json_body();
$action = (string) ($input['action'] ?? '');

if ($action === 'create') {
    foreach (['title', 'location', 'startDate', 'endDate', 'vehicleType', 'budgetType', 'signatureUrl'] as $field) {
        if (trim((string) ($input[$field] ?? '')) === '') {
            api_error('กรุณากรอกข้อมูลและลงลายมือชื่อให้ครบถ้วน', 422, 'validation_error');
        }
    }
    $budgetType = (string) $input['budgetType'];
    $budgetText = $budgetType === 'none' ? null : (trim((string) ($input['budgetCustomText'] ?? '')) ?: null);
    if ($budgetType !== 'none' && $budgetText === null) {
        api_error('กรุณาระบุแหล่งงบประมาณ', 422, 'validation_error');
    }

    $id = 'OD-' . date('Y') . '-' . strtoupper(bin2hex(random_bytes(3)));
    $statement = $database->prepare(
        'INSERT INTO official_duty_requests
         (id, user_id, user_name, user_position, department, title, location, organizer,
          start_date, end_date, total_days, participants, vehicle_type, vehicle_id, vehicle_name,
          license_plate, driver_name, supervisor_name, personal_license_plate, budget_type,
          budget_amount, budget_custom_text, signature_url, current_stage)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $statement->execute([
        $id, $currentUser['id'], $currentUser['name'], $currentUser['position'] ?? '',
        $currentUser['department'] ?? '', trim((string) $input['title']), trim((string) $input['location']),
        trim((string) ($input['organizer'] ?? '')), $input['startDate'], $input['endDate'],
        max(1, (int) ($input['totalDays'] ?? 1)),
        json_encode($input['participants'] ?? [], JSON_UNESCAPED_UNICODE), $input['vehicleType'],
        $input['vehicleId'] ?? null, $input['vehicleName'] ?? null, $input['licensePlate'] ?? null,
        $input['driverName'] ?? null, $input['supervisorName'] ?? null, $input['personalLicensePlate'] ?? null,
        $budgetType, $budgetType === 'none' ? 0 : max(0, (float) ($input['budgetAmount'] ?? 0)),
        $budgetText, $input['signatureUrl'], 'deputy_approval',
    ]);

    $fields = [
        'เลขที่' => $id, 'ผู้ยื่น' => $currentUser['name'], 'เรื่อง' => $input['title'],
        'สถานที่' => $input['location'], 'วันที่' => $input['startDate'] . ' ถึง ' . $input['endDate'],
    ];
    $recipients = [$dutyApprovers['deputy_approval']];
    notify_duty_users($database, $recipients, 'มีคำขอไปราชการใหม่รอตรวจสอบและเสนอความเห็น', $fields, $id);
    api_respond(['status' => 'success', 'data' => duty_payload(find_duty($database, $id))], 201);
}

if (in_array($action, ['review', 'approve_deputy', 'approve_director', 'reject'], true)) {
    $id = (string) ($input['dutyId'] ?? '');
    $duty = find_duty($database, $id);
    $expectedStage = $action === 'review' ? 'admin_review'
        : ($action === 'approve_deputy' ? 'deputy_approval'
        : ($action === 'approve_director' ? 'director_approval' : (string) ($input['stage'] ?? '')));
    if ((string) $duty['status'] !== 'pending' || (string) $duty['current_stage'] !== $expectedStage) {
        api_error('ขั้นตอนของคำขอนี้เปลี่ยนไปแล้ว กรุณารีเฟรชข้อมูล', 409, 'stage_conflict');
    }
    if ((string) $currentUser['id'] !== ($dutyApprovers[$expectedStage] ?? '')) {
        api_error('รายการนี้ไม่ใช่ขั้นตอนลงนามของคุณ', 403, 'forbidden');
    }
    $signatureUrl = trim((string) ($input['signatureUrl'] ?? ''));
    if ($signatureUrl === '') api_error('กรุณาลงลายมือชื่อก่อนบันทึกผล', 422, 'signature_required');
    $approval = [
        'approvedBy' => $currentUser['name'], 'approverRole' => $currentUser['position'] ?? '',
        'date' => date('Y-m-d'), 'comment' => trim((string) ($input['comment'] ?? '')),
        'status' => $action === 'reject' ? 'rejected' : 'approved', 'signatureUrl' => $signatureUrl,
    ];
    $column = $expectedStage === 'admin_review' ? 'admin_review'
        : ($expectedStage === 'deputy_approval' ? 'deputy_approval' : 'director_approval');

    if ($action === 'reject') {
        $statement = $database->prepare("UPDATE official_duty_requests SET $column = ?, status = 'rejected', current_stage = 'rejected' WHERE id = ?");
        $statement->execute([json_encode($approval, JSON_UNESCAPED_UNICODE), $id]);
        notify_duty_users($database, [(string) $duty['user_id']], 'คำขอไปราชการไม่ได้รับการอนุมัติ', [
            'เลขที่' => $id, 'เรื่อง' => $duty['title'], 'พิจารณาโดย' => $currentUser['name'],
            'เหตุผล' => $approval['comment'] ?: 'ไม่อนุมัติ/ส่งคืนแก้ไข',
        ], $id);
    } else {
        $nextStage = $action === 'review' ? 'deputy_approval'
            : ($action === 'approve_deputy' ? 'director_approval' : 'academic_substitute');
        $status = $action === 'approve_director' ? 'approved' : 'pending';
        $forwarded = $action === 'approve_director' ? 1 : 0;
        $statement = $database->prepare(
            "UPDATE official_duty_requests SET $column = ?, current_stage = ?, status = ?, forwarded_to_academic = ? WHERE id = ?"
        );
        $statement->execute([json_encode($approval, JSON_UNESCAPED_UNICODE), $nextStage, $status, $forwarded, $id]);

        if ($action === 'review') {
            $recipients = [$dutyApprovers['deputy_approval']];
            $title = 'มีคำขอไปราชการรอพิจารณา';
        } elseif ($action === 'approve_deputy') {
            $recipients = [$dutyApprovers['director_approval']];
            $title = 'มีคำขอไปราชการรออนุมัติ';
        } else {
            $recipients = array_merge([(string) $duty['user_id']], duty_role_user_ids($database, ['academic_affairs']));
            $title = 'คำขอไปราชการได้รับการอนุมัติแล้ว';
        }
        notify_duty_users($database, $recipients, $title, [
            'เลขที่' => $id, 'ผู้ยื่น' => $duty['user_name'], 'เรื่อง' => $duty['title'],
            'วันที่' => $duty['start_date'] . ' ถึง ' . $duty['end_date'], 'ดำเนินการโดย' => $currentUser['name'],
        ], $id);
    }
    api_respond(['status' => 'success', 'data' => duty_payload(find_duty($database, $id))]);
}

api_error('ไม่รู้จักคำสั่งที่ร้องขอ', 400, 'unknown_action');
