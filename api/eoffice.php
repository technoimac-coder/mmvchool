<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';
$db = require_database();
$user = require_user();
$canRegister = in_array($user['role'], ['admin', 'director', 'academic_affairs'], true);
$db->exec("CREATE TABLE IF NOT EXISTS eoffice_incoming (
 id varchar(64) PRIMARY KEY, receipt_no varchar(100) NOT NULL,
 academic_year varchar(10) NOT NULL, book_no varchar(150) NOT NULL,
 title varchar(255) NOT NULL, sender varchar(255) NOT NULL,
 book_date date NOT NULL, received_date date NOT NULL,
 urgency varchar(20) NOT NULL DEFAULT 'normal', details text NOT NULL,
 stored_name varchar(100) NOT NULL, file_name varchar(255) NOT NULL,
 created_by varchar(20) NOT NULL, created_by_name varchar(255) NOT NULL,
 created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY receipt_year(academic_year, receipt_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
if (isset($_GET['download'])) {
    $s = $db->prepare('SELECT * FROM eoffice_incoming WHERE id = ?');
    $s->execute([(string) $_GET['download']]);
    $row = $s->fetch();
    if (!$row) api_error('ไม่พบหนังสือ', 404, 'not_found');
    $path = __DIR__ . '/../storage/eoffice/' . basename($row['stored_name']);
    if (!is_file($path)) api_error('ไม่พบไฟล์หนังสือ', 404, 'file_not_found');
    header('Content-Type: application/octet-stream');
    header("Content-Disposition: attachment; filename*=UTF-8''" . rawurlencode($row['file_name']));
    header('Content-Length: ' . filesize($path));
    readfile($path); exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    $rows = $db->query('SELECT id, receipt_no, academic_year, book_no, title, sender, book_date, received_date, urgency, details, file_name, created_by_name FROM eoffice_incoming ORDER BY received_date DESC, created_at DESC')->fetchAll();
    api_respond(['status' => 'success', 'data' => $rows]);
}
require_method('POST'); require_csrf();
if (!$canRegister) api_error('เฉพาะเจ้าหน้าที่สารบรรณหรือผู้ดูแลระบบเท่านั้นที่ลงทะเบียนได้', 403, 'forbidden');
$fields = [];
foreach (['receipt_no', 'academic_year', 'book_no', 'title', 'sender', 'book_date', 'received_date'] as $key) {
    $fields[$key] = trim((string) ($_POST[$key] ?? ''));
    if ($fields[$key] === '') api_error('กรุณากรอกข้อมูลหนังสือให้ครบ', 422, 'validation_error');
}
if (!preg_match('/^\d{4}$/', $fields['academic_year'])) api_error('ปีการศึกษาไม่ถูกต้อง', 422, 'validation_error');
foreach (['book_date', 'received_date'] as $key) {
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $fields[$key]);
    if (!$date || $date->format('Y-m-d') !== $fields[$key]) api_error('วันที่ไม่ถูกต้อง', 422, 'validation_error');
}
$file = $_FILES['document'] ?? null;
if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) api_error('กรุณาแนบไฟล์หนังสือ', 422, 'file_required');
if ($file['size'] <= 0 || $file['size'] > 15 * 1024 * 1024) api_error('ไฟล์ต้องไม่เกิน 15 MB', 422, 'file_size');
$extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$types = ['pdf' => ['application/pdf'], 'doc' => ['application/msword', 'application/x-ole-storage'], 'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'], 'jpg' => ['image/jpeg'], 'jpeg' => ['image/jpeg'], 'png' => ['image/png']];
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
if (!isset($types[$extension]) || !in_array($mime, $types[$extension], true)) api_error('รองรับ PDF, Word, JPG และ PNG', 422, 'file_type');
$directory = __DIR__ . '/../storage/eoffice';
if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) api_error('เตรียมพื้นที่เก็บไฟล์ไม่สำเร็จ', 500, 'storage_error');
$stored = bin2hex(random_bytes(16)) . '.' . $extension;
if (!move_uploaded_file($file['tmp_name'], $directory . '/' . $stored)) api_error('บันทึกไฟล์ไม่สำเร็จ', 500, 'storage_error');
try {
    $s = $db->prepare('INSERT INTO eoffice_incoming (id, receipt_no, academic_year, book_no, title, sender, book_date, received_date, urgency, details, stored_name, file_name, created_by, created_by_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $s->execute([bin2hex(random_bytes(16)), ...array_values($fields), in_array($_POST['urgency'] ?? '', ['normal', 'urgent', 'very_urgent'], true) ? $_POST['urgency'] : 'normal', trim((string) ($_POST['details'] ?? '')), $stored, mb_substr(basename($file['name']), 0, 255), $user['id'], $user['name']]);
} catch (Throwable $e) {
    unlink($directory . '/' . $stored);
    if ($e instanceof PDOException && $e->getCode() === '23000') api_error('เลขทะเบียนรับนี้มีอยู่แล้วในปีการศึกษานี้', 409, 'duplicate_receipt');
    throw $e;
}
api_respond(['status' => 'success'], 201);
