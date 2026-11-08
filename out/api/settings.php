<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

$database = require_database();
$database->exec("CREATE TABLE IF NOT EXISTS system_settings (
  setting_key varchar(120) NOT NULL PRIMARY KEY,
  setting_json longtext NOT NULL,
  updated_by varchar(20) DEFAULT NULL,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'GET') {
    require_user();
    $rows = $database->query('SELECT setting_key, setting_json FROM system_settings')->fetchAll();
    $settings = [];
    foreach ($rows as $row) {
        $decoded = json_decode((string) $row['setting_json'], true);
        $settings[(string) $row['setting_key']] = $decoded ?? $row['setting_json'];
    }
    api_respond(['status' => 'success', 'data' => $settings]);
}

if ($method === 'POST') {
    $currentUser = require_roles('admin', 'director');
    require_csrf();
    $input = json_body();
    $key = trim((string) ($input['key'] ?? ''));
    if ($key === '' || !array_key_exists('value', $input)) {
        api_error('ข้อมูลการตั้งค่าไม่ครบถ้วน', 422, 'validation_error');
    }
    if ($key === 'school') {
        if (!is_array($input['value'])) {
            api_error('รูปแบบการตั้งค่าโรงเรียนไม่ถูกต้อง', 422, 'validation_error');
        }
        $year = trim((string) ($input['value']['year'] ?? ''));
        $semester = trim((string) ($input['value']['semester'] ?? ''));
        if (!preg_match('/^\d{4}$/', $year) || !in_array($semester, ['1', '2'], true)) {
            api_error('กรุณาระบุปีการศึกษา 4 หลักและภาคเรียนที่ 1 หรือ 2', 422, 'validation_error');
        }
    }
    $statement = $database->prepare(
        'INSERT INTO system_settings (setting_key, setting_json, updated_by) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE setting_json = VALUES(setting_json), updated_by = VALUES(updated_by)'
    );
    $statement->execute([$key, json_encode($input['value'], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), $currentUser['id']]);
    api_respond(['status' => 'success']);
}

api_error('ไม่รองรับวิธีการเรียกนี้', 405, 'method_not_allowed');
