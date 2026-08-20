<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

$admin = require_roles('admin', 'director');
$database = require_database();
$fields = 'id, name, position, academic_position, department, role, email, phone, avatar, organization,
           personnel_type, assigned_duties, must_change_password';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    $rows = $database->query("SELECT {$fields} FROM users WHERE status = 'active' ORDER BY id")->fetchAll();
    api_respond(['status' => 'success', 'data' => array_map('public_user', $rows)]);
}

require_method('POST');
require_csrf();
$input = json_body();
$action = (string) ($input['action'] ?? '');
$userId = (string) ($input['userId'] ?? '');
if ($userId === '') {
    api_error('ไม่พบรหัสผู้ใช้', 422, 'validation_error');
}

if ($action === 'reset_password') {
    $temporaryPassword = 'Mmv-' . bin2hex(random_bytes(5)) . '9';
    $statement = $database->prepare(
        "UPDATE users SET password_hash = ?, must_change_password = 1, password_changed_at = NULL
         WHERE id = ? AND status = 'active'"
    );
    $statement->execute([password_hash($temporaryPassword, PASSWORD_DEFAULT), $userId]);
    if ($statement->rowCount() !== 1) {
        api_error('ไม่พบผู้ใช้', 404, 'user_not_found');
    }
    api_respond(['status' => 'success', 'temporaryPassword' => $temporaryPassword]);
}

if ($action === 'set_role') {
    if ($userId === ($admin['id'] ?? '')) {
        api_error('ไม่สามารถเปลี่ยนสิทธิ์ของบัญชีที่กำลังใช้งาน', 422, 'cannot_change_self');
    }
    $allowedRoles = [
        'teacher', 'head', 'deputy_personnel', 'deputy_budget', 'director',
        'academic_affairs', 'technician', 'driver', 'admin',
    ];
    $role = (string) ($input['role'] ?? '');
    if (!in_array($role, $allowedRoles, true)) {
        api_error('บทบาทผู้ใช้ไม่ถูกต้อง', 422, 'invalid_role');
    }
    $statement = $database->prepare("UPDATE users SET role = ? WHERE id = ? AND status = 'active'");
    $statement->execute([$role, $userId]);
    if ($statement->rowCount() !== 1) {
        api_error('ไม่พบผู้ใช้หรือบทบาทไม่เปลี่ยนแปลง', 404, 'user_not_found');
    }
    api_respond(['status' => 'success']);
}

if ($action === 'update_profile') {
    $citizenId = preg_replace('/\D/', '', (string) ($input['citizenId'] ?? ''));
    if ($citizenId !== '' && !in_array(strlen($citizenId), [12, 13], true)) {
        api_error('รหัสประจำตัวต้องมี 12 หรือ 13 หลัก', 422, 'invalid_citizen_id');
    }
    $statement = $database->prepare(
        'UPDATE users SET name = ?, position = ?, department = ?, email = ?, phone = ?, citizen_id = COALESCE(NULLIF(?, \'\'), citizen_id)
         WHERE id = ? AND status = \'active\''
    );
    try {
        $statement->execute([
            trim((string) ($input['name'] ?? '')),
            trim((string) ($input['position'] ?? '')),
            trim((string) ($input['department'] ?? '')),
            trim((string) ($input['email'] ?? '')),
            trim((string) ($input['phone'] ?? '')),
            $citizenId,
            $userId,
        ]);
    } catch (PDOException $exception) {
        api_error('เลขประจำตัวประชาชนนี้ถูกใช้งานแล้ว', 409, 'citizen_id_conflict');
    }
    $fetch = $database->prepare("SELECT {$fields} FROM users WHERE id = ? LIMIT 1");
    $fetch->execute([$userId]);
    $row = $fetch->fetch();
    if (!$row) api_error('ไม่พบผู้ใช้', 404, 'user_not_found');
    api_respond(['status' => 'success', 'user' => public_user($row)]);
}

api_error('ไม่รู้จักคำสั่งที่ร้องขอ', 400, 'unknown_action');
