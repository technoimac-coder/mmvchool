<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

$database = require_database();
$currentUser = require_user();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function line_account_status(PDO $database, string $userId): array
{
    $statement = $database->prepare(
        "SELECT linked_at FROM line_accounts WHERE user_id = ? AND status = 'active' LIMIT 1"
    );
    $statement->execute([$userId]);
    $linkedAt = $statement->fetchColumn();
    return [
        'linked' => $linkedAt !== false,
        'linkedAt' => $linkedAt !== false ? (string) $linkedAt : null,
    ];
}

if ($method === 'GET') {
    api_respond(['status' => 'success', 'lineAccount' => line_account_status($database, $currentUser['id'])]);
}

if ($method !== 'POST') {
    api_error('ไม่รองรับวิธีการเรียกนี้', 405, 'method_not_allowed');
}

require_csrf();
$input = json_body();
$action = (string) ($input['action'] ?? '');

if ($action === 'create_code') {
    $code = (string) random_int(10000000, 99999999);
    $codeHash = password_hash($code, PASSWORD_DEFAULT);
    $statement = $database->prepare(
        'INSERT INTO line_link_codes (user_id, code_hash, expires_at)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))
         ON DUPLICATE KEY UPDATE code_hash = VALUES(code_hash), expires_at = VALUES(expires_at), created_at = NOW()'
    );
    $statement->execute([$currentUser['id'], $codeHash]);
    api_respond([
        'status' => 'success',
        'code' => $code,
        'expiresInSeconds' => 600,
        'lineOaId' => '@162dxdae',
    ]);
}

if ($action === 'disconnect') {
    $database->beginTransaction();
    try {
        $database->prepare('DELETE FROM line_accounts WHERE user_id = ?')->execute([$currentUser['id']]);
        $database->prepare('DELETE FROM line_link_codes WHERE user_id = ?')->execute([$currentUser['id']]);
        $database->commit();
        api_respond(['status' => 'success']);
    } catch (Throwable $exception) {
        if ($database->inTransaction()) {
            $database->rollBack();
        }
        error_log('LINE account disconnect failed: ' . $exception->getMessage());
        api_error('ไม่สามารถยกเลิกการเชื่อมบัญชี LINE ได้', 500, 'line_disconnect_failed');
    }
}

api_error('ไม่รู้จักคำสั่งที่ร้องขอ', 400, 'unknown_action');
