<?php
declare(strict_types=1);

const MMV_REMEMBER_COOKIE = 'MMVREMEMBER';
const MMV_REMEMBER_SECONDS = 30 * 24 * 60 * 60;

function remember_cookie(string $value, int $expires): void
{
    global $isHttps;
    setcookie(MMV_REMEMBER_COOKIE, $value, ['expires'=>$expires, 'path'=>'/', 'secure'=>$isHttps, 'httponly'=>true, 'samesite'=>'Strict']);
}

function remember_install(PDO $db): void
{
    $db->exec("CREATE TABLE IF NOT EXISTS remembered_logins (
        selector char(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
        user_id varchar(20) NOT NULL,
        token_hash char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        password_hash_fingerprint char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        expires_at datetime NOT NULL,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX remembered_logins_user (user_id), INDEX remembered_logins_expiry (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function remember_parts(string $cookie): ?array
{
    if (!preg_match('/\A([a-f0-9]{24}):([a-f0-9]{64})\z/D', $cookie, $parts)) return null;
    return [$parts[1], $parts[2]];
}

function remember_revoke_current(PDO $db): void
{
    $parts = remember_parts((string) ($_COOKIE[MMV_REMEMBER_COOKIE] ?? ''));
    if ($parts) {
        $q = $db->prepare('DELETE FROM remembered_logins WHERE selector = ? AND token_hash = ?');
        $q->execute([$parts[0], hash('sha256', $parts[1])]);
    }
    remember_cookie('', time() - 3600);
}

function remember_issue(PDO $db, array $row): string
{
    remember_install($db);
    remember_revoke_current($db);
    $selector = bin2hex(random_bytes(12));
    $validator = bin2hex(random_bytes(32));
    $q = $db->prepare('INSERT INTO remembered_logins(selector,user_id,token_hash,password_hash_fingerprint,expires_at) VALUES(?,?,?,?,DATE_ADD(NOW(), INTERVAL 30 DAY))');
    $q->execute([$selector, (string)$row['id'], hash('sha256', $validator), hash('sha256', (string)$row['password_hash'])]);
    remember_cookie($selector . ':' . $validator, time() + MMV_REMEMBER_SECONDS);
    return $selector . ':' . $validator;
}

function remember_restore(PDO $db): bool
{
    $parts = remember_parts((string) ($_COOKIE[MMV_REMEMBER_COOKIE] ?? ''));
    if (!$parts) return false;
    $q = $db->prepare("SELECT r.token_hash,r.password_hash_fingerprint,u.id,u.name,u.position,u.academic_position,u.department,u.role,u.email,u.phone,u.avatar,u.organization,u.personnel_type,u.assigned_duties,u.password_hash,u.must_change_password FROM remembered_logins r JOIN users u ON u.id=r.user_id WHERE r.selector=? AND r.expires_at>NOW() AND u.status='active' LIMIT 1");
    $q->execute([$parts[0]]);
    $row = $q->fetch(PDO::FETCH_ASSOC);
    if (!$row || !hash_equals((string)$row['token_hash'], hash('sha256', $parts[1])) || !hash_equals((string)$row['password_hash_fingerprint'], hash('sha256', (string)$row['password_hash'])) || !empty($row['must_change_password'])) return false;
    session_regenerate_id(true);
    $_SESSION['user'] = public_user($row);
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    $_SESSION['remember_login'] = true;
    return true;
}
