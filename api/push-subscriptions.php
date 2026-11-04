<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/web-push.php';

$db = require_database();
$user = require_user();
web_push_install($db);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'GET') {
    $config = web_push_config($db);
    $query = $db->prepare('SELECT COUNT(*) FROM web_push_subscriptions WHERE user_id=? AND active=1');
    $query->execute([(string) $user['id']]);
    api_respond(['status'=>'success','publicKey'=>$config['public_key'],'subscribed'=>(int)$query->fetchColumn()>0]);
}
require_method('POST');
require_csrf();
$input = json_body();
$action = (string) ($input['action'] ?? 'subscribe');
if ($action === 'unsubscribe') {
    $endpoint = trim((string) ($input['endpoint'] ?? ''));
    if ($endpoint !== '') {
        $query = $db->prepare('UPDATE web_push_subscriptions SET active=0 WHERE user_id=? AND endpoint_hash=?');
        $query->execute([(string) $user['id'], hash('sha256', $endpoint)]);
    }
    api_respond(['status'=>'success']);
}
$subscription = (array) ($input['subscription'] ?? []);
$endpoint = trim((string) ($subscription['endpoint'] ?? ''));
$keys = (array) ($subscription['keys'] ?? []);
$p256dh = trim((string) ($keys['p256dh'] ?? ''));
$auth = trim((string) ($keys['auth'] ?? ''));
if (!str_starts_with($endpoint, 'https://') || $p256dh === '' || $auth === '') api_error('ข้อมูลอุปกรณ์สำหรับ Push ไม่ครบถ้วน', 422, 'invalid_push_subscription');
$host = strtolower((string) (parse_url($endpoint, PHP_URL_HOST) ?: ''));
$trustedPushHost = $host === 'fcm.googleapis.com'
    || str_ends_with($host, '.push.apple.com')
    || str_ends_with($host, '.services.mozilla.com');
if (!$trustedPushHost) api_error('ผู้ให้บริการ Push ของอุปกรณ์นี้ไม่ได้รับรอง', 422, 'untrusted_push_service');
if (strlen(web_push_b64url_decode($p256dh)) !== 65 || strlen(web_push_b64url_decode($auth)) < 16) api_error('กุญแจ Push ไม่ถูกต้อง', 422, 'invalid_push_keys');
$id = web_push_uuid();
$query = $db->prepare("INSERT INTO web_push_subscriptions (id,user_id,endpoint_hash,endpoint,p256dh,auth_secret,user_agent,active,created_at)
 VALUES (?,?,?,?,?,?,?,1,NOW()) ON DUPLICATE KEY UPDATE user_id=VALUES(user_id),endpoint=VALUES(endpoint),p256dh=VALUES(p256dh),auth_secret=VALUES(auth_secret),user_agent=VALUES(user_agent),active=1,created_at=NOW(),last_error=''");
$query->execute([$id,(string)$user['id'],hash('sha256',$endpoint),$endpoint,$p256dh,$auth,substr((string)($_SERVER['HTTP_USER_AGENT']??''),0,500)]);
api_respond(['status'=>'success']);
