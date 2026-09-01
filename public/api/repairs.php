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
  academic_year varchar(10) NULL, semester varchar(1) NULL,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY repair_user (user_id), KEY repair_stage (status, repair_stage),
  CONSTRAINT repair_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
try { $database->exec("ALTER TABLE repair_tickets ADD COLUMN academic_year varchar(10) NULL"); } catch (Throwable $ignored) { /* column already exists */ }
try { $database->exec("ALTER TABLE repair_tickets ADD COLUMN semester varchar(1) NULL"); } catch (Throwable $ignored) { /* column already exists */ }
$database->exec("UPDATE repair_tickets SET academic_year = CASE WHEN MONTH(created_at) < 5 THEN YEAR(created_at) + 542 ELSE YEAR(created_at) + 543 END, semester = CASE WHEN MONTH(created_at) BETWEEN 5 AND 10 THEN '1' ELSE '2' END WHERE academic_year IS NULL OR semester IS NULL");

$isAdmin = in_array((string) ($currentUser['role'] ?? ''), ['admin', 'director'], true);
$avManager = repair_assignment($database, 'audiovisual_handler', 'MMV18');
$buildingManager = repair_assignment($database, 'building_reviewer', 'MMV03');
$buildingTechnician = repair_assignment($database, 'building_technician', 'MMV20');

function repair_json(?string $value): ?array { if (!$value) return null; $decoded = json_decode($value, true); return is_array($decoded) ? $decoded : null; }
function repair_payload(array $row): array {
    $out = ['id'=>(string)$row['id'],'userId'=>(string)$row['user_id'],'userName'=>(string)$row['user_name'],'department'=>(string)$row['department'],'category'=>(string)$row['category'],'title'=>(string)$row['title'],'description'=>(string)$row['description'],'building'=>(string)$row['building'],'floor'=>(string)$row['floor'],'roomNumber'=>(string)$row['room_number'],'location'=>(string)$row['location'],'urgency'=>(string)$row['urgency'],'repairStage'=>(string)$row['repair_stage'],'status'=>(string)$row['status'],'createdAt'=>substr((string)$row['created_at'],0,10),'academicYear'=>(string)($row['academic_year']??''),'semester'=>(string)($row['semester']??'')];
    foreach (['user_phone'=>'userPhone','photo_url'=>'photoUrl','assigned_technician_id'=>'assignedTechnicianId','assigned_technician'=>'assignedTechnician','repair_notes'=>'repairNotes','completed_at'=>'completedAt'] as $column=>$key) if (($row[$column] ?? '') !== '' && $row[$column] !== null) $out[$key]=(string)$row[$column];
    foreach (['head_review'=>'headReview','technician_report'=>'technicianReport','user_confirmation'=>'userConfirmation'] as $column=>$key) { $value=repair_json($row[$column]??null); if ($value!==null) $out[$key]=$value; }
    return $out;
}
function repair_find(PDO $db, string $id): array { $s=$db->prepare('SELECT * FROM repair_tickets WHERE id=? LIMIT 1'); $s->execute([$id]); $row=$s->fetch(); if (!$row) api_error('ไม่พบรายการแจ้งซ่อม',404,'repair_not_found'); return $row; }
function repair_notify(PDO $db, string $userId, string $title, string|array $details, string $relatedId): void {
    // A notification failure must never make a successfully submitted repair
    // disappear. The ticket is the primary transaction; notification delivery
    // is best-effort and is logged for the administrator to inspect.
    try {
        $fields = is_array($details) ? $details : ['รายละเอียด' => $details];
        $parts = [];
        foreach ($fields as $label => $value) {
            $cleanValue = trim((string) $value);
            if ($cleanValue !== '') $parts[] = trim((string) $label) . ': ' . $cleanValue;
        }
        $message = implode(' • ', $parts);
        $s=$db->prepare('INSERT INTO notifications (user_id,title,message,module,related_id) VALUES (?,?,?,?,?)');
        $s->execute([$userId,$title,$message,'repair',$relatedId]);
        line_notify_linked_users($db,[$userId],$title,$fields);
    } catch (Throwable $exception) {
        error_log('MMV repair notification failed: '.$exception->getMessage());
    }
}
function repair_manager(PDO $db, string $configuredUserId): string {
    // A repair report must go to exactly the one reviewer configured in the
    // Admin Console. Never fall back to another AV officer, administrator or
    // director because doing so exposes the report and alerts the wrong user.
    $configuredUserId = trim($configuredUserId);
    if ($configuredUserId === '') {
        api_error('ยังไม่ได้กำหนดผู้ตรวจสอบรายการแจ้งซ่อมใน Admin Console', 503, 'repair_manager_not_configured');
    }

    $s = $db->prepare("SELECT id FROM users WHERE id=? AND status='active' LIMIT 1");
    $s->execute([$configuredUserId]);
    $found = $s->fetchColumn();
    if ($found) return (string) $found;

    api_error('ผู้ตรวจสอบรายการแจ้งซ่อมที่กำหนดไว้ไม่พร้อมใช้งาน กรุณาตรวจสอบใน Admin Console', 503, 'repair_manager_unavailable');
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    $manager = in_array((string)$currentUser['id'], [$avManager,$buildingManager], true);
    if ($isAdmin || $manager) $rows=$database->query('SELECT * FROM repair_tickets ORDER BY created_at DESC')->fetchAll();
    else {
        // Match immutable account IDs only. Display names can change or be duplicated.
        $s=$database->prepare('SELECT * FROM repair_tickets WHERE assigned_technician_id=? OR user_id=? ORDER BY created_at DESC');
        $s->execute([$currentUser['id'],$currentUser['id']]);
        $rows=$s->fetchAll();
    }
    api_respond(['status'=>'success','data'=>array_map('repair_payload',$rows)]);
}

require_method('POST'); require_csrf(); $input=json_body(); $action=(string)($input['action']??'');
if ($action==='create') {
    // The current form intentionally asks only for category, location and the
    // reported symptom. Building/floor/room_number are optional detail fields;
    // rejecting an otherwise complete report here prevented it from ever being
    // inserted, so the reviewer notification was never created.
    foreach (['category','title','description','location'] as $field) if (trim((string)($input[$field]??''))==='') api_error('กรุณากรอกข้อมูลแจ้งซ่อมให้ครบถ้วน',422,'validation_error');
    $category = (string)$input['category'];
    if (!in_array($category, ['audio_visual', 'building'], true)) api_error('กรุณาเลือกหัวข้องานโสตฯ หรืองานอาคารสถานที่',422,'invalid_repair_category');
    foreach (['building','floor','roomNumber'] as $field) $input[$field] = trim((string)($input[$field]??''));
    $id='RP-'.date('Y').'-'.strtoupper(bin2hex(random_bytes(3)));
    $period=current_academic_period($database);
    $s=$database->prepare('INSERT INTO repair_tickets (id,user_id,user_name,department,user_phone,category,title,description,building,floor,room_number,location,photo_url,urgency,academic_year,semester) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $s->execute([$id,$currentUser['id'],$currentUser['name'],$currentUser['department']??'', $currentUser['phone']??null,$category,$input['title'],$input['description'],$input['building'],$input['floor'],$input['roomNumber'],$input['location'],$input['photoUrl']??null,$input['urgency']??'medium',$period['academicYear'],$period['semester']]);
    $isAvCategory = $category === 'audio_visual';
    $managerId=repair_manager($database, $isAvCategory ? $avManager : $buildingManager);
    repair_notify($database,$managerId,'มีรายการแจ้งซ่อมใหม่รอตรวจสอบ',[
        'เลขที่' => $id,
        'งานที่แจ้ง' => $input['title'],
        'รายละเอียด' => $input['description'],
        'สถานที่' => $input['location'],
        'ผู้แจ้ง' => $currentUser['name'],
    ],$id);
    api_respond(['status'=>'success','data'=>repair_payload(repair_find($database,$id))],201);
}

$ticket=repair_find($database,(string)($input['repairId']??'')); $category=(string)$ticket['category']; $isAvTicket=in_array($category,['audio_visual','computer_network'],true); $managerId=repair_manager($database, $isAvTicket?$avManager:$buildingManager);
$isSingleAvHandler = $isAvTicket;
$assignerId = $managerId;
if ($action==='acknowledge_assign') {
    if ((string)$currentUser['id']!==$assignerId) api_error('ขั้นตอนมอบหมายงานนี้ต้องดำเนินการโดยผู้รับผิดชอบที่กำหนดใน Admin Console',403,'forbidden');
    if ((string)$ticket['repair_stage']!=='reported' || (string)$ticket['status']!=='pending') api_error('รายการนี้ถูกรับแจ้งหรือเปลี่ยนสถานะแล้ว กรุณารีเฟรชข้อมูล',409,'stale_repair');
    if ($isSingleAvHandler) {
        // The audiovisual/IT reviewer is also the sole technician. Receiving the
        // ticket starts the work immediately; there is no duplicate assignment step.
        $input['technicianId'] = $managerId;
    } elseif (!$isAvTicket) {
        $input['technicianId'] = $buildingTechnician;
    }
    $technicianId = trim((string)($input['technicianId']??''));
    if ($technicianId==='') api_error('กรุณาเลือกผู้รับผิดชอบงานซ่อม',422,'technician_required');
    $technician = $database->prepare("SELECT name FROM users WHERE id=? AND status='active' LIMIT 1");
    $technician->execute([$technicianId]);
    $technicianName = (string)($technician->fetchColumn() ?: '');
    if ($technicianName==='') api_error('ไม่พบบัญชีผู้รับผิดชอบที่พร้อมใช้งาน',422,'technician_invalid');
    $input['technicianId'] = $technicianId;
    $input['technicianName'] = $technicianName;
    $defaultReviewComment = $isSingleAvHandler ? 'รับแจ้งและเริ่มดำเนินการตรวจสอบอุปกรณ์' : 'รับแจ้ง มอบหมายช่างเข้าดำเนินการ';
    $review=['approvedBy'=>$currentUser['name'],'date'=>date('Y-m-d'),'assignedTechnicianName'=>(string)$input['technicianName'],'comment'=>trim((string)($input['comment']??'')) ?: $defaultReviewComment];
    $s=$database->prepare("UPDATE repair_tickets SET repair_stage='head_acknowledged',status='in_progress',assigned_technician_id=?,assigned_technician=?,head_review=? WHERE id=? AND repair_stage='reported' AND status='pending'");
    $s->execute([$input['technicianId'],$input['technicianName'],json_encode($review,JSON_UNESCAPED_UNICODE),$ticket['id']]);
    if ($s->rowCount()!==1) api_error('รายการนี้ถูกรับแจ้งหรือเปลี่ยนสถานะแล้ว กรุณารีเฟรชข้อมูล',409,'stale_repair');
    if (!$isSingleAvHandler) {
        // Notify only a separately assigned technician. The sole audiovisual/IT
        // handler does not need a second notification sent back to themself.
        repair_notify($database,(string)$input['technicianId'],'คุณได้รับมอบหมายงานซ่อมใหม่',[
            'เลขที่' => $ticket['id'],
            'งานที่มอบหมาย' => $ticket['title'],
            'รายละเอียด' => $ticket['description'],
            'สถานที่' => $ticket['location'],
            'ผู้แจ้ง' => $ticket['user_name'],
            'ผู้รับมอบหมาย' => $input['technicianName'],
            'มอบหมายโดย' => $currentUser['name'],
        ],$ticket['id']);
    }
} elseif ($action==='technician_report') {
    if ((string)$currentUser['id']!==$ticket['assigned_technician_id']) api_error('เฉพาะผู้ที่ได้รับมอบหมายงานนี้เท่านั้นที่บันทึกผลได้',403,'forbidden');
    if ((string)$ticket['repair_stage']!=='head_acknowledged' || (string)$ticket['status']!=='in_progress') api_error('รายการนี้ไม่ได้อยู่ในขั้นตอนบันทึกผลการซ่อม',409,'stale_repair');
    $repairDetails = trim((string)($input['repairDetails']??''));
    if ($repairDetails==='') api_error('กรุณาระบุรายละเอียดการดำเนินงาน',422,'repair_details_required');
    $repairPhotoUrl = trim((string)($input['repairPhotoUrl']??''));
    if ($repairPhotoUrl === '') api_error('กรุณาแนบรูปงานที่ดำเนินการแก้ไข',422,'repair_photo_required');
    $report=['technicianName'=>$currentUser['name'],'date'=>date('Y-m-d'),'repairDetails'=>$repairDetails,'repairPhotoUrl'=>$repairPhotoUrl];
    $s=$database->prepare("UPDATE repair_tickets SET repair_stage='repaired_pending_confirm',technician_report=?,repair_notes=? WHERE id=? AND repair_stage='head_acknowledged' AND status='in_progress' AND assigned_technician_id=?");
    $s->execute([json_encode($report,JSON_UNESCAPED_UNICODE),$repairDetails,$ticket['id'],$currentUser['id']]);
    if ($s->rowCount()!==1) api_error('รายการนี้ไม่ได้อยู่ในขั้นตอนบันทึกผลการซ่อม',409,'stale_repair');
    repair_notify($database,(string)$ticket['user_id'],'งานซ่อมเสร็จแล้ว (รอผู้แจ้งยืนยัน)','ช่างบันทึกผลการซ่อมงาน '.$ticket['id'].' กรุณาตรวจรับงาน',$ticket['id']);
} elseif ($action==='confirm') {
    if ((string)$currentUser['id']!==$ticket['user_id']) api_error('เฉพาะผู้แจ้งเท่านั้นที่ยืนยันงานได้',403,'forbidden');
    if ((string)$ticket['repair_stage']!=='repaired_pending_confirm' || (string)$ticket['status']!=='in_progress') api_error('รายการนี้ไม่ได้อยู่ในขั้นตอนตรวจรับงาน',409,'stale_repair');
    $confirm=['confirmedBy'=>$currentUser['name'],'date'=>date('Y-m-d'),'rating'=>$input['rating']??5,'comment'=>$input['comment']??'ตรวจรับงานเรียบร้อย อุปกรณ์ใช้งานได้ตามปกติ'];
    $s=$database->prepare("UPDATE repair_tickets SET repair_stage='user_confirmed',status='completed',completed_at=CURDATE(),user_confirmation=? WHERE id=? AND repair_stage='repaired_pending_confirm' AND status='in_progress' AND user_id=?");
    $s->execute([json_encode($confirm,JSON_UNESCAPED_UNICODE),$ticket['id'],$currentUser['id']]);
    if ($s->rowCount()!==1) api_error('รายการนี้ไม่ได้อยู่ในขั้นตอนตรวจรับงาน',409,'stale_repair');
} elseif ($action==='reject') {
    if ((string)$currentUser['id']!==$managerId) api_error('คุณไม่มีสิทธิ์ปฏิเสธรายการนี้',403,'forbidden');
    if ((string)$ticket['repair_stage']!=='reported' || (string)$ticket['status']!=='pending') api_error('รายการนี้ถูกรับแจ้งหรือเปลี่ยนสถานะแล้ว กรุณารีเฟรชข้อมูล',409,'stale_repair');
    $s=$database->prepare("UPDATE repair_tickets SET repair_stage='rejected',status='rejected',repair_notes=? WHERE id=? AND repair_stage='reported' AND status='pending'");
    $s->execute([trim((string)($input['comment']??'')) ?: 'ยกเลิกคำขอซ่อม',$ticket['id']]);
    if ($s->rowCount()!==1) api_error('รายการนี้ถูกรับแจ้งหรือเปลี่ยนสถานะแล้ว กรุณารีเฟรชข้อมูล',409,'stale_repair');
    repair_notify($database,(string)$ticket['user_id'],'รายการแจ้งซ่อมถูกปฏิเสธ','รายการ '.$ticket['id'].' ถูกปฏิเสธโดย '.$currentUser['name'],$ticket['id']);
} else api_error('ไม่รู้จักคำสั่งที่ร้องขอ',400,'unknown_action');
api_respond(['status'=>'success','data'=>repair_payload(repair_find($database,(string)$ticket['id']))]);
