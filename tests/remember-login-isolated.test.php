<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') exit(1);
ob_start();
session_start();
$isHttps = true;
function public_user(array $row): array { return ['id'=>$row['id'], 'name'=>$row['name']]; }
require_once __DIR__ . '/../api/remember-login.php';
function check_remember(bool $value, string $label): void { if (!$value) throw new RuntimeException($label); }
$db = new PDO('mysql:host=127.0.0.1;port=43317;charset=utf8mb4', 'root', '', [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES=>false]);
$name = 'mmv_remember_test_' . bin2hex(random_bytes(4));
$db->exec("CREATE DATABASE {$name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
try {
    $db->exec("USE {$name}");
    $db->exec("CREATE TABLE users(id varchar(20) PRIMARY KEY,name varchar(255),position varchar(255),academic_position varchar(255),department varchar(255),role varchar(50),email varchar(255),phone varchar(50),avatar text,organization varchar(255),personnel_type varchar(100),assigned_duties text,password_hash varchar(255),must_change_password tinyint,status varchar(20)) ENGINE=InnoDB");
    $hash = password_hash('synthetic password', PASSWORD_DEFAULT);
    $q = $db->prepare("INSERT INTO users(id,name,password_hash,must_change_password,status) VALUES('test','Test user',?,0,'active')"); $q->execute([$hash]);
    $cookie = remember_issue($db, ['id'=>'test','password_hash'=>$hash]);
    $parts = remember_parts($cookie); check_remember($parts !== null, 'Valid token format');
    $stored = $db->query('SELECT token_hash FROM remembered_logins')->fetchColumn();
    check_remember($stored === hash('sha256', $parts[1]) && $stored !== $parts[1], 'Verifier is hashed');
    $_SESSION = []; $_COOKIE[MMV_REMEMBER_COOKIE] = $cookie;
    check_remember(remember_restore($db) && ($_SESSION['user']['id'] ?? '') === 'test' && !empty($_SESSION['csrf_token']), 'Restore after session loss');
    $_SESSION = []; $_COOKIE[MMV_REMEMBER_COOKIE] = $parts[0] . ':' . str_repeat('0', 64);
    check_remember(!remember_restore($db) && empty($_SESSION['user']), 'Reject incorrect verifier');
    $_COOKIE[MMV_REMEMBER_COOKIE] = $cookie; $db->exec("UPDATE users SET status='inactive' WHERE id='test'");
    check_remember(!remember_restore($db), 'Reject inactive account');
    $db->exec("UPDATE users SET status='active', password_hash='changed' WHERE id='test'");
    check_remember(!remember_restore($db), 'Reject token after password reset');
    $q=$db->prepare("UPDATE users SET password_hash=? WHERE id='test'"); $q->execute([$hash]);
    $db->exec('UPDATE remembered_logins SET expires_at=DATE_SUB(NOW(), INTERVAL 1 SECOND)');
    check_remember(!remember_restore($db), 'Reject expired token');
    $db->exec('UPDATE remembered_logins SET expires_at=DATE_ADD(NOW(), INTERVAL 1 DAY)');
    remember_revoke_current($db);
    check_remember((int)$db->query('SELECT COUNT(*) FROM remembered_logins')->fetchColumn() === 0 && !remember_restore($db), 'Logout revokes token');
    echo "PASS: restore, hashed token, invalid token, disabled account, password reset, expiry and logout.\n";
} finally { $db->exec("DROP DATABASE {$name}"); }
