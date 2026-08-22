<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/line-notifier.php';

$database = require_database();
$currentUser = require_user();

// Self-migrating table keeps Plesk deployments safe when no shell access is available.
$database->exec("CREATE TABLE IF NOT EXISTS repair_tickets (
  id varchar(40) NOT NULL PRIMARY KEY, user_id varchar(20) NOT NULL, user_name varchar(255) NOT NULL,
  department varchar(255) NOT NULL DEFAULT '', user_phone varchar(50) DEFAULT NULL,
  category varchar(40) NOT NULL, title varchar(255) NOT NULL, description text NOT NULL,
  building varchar(255) NOT NULL DEFAULT '', floor varchar(100) NOT NULL DEFAULT '', room_number varchar(100) NOT NULL DEFAULT '',
  location varchar(255) NOT NULL DEFAULT '', photo_url longtext, urgency varchar(20) NOT NULL DEFAULT 'medium',
  repair_stage varchar(40) NOT NULL DEFAULT 'reported', status varchar(30) NOT NULL DEFAULT 'pending',
  assigned_technician_id varchar(20) DEFAULT NULL, assigned_technician varchar(255) DEFAULT NULL,
  head_review json DEFAULT NULL, technician_report json DEFAULT NULL, user_confirmation json DEFAULT NULL,
  repair_notes text, completed_at date DEFAULT NULL, created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY repair_user (user_id), KEY repair_stage (status, repair_stage),
  CONSTRAINT repair_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$isAdmin = in_array((string) ($currentUser['role'] ?? ''), ['admin', 'director'], true);
$avManager = workflow_assignee('pipe-repair-av', 2, 'MMV96');
$buildingManager = workflow_assignee('pipe-repair-build', 2, 'MMV97');

function repair_json(?string $value): ?array { if (!$value) return null; $decoded = json_decode($value, true); return is_array($decoded) ? $decoded : null; }
function repair_payload(array $row): array {
    $out = ['id'=>(string)$row['id'],'userId'=>(string)$row['user_id'],'userName'=>(string)$row['user_name'],'department'=>(string)$row['department'],'category'=>(string)$row['category'],'title'=>(string)$row['title'],'description'=>(string)$row['description'],'building'=>(string)$row['building'],'floor'=>(string)$row['floor'],'roomNumber'=>(string)$row['room_number'],'location'=>(string)$row['location'],'urgency'=>(string)$row['urgency'],'repairStage'=>(string)$row['repair_stage'],'status'=>(string)$row['status'],'createdAt'=>substr((string)$row['created_at'],0,10)];
    foreach (['user_phone'=>'userPhone','photo_url'=>'photoUrl','assigned_technician_id'=>'assignedTechnicianId','assigned_technician'=>'assignedTechnician','repair_notes'=>'repairNotes','completed_at'=>'completedAt'] as $column=>$key) if (($row[$column] ?? '') !== '' && $row[$column] !== null) $out[$key]=(string)$row[$column];
    foreach (['head_review'=>'headReview','technician_report'=>'technicianReport','user_confirmation'=>'userConfirmation'] as $column=>$key) { $value=repair_json($row[$column]??null); if ($value!==null) $out[$key]=$value; }
    return $out;
}
function repair_find(PDO $db, string $id): array { $s=$db->prepare('SELECT * FROM repair_tickets WHERE id=? LIMIT 1'); $s->execute([$id]); $row=$s->fetch(); if (!$row) api_error('ไม่พบรายการแจ้งซ่อม',404,'repair_not_found'); return $row; }
function repair_notify(PDO $db, string $userId, string $title, string $message, string $relatedId): void {
    // A notification failure must never make a successfully submitted repair
    // disappear. The ticket is the primary transaction; notification delivery
    // is best-effort and is logged for the administrator to inspect.
    try {
        $s=$db->prepare('INSERT INTO notifications (user_id,title,message,module,related_id) VALUES (?,?,?,?,?)');
        $s->execute([$userId,$title,$message,'repair',$relatedId]);
        line_notify_linked_users($db,[$userId],$title,['รายละเอียด'=>$message]);
    } catch (Throwable $exception) {
        error_log('MMV repair notification failed: '.$exception->getMessage());
    }
}
function repair_manager(PDO $db, string $preferred): string {
    $ids = array_values(array_unique([$preferred, 'MMV96', 'MMV97']));
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $s = $db->prepare("SELECT id FROM users WHERE status='active' AND id IN ($placeholders) ORDER BY FIELD(id, $placeholders) LIMIT 1");
    $s->execute(array_merge($ids, $ids));
    $found = $s->fetchColumn();
    if ($found) return (string) $found;
    $found = $db->query("SELECT id FROM users WHERE status='active' AND role IN ('admin','director') ORDER BY id LIMIT 1")->fetchColumn();
    if ($found) return (string) $found;
    api_error('ไม่พบผู้ตรวจสอบรายการแจ้งซ่อมที่ใช้งานได้', 503, 'repair_manager_unavailable');
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    $manager = in_array((string)$currentUser['id'], [$avManager,$buildingManager], true);
    if ($isAdmin || $manager) $rows=$database->query('SELECT * FROM repair_tickets ORDER BY created_at DESC')->fetchAll();
    elseif (($currentUser['role'] ?? '') === 'technician') { $s=$database->prepare('SELECT * FROM repair_tickets WHERE assigned_technician_id=? OR user_id=? ORDER BY created_at DESC'); $s->execute([$currentUser['id'],$currentUser['id']]); $rows=$s->fetchAll(); }
    else { $s=$database->prepare('SELECT * FROM repair_tickets WHERE user_id=? OR user_name=? ORDER BY created_at DESC'); $s->execute([$currentUser['id'],$currentUser['name']]); $rows=$s->fetchAll(); }
    api_respond(['status'=>'success','data'=>array_map('repair_payload',$rows)]);
}

require_method('POST'); require_csrf(); $input=json_body(); $action=(string)($input['action']??'');
if ($action==='create') {
    // The current form intentionally asks only for category, location and the
    // reported symptom. Building/floor/room_number are optional detail fields;
    // rejecting an otherwise complete report here prevented it from ever being
    // inserted, so the reviewer notification was never created.
    foreach (['category','title','description','location'] as $field) if (trim((string)($input[$field]??''))==='') api_error('กรุณากรอกข้อมูลแจ้งซ่อมให้ครบถ้วน',422,'validation_error');
    foreach (['building','floor','roomNumber'] as $field) $input[$field] = trim((string)($input[$field]??''));
    $id='RP-'.date('Y').'-'.strtoupper(bin2hex(random_bytes(3)));
    $s=$database->prepare('INSERT INTO repair_tickets (id,user_id,user_name,department,user_phone,category,title,description,building,floor,room_number,location,photo_url,urgency) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $s->execute([$id,$currentUser['id'],$currentUser['name'],$currentUser['department']??'', $currentUser['phone']??null,$input['category'],$input['title'],$input['description'],$input['building'],$input['floor'],$input['roomNumber'],$input['location'],$input['photoUrl']??null,$input['urgency']??'medium']);
    $isAvCategory = in_array((string)$input['category'],['audio_visual','computer_network'],true);
    $managerId=repair_manager($database, $isAvCategory ? $avManager : $buildingManager);
    repair_notify($database,$managerId,'มีรายการแจ้งซ่อมใหม่รอตรวจสอบ','ผู้แจ้ง '.$currentUser['name'].' แจ้งซ่อม: '.$input['title'].' ('.$input['location'].')',$id);
    api_respond(['status'=>'success','data'=>repair_payload(repair_find($database,$id))],201);
}

$ticket=repair_find($database,(string)($input['repairId']??'')); $category=(string)$ticket['category']; $isAvTicket=in_array($category,['audio_visual','computer_network'],true); $managerId=repair_manager($database, $isAvTicket?$avManager:$buildingManager);
$assignerId = $isAvTicket ? $managerId : workflow_assignee('pipe-room', 2, 'MMV05');
if ($action==='acknowledge_assign') {
    if (!$isAdmin && (string)$currentUser['id']!==$assignerId) api_error('ขั้นตอนมอบหมายงานนี้ต้องดำเนินการโดยรองผู้อำนวยการที่กำหนด',403,'forbidden');
    if (!$isAvTicket) {
        $input['technicianId'] = workflow_assignee('pipe-repair-build', 3, 'MMV20');
        $technician = $database->prepare('SELECT name FROM users WHERE id=? LIMIT 1');
        $technician->execute([$input['technicianId']]);
        $input['technicianName'] = (string)($technician->fetchColumn() ?: 'นายอนุชา โสลำภา');
    }
    $review=['approvedBy'=>$currentUser['name'],'date'=>date('Y-m-d'),'assignedTechnicianName'=>(string)$input['technicianName'],'comment'=>trim((string)($input['comment']??'')) ?: 'รับแจ้ง มอบหมายช่างเข้าดำเนินการ'];
    $s=$database->prepare("UPDATE repair_tickets SET repair_stage='head_acknowledged',status='in_progress',assigned_technician_id=?,assigned_technician=?,head_review=? WHERE id=?"); $s->execute([$input['technicianId'],$input['technicianName'],json_encode($review,JSON_UNESCAPED_UNICODE),$ticket['id']]);
    // Notify only the technician selected in the assignment form.
    repair_notify($database,(string)$input['technicianId'],'มีงานซ่อมมอบหมายใหม่','หัวหน้างานมอบหมายงาน '.$ticket['id'].' ให้คุณดำเนินการ',$ticket['id']);
} elseif ($action==='technician_report') {
    if (!$isAdmin && ($currentUser['role']??'')!=='technician' && (string)$currentUser['id']!==$ticket['assigned_technician_id']) api_error('เฉพาะทีมช่างเท่านั้นที่บันทึกผลได้',403,'forbidden');
    $report=['technicianName'=>$currentUser['name'],'date'=>date('Y-m-d'),'repairDetails'=>$input['repairDetails'],'partsUsed'=>$input['partsUsed']??null,'cost'=>$input['cost']??null];
    $s=$database->prepare("UPDATE repair_tickets SET repair_stage='repaired_pending_confirm',technician_report=?,repair_notes=? WHERE id=?"); $s->execute([json_encode($report,JSON_UNESCAPED_UNICODE),$input['repairDetails'],$ticket['id']]); repair_notify($database,(string)$ticket['user_id'],'งานซ่อมเสร็จแล้ว (รอผู้แจ้งยืนยัน)','ช่างบันทึกผลการซ่อมงาน '.$ticket['id'].' กรุณาตรวจรับงาน',$ticket['id']);
} elseif ($action==='confirm') {
    if (!$isAdmin && (string)$currentUser['id']!==$ticket['user_id']) api_error('เฉพาะผู้แจ้งเท่านั้นที่ยืนยันงานได้',403,'forbidden');
    $confirm=['confirmedBy'=>$currentUser['name'],'date'=>date('Y-m-d'),'rating'=>$input['rating']??5,'comment'=>$input['comment']??'ตรวจรับงานเรียบร้อย อุปกรณ์ใช้งานได้ตามปกติ'];
    $s=$database->prepare("UPDATE repair_tickets SET repair_stage='user_confirmed',status='completed',completed_at=CURDATE(),user_confirmation=? WHERE id=?"); $s->execute([json_encode($confirm,JSON_UNESCAPED_UNICODE),$ticket['id']]);
} elseif ($action==='reject') {
    if (!$isAdmin && (string)$currentUser['id']!==$managerId) api_error('คุณไม่มีสิทธิ์ปฏิเสธรายการนี้',403,'forbidden');
    $s=$database->prepare("UPDATE repair_tickets SET repair_stage='rejected',status='rejected',repair_notes=? WHERE id=?"); $s->execute([trim((string)($input['comment']??'')) ?: 'ยกเลิกคำขอซ่อม',$ticket['id']]); repair_notify($database,(string)$ticket['user_id'],'รายการแจ้งซ่อมถูกปฏิเสธ','รายการ '.$ticket['id'].' ถูกปฏิเสธโดย '.$currentUser['name'],$ticket['id']);
} else api_error('ไม่รู้จักคำสั่งที่ร้องขอ',400,'unknown_action');
api_respond(['status'=>'success','data'=>repair_payload(repair_find($database,(string)$ticket['id']))]);
