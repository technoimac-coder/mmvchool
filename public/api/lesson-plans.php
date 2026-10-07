<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

$database = require_database();
$currentUser = require_user();
$database->exec("CREATE TABLE IF NOT EXISTS lesson_plans (
  id varchar(64) NOT NULL PRIMARY KEY,
  user_id varchar(20) NOT NULL, user_name varchar(255) NOT NULL, department varchar(255) NOT NULL DEFAULT '',
  title varchar(255) NOT NULL, subject_code varchar(100) NOT NULL, subject_name varchar(255) NOT NULL,
  grade_level varchar(100) NOT NULL, semester varchar(1) NOT NULL, academic_year varchar(10) NOT NULL,
  unit_count int DEFAULT NULL, total_hours int DEFAULT NULL, file_url text NOT NULL, file_name varchar(255) NOT NULL,
  file_size varchar(50) NOT NULL DEFAULT '', stored_name varchar(255) NOT NULL DEFAULT '', status varchar(30) NOT NULL DEFAULT 'pending', score decimal(5,2) DEFAULT NULL,
  reviewer_name varchar(255) DEFAULT NULL, review_comment text DEFAULT NULL, reviewed_at date DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY lesson_owner_period (user_id, academic_year, semester), KEY lesson_status (status),
  CONSTRAINT lesson_plan_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
$columns = $database->query("SHOW COLUMNS FROM lesson_plans")->fetchAll(PDO::FETCH_COLUMN);
if (!in_array('stored_name', $columns, true)) {
    $database->exec("ALTER TABLE lesson_plans ADD COLUMN stored_name varchar(255) NOT NULL DEFAULT '' AFTER file_size");
}

function lesson_payload(array $row): array
{
    $payload = [
        'id'=>(string)$row['id'], 'userId'=>(string)$row['user_id'], 'userName'=>(string)$row['user_name'],
        'department'=>(string)$row['department'], 'title'=>(string)$row['title'], 'subjectCode'=>(string)$row['subject_code'],
        'subjectName'=>(string)$row['subject_name'], 'gradeLevel'=>(string)$row['grade_level'],
        'semester'=>(string)$row['semester'], 'academicYear'=>(string)$row['academic_year'],
        'fileUrl'=>'/api/lesson-plans.php?download=' . rawurlencode((string)$row['id']), 'fileName'=>(string)$row['file_name'], 'fileSize'=>(string)$row['file_size'],
        'status'=>(string)$row['status'], 'createdAt'=>substr((string)$row['created_at'],0,10),
    ];
    foreach (['unit_count'=>'unitCount','total_hours'=>'totalHours','score'=>'score'] as $column=>$key) {
        if ($row[$column] !== null) $payload[$key] = (float)$row[$column];
    }
    foreach (['reviewer_name'=>'reviewerName','review_comment'=>'reviewComment','reviewed_at'=>'reviewedAt'] as $column=>$key) {
        if (!empty($row[$column])) $payload[$key] = (string)$row[$column];
    }
    return $payload;
}

if (isset($_GET['download'])) {
    $id = trim((string)$_GET['download']);
    $lookup = $database->prepare('SELECT * FROM lesson_plans WHERE id=? LIMIT 1');
    $lookup->execute([$id]);
    $row = $lookup->fetch();
    if (!$row) api_error('ไม่พบไฟล์แผนการสอน', 404, 'not_found');
    $canViewAll = is_executive_role($currentUser)
        || in_array((string)($currentUser['role'] ?? ''), ['head','academic_affairs'], true)
        || str_contains((string)($currentUser['department'] ?? ''), 'วิชาการ');
    if (!$canViewAll && (string)$row['user_id'] !== (string)$currentUser['id']) api_error('คุณไม่มีสิทธิ์เปิดไฟล์นี้', 403, 'forbidden');
    $storedName = trim((string)($row['stored_name'] ?? ''));
    if ($storedName === '') {
        $legacyPath = (string)parse_url((string)$row['file_url'], PHP_URL_PATH);
        if (str_contains($legacyPath, '/uploads/lesson-plans/')) $storedName = basename($legacyPath);
    }
    $storedName = basename($storedName);
    if ($storedName === '' || $storedName === '.' || $storedName === '..') api_error('ไม่พบชื่อไฟล์บนเซิร์ฟเวอร์', 404, 'file_not_found');
    $path = dirname(__DIR__) . '/uploads/lesson-plans/' . $storedName;
    if (!is_file($path)) api_error('ไม่พบไฟล์บนเซิร์ฟเวอร์', 404, 'file_not_found');
    $extension = strtolower(pathinfo((string)$row['file_name'], PATHINFO_EXTENSION));
    $mime = ['pdf'=>'application/pdf','doc'=>'application/msword','docx'=>'application/vnd.openxmlformats-officedocument.wordprocessingml.document'][$extension] ?? 'application/octet-stream';
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($path));
    header('Content-Disposition: ' . ($extension === 'pdf' ? 'inline' : 'attachment') . '; filename="' . rawurlencode((string)$row['file_name']) . '"');
    readfile($path);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    $canViewAll = is_executive_role($currentUser)
        || in_array((string)($currentUser['role'] ?? ''), ['head','academic_affairs'], true)
        || str_contains((string)($currentUser['department'] ?? ''), 'วิชาการ');
    if ($canViewAll) $rows = $database->query('SELECT * FROM lesson_plans ORDER BY created_at DESC')->fetchAll();
    else {
        $statement = $database->prepare('SELECT * FROM lesson_plans WHERE user_id = ? ORDER BY created_at DESC');
        $statement->execute([$currentUser['id']]); $rows = $statement->fetchAll();
    }
    api_respond(['status'=>'success','data'=>array_map('lesson_payload',$rows)]);
}

require_method('POST'); require_csrf();
$isMultipart = str_starts_with(strtolower((string)($_SERVER['CONTENT_TYPE'] ?? '')), 'multipart/form-data');
$input = $isMultipart ? $_POST : json_body(); $action=(string)($input['action']??'');
if ($action === 'create') {
    foreach (['subjectCode','subjectName','gradeLevel'] as $field) if (trim((string)($input[$field]??''))==='') api_error('กรุณากรอกข้อมูลแผนการสอนให้ครบถ้วน',422,'validation_error');
    $document = $_FILES['document'] ?? null;
    if (!is_array($document) || ($document['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) api_error('กรุณาแนบไฟล์แผนการจัดการเรียนรู้',422,'document_required');
    if ((int)$document['size'] <= 0 || (int)$document['size'] > 50 * 1024 * 1024) api_error('ไฟล์ต้องมีขนาดไม่เกิน 50 MB',422,'document_too_large');
    $extension = strtolower(pathinfo((string)$document['name'], PATHINFO_EXTENSION));
    if (!in_array($extension, ['pdf','doc','docx'], true)) api_error('รองรับเฉพาะไฟล์ PDF, DOC และ DOCX',422,'unsupported_document');
    $directory = dirname(__DIR__) . '/uploads/lesson-plans';
    if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) api_error('ไม่สามารถเตรียมพื้นที่จัดเก็บไฟล์ได้',500,'upload_directory_failed');
    $storedName = 'LP-' . date('YmdHis') . '-' . bin2hex(random_bytes(5)) . '.' . $extension;
    if (!move_uploaded_file((string)$document['tmp_name'], $directory . '/' . $storedName)) api_error('บันทึกไฟล์ไม่สำเร็จ',500,'upload_failed');
    $period=current_academic_period($database);
    $semester = trim((string)($input['semester'] ?? $period['semester']));
    $academicYear = trim((string)($input['academicYear'] ?? $period['academicYear']));
    if (!in_array($semester, ['1', '2'], true) || !preg_match('/^\\d{4}$/', $academicYear)) api_error('ภาคเรียนหรือปีการศึกษาไม่ถูกต้อง', 422, 'invalid_academic_period');
    $id='LP-'.date('Y').'-'.strtoupper(bin2hex(random_bytes(3)));
    $fileUrl = '/api/lesson-plans.php?download=' . rawurlencode($id);
    $statement=$database->prepare('INSERT INTO lesson_plans (id,user_id,user_name,department,title,subject_code,subject_name,grade_level,semester,academic_year,unit_count,total_hours,file_url,file_name,file_size,stored_name) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $statement->execute([$id,$currentUser['id'],$currentUser['name'],$currentUser['department']??'',trim((string)($input['title']??'')) ?: trim((string)$input['subjectName']),trim((string)$input['subjectCode']),trim((string)$input['subjectName']),trim((string)$input['gradeLevel']),$semester,$academicYear,$input['unitCount']??null,$input['totalHours']??null,$fileUrl,(string)$document['name'],number_format((int)$document['size'] / 1024 / 1024, 1) . ' MB',$storedName]);
    $lookup=$database->prepare('SELECT * FROM lesson_plans WHERE id=? LIMIT 1'); $lookup->execute([$id]);
    api_respond(['status'=>'success','data'=>lesson_payload($lookup->fetch())],201);
}
if ($action === 'review') {
    if (!in_array((string)($currentUser['role']??''),['director','head','academic_affairs'],true)) api_error('คุณไม่มีสิทธิ์ประเมินแผนการสอน',403,'forbidden');
    $status=(string)($input['status']??''); if (!in_array($status,['approved','needs_revision'],true)) api_error('ผลการประเมินไม่ถูกต้อง',422,'validation_error');
    $statement=$database->prepare('UPDATE lesson_plans SET status=?,score=?,reviewer_name=?,review_comment=?,reviewed_at=CURDATE() WHERE id=?');
    $statement->execute([$status,$input['score']??null,$currentUser['name'],trim((string)($input['comment']??'')),(string)($input['lessonPlanId']??'')]);
    $lookup=$database->prepare('SELECT * FROM lesson_plans WHERE id=? LIMIT 1'); $lookup->execute([(string)($input['lessonPlanId']??'')]); $row=$lookup->fetch();
    if (!$row) api_error('ไม่พบแผนการสอน',404,'not_found'); api_respond(['status'=>'success','data'=>lesson_payload($row)]);
}
api_error('ไม่รู้จักคำสั่งที่ร้องขอ',400,'invalid_action');
