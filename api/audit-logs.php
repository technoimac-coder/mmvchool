<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

require_method('GET');
require_roles('admin', 'director');
$database = require_database();
ensure_audit_logs($database);

$limit = max(1, min(500, (int) ($_GET['limit'] ?? 200)));
$statement = $database->prepare(
    'SELECT id, user_id, user_name, action, details, event_type, created_at
     FROM audit_logs ORDER BY created_at DESC, id DESC LIMIT ?'
);
$statement->bindValue(1, $limit, PDO::PARAM_INT);
$statement->execute();

$rows = array_map(static function (array $row): array {
    return [
        'id' => (string) $row['id'],
        'userId' => (string) $row['user_id'],
        'user' => (string) $row['user_name'],
        'action' => (string) $row['action'],
        'details' => (string) $row['details'],
        'type' => (string) $row['event_type'],
        'createdAt' => date(DATE_ATOM, strtotime((string) $row['created_at'])),
    ];
}, $statement->fetchAll());

api_respond(['status' => 'success', 'data' => $rows]);
