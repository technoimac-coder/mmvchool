<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/line-notifier.php';

$database = require_database();
$currentUser = require_user();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Additive migration for deployments that already have the leave table.
try { $database->exec("ALTER TABLE leave_requests ADD COLUMN attachments longtext NULL"); } catch (Throwable $ignored) { /* column already exists */ }
try { $database->exec("ALTER TABLE leave_requests ADD COLUMN academic_year varchar(10) NULL"); } catch (Throwable $ignored) { /* column already exists */ }
try { $database->exec("ALTER TABLE leave_requests ADD COLUMN semester varchar(1) NULL"); } catch (Throwable $ignored) { /* column already exists */ }
$database->exec("UPDATE leave_requests SET academic_year = CASE WHEN MONTH(created_at) < 5 THEN YEAR(created_at) + 542 ELSE YEAR(created_at) + 543 END, semester = CASE WHEN MONTH(created_at) BETWEEN 5 AND 10 THEN '1' ELSE '2' END WHERE academic_year IS NULL OR semester IS NULL");

$leaveApprovers = [
    'admin_review' => workflow_assignee('pipe-leave', 2, 'MMV14'),
    'deputy_approval' => workflow_assignee('pipe-leave', 3, 'MMV04'),
    'director_approval' => workflow_assignee('pipe-leave', 4, 'MMV01'),
];

const FOREIGN_LEAVE_REVIEWER_ID = 'MMV11';

function is_foreign_leave_request(PDO $database, array $leave): bool
{
    if (preg_match('/^(Mr|Mrs|Ms|Miss)\.?\s*/i', trim((string) ($leave['user_name'] ?? $leave['name'] ?? '')))) return true;
    $userId = (string) ($leave['user_id'] ?? $leave['id'] ?? '');
    if ($userId === '') return false;
    $statement = $database->prepare('SELECT personnel_type FROM users WHERE id = ? LIMIT 1');
    $statement->execute([$userId]);
    return (string) ($statement->fetchColumn() ?: '') === 'ครูต่างชาติ';
}

function leave_approver_for(PDO $database, array $approvers, string $stage, array $leave): string
{
    if ($stage === 'admin_review' && is_foreign_leave_request($database, $leave)) return FOREIGN_LEAVE_REVIEWER_ID;
    return (string) ($approvers[$stage] ?? '');
}

function can_view_all_leave_records(array $user, array $approvers): bool
{
    $executiveRoles = ['admin', 'director', 'deputy_personnel', 'deputy_budget', 'deputy_general'];
    return in_array((string) ($user['role'] ?? ''), $executiveRoles, true)
        || in_array((string) ($user['id'] ?? ''), array_values($approvers), true);
}

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
        'academicYear' => (string) ($row['academic_year'] ?? ''), 'semester' => (string) ($row['semester'] ?? ''),
    ];
    if (!empty($row['attachments'])) {
        $attachments = json_decode((string) $row['attachments'], true);
        if (is_array($attachments)) $payload['attachments'] = $attachments;
    }
    foreach (['other_leave_details' => 'otherLeaveDetails', 'signature_url' => 'signatureUrl'] as $column => $key) {
        if (!empty($row[$column])) $payload[$key] = (string) $row[$column];
    }
    foreach (['leave_stats' => 'leaveStats', 'admin_review' => 'adminReview', 'deputy_approval' => 'deputyApproval', 'director_approval' => 'directorApproval'] as $column => $key) {
        $value = leave_json($row[$column] ?? null);
        if ($value !== null) $payload[$key] = $value;
    }
    if (isset($row['_leave_summary']) && is_array($row['_leave_summary'])) {
        $payload['leaveSummary'] = $row['_leave_summary'];
    }
    if (isset($row['_last_leave']) && is_array($row['_last_leave'])) {
        $payload['lastLeave'] = $row['_last_leave'];
    }
    return $payload;
}

function enrich_leave_history(PDO $database, array $rows): array
{
    if (!$rows) return [];

    $userIds = array_values(array_unique(array_map(static fn(array $row): string => (string) $row['user_id'], $rows)));
    $idPlaceholders = implode(',', array_fill(0, count($userIds), '?'));
    $statement = $database->prepare(
        "SELECT id, user_id, user_name, leave_type, start_date, end_date, total_days, created_at
         FROM leave_requests
         WHERE status = 'approved'
           AND user_id IN ($idPlaceholders)
         ORDER BY created_at ASC, id ASC"
    );
    $statement->execute($userIds);
    $approvedRows = $statement->fetchAll();

    foreach ($rows as &$row) {
        $summary = [];
        foreach (['sick', 'personal', 'maternity'] as $type) {
            $summary[$type] = ['pastCount' => 0, 'pastDays' => 0];
        }

        $lastLeave = null;
        $rowCreatedAt = (string) $row['created_at'];
        $rowId = (string) $row['id'];
        foreach ($approvedRows as $approved) {
            $sameUser = (string) $approved['user_id'] === (string) $row['user_id'];
            if (!$sameUser) continue;

            $approvedId = (string) $approved['id'];
            $approvedCreatedAt = (string) $approved['created_at'];
            $isEarlier = $approvedCreatedAt < $rowCreatedAt
                || ($approvedCreatedAt === $rowCreatedAt && strcmp($approvedId, $rowId) < 0);
            if (!$isEarlier || $approvedId === $rowId) continue;

            $type = (string) $approved['leave_type'];
            if (isset($summary[$type])) {
                $summary[$type]['pastCount']++;
                $summary[$type]['pastDays'] += (int) $approved['total_days'];
            }
            $lastLeave = [
                'hasHistory' => true,
                'type' => $type,
                'startDate' => (string) $approved['start_date'],
                'endDate' => (string) $approved['end_date'],
                'days' => (int) $approved['total_days'],
            ];
        }

        foreach ($summary as $type => &$totals) {
            $isCurrentType = (string) $row['leave_type'] === $type;
            $totals['currentCount'] = $isCurrentType ? 1 : 0;
            $totals['currentDays'] = $isCurrentType ? (int) $row['total_days'] : 0;
            $totals['totalCount'] = $totals['pastCount'] + $totals['currentCount'];
            $totals['totalDays'] = $totals['pastDays'] + $totals['currentDays'];
        }
        unset($totals);

        $row['_leave_summary'] = $summary;
        if ($lastLeave !== null) $row['_last_leave'] = $lastLeave;
    }
    unset($row);

    return $rows;
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

function notify_leave_user(PDO $database, string $userId, string $title, array $fields, string $relatedId, bool $bilingual): void
{
    $displayTitle = $bilingual ? mmv_bilingual_notification_title($title) : $title;
    $displayFields = $bilingual ? mmv_bilingual_notification_fields($fields) : $fields;
    $message = $bilingual
        ? mmv_bilingual_notification_message($fields)
        : implode(' • ', array_map(
            static fn(string $label, mixed $value): string => $label . ': ' . (string) $value,
            array_keys($fields),
            array_values($fields)
        ));
    add_workflow_notification($database, $userId, $displayTitle, $message, $relatedId);
    line_notify_linked_users($database, [$userId], $displayTitle, $displayFields);
}

if ($method === 'GET') {
    if (can_view_all_leave_records($currentUser, $leaveApprovers)) {
        $rows = $database->query('SELECT * FROM leave_requests ORDER BY created_at DESC')->fetchAll();
    } elseif ((string) ($currentUser['id'] ?? '') === FOREIGN_LEAVE_REVIEWER_ID) {
        // The Head of English Program can inspect only their own requests and
        // requests submitted by foreign teachers, never unrelated personnel records.
        $statement = $database->prepare(
            "SELECT lr.* FROM leave_requests lr
             LEFT JOIN users u ON u.id = lr.user_id
             WHERE lr.user_id = ? OR u.personnel_type = 'ครูต่างชาติ'
                OR lr.user_name REGEXP '^(Mr|Mrs|Ms|Miss)\\.?[[:space:]]*'
             ORDER BY lr.created_at DESC"
        );
        $statement->execute([$currentUser['id']]);
        $rows = $statement->fetchAll();
    } else {
        // A personnel account can read only records tied to its immutable user ID.
        // Never fall back to a display name because names can change or be duplicated.
        $statement = $database->prepare(
            'SELECT * FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC'
        );
        $statement->execute([$currentUser['id']]);
        $rows = $statement->fetchAll();
    }
    $rows = enrich_leave_history($database, $rows);
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
    $period = current_academic_period($database);
    $statement = $database->prepare(
        'INSERT INTO leave_requests
         (id, user_id, user_name, user_position, department, organization, written_at, leave_type,
          other_leave_details, start_date, end_date, total_days, reason, contact_address, contact_phone,
          leave_stats, signature_url, attachments, academic_year, semester) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $statement->execute([
        $id, $currentUser['id'], $currentUser['name'], $currentUser['position'] ?? '', $currentUser['department'] ?? '',
        trim((string) ($input['organization'] ?? '')), trim((string) ($input['writtenAt'] ?? '')),
        $input['leaveType'], trim((string) ($input['otherLeaveDetails'] ?? '')) ?: null,
        $input['startDate'], $input['endDate'], max(1, (int) ($input['totalDays'] ?? 1)), trim((string) $input['reason']),
        trim((string) ($input['contactAddress'] ?? '')), trim((string) ($input['contactPhone'] ?? '')),
        json_encode($input['leaveStats'] ?? null, JSON_UNESCAPED_UNICODE), $input['signatureUrl'] ?? null,
        json_encode($input['attachments'] ?? [], JSON_UNESCAPED_UNICODE),
        $period['academicYear'], $period['semester'],
    ]);
    $created = find_leave($database, $id);
    $isForeignLeave = is_foreign_leave_request($database, $created);
    $firstReviewer = $isForeignLeave
        ? FOREIGN_LEAVE_REVIEWER_ID
        : $leaveApprovers['admin_review'];
    notify_leave_user($database, $firstReviewer, 'มีใบลาใหม่รอตรวจสอบ', [
        'เลขที่' => $id, 'ผู้ยื่น' => $currentUser['name'], 'ประเภท' => $input['leaveType'],
        'วันที่' => $input['startDate'] . ' ถึง ' . $input['endDate'], 'จำนวน' => max(1, (int) ($input['totalDays'] ?? 1)) . ' วัน',
    ], $id, $isForeignLeave);
    $enriched = enrich_leave_history($database, [$created]);
    api_respond(['status' => 'success', 'data' => leave_payload($enriched[0])], 201);
}

if (in_array($action, ['review', 'approve_deputy', 'approve_director', 'reject'], true)) {
    $leave = find_leave($database, (string) ($input['leaveId'] ?? ''));
    $expectedStage = $action === 'review' ? 'admin_review' : ($action === 'approve_deputy' ? 'deputy_approval' : ($action === 'approve_director' ? 'director_approval' : (string) ($input['stage'] ?? '')));
    if (($leave['status'] ?? '') !== 'pending' || ($leave['current_stage'] ?? '') !== $expectedStage) api_error('สถานะใบลาถูกเปลี่ยนไปแล้ว', 409, 'stale_leave');
    $expectedApprover = leave_approver_for($database, $leaveApprovers, $expectedStage, $leave);
    if (($currentUser['id'] ?? '') !== $expectedApprover) api_error('รายการนี้ไม่ใช่ขั้นตอนลงนามของคุณ', 403, 'forbidden');
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
        ], (string) $leave['id'], is_foreign_leave_request($database, $leave));
    } else {
        $nextStage = $expectedStage === 'admin_review' ? 'deputy_approval' : ($expectedStage === 'deputy_approval' ? 'director_approval' : 'academic_substitute');
        $status = $expectedStage === 'director_approval' ? 'approved' : 'pending';
        $sql = "UPDATE leave_requests SET $column = ?, status = ?, current_stage = ? WHERE id = ? AND status = 'pending' AND current_stage = ?";
        $database->prepare($sql)->execute([$review, $status, $nextStage, $leave['id'], $expectedStage]);
        $recipient = $expectedStage === 'director_approval' ? (string) $leave['user_id'] : (string) $leaveApprovers[$nextStage];
        $title = $expectedStage === 'director_approval' ? 'ใบลาได้รับการอนุมัติแล้ว' : 'มีใบลารอลงนามขั้นถัดไป';
        notify_leave_user($database, $recipient, $title, [
            'เลขที่' => $leave['id'], 'ผู้ยื่น' => $leave['user_name'], 'ประเภท' => $leave['leave_type'],
            'จำนวน' => $leave['total_days'] . ' วัน', 'วันที่' => $leave['start_date'] . ' ถึง ' . $leave['end_date'],
            'ดำเนินการโดย' => $currentUser['name'],
        ], (string) $leave['id'], is_foreign_leave_request($database, $leave));
    }
    $enriched = enrich_leave_history($database, [find_leave($database, (string) $leave['id'])]);
    api_respond(['status' => 'success', 'data' => leave_payload($enriched[0])]);
}

api_error('ไม่รู้จักคำสั่งที่ร้องขอ', 400, 'unknown_action');
