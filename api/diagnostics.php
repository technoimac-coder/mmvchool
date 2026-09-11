<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/line-notifier.php';

$database = require_database();
$currentUser = require_roles('admin', 'director');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$requiredTables = [
    'users', 'vehicles', 'vehicle_bookings', 'meeting_rooms', 'room_bookings',
    'leave_requests', 'official_duty_requests', 'substitute_teachings',
    'repair_tickets', 'staff_portfolios', 'lesson_plans', 'notifications', 'approval_pipelines', 'system_settings',
    'line_accounts', 'line_link_codes',
];

if ($method === 'POST') {
    require_csrf();
    $input = json_body();
    if (($input['action'] ?? '') !== 'send_test') {
        api_error('ไม่รู้จักคำสั่งทดสอบ', 400, 'unknown_action');
    }
    $title = 'ทดสอบการแจ้งเตือน MMV Smart School';
    $fields = [
        'รายละเอียด' => 'ระบบบันทึกการแจ้งเตือนในเว็บและส่งต่อไปยัง LINE ของบัญชีนี้',
        'บัญชีผู้รับ' => $currentUser['name'], 'เวลา' => date('Y-m-d H:i:s'),
    ];
    $message = 'รายละเอียด: ระบบบันทึกการแจ้งเตือนในเว็บและส่งต่อไปยัง LINE ของบัญชีนี้';
    $database->prepare(
        'INSERT INTO notifications (user_id, title, message, module, related_id) VALUES (?, ?, ?, ?, ?)'
    )->execute([$currentUser['id'], $title, $message, 'system', 'diagnostic-test']);
    $lineSent = line_notify_linked_users($database, [(string) $currentUser['id']], $title, $fields);
    api_respond(['status' => 'success', 'webNotification' => true, 'lineNotification' => $lineSent]);
}

if ($method !== 'GET') api_error('ไม่รองรับวิธีการเรียกนี้', 405, 'method_not_allowed');

$placeholders = implode(',', array_fill(0, count($requiredTables), '?'));
$tableStatement = $database->prepare(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ($placeholders)"
);
$tableStatement->execute($requiredTables);
$presentTables = array_map('strval', $tableStatement->fetchAll(PDO::FETCH_COLUMN));
$missingTables = array_values(array_diff($requiredTables, $presentTables));

$assignees = [];
foreach (workflow_pipelines() as $pipeline) {
    foreach (($pipeline['steps'] ?? []) as $step) {
        $userId = trim((string) ($step['assignedUserId'] ?? ''));
        if ($userId !== '') $assignees[$userId] = true;
    }
}
$recipientRows = [];
if ($assignees) {
    $ids = array_keys($assignees);
    $recipientPlaceholders = implode(',', array_fill(0, count($ids), '?'));
    $recipientStatement = $database->prepare(
        "SELECT u.id, u.name, u.status,
                CASE WHEN la.line_user_id IS NULL THEN 0 ELSE 1 END AS line_linked
         FROM users u LEFT JOIN line_accounts la ON la.user_id = u.id AND la.status = 'active'
         WHERE u.id IN ($recipientPlaceholders) ORDER BY u.id"
    );
    $recipientStatement->execute($ids);
    $recipientRows = $recipientStatement->fetchAll();
}

$recentNotifications = (int) $database->query(
    "SELECT COUNT(*) FROM notifications WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
)->fetchColumn();
$lineStatus = line_notification_status();
$invalidRecipients = array_values(array_filter($recipientRows, static fn(array $row): bool => $row['status'] !== 'active'));

api_respond([
    'status' => 'success',
    'ready' => !$missingTables && !$invalidRecipients && $lineStatus['enabled'],
    'database' => ['missingTables' => $missingTables, 'recentNotifications' => $recentNotifications],
    'line' => $lineStatus,
    'workflowRecipients' => $recipientRows,
    'invalidRecipients' => $invalidRecipients,
]);
