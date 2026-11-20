<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';
$database = require_database();
$user = require_user();
$database->exec("CREATE TABLE IF NOT EXISTS dashboard_quick_links (
  id varchar(64) NOT NULL PRIMARY KEY,
  title varchar(160) NOT NULL,
  url varchar(2048) NOT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'GET') {
    $links = $database->query('SELECT id,title,url FROM dashboard_quick_links ORDER BY created_at ASC,id ASC')->fetchAll();
    api_respond(['status'=>'success','data'=>$links]);
}
require_method('POST');
require_csrf();
require_roles('admin', 'director');
$input = json_body();
$action = (string) ($input['action'] ?? '');
$id = trim((string) ($input['id'] ?? ''));
if ($action === 'delete') {
    if (!preg_match('/\A[a-f0-9]{32}\z/D', $id)) api_error('ไม่พบลิงก์ที่ต้องการลบ', 422, 'invalid_link');
    $q=$database->prepare('DELETE FROM dashboard_quick_links WHERE id=?'); $q->execute([$id]);
    if ($q->rowCount() !== 1) api_error('ไม่พบลิงก์ที่ต้องการลบ', 404, 'not_found');
    api_respond(['status'=>'success']);
}
if (!in_array($action, ['create','update'], true)) api_error('ไม่รู้จักคำสั่งที่ร้องขอ', 400, 'unknown_action');
$title = trim((string) ($input['title'] ?? ''));
$url = trim((string) ($input['url'] ?? ''));
$parts = parse_url($url);
if ($title === '' || mb_strlen($title) > 160 || strlen($url) > 2048 || !filter_var($url, FILTER_VALIDATE_URL) || !is_array($parts) || !in_array(strtolower((string)($parts['scheme'] ?? '')), ['http','https'], true) || isset($parts['user']) || isset($parts['pass'])) {
    api_error('กรุณากรอกชื่อลิงก์และที่อยู่เว็บไซต์ที่ถูกต้อง', 422, 'invalid_link');
}
if ($action === 'create') {
    $id = bin2hex(random_bytes(16));
    $q=$database->prepare('INSERT INTO dashboard_quick_links (id,title,url) VALUES (?,?,?)'); $q->execute([$id,$title,$url]);
} else {
    if (!preg_match('/\A[a-f0-9]{32}\z/D', $id)) api_error('ไม่พบลิงก์ที่ต้องการแก้ไข', 422, 'invalid_link');
    $q=$database->prepare('UPDATE dashboard_quick_links SET title=?,url=? WHERE id=?'); $q->execute([$title,$url,$id]);
    if ($q->rowCount() === 0) { $q=$database->prepare('SELECT 1 FROM dashboard_quick_links WHERE id=?'); $q->execute([$id]); if (!$q->fetchColumn()) api_error('ไม่พบลิงก์ที่ต้องการแก้ไข', 404, 'not_found'); }
}
api_respond(['status'=>'success','data'=>['id'=>$id,'title'=>$title,'url'=>$url]]);
