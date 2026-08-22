<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

$database = require_database();
$currentUser = require_user();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $statement = $database->prepare(
        'SELECT id, title, message, module, read_at, created_at
         FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
    );
    $statement->execute([$currentUser['id']]);
    $data = array_map(static fn(array $row): array => [
        'id' => (string) $row['id'],
        'title' => (string) $row['title'],
        'message' => (string) $row['message'],
        'module' => (string) $row['module'],
        'timestamp' => substr((string) $row['created_at'], 0, 16),
        'read' => !empty($row['read_at']),
    ], $statement->fetchAll());
    api_respond(['status' => 'success', 'data' => $data]);
}

require_method('POST');
require_csrf();
$input = json_body();
$action = (string) ($input['action'] ?? '');
if ($action === 'create') {
    $userIds = array_values(array_filter(array_map('strval', (array) ($input['userIds'] ?? []))));
    $title = trim((string) ($input['title'] ?? ''));
    $message = trim((string) ($input['message'] ?? ''));
    $module = trim((string) ($input['module'] ?? 'system'));
    if (!$userIds || $title === '' || $message === '') api_error('ข้อมูลแจ้งเตือนไม่ครบถ้วน', 422, 'validation_error');
    $statement = $database->prepare('INSERT INTO notifications (user_id, title, message, module, created_at) VALUES (?, ?, ?, ?, NOW())');
    foreach (array_unique($userIds) as $targetId) $statement->execute([$targetId, $title, $message, $module]);
    require_once __DIR__ . '/line-notifier.php';
    line_notify_linked_users($database, $userIds, $title, ['รายละเอียด' => $message]);
    api_respond(['status' => 'success']);
}
if (($input['action'] ?? '') !== 'mark_read') {
    api_error('ไม่รู้จักคำสั่งที่ร้องขอ', 400, 'unknown_action');
}
$statement = $database->prepare('UPDATE notifications SET read_at = COALESCE(read_at, NOW()) WHERE id = ? AND user_id = ?');
$statement->execute([(string) ($input['notificationId'] ?? ''), $currentUser['id']]);
api_respond(['status' => 'success']);
