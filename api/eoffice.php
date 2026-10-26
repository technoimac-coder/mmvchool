<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';
$db = require_database();
$user = require_user();
$canRegister = in_array($user['role'], ['admin', 'director', 'academic_affairs'], true);
define('MMV_WORKFLOW_LIBRARY_ONLY', true);
require_once __DIR__ . '/document_workflows.php';
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
$columns = $db->query('SHOW COLUMNS FROM eoffice_incoming')->fetchAll(PDO::FETCH_COLUMN);
foreach (['responsible_id' => 'varchar(20)', 'responsible_name' => 'varchar(255)', 'workflow_id' => 'varchar(64)'] as $column => $type) {
    if (!in_array($column, $columns, true)) $db->exec("ALTER TABLE eoffice_incoming ADD COLUMN {$column} {$type} NULL");
}
$extraColumns = [
 'recipient' => "varchar(255) NOT NULL DEFAULT 'ผู้อำนวยการ'",
 'page_count' => 'int NOT NULL DEFAULT 1', 'signing_page' => 'int NOT NULL DEFAULT 1',
 'stamp_enabled' => 'tinyint NOT NULL DEFAULT 0',
 'stage' => "varchar(30) NOT NULL DEFAULT 'registered'", 'follow_date' => 'date NULL',
 'initial_note' => 'text NULL',
 'deleted_at' => 'datetime NULL',
];
foreach ($extraColumns as $column => $definition) {
    if (!in_array($column, $columns, true)) $db->exec("ALTER TABLE eoffice_incoming ADD COLUMN {$column} {$definition}");
}
$db->exec("CREATE TABLE IF NOT EXISTS eoffice_tasks (
 id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY, book_id varchar(64) NOT NULL,
 user_id varchar(20) NOT NULL, user_name varchar(255) NOT NULL,
 instruction text NOT NULL, status varchar(20) NOT NULL DEFAULT 'pending',
 report text NULL, acknowledged_at datetime NULL, completed_at datetime NULL,
 UNIQUE KEY book_user(book_id,user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
$db->exec("CREATE TABLE IF NOT EXISTS eoffice_history (
 id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY, book_id varchar(64) NOT NULL,
 actor_name varchar(255) NOT NULL, action varchar(100) NOT NULL, note text NOT NULL,
 created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, KEY book_history(book_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
require_once __DIR__ . '/eoffice-actions.php';
$db->exec("CREATE TABLE IF NOT EXISTS eoffice_attachments (
 id varchar(64) NOT NULL PRIMARY KEY, book_id varchar(64) NOT NULL,
 stored_name varchar(100) NOT NULL, file_name varchar(255) NOT NULL,
 KEY book_attachment(book_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
$db->exec("UPDATE eoffice_incoming SET stage='routing' WHERE stage='registered' AND workflow_id IS NOT NULL AND workflow_id<>''");
// Route existing assignment notifications to the correct work area as well.
$db->exec("UPDATE notifications SET module='eoffice' WHERE module='document_workflow' AND related_id LIKE 'EO-%'");
if (isset($_GET['download'])) {
    $s = $db->prepare('SELECT * FROM eoffice_incoming WHERE id = ?');
    $s->execute([(string) $_GET['download']]);
    $row = $s->fetch();
    if (!$row) api_error('ไม่พบหนังสือ', 404, 'not_found');
    if (isset($_GET['attachment'])) {
        $s=$db->prepare('SELECT stored_name,file_name FROM eoffice_attachments WHERE id=? AND book_id=?');
        $s->execute([(string)$_GET['attachment'],$row['id']]);
        $attachment=$s->fetch();
        if (!$attachment) api_error('ไม่พบไฟล์แนบ',404,'attachment_not_found');
        $row['stored_name']=$attachment['stored_name']; $row['file_name']=$attachment['file_name'];
    }
    $path = __DIR__ . '/../storage/eoffice/' . basename($row['stored_name']);
    if (!is_file($path)) api_error('ไม่พบไฟล์หนังสือ', 404, 'file_not_found');
    header('Content-Type: application/octet-stream');
    header("Content-Disposition: attachment; filename*=UTF-8''" . rawurlencode($row['file_name']));
    header('Content-Length: ' . filesize($path));
    readfile($path); exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    $rows = $db->query('SELECT b.*, w.status AS signing_status FROM eoffice_incoming b LEFT JOIN document_workflows w ON w.id=b.workflow_id WHERE b.deleted_at IS NULL ORDER BY b.received_date DESC,b.created_at DESC')->fetchAll();
    $taskRows = $db->query('SELECT * FROM eoffice_tasks ORDER BY id')->fetchAll();
    $historyRows = $db->query('SELECT * FROM eoffice_history ORDER BY id')->fetchAll();
    $attachments=$db->query('SELECT id,book_id,file_name FROM eoffice_attachments ORDER BY id')->fetchAll();
    foreach ($rows as &$row) {
        $row['tasks'] = array_values(array_filter($taskRows, fn($task) => $task['book_id'] === $row['id']));
        $row['history'] = array_values(array_filter($historyRows, fn($entry) => $entry['book_id'] === $row['id']));
        $row['attachments']=array_values(array_filter($attachments,fn($attachment)=>$attachment['book_id']===$row['id']));
        unset($row['stored_name']);
    }
    unset($row);
    api_respond(['status' => 'success', 'data' => $rows]);
}
require_method('POST'); require_csrf();
if (isset($_POST['action']) && in_array($_POST['action'], ['route','distribute','acknowledge','report','follow','archive'], true)) {
    eoffice_action($db, $user, $canRegister);
}
if (!$canRegister) api_error('เฉพาะเจ้าหน้าที่สารบรรณหรือผู้ดูแลระบบเท่านั้นที่ลงทะเบียนได้', 403, 'forbidden');
if (($_POST['action'] ?? '') === 'delete') {
    $db->beginTransaction();
    try {
        $id=(string)($_POST['id']??'');
        $q=$db->prepare('SELECT * FROM eoffice_incoming WHERE id=? AND deleted_at IS NULL FOR UPDATE');
        $q->execute([$id]); $book=$q->fetch();
        if (!$book) { $db->rollBack(); api_error('ไม่พบหนังสือหรือถูกลบแล้ว',404,'not_found'); }
        $db->prepare("UPDATE eoffice_incoming SET deleted_at=NOW(),stage='archived' WHERE id=?")->execute([$id]);
        if (!empty($book['workflow_id'])) $db->prepare("UPDATE document_workflows SET status='rejected' WHERE id=? AND status IN ('pending','in_review')")->execute([$book['workflow_id']]);
        eoffice_history($db,$id,$user['name'],'ลบเอกสาร (เก็บข้อมูลไว้)',json_encode(['receipt_no'=>$book['receipt_no'],'title'=>$book['title'],'previous_stage'=>$book['stage']],JSON_UNESCAPED_UNICODE));
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        error_log('eOffice delete: '.$e->getMessage());
        api_error('ลบเอกสารไม่สำเร็จ กรุณาลองใหม่',500,'delete_failed');
    }
    api_respond(['status'=>'success']);
}
if (($_POST['action'] ?? '') === 'update') {
    $fields=[];
    foreach (['receipt_no'=>100,'academic_year'=>4,'book_no'=>150,'title'=>255,'sender'=>255,'book_date'=>10,'received_date'=>10,'recipient'=>255,'details'=>4000] as $key=>$limit) {
        $fields[$key]=trim((string)($_POST[$key]??''));
        if (mb_strlen($fields[$key])>$limit || (!in_array($key,['recipient','details'],true) && $fields[$key]==='')) api_error('กรุณากรอกข้อมูลให้ครบและไม่เกินความยาวที่กำหนด',422,'validation_error');
    }
    if (!preg_match('/^\d{4}$/',$fields['academic_year']) || !eoffice_valid_date($fields['book_date']) || !eoffice_valid_date($fields['received_date'])) api_error('ปีการศึกษาหรือวันที่ไม่ถูกต้อง',422,'validation_error');
    $fields['urgency']=(string)($_POST['urgency']??'normal');
    if (!in_array($fields['urgency'],['normal','urgent','very_urgent'],true)) api_error('ความเร่งด่วนไม่ถูกต้อง',422,'validation_error');
    $db->beginTransaction();
    try {
        $id=(string)($_POST['id']??'');
        $q=$db->prepare('SELECT * FROM eoffice_incoming WHERE id=? FOR UPDATE'); $q->execute([$id]); $before=$q->fetch();
        if (!$before) throw new RuntimeException('ไม่พบหนังสือ');
        $q=$db->prepare('SELECT id FROM eoffice_incoming WHERE academic_year=? AND receipt_no=? AND id<>?'); $q->execute([$fields['academic_year'],$fields['receipt_no'],$id]);
        if ($q->fetchColumn()) throw new RuntimeException('เลขรับซ้ำในปีการศึกษานี้');
        $changes=[];
        foreach ($fields as $key=>$value) if ((string)($before[$key]??'')!==$value) $changes[$key]=['before'=>$before[$key]??'','after'=>$value];
        $q=$db->prepare('UPDATE eoffice_incoming SET receipt_no=?,academic_year=?,book_no=?,title=?,sender=?,book_date=?,received_date=?,recipient=?,details=?,urgency=? WHERE id=?');
        $q->execute([...array_values($fields),$id]);
        if ($changes) eoffice_history($db,$id,$user['name'],'แก้ไขข้อมูลหนังสือ',json_encode($changes,JSON_UNESCAPED_UNICODE));
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        api_error($e instanceof RuntimeException?$e->getMessage():'แก้ไขข้อมูลไม่สำเร็จ กรุณาตรวจสอบเลขรับและลองใหม่',422,'update_failed');
    }
    api_respond(['status'=>'success']);
}
if (($_POST['action'] ?? '') === 'assign') {
    $path = null;
    $db->beginTransaction();
    try {
        $q = $db->prepare('SELECT * FROM eoffice_incoming WHERE id=? FOR UPDATE');
        $q->execute([(string) ($_POST['id'] ?? '')]); $book = $q->fetch();
        if (!$book) throw new RuntimeException('ไม่พบหนังสือ');
        if (!empty($book['responsible_id'])) throw new RuntimeException('หนังสือนี้มอบหมายแล้ว');
        $personId = (string) ($_POST['responsible_id'] ?? '');
        $q = $db->prepare("SELECT name FROM users WHERE id=? AND status='active'");
        $q->execute([$personId]); $name = $q->fetchColumn();
        if (!$name) throw new RuntimeException('กรุณาเลือกผู้รับผิดชอบที่ปฏิบัติงานอยู่');
        $workflowId = null;
        if (strtolower(pathinfo($book['file_name'], PATHINFO_EXTENSION)) === 'pdf') {
            $directory = dirname(__DIR__, 2) . '/private-workflows/' . preg_replace('/[^A-Za-z0-9_-]/', '_', $user['id']);
            if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) throw new RuntimeException('สร้างพื้นที่เก็บเอกสารไม่สำเร็จ');
            $stored = bin2hex(random_bytes(12)) . '.pdf';
            $path = $directory . '/' . $stored;
            if (!copy(__DIR__ . '/../storage/eoffice/' . basename($book['stored_name']), $path)) throw new RuntimeException('เตรียมเอกสารลงนามไม่สำเร็จ');
            $workflowId = 'EO-' . bin2hex(random_bytes(12));
            $signers = [['userId' => $personId, 'userName' => $name, 'step' => 1, 'status' => 'pending']];
            $period = current_academic_period($db);
            $q = $db->prepare('INSERT INTO document_workflows (id,title,topic,description,file_url,file_name,created_by,created_by_name,status,current_step,signers_json,stored_name,academic_year,semester) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
            $q->execute([$workflowId, $book['title'], 'other', 'หนังสือรับที่ ' . $book['receipt_no'] . ' จาก ' . $book['sender'], '/api/document_workflows.php?download=' . $workflowId, $book['file_name'], $user['id'], $user['name'], 'pending', 1, json_encode($signers, JSON_UNESCAPED_UNICODE), $stored, $book['academic_year'], $period['semester']]);
        }
        $q = $db->prepare('UPDATE eoffice_incoming SET responsible_id=?, responsible_name=?, workflow_id=? WHERE id=?');
        $q->execute([$personId, $name, $workflowId, $book['id']]);
        $q = $db->prepare('INSERT INTO notifications (user_id,title,message,module,related_id,created_at) VALUES (?,?,?,?,?,NOW())');
        $q->execute([$personId, 'ได้รับมอบหมายหนังสือ e-Office', $book['title'], 'eoffice', $workflowId ?: $book['id']]);
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        if ($path && is_file($path)) unlink($path);
        error_log('eOffice assignment: ' . $e->getMessage());
        api_error('มอบหมายไม่สำเร็จ กรุณาตรวจสอบผู้รับผิดชอบและลองใหม่', 422, 'assignment_failed');
    }
    try {
        require_once __DIR__ . '/line-notifier.php';
        line_notify_linked_users($db, [$personId], 'ได้รับมอบหมายหนังสือ e-Office', ['เรื่อง' => $book['title']]);
    } catch (Throwable $e) { error_log('eOffice LINE: ' . $e->getMessage()); }
    api_respond(['status' => 'success']);
}
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
$pageCountInput=filter_var($_POST['page_count']??1,FILTER_VALIDATE_INT);
$signingPageInput=filter_var($_POST['signing_page']??1,FILTER_VALIDATE_INT);
if ($pageCountInput===false || $pageCountInput<1 || $pageCountInput>10000 || $signingPageInput===false || $signingPageInput<1 || $signingPageInput>$pageCountInput) api_error('หน้าที่ผู้บริหารลงนามต้องอยู่ในจำนวนหน้าทั้งหมด',422,'invalid_page_count');
$file = $_FILES['document'] ?? null;
if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) api_error('กรุณาแนบไฟล์หนังสือ', 422, 'file_required');
if ($file['size'] <= 0 || $file['size'] > 15 * 1024 * 1024) api_error('ไฟล์ต้องไม่เกิน 15 MB', 422, 'file_size');
$extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$types = ['pdf' => ['application/pdf'], 'doc' => ['application/msword', 'application/x-ole-storage'], 'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'], 'jpg' => ['image/jpeg'], 'jpeg' => ['image/jpeg'], 'png' => ['image/png']];
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
if (!isset($types[$extension]) || !in_array($mime, $types[$extension], true)) api_error('รองรับ PDF, Word, JPG และ PNG', 422, 'file_type');
$initialEndorsement=!empty($_POST['initial_endorsement']);
$firstRecipientId=trim((string)($_POST['first_recipient_id']??''));
$firstRecipient=null;
if ($firstRecipientId!=='') {
    $q=$db->prepare("SELECT id,name FROM users WHERE id=? AND status='active'");
    $q->execute([$firstRecipientId]); $firstRecipient=$q->fetch();
    if (!$firstRecipient || $firstRecipientId===(string)$user['id']) api_error('กรุณาเลือกผู้รับเกษียนที่ปฏิบัติงานอยู่',422,'invalid_recipient');
    if ($extension!=='pdf') api_error('กรุณาแนบ PDF สำหรับส่งเกษียน',422,'recipient_requires_pdf');
}
$initialNote=trim((string)($_POST['initial_note']??'- เห็นสมควรเสนอกลุ่มบริหารวิชาการ'));
if (mb_strlen($initialNote)>500 || count(preg_split('/\r\n|\r|\n/',$initialNote))>4) api_error('ข้อความเสนอใส่ได้ไม่เกิน 4 บรรทัด และ 500 ตัวอักษร',422,'initial_note_length');
if ($initialEndorsement && $extension!=='pdf') api_error('กรุณาใช้ PDF สำหรับลงความเห็นเสนอ หรือปิดตัวเลือกลงความเห็นหลังลงทะเบียน',422,'endorsement_requires_pdf');
$extraFiles=[]; $totalSize=(int)$file['size'];
$extraUpload=$_FILES['attachments']??[];
if (!empty($extraUpload) && (!is_array($extraUpload['name']??null) || count($extraUpload['name'])>5)) api_error('แนบไฟล์เพิ่มเติมได้ไม่เกิน 5 ไฟล์',422,'attachment_limit');
foreach (($extraUpload['name']??[]) as $index=>$name) {
    $uploadError=(int)($extraUpload['error'][$index]??UPLOAD_ERR_NO_FILE);
    if ($uploadError===UPLOAD_ERR_NO_FILE) continue;
    if ($uploadError!==UPLOAD_ERR_OK) api_error('อัปโหลดไฟล์เพิ่มเติมไม่สำเร็จ',422,'attachment_upload_error');
    $size=(int)($extraUpload['size'][$index]??0);
    $ext=strtolower(pathinfo((string)$name,PATHINFO_EXTENSION));
    $tmp=(string)($extraUpload['tmp_name'][$index]??'');
    $type=(new finfo(FILEINFO_MIME_TYPE))->file($tmp);
    if ($size<=0 || !isset($types[$ext]) || !in_array($type,$types[$ext],true)) api_error('ไฟล์เพิ่มเติมต้องเป็น PDF, Word, JPG หรือ PNG',422,'attachment_type');
    $totalSize+=$size;
    $extraFiles[]=['name'=>mb_substr(basename((string)$name),0,255),'tmp'=>$tmp,'stored'=>bin2hex(random_bytes(16)) . '.' . $ext];
}
if ($totalSize>15*1024*1024) api_error('ไฟล์หนังสือและไฟล์เพิ่มเติมรวมกันต้องไม่เกิน 15 MB',422,'total_file_size');
$directory = __DIR__ . '/../storage/eoffice';
if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) api_error('เตรียมพื้นที่เก็บไฟล์ไม่สำเร็จ', 500, 'storage_error');
$stored = bin2hex(random_bytes(16)) . '.' . $extension;
if (!move_uploaded_file($file['tmp_name'], $directory . '/' . $stored)) api_error('บันทึกไฟล์ไม่สำเร็จ', 500, 'storage_error');
$initialPath=null; $initialWorkflowId=null;
try {
    $db->beginTransaction();
    $bookId = bin2hex(random_bytes(16));
    $s = $db->prepare('INSERT INTO eoffice_incoming (id, receipt_no, academic_year, book_no, title, sender, book_date, received_date, urgency, details, stored_name, file_name, created_by, created_by_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $s->execute([$bookId, ...array_values($fields), in_array($_POST['urgency'] ?? '', ['normal', 'urgent', 'very_urgent'], true) ? $_POST['urgency'] : 'normal', trim((string) ($_POST['details'] ?? '')), $stored, mb_substr(basename($file['name']), 0, 255), $user['id'], $user['name']]);
    $attachmentInsert=$db->prepare('INSERT INTO eoffice_attachments (id,book_id,stored_name,file_name) VALUES (?,?,?,?)');
    foreach ($extraFiles as $extra) {
        if (!move_uploaded_file($extra['tmp'],$directory . '/' . $extra['stored'])) throw new RuntimeException('บันทึกไฟล์เพิ่มเติมไม่สำเร็จ');
        $attachmentInsert->execute([bin2hex(random_bytes(16)),$bookId,$extra['stored'],$extra['name']]);
    }
    $s = $db->prepare('UPDATE eoffice_incoming SET recipient=?,page_count=?,signing_page=?,stamp_enabled=?,follow_date=? WHERE id=?');
    $pageCount = max(1, min(10000, (int) ($_POST['page_count'] ?? 1)));
    $signingPage = max(1, min($pageCount, (int) ($_POST['signing_page'] ?? 1)));
    $followDate = trim((string) ($_POST['follow_date'] ?? ''));
    if ($followDate !== '' && !eoffice_valid_date($followDate)) throw new RuntimeException('วันที่ติดตามไม่ถูกต้อง');
    $s->execute([mb_substr(trim((string) ($_POST['recipient'] ?? 'ผู้อำนวยการ')),0,255), $pageCount, $signingPage, !empty($_POST['stamp_enabled']) ? 1 : 0, $followDate ?: null, $bookId]);
    eoffice_history($db, $bookId, $user['name'], 'ลงทะเบียนรับ', $fields['receipt_no']);
    if ($initialEndorsement || $firstRecipient) {
        $db->prepare('UPDATE eoffice_incoming SET initial_note=? WHERE id=?')->execute([$initialNote,$bookId]);
        $privateDirectory=dirname(__DIR__,2) . '/private-workflows/' . preg_replace('/[^A-Za-z0-9_-]/','_',$user['id']);
        if (!is_dir($privateDirectory) && !mkdir($privateDirectory,0755,true) && !is_dir($privateDirectory)) throw new RuntimeException('เตรียมพื้นที่เอกสารลงความเห็นไม่สำเร็จ');
        $initialStored=bin2hex(random_bytes(12)) . '.pdf';
        $initialPath=$privateDirectory . '/' . $initialStored;
        if (!copy($directory . '/' . $stored,$initialPath)) throw new RuntimeException('เตรียมเอกสารลงความเห็นไม่สำเร็จ');
        $initialWorkflowId='EO-' . bin2hex(random_bytes(12));
        $signers=$initialEndorsement?[['userId'=>$user['id'],'userName'=>$user['name'],'step'=>1,'status'=>'pending']]:[];
        if ($firstRecipient) $signers[]=['userId'=>$firstRecipient['id'],'userName'=>$firstRecipient['name'],'step'=>count($signers)+1,'status'=>'pending'];
        $period=current_academic_period($db);
        $s=$db->prepare('INSERT INTO document_workflows (id,title,topic,description,file_url,file_name,created_by,created_by_name,status,current_step,signers_json,stored_name,academic_year,semester) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
        $s->execute([$initialWorkflowId,$fields['title'],'other','ลงความเห็นเสนอโดยเจ้าหน้าที่ผู้ลงทะเบียนรับ','/api/document_workflows.php?download=' . $initialWorkflowId,$file['name'],$user['id'],$user['name'],'pending',1,json_encode($signers,JSON_UNESCAPED_UNICODE),$initialStored,$fields['academic_year'],$period['semester']]);
        $s=$db->prepare("UPDATE eoffice_incoming SET workflow_id=?,responsible_id=?,responsible_name=?,stage='routing' WHERE id=?");
        $s->execute([$initialWorkflowId,$signers[0]['userId'],$signers[0]['userName'],$bookId]);
        if ($firstRecipient) eoffice_history($db,$bookId,$user['name'],'เลือกผู้รับเกษียนคนแรก',$firstRecipient['name']);
        if (!$initialEndorsement && $firstRecipient) workflow_notify($db,[$firstRecipient['id']],'มีหนังสือ e-Office รอเกษียน',$fields['title'],$initialWorkflowId);
        eoffice_history($db,$bookId,$user['name'],'เตรียมลงความเห็นเสนอ','รอเจ้าหน้าที่ลงนามและเลือกผู้รับ');
    }
    $db->commit();
} catch (Throwable $e) {
    if ($db->inTransaction()) $db->rollBack();
    unlink($directory . '/' . $stored);
    if ($initialPath && is_file($initialPath)) unlink($initialPath);
    foreach ($extraFiles as $extra) { $extraPath=$directory . '/' . $extra['stored']; if (is_file($extraPath)) unlink($extraPath); }
    if ($e instanceof PDOException && $e->getCode() === '23000') api_error('เลขทะเบียนรับนี้มีอยู่แล้วในปีการศึกษานี้', 409, 'duplicate_receipt');
    throw $e;
}
api_respond(['status' => 'success','id'=>$bookId,'workflowId'=>$initialWorkflowId], 201);
