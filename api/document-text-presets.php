<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

$database = require_database();
$userId = (string) require_user()['id'];
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'GET') {
    require_method('POST');
    require_csrf();
}

$database->exec("CREATE TABLE IF NOT EXISTS document_text_presets (
    user_id varbinary(64) NOT NULL,
    text_key char(64) CHARACTER SET ascii NOT NULL,
    preset_text varchar(500) NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, text_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

if ($method === 'POST') {
    $input = json_body();
    if (($input['action'] ?? '') === 'save' && is_string($input['text'] ?? null)) {
        $text = trim($input['text']);
        if ($text === '' || mb_strlen($text) > 500) {
            api_error('ข้อความต้องมีความยาว 1–500 ตัวอักษร', 422, 'invalid_preset_text');
        }
        $statement = $database->prepare('INSERT INTO document_text_presets (user_id, text_key, preset_text)
            VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE text_key = VALUES(text_key)');
        $statement->execute([$userId, hash('sha256', $text), $text]);
    } elseif (($input['action'] ?? '') === 'delete' && is_string($input['id'] ?? null)
        && preg_match('/^[a-f0-9]{64}$/D', $input['id'])) {
        $statement = $database->prepare('DELETE FROM document_text_presets WHERE user_id = ? AND text_key = ?');
        $statement->execute([$userId, $input['id']]);
    } else {
        api_error('ข้อมูลข้อความที่บันทึกไม่ถูกต้อง', 422, 'invalid_preset_action');
    }
}

$statement = $database->prepare('SELECT text_key AS id, preset_text AS text FROM document_text_presets
    WHERE user_id = ? ORDER BY created_at DESC, text_key');
$statement->execute([$userId]);
api_respond(['status' => 'success', 'data' => $statement->fetchAll(PDO::FETCH_ASSOC)]);
