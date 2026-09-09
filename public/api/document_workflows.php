<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';
set_exception_handler(static function (Throwable $exception): void {
    error_log('Document workflow API: ' . $exception->getMessage());
    api_error('ระบบไม่สามารถบันทึกเอกสารได้ กรุณาลองใหม่อีกครั้ง', 500, 'workflow_server_error');
});
$db = require_database();
$user = require_user();

function workflow_install(PDO $db): void
{
    $db->exec("CREATE TABLE IF NOT EXISTS document_workflows (
        id varchar(64) NOT NULL PRIMARY KEY,
        title varchar(255) NOT NULL,
        topic varchar(30) NOT NULL,
        description text NOT NULL,
        file_url varchar(500) NOT NULL,
        file_name varchar(255) NOT NULL,
        created_by varchar(20) NOT NULL,
        created_by_name varchar(255) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'pending',
        current_step int NOT NULL DEFAULT 1,
        signers_json longtext NOT NULL,
        academic_year varchar(10) NOT NULL DEFAULT '',
        semester varchar(2) NOT NULL DEFAULT '',
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY workflow_creator(created_by),
        KEY workflow_status(status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $columns = [];
    foreach ($db->query('SHOW COLUMNS FROM document_workflows')->fetchAll(PDO::FETCH_ASSOC) as $column) {
        $columns[(string) ($column['Field'] ?? '')] = true;
    }
    $missing = [
        'title' => "ADD COLUMN title varchar(255) NOT NULL DEFAULT ''",
        'topic' => "ADD COLUMN topic varchar(30) NOT NULL DEFAULT 'other'",
        'description' => "ADD COLUMN description text NOT NULL",
        'file_url' => "ADD COLUMN file_url varchar(500) NOT NULL DEFAULT ''",
        'file_name' => "ADD COLUMN file_name varchar(255) NOT NULL DEFAULT ''",
        'stored_name' => "ADD COLUMN stored_name varchar(100) NOT NULL DEFAULT ''",
        'created_by' => "ADD COLUMN created_by varchar(20) NOT NULL DEFAULT ''",
        'created_by_name' => "ADD COLUMN created_by_name varchar(255) NOT NULL DEFAULT ''",
        'status' => "ADD COLUMN status varchar(20) NOT NULL DEFAULT 'pending'",
        'current_step' => "ADD COLUMN current_step int NOT NULL DEFAULT 1",
        'signers_json' => "ADD COLUMN signers_json longtext NOT NULL",
        'academic_year' => "ADD COLUMN academic_year varchar(10) NOT NULL DEFAULT ''",
        'semester' => "ADD COLUMN semester varchar(2) NOT NULL DEFAULT ''",
        'created_at' => "ADD COLUMN created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP",
    ];
    foreach ($missing as $name => $definition) {
        if (!isset($columns[$name])) $db->exec("ALTER TABLE document_workflows {$definition}");
    }
}
workflow_install($db);

function workflow_row(array $row): array
{
    $signers = json_decode((string) ($row['signers_json'] ?? '[]'), true);
    return [
        'id' => (string) ($row['id'] ?? ''),
        'title' => (string) ($row['title'] ?? ''),
        'topic' => (string) ($row['topic'] ?? 'other'),
        'description' => (string) ($row['description'] ?? ''),
        'fileUrl' => (string) ($row['file_url'] ?? ''),
        'fileName' => (string) ($row['file_name'] ?? ''),
        'createdBy' => (string) ($row['created_by'] ?? ''),
        'createdByName' => (string) ($row['created_by_name'] ?? ''),
        'status' => (string) ($row['status'] ?? 'pending'),
        'currentStep' => (int) ($row['current_step'] ?? 1),
        'academicYear' => (string) ($row['academic_year'] ?? ''),
        'semester' => (string) ($row['semester'] ?? ''),
        'signers' => is_array($signers) ? $signers : [],
        'createdAt' => (string) ($row['created_at'] ?? ''),
    ];
}
function workflow_allowed(array $item): bool
{
    global $user;
    if (in_array((string) ($user['role'] ?? ''), ['admin', 'director', 'head', 'deputy_personnel', 'deputy_budget', 'deputy_general'], true)) return true;
    if ($item['createdBy'] === (string) $user['id']) return true;
    foreach ($item['signers'] as $signer) {
        if ((string) ($signer['userId'] ?? '') === (string) $user['id']) return true;
    }
    return false;
}
function workflow_notify(PDO $db, array $userIds, string $title, string $message, string $relatedId): void
{
    $userIds = array_values(array_unique(array_filter(array_map('strval', $userIds))));
    if (!$userIds) return;
    $statement = $db->prepare('INSERT INTO notifications (user_id, title, message, module, related_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())');
    foreach ($userIds as $targetId) $statement->execute([$targetId, $title, $message, 'document_workflow', $relatedId]);
    require_once __DIR__ . '/line-notifier.php';
    line_notify_linked_users($db, $userIds, $title, ['รายละเอียด' => $message]);
}
function workflow_get(PDO $db, string $id, bool $lock = false): array
{
    $query = $db->prepare('SELECT * FROM document_workflows WHERE id = ?' . ($lock ? ' FOR UPDATE' : ''));
    $query->execute([$id]);
    $row = $query->fetch();
    if (!$row) api_error('ไม่พบเอกสาร', 404, 'not_found');
    $item = workflow_row($row);
    if (!workflow_allowed($item)) api_error('คุณไม่มีสิทธิ์เข้าถึงเอกสารนี้', 403, 'forbidden');
    return $item;
}
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    if (isset($_GET['download'])) {
        $row = workflow_get($db, (string) $_GET['download']);
        $safeUser = preg_replace('/[^A-Za-z0-9_-]/', '_', $row['createdBy']);
        $query = $db->prepare('SELECT stored_name FROM document_workflows WHERE id = ?');
        $query->execute([$row['id']]);
        $stored = (string) $query->fetchColumn();
        // Never guess a legacy attachment by choosing the first file in a user's folder.
        if (!preg_match('/^[a-f0-9]{24}\.pdf$/D', $stored)) api_error('เอกสารเดิมไม่มีข้อมูลผูกไฟล์ที่แน่นอน กรุณาส่งเอกสารใหม่เป็น PDF', 409, 'attachment_unlinked');
        $path = dirname(__DIR__, 2) . '/private-workflows/' . $safeUser . '/' . $stored;
        if (!is_file($path)) api_error('ไม่พบไฟล์เอกสาร กรุณาติดต่อผู้ดูแล', 404, 'file_not_found');
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="document.pdf"; filename*=UTF-8\'\'' . rawurlencode($row['fileName']));
        header('Cache-Control: private, no-store');
        header('X-Content-Type-Options: nosniff');
        header('Content-Length: ' . filesize($path));
        readfile($path);
        exit;
    }
    $rows = $db->query('SELECT * FROM document_workflows ORDER BY created_at DESC')->fetchAll();
    api_respond(['status' => 'success', 'data' => array_values(array_filter(array_map('workflow_row', $rows), 'workflow_allowed'))]);
}
require_method('POST');
require_csrf();
$input = $_POST;
if (empty($input) && str_contains((string) ($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) $input = json_body();
$action = (string) ($input['action'] ?? '');

if ($action === 'create') {
    $title = trim((string) ($input['title'] ?? ''));
    $topic = trim((string) ($input['topic'] ?? ''));
    $description = trim((string) ($input['description'] ?? ''));
    $academicYear = preg_replace('/[^0-9]/', '', (string) ($input['academicYear'] ?? '')) ?: '';
    $semester = in_array((string) ($input['semester'] ?? ''), ['1', '2'], true) ? (string) $input['semester'] : '';
    $ids = $input['signerIds'] ?? [];
    if (!is_array($ids)) $ids = [$ids];
    $ids = array_values(array_unique(array_filter(array_map('strval', $ids))));
    if ($title === '' || !in_array($topic, ['lesson_plan', 'plc', 'id_plan', 'sar', 'other'], true) || count($ids) < 1) api_error('กรุณากรอกหัวข้อและเลือกผู้ลงนามอย่างน้อย 1 คน', 422, 'validation_error');
    $file = $_FILES['document'] ?? null;
    if (!is_array($file) || ($file['error'] ?? 1) !== UPLOAD_ERR_OK) api_error('กรุณาแนบเอกสาร', 422, 'document_required');
    if ((int) $file['size'] > 15 * 1024 * 1024) api_error('ไฟล์ต้องมีขนาดไม่เกิน 15 MB', 422, 'document_too_large');
    $extension = strtolower(pathinfo((string) $file['name'], PATHINFO_EXTENSION));
    if ($extension !== 'pdf' || file_get_contents((string) $file['tmp_name'], false, null, 0, 5) !== '%PDF-') api_error('กรุณาแนบ PDF สำหรับอ่านและลงนามบนเอกสารออนไลน์', 422, 'unsupported_document');
    $safeUser = preg_replace('/[^A-Za-z0-9_-]/', '_', (string) $user['id']);
    $directory = dirname(__DIR__, 2) . '/private-workflows/' . $safeUser;
    if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) api_error('สร้างพื้นที่เก็บไฟล์ไม่สำเร็จ', 500, 'upload_failed');
    $storedName = bin2hex(random_bytes(12)) . '.' . $extension;
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $query = $db->prepare("SELECT id, name FROM users WHERE status = 'active' AND id IN ({$placeholders})");
    $query->execute($ids);
    $people = $query->fetchAll();
    $byId = [];
    foreach ($people as $person) $byId[(string) $person['id']] = $person;
    if (count($byId) !== count($ids)) api_error('พบผู้ลงนามบางรายไม่พร้อมใช้งาน', 422, 'invalid_signers');
    $signers = [];
    foreach ($ids as $index => $id) $signers[] = ['userId' => $id, 'userName' => $byId[$id]['name'], 'step' => $index + 1, 'status' => 'pending'];
    $id = 'DOC-' . date('YmdHis') . '-' . strtoupper(bin2hex(random_bytes(3)));
    if (!move_uploaded_file((string) $file['tmp_name'], $directory . '/' . $storedName)) api_error('บันทึกไฟล์ไม่สำเร็จ', 500, 'upload_failed');
    try {
        $query = $db->prepare('INSERT INTO document_workflows (id,title,topic,description,file_url,file_name,created_by,created_by_name,status,current_step,signers_json,stored_name,academic_year,semester) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
        $query->execute([$id, $title, $topic, $description, '/api/document_workflows.php?download=' . $id, (string) $file['name'], $user['id'], $user['name'], 'pending', 1, json_encode($signers, JSON_UNESCAPED_UNICODE), $storedName, $academicYear, $semester]);
        // Notify only the first signer. The next signer is notified after the
        // current signer completes their step, so people never receive a
        // request before it is their turn.
        $firstSigner = (string) ($ids[0] ?? '');
        workflow_notify($db, [$firstSigner], 'มีเอกสารรอให้ลงนาม', "{$title} จาก {$user['name']} กรุณาตรวจสอบและลงนามตามลำดับที่ 1", $id);
    } catch (Throwable $e) {
        unlink($directory . '/' . $storedName);
        throw $e;
    }
    api_respond(['status' => 'success', 'data' => workflow_get($db, $id)], 201);
}

$id = (string) ($input['id'] ?? '');
if (!in_array($action, ['sign', 'reject'], true)) api_error('ไม่รู้จักคำสั่งที่ร้องขอ', 400, 'invalid_action');
$db->beginTransaction();
$item = workflow_get($db, $id, true);
if (!in_array($item['status'], ['pending', 'in_review'], true)) api_error('เอกสารนี้ปิดการดำเนินการแล้ว', 409, 'workflow_closed');
$signers = $item['signers'];
$index = -1;
foreach ($signers as $i => $signer) {
    if ((string) ($signer['userId'] ?? '') === (string) $user['id'] && (int) ($signer['step'] ?? 0) === $item['currentStep'] && ($signer['status'] ?? '') === 'pending') { $index = $i; break; }
}
if ($index < 0) api_error('ยังไม่ถึงลำดับการลงนามของคุณ', 403, 'not_current_signer');
if ($action === 'sign') {
    $signature = (string) ($input['signatureData'] ?? '');
    if (strlen($signature) > 200000 || !str_starts_with($signature, 'data:image/png;base64,')) api_error('กรุณาวาดลายเซ็นใหม่', 422, 'invalid_signature');
    $bytes = base64_decode(substr($signature, 22), true);
    $dimensions = $bytes === false ? false : @getimagesizefromstring($bytes);
    if (!$dimensions || $dimensions[2] !== IMAGETYPE_PNG || $dimensions[0] !== 600 || $dimensions[1] !== 200) api_error('รูปแบบลายเซ็นไม่ถูกต้อง', 422, 'invalid_signature');
    $p = $input['placement'] ?? null;
    if (!is_array($p) || !is_int($p['page'] ?? null) || $p['page'] < 1 || $p['page'] > 10000) api_error('กรุณาเลือกหน้าลงนาม', 422, 'invalid_placement');
    foreach (['x', 'y', 'width', 'height'] as $key) {
        if (!isset($p[$key]) || !is_numeric($p[$key]) || !is_finite((float) $p[$key]) || $p[$key] < 0 || $p[$key] > 1) api_error('ตำแหน่งลายเซ็นไม่ถูกต้อง', 422, 'invalid_placement');
        $p[$key] = (float) $p[$key];
    }
    if ($p['width'] <= 0 || $p['height'] <= 0 || $p['x'] + $p['width'] > 1.000001 || $p['y'] + $p['height'] > 1.000001) api_error('ลายเซ็นอยู่นอกหน้าเอกสาร', 422, 'invalid_placement');
    $signers[$index]['placement'] = array_intersect_key($p, array_flip(['page', 'x', 'y', 'width', 'height']));
    $signers[$index]['status'] = 'signed';
    $signers[$index]['signedAt'] = date('c');
    $signers[$index]['signatureData'] = $signature;
    $signers[$index]['comment'] = trim((string) ($input['comment'] ?? ''));
    $checkmarks = $input['checkmarks'] ?? [];
    if (!is_array($checkmarks)) $checkmarks = [];
    $signers[$index]['checkmarks'] = [
        'noted' => filter_var($checkmarks['noted'] ?? false, FILTER_VALIDATE_BOOLEAN),
        'approved' => filter_var($checkmarks['approved'] ?? false, FILTER_VALIDATE_BOOLEAN),
    ];
    $next = $item['currentStep'] + 1;
    $status = $next > count($signers) ? 'completed' : 'in_review';
    $query = $db->prepare('UPDATE document_workflows SET signers_json = ?, current_step = ?, status = ? WHERE id = ?');
    $query->execute([json_encode($signers, JSON_UNESCAPED_UNICODE), $next, $status, $id]);
    $notifyIds = [];
    if ($next <= count($signers)) $notifyIds[] = (string) ($signers[$next - 1]['userId'] ?? '');
    if ($status === 'completed') $notifyIds[] = $item['createdBy'];
    workflow_notify($db, $notifyIds, $status === 'completed' ? 'ลงนามเอกสารครบแล้ว' : 'มีเอกสารรอลงนามลำดับถัดไป', $item['title'], $id);
    $db->commit();
    api_respond(['status' => 'success', 'data' => workflow_get($db, $id)]);
}
if ($action === 'reject') {
    $signers[$index]['status'] = 'rejected';
    $signers[$index]['comment'] = trim((string) ($input['comment'] ?? ''));
    $query = $db->prepare('UPDATE document_workflows SET signers_json = ?, status = ? WHERE id = ?');
    $query->execute([json_encode($signers, JSON_UNESCAPED_UNICODE), 'rejected', $id]);
    workflow_notify($db, [$item['createdBy']], 'เอกสารถูกส่งกลับแก้ไข', $item['title'] . ' — ' . trim((string) ($input['comment'] ?? '')), $id);
    $db->commit();
    api_respond(['status' => 'success', 'data' => workflow_get($db, $id)]);
}
api_error('ไม่รู้จักคำสั่งที่ร้องขอ', 400, 'invalid_action');
