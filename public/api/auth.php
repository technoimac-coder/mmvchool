<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'GET') {
    $user = !empty($_SESSION['user']['id']) ? require_user(true) : null;
    $authenticated = is_array($user) && empty($user['mustChangePassword']);
    api_respond([
        'status' => 'success',
        'authenticated' => $authenticated,
        'user' => $authenticated ? $user : null,
        'passwordChangeRequired' => is_array($user) && !empty($user['mustChangePassword']),
        'csrfToken' => csrf_token(),
    ]);
}

require_method('POST');
$input = json_body();
$action = (string) ($input['action'] ?? 'login');

if ($action === 'login') {
    $citizenId = preg_replace('/\D/', '', (string) ($input['citizenId'] ?? ''));
    $password = (string) ($input['password'] ?? '');
    if (!in_array(strlen($citizenId), [12, 13], true) || $password === '' || strlen($password) > 200) {
        api_error('ข้อมูลเข้าสู่ระบบไม่ถูกต้อง', 422, 'invalid_credentials');
    }

    $attempts = $_SESSION['login_attempts'] ?? ['count' => 0, 'startedAt' => time()];
    if ((time() - (int) $attempts['startedAt']) > 900) {
        $attempts = ['count' => 0, 'startedAt' => time()];
    }
    if ((int) $attempts['count'] >= 5) {
        api_error('เข้าสู่ระบบผิดพลาดหลายครั้ง กรุณารอ 15 นาที', 429, 'too_many_attempts');
    }

    $database = require_database();
    $statement = $database->prepare(
        "SELECT id, name, position, academic_position, department, role, email, phone, avatar,
                organization, personnel_type, assigned_duties, password_hash, must_change_password
         FROM users
         WHERE REPLACE(REPLACE(citizen_id, '-', ''), ' ', '') = ?
           AND status = 'active'
         LIMIT 1"
    );
    $statement->execute([$citizenId]);
    $row = $statement->fetch();

    if (!$row || empty($row['password_hash']) || !password_verify($password, $row['password_hash'])) {
        $attempts['count'] = (int) $attempts['count'] + 1;
        $_SESSION['login_attempts'] = $attempts;
        api_error('เลขประจำตัวประชาชนหรือรหัสผ่านไม่ถูกต้อง', 401, 'invalid_credentials');
    }

    session_regenerate_id(true);
    unset($_SESSION['login_attempts']);
    $_SESSION['user'] = public_user($row);
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    $database->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?')->execute([$row['id']]);

    api_respond([
        'status' => 'success',
        'user' => $_SESSION['user'],
        'csrfToken' => $_SESSION['csrf_token'],
        'mustChangePassword' => (bool) $row['must_change_password'],
    ]);
}

if ($action === 'change_password') {
    $user = require_user(true);
    require_csrf();
    $newPassword = (string) ($input['newPassword'] ?? '');
    $confirmPassword = (string) ($input['confirmPassword'] ?? '');

    if (strlen($newPassword) < 6 || strlen($newPassword) > 200) {
        api_error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 422, 'weak_password');
    }
    if (!hash_equals($newPassword, $confirmPassword)) {
        api_error('รหัสผ่านยืนยันไม่ตรงกัน', 422, 'password_mismatch');
    }

    $database = require_database();
    $statement = $database->prepare(
        'UPDATE users SET password_hash = ?, must_change_password = 0, password_changed_at = NOW() WHERE id = ?'
    );
    $statement->execute([password_hash($newPassword, PASSWORD_DEFAULT), $user['id']]);
    $_SESSION['user']['mustChangePassword'] = false;
    session_regenerate_id(true);

    api_respond(['status' => 'success', 'user' => $_SESSION['user'], 'csrfToken' => csrf_token()]);
}

if ($action === 'logout') {
    require_csrf();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $params['path'],
            'secure' => $params['secure'],
            'httponly' => $params['httponly'],
            'samesite' => $params['samesite'] ?? 'Strict',
        ]);
    }
    session_destroy();
    api_respond(['status' => 'success']);
}

api_error('ไม่รู้จักคำสั่งที่ร้องขอ', 400, 'unknown_action');
