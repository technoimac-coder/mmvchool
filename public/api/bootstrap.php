<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');

$requestOrigin = rtrim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''), '/');
$configuredOrigin = rtrim((string) (getenv('MMV_ALLOWED_ORIGIN') ?: ''), '/');
$requestHost = (string) ($_SERVER['HTTP_HOST'] ?? '');
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
$sameOrigin = ($isHttps ? 'https://' : 'http://') . $requestHost;

if ($requestOrigin !== '') {
    $allowed = hash_equals($sameOrigin, $requestOrigin)
        || ($configuredOrigin !== '' && hash_equals($configuredOrigin, $requestOrigin));
    if (!$allowed) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'code' => 'origin_not_allowed'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    header('Access-Control-Allow-Origin: ' . $requestOrigin);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
    http_response_code(204);
    exit;
}

session_name('MMVSESSID');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => $isHttps,
    'httponly' => true,
    'samesite' => 'Strict',
]);
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

function api_respond(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function api_error(string $message, int $status, string $code): never
{
    api_respond(['status' => 'error', 'code' => $code, 'message' => $message], $status);
}

function require_method(string ...$allowed): void
{
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($method, $allowed, true)) {
        header('Allow: ' . implode(', ', $allowed));
        api_error('ไม่รองรับวิธีการเรียกนี้', 405, 'method_not_allowed');
    }
}

function json_body(): array
{
    $data = json_decode(file_get_contents('php://input') ?: '{}', true);
    if (!is_array($data) || json_last_error() !== JSON_ERROR_NONE) {
        api_error('ข้อมูล JSON ไม่ถูกต้อง', 400, 'invalid_json');
    }
    return $data;
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return (string) $_SESSION['csrf_token'];
}

function require_csrf(): void
{
    $provided = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    $expected = (string) ($_SESSION['csrf_token'] ?? '');
    if ($provided === '' || $expected === '' || !hash_equals($expected, $provided)) {
        api_error('CSRF token ไม่ถูกต้อง', 403, 'invalid_csrf');
    }
}

function require_user(bool $allowPasswordChange = false): array
{
    $user = $_SESSION['user'] ?? null;
    if (!is_array($user) || empty($user['id'])) {
        api_error('กรุณาเข้าสู่ระบบ', 401, 'unauthenticated');
    }

    global $pdo;
    if ($pdo instanceof PDO) {
        $statement = $pdo->prepare(
            "SELECT id, name, position, academic_position, department, role, email, phone, avatar,
                    organization, personnel_type, assigned_duties, must_change_password
             FROM users WHERE id = ? AND status = 'active' LIMIT 1"
        );
        $statement->execute([$user['id']]);
        $fresh = $statement->fetch();
        if (!$fresh) {
            $_SESSION = [];
            session_destroy();
            api_error('บัญชีนี้ไม่พร้อมใช้งาน', 401, 'account_unavailable');
        }
        $user = public_user($fresh);
        $_SESSION['user'] = $user;
    }

    if (!$allowPasswordChange && !empty($user['mustChangePassword'])) {
        api_error('กรุณาเปลี่ยนรหัสผ่านก่อนใช้งานระบบ', 403, 'password_change_required');
    }
    return $user;
}

function require_roles(string ...$roles): array
{
    $user = require_user();
    if (!in_array($user['role'] ?? '', $roles, true)) {
        api_error('คุณไม่มีสิทธิ์ดำเนินการนี้', 403, 'forbidden');
    }
    return $user;
}

function public_user(array $row, bool $includeSensitive = false): array
{
    $assignments = json_decode((string) ($row['assigned_duties'] ?? '[]'), true);
    $user = [
        'id' => (string) $row['id'],
        'name' => (string) $row['name'],
        'position' => (string) ($row['position'] ?? ''),
        'academicPosition' => (string) ($row['academic_position'] ?? ''),
        'department' => (string) ($row['department'] ?? ''),
        'role' => (string) ($row['role'] ?? 'teacher'),
        'avatar' => (string) ($row['avatar'] ?? ''),
        'photoUrl' => (string) ($row['photo_url'] ?? ''),
        'email' => (string) ($row['email'] ?? ''),
        'phone' => (string) ($row['phone'] ?? ''),
        'organization' => (string) ($row['organization'] ?? ''),
        'personnelType' => (string) ($row['personnel_type'] ?? ''),
        'assignments' => is_array($assignments) ? $assignments : [],
        'mustChangePassword' => (bool) ($row['must_change_password'] ?? false),
        'leaveQuota' => ['sick' => 30, 'personal' => 10],
        'leaveUsed' => ['sick' => 0, 'personal' => 0],
        'leaveCount' => ['sick' => 0, 'personal' => 0],
    ];
    if ($includeSensitive) {
        $user['citizenId'] = (string) ($row['citizen_id'] ?? '');
    }
    return $user;
}
