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
    $GLOBALS['mmv_request_payload'] = $data;
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

function is_executive_role(array|string $userOrRole): bool
{
    $role = is_array($userOrRole) ? (string) ($userOrRole['role'] ?? '') : $userOrRole;
    if (in_array($role, ['director', 'deputy_personnel', 'deputy_budget', 'deputy_general'], true)) return true;
    $position = is_array($userOrRole) ? trim((string) ($userOrRole['position'] ?? '')) : '';
    return $position !== '' && str_contains($position, 'ผู้อำนวยการ');
}

function current_academic_period(PDO $database): array
{
    $month = (int) date('n');
    $fallbackYear = (int) date('Y') + 543 - ($month < 5 ? 1 : 0);
    $fallbackSemester = ($month >= 5 && $month <= 10) ? '1' : '2';
    try {
        $statement = $database->prepare("SELECT setting_json FROM system_settings WHERE setting_key = 'school' LIMIT 1");
        $statement->execute();
        $decoded = json_decode((string) ($statement->fetchColumn() ?: '{}'), true);
        $year = trim((string) ($decoded['year'] ?? ''));
        $semester = trim((string) ($decoded['semester'] ?? ''));
        return [
            'academicYear' => preg_match('/^\d{4}$/', $year) ? $year : (string) $fallbackYear,
            'semester' => in_array($semester, ['1', '2'], true) ? $semester : $fallbackSemester,
        ];
    } catch (Throwable $ignored) {
        return ['academicYear' => (string) $fallbackYear, 'semester' => $fallbackSemester];
    }
}

function ensure_audit_logs(PDO $database): void
{
    $database->exec("CREATE TABLE IF NOT EXISTS audit_logs (
        id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id varchar(20) NOT NULL,
        user_name varchar(255) NOT NULL,
        action varchar(120) NOT NULL,
        details varchar(500) NOT NULL DEFAULT '',
        event_type varchar(40) NOT NULL DEFAULT 'system',
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY audit_created_at (created_at),
        KEY audit_user_id (user_id),
        KEY audit_event_type (event_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function audit_event_metadata(string $script, string $action, array $payload): array
{
    $targetId = trim((string) ($payload['userId'] ?? $payload['leaveId'] ?? $payload['dutyId']
        ?? $payload['bookingId'] ?? $payload['repairId'] ?? $payload['lessonPlanId'] ?? $payload['id'] ?? ''));
    $target = $targetId !== '' ? ' รหัสรายการ ' . mb_substr($targetId, 0, 80, 'UTF-8') : '';
    $definitions = [
        'auth.php' => ['type' => 'security', 'labels' => ['login' => 'เข้าสู่ระบบ', 'change_password' => 'เปลี่ยนรหัสผ่าน']],
        'users.php' => ['type' => 'security', 'labels' => ['reset_password' => 'รีเซ็ตรหัสผ่านบุคลากร', 'set_role' => 'เปลี่ยนสิทธิ์บัญชีบุคลากร', 'delete' => 'ระงับบัญชีบุคลากร', 'bulk_update_photos' => 'อัปเดตรูปบุคลากร', 'update_profile' => 'เพิ่มหรือแก้ไขบัญชีบุคลากร']],
        'leaves.php' => ['type' => 'leave', 'labels' => ['create' => 'ยื่นใบลา', 'review' => 'ตรวจสอบใบลา', 'approve_deputy' => 'รองผู้อำนวยการอนุมัติใบลา', 'approve_director' => 'ผู้อำนวยการอนุมัติใบลา', 'reject' => 'ไม่อนุมัติใบลา']],
        'official-duties.php' => ['type' => 'official_duty', 'labels' => ['create' => 'ยื่นขออนุญาตไปราชการ', 'review' => 'ตรวจสอบคำขอไปราชการ', 'approve_deputy' => 'รองผู้อำนวยการอนุมัติไปราชการ', 'approve_director' => 'ผู้อำนวยการอนุมัติไปราชการ', 'reject' => 'ไม่อนุมัติไปราชการ']],
        'vehicles.php' => ['type' => 'vehicle', 'labels' => ['create' => 'ยื่นคำขอใช้รถ', 'review' => 'ตรวจสอบคำขอใช้รถ', 'allocate' => 'อนุมัติและจัดสรรรถ', 'driver_ack' => 'ผู้ขับรถรับทราบงาน', 'reject' => 'ไม่อนุมัติคำขอใช้รถ', 'save_fleet' => 'เพิ่มหรือแก้ไขข้อมูลรถ']],
        'rooms.php' => ['type' => 'room', 'labels' => ['create' => 'ยื่นคำขอใช้อาคารสถานที่', 'approve_deputy' => 'รองผู้อำนวยการอนุมัติใช้อาคาร', 'approve' => 'ผู้ดูแลยืนยันความพร้อมสถานที่', 'complete' => 'ปิดงานใช้อาคารสถานที่', 'reject' => 'ไม่อนุมัติคำขอใช้อาคาร', 'update_manager' => 'เปลี่ยนผู้ดูแลสถานที่', 'update_room' => 'แก้ไขข้อมูลสถานที่']],
        'repairs.php' => ['type' => 'repair', 'labels' => ['create' => 'แจ้งซ่อม', 'acknowledge_assign' => 'รับงานและมอบหมายงานซ่อม', 'technician_report' => 'บันทึกผลการซ่อม', 'confirm' => 'ผู้แจ้งยืนยันรับงานซ่อม', 'reject' => 'ยกเลิกรายการแจ้งซ่อม']],
        'substitutes.php' => ['type' => 'substitute', 'labels' => ['create_batch' => 'จัดตารางสอนแทน', 'acknowledge' => 'ครูสอนแทนรับทราบ', 'reject' => 'ครูสอนแทนปฏิเสธงาน', 'reassign' => 'เปลี่ยนครูผู้สอนแทน']],
        'document_workflows.php' => ['type' => 'document', 'labels' => ['create' => 'ส่งเอกสารลงนามออนไลน์', 'sign' => 'ลงนามเอกสารออนไลน์', 'reject' => 'ส่งเอกสารกลับแก้ไข']],
        'portfolios.php' => ['type' => 'portfolio', 'labels' => ['create' => 'บันทึกผลงานและรางวัล']],
        'lesson-plans.php' => ['type' => 'lesson_plan', 'labels' => ['create' => 'ส่งแผนการจัดการเรียนรู้', 'review' => 'ตรวจแผนการจัดการเรียนรู้']],
        'settings.php' => ['type' => 'security', 'labels' => ['update' => 'แก้ไขข้อมูลโรงเรียนและการตั้งค่าระบบ']],
        'pipelines.php' => ['type' => 'security', 'labels' => ['update' => 'แก้ไขลำดับและผู้รับผิดชอบการอนุมัติ']],
        'content.php' => ['type' => 'content', 'labels' => ['create_news' => 'เผยแพร่ข่าวประชาสัมพันธ์', 'create_order' => 'บันทึกคำสั่งโรงเรียน']],
    ];
    $definition = $definitions[$script] ?? ['type' => 'system', 'labels' => []];
    $label = $definition['labels'][$action] ?? ('ดำเนินการในระบบ ' . preg_replace('/\.php$/', '', $script));
    return [$label, 'ดำเนินการสำเร็จ' . $target, $definition['type']];
}

function register_audit_trail(): void
{
    register_shutdown_function(static function (): void {
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST' || http_response_code() >= 400) return;
        $script = basename((string) ($_SERVER['SCRIPT_NAME'] ?? ''));
        if ($script === 'audit-logs.php' || str_contains($script, '-cli.php')) return;
        $user = $_SESSION['user'] ?? null;
        if (!is_array($user) || empty($user['id'])) return;
        $payload = $GLOBALS['mmv_request_payload'] ?? $_POST;
        if (!is_array($payload)) $payload = [];
        $action = trim((string) ($payload['action'] ?? 'update'));
        if ($action === 'logout') return;
        global $pdo;
        if (!$pdo instanceof PDO) return;
        try {
            ensure_audit_logs($pdo);
            [$label, $details, $eventType] = audit_event_metadata($script, $action, $payload);
            $statement = $pdo->prepare('INSERT INTO audit_logs (user_id, user_name, action, details, event_type) VALUES (?, ?, ?, ?, ?)');
            $statement->execute([(string) $user['id'], (string) ($user['name'] ?? $user['id']), $label, $details, $eventType]);
        } catch (Throwable $exception) {
            error_log('Audit trail write failed: ' . $exception->getCode());
        }
    });
}

register_audit_trail();
