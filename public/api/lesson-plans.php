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
  file_size varchar(50) NOT NULL DEFAULT '', status varchar(30) NOT NULL DEFAULT 'pending', score decimal(5,2) DEFAULT NULL,
  reviewer_name varchar(255) DEFAULT NULL, review_comment text DEFAULT NULL, reviewed_at date DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY lesson_owner_period (user_id, academic_year, semester), KEY lesson_status (status),
  CONSTRAINT lesson_plan_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

function lesson_payload(array $row): array
{
    $payload = [
        'id'=>(string)$row['id'], 'userId'=>(string)$row['user_id'], 'userName'=>(string)$row['user_name'],
        'department'=>(string)$row['department'], 'title'=>(string)$row['title'], 'subjectCode'=>(string)$row['subject_code'],
        'subjectName'=>(string)$row['subject_name'], 'gradeLevel'=>(string)$row['grade_level'],
        'semester'=>(string)$row['semester'], 'academicYear'=>(string)$row['academic_year'],
        'fileUrl'=>(string)$row['file_url'], 'fileName'=>(string)$row['file_name'], 'fileSize'=>(string)$row['file_size'],
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

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    $canViewAll = in_array((string)($currentUser['role'] ?? ''), ['admin','director','head','academic_affairs'], true)
        || str_contains((string)($currentUser['department'] ?? ''), 'วิชาการ');
    if ($canViewAll) $rows = $database->query('SELECT * FROM lesson_plans ORDER BY created_at DESC')->fetchAll();
    else {
        $statement = $database->prepare('SELECT * FROM lesson_plans WHERE user_id = ? ORDER BY created_at DESC');
        $statement->execute([$currentUser['id']]); $rows = $statement->fetchAll();
    }
    api_respond(['status'=>'success','data'=>array_map('lesson_payload',$rows)]);
}

require_method('POST'); require_csrf(); $input=json_body(); $action=(string)($input['action']??'');
if ($action === 'create') {
    foreach (['subjectCode','subjectName','gradeLevel'] as $field) if (trim((string)($input[$field]??''))==='') api_error('กรุณากรอกข้อมูลแผนการสอนให้ครบถ้วน',422,'validation_error');
    $period=current_academic_period($database); $id='LP-'.date('Y').'-'.strtoupper(bin2hex(random_bytes(3)));
    $statement=$database->prepare('INSERT INTO lesson_plans (id,user_id,user_name,department,title,subject_code,subject_name,grade_level,semester,academic_year,unit_count,total_hours,file_url,file_name,file_size) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $statement->execute([$id,$currentUser['id'],$currentUser['name'],$currentUser['department']??'',trim((string)($input['title']??'')) ?: trim((string)$input['subjectName']),trim((string)$input['subjectCode']),trim((string)$input['subjectName']),trim((string)$input['gradeLevel']),$period['semester'],$period['academicYear'],$input['unitCount']??null,$input['totalHours']??null,trim((string)($input['fileUrl']??'#')),trim((string)($input['fileName']??'')),trim((string)($input['fileSize']??''))]);
    $lookup=$database->prepare('SELECT * FROM lesson_plans WHERE id=? LIMIT 1'); $lookup->execute([$id]);
    api_respond(['status'=>'success','data'=>lesson_payload($lookup->fetch())],201);
}
if ($action === 'review') {
    if (!in_array((string)($currentUser['role']??''),['admin','director','head','academic_affairs'],true)) api_error('คุณไม่มีสิทธิ์ประเมินแผนการสอน',403,'forbidden');
    $status=(string)($input['status']??''); if (!in_array($status,['approved','needs_revision'],true)) api_error('ผลการประเมินไม่ถูกต้อง',422,'validation_error');
    $statement=$database->prepare('UPDATE lesson_plans SET status=?,score=?,reviewer_name=?,review_comment=?,reviewed_at=CURDATE() WHERE id=?');
    $statement->execute([$status,$input['score']??null,$currentUser['name'],trim((string)($input['comment']??'')),(string)($input['lessonPlanId']??'')]);
    $lookup=$database->prepare('SELECT * FROM lesson_plans WHERE id=? LIMIT 1'); $lookup->execute([(string)($input['lessonPlanId']??'')]); $row=$lookup->fetch();
    if (!$row) api_error('ไม่พบแผนการสอน',404,'not_found'); api_respond(['status'=>'success','data'=>lesson_payload($row)]);
}
api_error('ไม่รู้จักคำสั่งที่ร้องขอ',400,'invalid_action');
