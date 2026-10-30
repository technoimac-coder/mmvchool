<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/document-upload.php';
require_once __DIR__ . '/document-workflow-access.php';
require_once __DIR__ . '/document-workflow-period.php';
require_once __DIR__ . '/document-workflow-revisions.php';
require_once __DIR__ . '/document-workflow-notification.php';
require_once __DIR__ . '/document-workflow-trash.php';
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
        batch_id varchar(64) DEFAULT NULL,
        batch_notified tinyint(1) NOT NULL DEFAULT 0,
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
        'batch_id' => "ADD COLUMN batch_id varchar(64) DEFAULT NULL",
        'batch_notified' => "ADD COLUMN batch_notified tinyint(1) NOT NULL DEFAULT 0",
        'created_at' => "ADD COLUMN created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP",
    ];
    foreach ($missing as $name => $definition) {
        if (!isset($columns[$name])) $db->exec("ALTER TABLE document_workflows {$definition}");
    }
    workflow_install_period_storage($db);
    workflow_install_revisions($db);
    workflow_install_trash($db);
    $db->exec("CREATE TABLE IF NOT EXISTS approval_pipelines (
        pipeline_id varchar(80) NOT NULL PRIMARY KEY,
        pipeline_json longtext NOT NULL,
        updated_by varchar(20) DEFAULT NULL,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}
workflow_install($db);

function workflow_row(array $row): array
{
    $signers = json_decode((string) ($row['signers_json'] ?? '[]'), true);
    return [
        'id' => (string) ($row['id'] ?? ''),
        'batchId' => (string) ($row['batch_id'] ?? ''),
        'fileVersion' => (int) ($row['file_version'] ?? 1),
        'deletedAt' => $row['deleted_at'] ?? null,
        'lifecycleVersion' => (int) ($row['lifecycle_version'] ?? 0),
        'resubmittedAt' => $row['resubmitted_at'] ?? null,
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
        'fiscalYear' => isset($row['fiscal_year']) ? (string) $row['fiscal_year'] : null,
        'signers' => is_array($signers) ? $signers : [],
        'createdAt' => (string) ($row['created_at'] ?? ''),
    ];
}
function workflow_document_reviewer_ids(PDO $db): array
{
    static $reviewerIds = null;
    if (is_array($reviewerIds)) return $reviewerIds;
    $query = $db->prepare('SELECT pipeline_json FROM approval_pipelines WHERE pipeline_id = ? LIMIT 1');
    $query->execute(['pipe-document-review']);
    $pipelineJson = $query->fetchColumn();
    if (!is_string($pipelineJson) || $pipelineJson === '') return $reviewerIds = ['MMV02'];
    $pipeline = json_decode($pipelineJson, true);
    $steps = is_array($pipeline['steps'] ?? null) ? $pipeline['steps'] : [];
    $reviewerIds = [];
    foreach ($steps as $step) {
        $reviewerId = trim((string) ($step['assignedUserId'] ?? ''));
        if ($reviewerId !== '') $reviewerIds[] = $reviewerId;
    }
    return array_values(array_unique($reviewerIds));
}
function workflow_allowed(array $item): bool
{
    global $user, $db;
    if (is_executive_role($user)) return true;
    if (!str_starts_with($item['id'], 'EO-') && in_array((string) ($user['id'] ?? ''), workflow_document_reviewer_ids($db), true)) return true;
    if ($item['createdBy'] === (string) $user['id']) return true;
    foreach ($item['signers'] as $signer) {
        if ((string) ($signer['userId'] ?? '') === (string) $user['id']) return true;
    }
    if (str_starts_with($item['id'], 'EO-')) {
        if (in_array($user['role'], ['admin','academic_affairs'],true)) return true;
        if (!$db->query("SHOW TABLES LIKE 'eoffice_tasks'")->fetchColumn()) return false;
        $q = $db->prepare('SELECT 1 FROM eoffice_incoming b INNER JOIN eoffice_tasks t ON t.book_id=b.id WHERE b.workflow_id=? AND t.user_id=? LIMIT 1');
        $q->execute([$item['id'],$user['id']]);
        if ($q->fetchColumn()) return true;
    }
    foreach ($item['signers'] as $signer) {
        if ((string) ($signer['userId'] ?? '') === (string) $user['id']) return true;
    }
    return false;
}
function workflow_validate_comment_image(string $commentImage): string
{
    if ($commentImage === '') return '';
    if (!str_starts_with($commentImage, 'data:image/png;base64,')) {
        api_error('ลายมือต้องเป็นภาพ PNG ที่สร้างจากหน้าเอกสาร กรุณาเขียนใหม่', 422, 'invalid_comment_image');
    }
    $commentBytes = base64_decode(substr($commentImage, 22), true);
    if ($commentBytes === false || strlen($commentBytes) > 2 * 1024 * 1024) {
        api_error('ภาพลายมือต้องมีขนาดไม่เกิน 2 MB กรุณาลบเส้นที่ไม่จำเป็นแล้วลองใหม่', 422, 'invalid_comment_image_size');
    }
    $commentDimensions = @getimagesizefromstring($commentBytes);
    $width = (int) ($commentDimensions[0] ?? 0);
    $height = (int) ($commentDimensions[1] ?? 0);
    if (!$commentDimensions || ($commentDimensions[2] ?? null) !== IMAGETYPE_PNG || $width < 100 || $height < 100 || $width > 4096 || $height > 4096) {
        api_error('ภาพลายมือต้องเป็น PNG ขนาดด้านละ 100–4,096 พิกเซล กรุณาเขียนใหม่บนหน้า PDF', 422, 'invalid_comment_image_dimensions');
    }
    return $commentImage;
}

function workflow_validate_placement(mixed $value, bool $allowTextStyle = false): array
{
    if (!is_array($value) || !is_int($value['page'] ?? null) || $value['page'] < 1 || $value['page'] > 10000) {
        api_error('ตำแหน่งบนเอกสารไม่ถูกต้อง', 422, 'invalid_placement');
    }
    $stored = ['page' => $value['page']];
    foreach (['x', 'y', 'width', 'height'] as $key) {
        if (!isset($value[$key]) || !is_numeric($value[$key]) || !is_finite((float) $value[$key]) || $value[$key] < 0 || $value[$key] > 1) {
            api_error('ตำแหน่งบนเอกสารไม่ถูกต้อง', 422, 'invalid_placement');
        }
        $stored[$key] = (float) $value[$key];
    }
    if ($stored['width'] <= 0 || $stored['height'] <= 0 || $stored['x'] + $stored['width'] > 1.000001 || $stored['y'] + $stored['height'] > 1.000001) {
        api_error('ตำแหน่งอยู่นอกหน้าเอกสาร', 422, 'invalid_placement');
    }
    if ($allowTextStyle) {
        if (isset($value['fontSize']) && is_numeric($value['fontSize'])) $stored['fontSize'] = max(8, min(32, (float) $value['fontSize']));
        if (in_array($value['textAlign'] ?? '', ['left', 'center', 'right'], true)) $stored['textAlign'] = $value['textAlign'];
    }
    return $stored;
}
function workflow_notify(PDO $db, array $userIds, string $title, string $message, string $relatedId, array $lineFields = []): void
{
    $userIds = array_values(array_unique(array_filter(array_map('strval', $userIds))));
    if (!$userIds) return;
    $isEoffice = str_starts_with($relatedId, 'EO-');
    $module = $isEoffice ? 'eoffice' : 'document_workflow';
    if ($isEoffice) $title = 'e-Office: ' . $title;
    $statement = $db->prepare('INSERT INTO notifications (user_id, title, message, module, related_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())');
    foreach ($userIds as $targetId) $statement->execute([$targetId, $title, $message, $module, $relatedId]);
    require_once __DIR__ . '/line-notifier.php';
    line_notify_linked_users($db, $userIds, $title, $lineFields ?: ['รายละเอียด' => $message]);
}
function workflow_get(PDO $db, string $id, bool $lock = false): array
{
    $query = $db->prepare('SELECT * FROM document_workflows WHERE id = ?' . ($lock ? ' FOR UPDATE' : ''));
    $query->execute([$id]);
    $row = $query->fetch();
    if (!$row) api_error('ไม่พบเอกสาร', 404, 'not_found');
    $item = workflow_row($row);
    if (!workflow_allowed($item)) api_error('คุณไม่มีสิทธิ์เข้าถึงเอกสารนี้', 403, 'forbidden');
    try { workflow_assert_live($item); }
    catch (WorkflowRevisionError $exception) { api_error($exception->getMessage(), $exception->httpStatus, $exception->errorCode); }
    return $item;
}
if (defined('MMV_WORKFLOW_LIBRARY_ONLY')) return;
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    if (($_GET['trash'] ?? '') === '1') api_error('เอกสารที่ลบไม่สามารถนำกลับคืนได้ กรุณาส่งเอกสารใหม่', 410, 'document_restore_disabled');
    if (isset($_GET['history'])) {
        $item = workflow_get($db, (string) $_GET['history']);
        $query = $db->prepare('SELECT version,snapshot_json,replaced_at FROM document_workflow_revisions WHERE workflow_id = ? ORDER BY version DESC');
        $query->execute([$item['id']]);
        $history = [];
        $revisions = $query->fetchAll(PDO::FETCH_ASSOC);
        $submissionTimes = array_column($revisions, 'replaced_at', 'version');
        foreach ($revisions as $revision) {
            $snapshot = json_decode((string) $revision['snapshot_json'], true);
            if (!is_array($snapshot)) continue;
            $document = workflow_row($snapshot);
            if ((int) $revision['version'] > 1 && !$document['resubmittedAt']) $document['resubmittedAt'] = $submissionTimes[(int) $revision['version'] - 1] ?? null;
            $document['fileUrl'] = '/api/document_workflows.php?download=' . rawurlencode($item['id']) . '&version=' . (int) $revision['version'];
            $history[] = ['version' => (int) $revision['version'], 'replacedAt' => $revision['replaced_at'], 'document' => $document];
        }
        api_respond(['status' => 'success', 'data' => $history]);
    }
    if (isset($_GET['download'])) {
        $row = workflow_get($db, (string) $_GET['download']);
        $safeUser = preg_replace('/[^A-Za-z0-9_-]/', '_', $row['createdBy']);
        $query = $db->prepare('SELECT stored_name FROM document_workflows WHERE id = ?');
        $query->execute([$row['id']]);
        $stored = (string) $query->fetchColumn();
        if (isset($_GET['version'])) {
            $version = filter_var($_GET['version'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
            if ($version === false) api_error('รุ่นเอกสารไม่ถูกต้อง', 422, 'invalid_version');
            if ($version !== $row['fileVersion']) {
                $query = $db->prepare('SELECT stored_name,file_name FROM document_workflow_revisions WHERE workflow_id=? AND version=?');
                $query->execute([$row['id'], $version]);
                $revision = $query->fetch(PDO::FETCH_ASSOC);
                if (!$revision) api_error('ไม่พบเอกสารฉบับที่เลือก', 404, 'revision_not_found');
                $stored = (string) $revision['stored_name'];
                $row['fileName'] = (string) $revision['file_name'];
            }
        }
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
    // Each work area requests only its own records. Signing still shares the
    // same engine and permission checks for individual documents.
    $isEoffice = ($_GET['source'] ?? '') === 'eoffice';
    $query = $db->prepare('SELECT * FROM document_workflows WHERE deleted_at IS NULL AND id ' . ($isEoffice ? 'LIKE' : 'NOT LIKE') . ' ? ORDER BY created_at DESC');
    $query->execute(['EO-%']);
    $rows = $query->fetchAll();
    $personalOnly = ($_GET['scope'] ?? '') === 'personal';
    $visibleRows = array_filter(array_map('workflow_row', $rows), static function (array $item) use ($personalOnly, $user): bool {
        return (!$personalOnly || workflow_is_participant($item, (string) $user['id'])) && workflow_allowed($item);
    });
    api_respond(['status' => 'success', 'data' => array_values($visibleRows)]);
}
require_method('POST');
require_csrf();
$input = $_POST;
if (empty($_POST) && empty($_FILES) && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0 && str_contains((string) ($_SERVER['CONTENT_TYPE'] ?? ''), 'multipart/form-data')) api_error('ขนาดไฟล์เกินค่าที่เซิร์ฟเวอร์อนุญาต กรุณาแจ้งผู้ดูแลตรวจสอบ post_max_size และ upload_max_filesize', 413, 'upload_limit_exceeded');
if (empty($input) && str_contains((string) ($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) $input = json_body();
$action = (string) ($input['action'] ?? '');

if ($action === 'notify_batch') {
    $batchId = trim((string) ($input['batchId'] ?? ''));
    if (!preg_match('/^[A-Za-z0-9_-]{8,64}$/D', $batchId)) api_error('รหัสชุดเอกสารไม่ถูกต้อง', 422, 'invalid_batch_id');
    $db->beginTransaction();
    try {
        $query = $db->prepare('SELECT id,title,topic,created_by_name,signers_json FROM document_workflows WHERE batch_id = ? AND created_by = ? AND batch_notified = 0 AND deleted_at IS NULL ORDER BY created_at,id FOR UPDATE');
        $query->execute([$batchId, $user['id']]);
        $rows = $query->fetchAll(PDO::FETCH_ASSOC);
        if (!$rows) {
            $db->commit();
            api_respond(['status' => 'success', 'data' => ['notified' => 0]]);
        }
        $buckets = [];
        foreach ($rows as $row) {
            $signers = json_decode((string) ($row['signers_json'] ?? '[]'), true);
            $firstSigner = is_array($signers) ? (string) ($signers[0]['userId'] ?? '') : '';
            if ($firstSigner === '') continue;
            $topic = (string) ($row['topic'] ?? 'other');
            $key = $topic . ':' . $firstSigner;
            if (!isset($buckets[$key])) $buckets[$key] = ['topic' => $topic, 'signer' => $firstSigner, 'rows' => []];
            $buckets[$key]['rows'][] = $row;
        }
        if (!$buckets) {
            $db->rollBack();
            api_error('ไม่พบผู้ลงนามลำดับแรกของชุดเอกสาร', 422, 'missing_signer');
        }
        $topicLabels = [
            'lesson_plan_before' => 'แผนการสอน (ก่อนบันทึกหลังแผน)', 'lesson_plan' => 'แผนการสอน (บันทึกหลังแผน)',
            'learner_quality' => 'รายงานการพัฒนาคุณภาพผู้เรียน', 'course_plan' => 'โครงการสอน',
            'classroom_research' => 'วิจัยในชั้นเรียน', 'substitute_report' => 'รายงานการสอนแทน',
            'plc_setup' => 'บันทึกการจัดตั้งกลุ่ม PLC', 'plc' => 'กิจกรรมชุมชนการเรียนรู้ทางวิชาชีพ (PLC)',
            'innovation_report' => 'รายงานนวัตกรรม', 'id_plan' => 'ID PLAN', 'sar' => 'SAR รายบุคคล', 'other' => 'เอกสาร',
        ];
        $notified = 0;
        $markedIds = [];
        foreach ($buckets as $bucket) {
            $items = $bucket['rows'];
            $count = count($items);
            $label = $topicLabels[$bucket['topic']] ?? 'เอกสาร';
            $title = $count > 1
                ? (($bucket['topic'] === 'lesson_plan' || $bucket['topic'] === 'lesson_plan_before') ? "มีแผนการสอนรอลงนาม {$count} ไฟล์" : "มีเอกสารรอลงนาม {$count} ไฟล์")
                : 'มีเอกสารรอให้ลงนาม';
            $message = $count > 1
                ? "คุณมี{$label}จำนวน {$count} ไฟล์ จาก {$items[0]['created_by_name']} กรุณาตรวจสอบและลงนามตามลำดับ"
                : "{$items[0]['title']} จาก {$items[0]['created_by_name']} กรุณาตรวจสอบและลงนามตามลำดับที่ 1";
            workflow_notify($db, [$bucket['signer']], $title, $message, (string) $items[0]['id']);
            foreach ($items as $item) $markedIds[] = (string) $item['id'];
            $notified++;
        }
        if ($markedIds) {
            $placeholders = implode(',', array_fill(0, count($markedIds), '?'));
            $update = $db->prepare("UPDATE document_workflows SET batch_notified = 1 WHERE id IN ({$placeholders}) AND created_by = ?");
            $update->execute([...$markedIds, $user['id']]);
        }
        $db->commit();
        api_respond(['status' => 'success', 'data' => ['notified' => $notified]]);
    } catch (Throwable $exception) {
        if ($db->inTransaction()) $db->rollBack();
        throw $exception;
    }
}
if ($action === 'create') {
    try {
        $requestId = document_upload_request_id((string) $user['id'], (string) ($input['clientRequestId'] ?? ''));
    } catch (InvalidArgumentException $exception) {
        api_error($exception->getMessage(), 422, 'invalid_request_id');
    }
    if ($requestId !== null) {
        $existing = $db->prepare('SELECT id FROM document_workflows WHERE id = ? AND created_by = ?');
        $existing->execute([$requestId, $user['id']]);
        if ($existing->fetchColumn()) api_respond(['status' => 'success', 'data' => workflow_get($db, $requestId)]);
    }
    $title = trim((string) ($input['title'] ?? ''));
    $topic = trim((string) ($input['topic'] ?? ''));
    $description = trim((string) ($input['description'] ?? ''));
    $batchId = trim((string) ($input['batchId'] ?? ''));
    if ($batchId !== '' && !preg_match('/^[A-Za-z0-9_-]{8,64}$/D', $batchId)) api_error('รหัสชุดเอกสารไม่ถูกต้อง', 422, 'invalid_batch_id');
    // The active academic period is managed centrally by administrators.
    // Do not trust values sent by the browser, so every new workflow is
    // stored against the current system period.
    $academicPeriod = current_academic_period($db);
    $academicYear = preg_replace('/[^0-9]/', '', (string) ($academicPeriod['academicYear'] ?? '')) ?: '';
    // Teachers may choose which semester the document belongs to, while the
    // academic year always comes from the administrator-managed system period.
    $semester = in_array((string) ($input['semester'] ?? ''), ['1', '2'], true)
        ? (string) $input['semester']
        : '';
    $ids = $input['signerIds'] ?? [];
    if (!is_array($ids)) $ids = [$ids];
    $ids = array_values(array_unique(array_filter(array_map('strval', $ids))));
    $allowedTopics = ['lesson_plan_before', 'lesson_plan', 'learner_quality', 'course_plan', 'classroom_research', 'substitute_report', 'plc_setup', 'plc', 'innovation_report', 'id_plan', 'sar', 'other'];
    if (mb_strlen($title) > 255 || mb_strlen($description) > 4000) api_error('กรุณากรอกชื่อเรื่องไม่เกิน 255 ตัวอักษร และรายละเอียดไม่เกิน 4000 ตัวอักษร', 422, 'invalid_metadata');
    if ($title === '' || !in_array($topic, $allowedTopics, true) || count($ids) < 1) api_error('กรุณากรอกหัวข้อและเลือกผู้ลงนามอย่างน้อย 1 คน', 422, 'validation_error');
    $file = $_FILES['document'] ?? null;
    if (is_array($file) && in_array((int) ($file['error'] ?? UPLOAD_ERR_NO_FILE), [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) api_error('ไฟล์เกินขนาดที่เซิร์ฟเวอร์อนุญาต กรุณาลดขนาด PDF หรือแจ้งผู้ดูแลตรวจสอบค่าอัปโหลด', 413, 'upload_limit_exceeded');
    if (is_array($file) && (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_PARTIAL) api_error('อัปโหลดไฟล์ไม่ครบ กรุณาส่งไฟล์นี้ใหม่', 422, 'upload_incomplete');
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
    $id = $requestId ?? 'DOC-' . date('YmdHis') . '-' . strtoupper(bin2hex(random_bytes(3)));
    if (!move_uploaded_file((string) $file['tmp_name'], $directory . '/' . $storedName)) api_error('บันทึกไฟล์ไม่สำเร็จ', 500, 'upload_failed');
    try {
        $query = $db->prepare('INSERT INTO document_workflows (id,title,topic,description,file_url,file_name,created_by,created_by_name,status,current_step,signers_json,stored_name,academic_year,semester,fiscal_year,batch_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
        $query->execute([$id, $title, $topic, $description, '/api/document_workflows.php?download=' . $id, (string) $file['name'], $user['id'], $user['name'], 'pending', 1, json_encode($signers, JSON_UNESCAPED_UNICODE), $storedName, $academicYear, $semester, workflow_fiscal_year($topic, $academicYear, $semester), $batchId !== '' ? $batchId : null]);
    } catch (Throwable $e) {
        unlink($directory . '/' . $storedName);
        // A concurrent retry can lose the primary-key race. Return the original
        // workflow and do not notify its signers twice.
        if ($requestId !== null) {
            $existing = $db->prepare('SELECT id FROM document_workflows WHERE id = ? AND created_by = ?');
            $existing->execute([$requestId, $user['id']]);
            if ($existing->fetchColumn()) api_respond(['status' => 'success', 'data' => workflow_get($db, $requestId)]);
        }
        throw $e;
    }
    // Keep a successfully stored document even if notification delivery fails.
    // Only the request that inserted the row sends the first-signer notification.
    $firstSigner = (string) ($ids[0] ?? '');
    if ($batchId === '') {
        try {
            workflow_notify($db, [$firstSigner], 'มีเอกสารรอให้ลงนาม', "{$title} จาก {$user['name']} กรุณาตรวจสอบและลงนามตามลำดับที่ 1", $id);
        } catch (Throwable $exception) {
            error_log('Document workflow notification: ' . $exception->getMessage());
        }
    }
    api_respond(['status' => 'success', 'data' => workflow_get($db, $id)], 201);
}

$id = (string) ($input['id'] ?? '');
if ($action === 'restore_submission') api_error('เอกสารที่ลบไม่สามารถนำกลับคืนได้ กรุณาส่งเอกสารใหม่', 410, 'document_restore_disabled');
if ($action === 'delete_submission') {
    try {
        $result = workflow_delete_submission($db, $user, $id, (int) ($input['fileVersion'] ?? 1), (int) ($input['lifecycleVersion'] ?? 0));
    } catch (WorkflowRevisionError $exception) {
        api_error($exception->getMessage(), $exception->httpStatus, $exception->errorCode);
    }
    $updated = workflow_row($result['row']);
    if ($result['changed']) {
        try {
            workflow_notify($db, [(string) $updated['signers'][0]['userId']],
                'ผู้ส่งลบเอกสารแล้ว',
                'ไฟล์: ' . $updated['fileName'] . ' — ' . $updated['title'] . ' จาก ' . $updated['createdByName'] .
                ' ผู้ส่งลบเอกสารแล้ว', $id);
        } catch (Throwable $exception) { error_log('Document trash notification: ' . $exception->getMessage()); }
    }
    api_respond(['status' => 'success', 'data' => $updated]);
}

if (in_array($action, ['resubmit', 'correct_submission', 'update_metadata'], true)) {
    // Older cached clients use this JSON action. Route it through the same locked,
    // versioned correction path and give retries the same deterministic UUID.
    if ($action === 'update_metadata' && empty($input['clientRequestId'])) {
        $retryHash = hash('sha256', json_encode([$user['id'], $id, $input['fileVersion'] ?? 1, $input['title'] ?? '', $input['description'] ?? '']));
        $input['clientRequestId'] = substr($retryHash, 0, 8) . '-' . substr($retryHash, 8, 4) . '-4' . substr($retryHash, 13, 3) . '-8' . substr($retryHash, 17, 3) . '-' . substr($retryHash, 20, 12);
    }
    try {
        $result = workflow_resubmit($db, $user, $id, is_array($_FILES['document'] ?? null) ? $_FILES['document'] : null,
            (string) ($input['clientRequestId'] ?? ''), (int) ($input['fileVersion'] ?? 1), dirname(__DIR__, 2) . '/private-workflows', null,
            $action !== 'resubmit' ? $input : null);
    } catch (WorkflowRevisionError $exception) {
        api_error($exception->getMessage(), $exception->httpStatus, $exception->errorCode);
    }
    $updated = workflow_row($result['row']);
    if ($result['changed']) {
        try {
            workflow_notify($db, [(string) $updated['signers'][0]['userId']],
                $action !== 'resubmit' ? 'เอกสารที่รอลงนามมีการแก้ไข' : 'มีเอกสารฉบับแก้ไขรอให้ลงนาม',
                'ไฟล์: ' . $updated['fileName'] . ' — ' . $updated['title'] . ' จาก ' . $updated['createdByName'] . ' — ฉบับที่ ' . $updated['fileVersion'] . ' กรุณาเปิดข้อมูลล่าสุดและลงนามตามลำดับที่ 1', $id);
        } catch (Throwable $exception) { error_log('Document resubmission notification: ' . $exception->getMessage()); }
    }
    api_respond(['status' => 'success', 'data' => $updated]);
}
if (!in_array($action, ['sign', 'reject'], true)) api_error('ไม่รู้จักคำสั่งที่ร้องขอ', 400, 'invalid_action');
$db->beginTransaction();
$item = workflow_get($db, $id, true);
try { workflow_assert_file_version($item, (int) ($input['fileVersion'] ?? 1)); }
catch (WorkflowRevisionError $exception) { $db->rollBack(); api_error($exception->getMessage(), $exception->httpStatus, $exception->errorCode); }
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
    $primaryPlacement = workflow_validate_placement($p);
    $placementInputs = $input['placements'] ?? [$p];
    if (!is_array($placementInputs) || count($placementInputs) < 1 || count($placementInputs) > 50) api_error('ลงลายเซ็นได้ไม่เกิน 50 ตำแหน่ง', 422, 'invalid_placements');
    $storedPlacements = array_map(fn ($placement) => workflow_validate_placement($placement), array_values($placementInputs));
    $signers[$index]['placement'] = $primaryPlacement;
    $signers[$index]['placements'] = $storedPlacements;
    foreach (['commentPlacement', 'textPlacement', 'checkmarksPlacement'] as $annotationKey) {
        if (isset($p[$annotationKey]) && is_array($p[$annotationKey])) {
            $ap = $p[$annotationKey];
            if (!is_int($ap['page'] ?? null) || $ap['page'] < 1 || $ap['page'] > 10000) api_error('ตำแหน่งข้อความหรือเครื่องหมายไม่ถูกต้อง', 422, 'invalid_annotation_placement');
            foreach (['x', 'y', 'width', 'height'] as $key) {
                if (!isset($ap[$key]) || !is_numeric($ap[$key]) || !is_finite((float) $ap[$key]) || $ap[$key] < 0 || $ap[$key] > 1) api_error('ตำแหน่งข้อความหรือเครื่องหมายไม่ถูกต้อง', 422, 'invalid_annotation_placement');
            }
            if ($ap['width'] <= 0 || $ap['height'] <= 0 || $ap['x'] + $ap['width'] > 1.000001 || $ap['y'] + $ap['height'] > 1.000001) api_error('ข้อความหรือเครื่องหมายอยู่นอกหน้าเอกสาร', 422, 'invalid_annotation_placement');
            $storedPlacement = array_intersect_key($ap, array_flip(['page', 'x', 'y', 'width', 'height']));
            if (in_array($annotationKey, ['commentPlacement', 'textPlacement'], true) && isset($ap['fontSize']) && is_numeric($ap['fontSize'])) $storedPlacement['fontSize'] = max(8, min(32, (float) $ap['fontSize']));
            if ($annotationKey === 'textPlacement' && in_array($ap['textAlign'] ?? '', ['left', 'center', 'right'], true)) $storedPlacement['textAlign'] = $ap['textAlign'];
            $signers[$index][$annotationKey] = $storedPlacement;
        }
    }
    $signers[$index]['status'] = 'signed';
    $signers[$index]['signedAt'] = date('c');
    $signers[$index]['signatureData'] = $signature;
    $signers[$index]['comment'] = trim((string) ($input['comment'] ?? ''));
    $commentImage = workflow_validate_comment_image((string) ($input['commentImage'] ?? ''));
    if ($commentImage !== '') {
        $signers[$index]['commentImage'] = $commentImage;
    } else {
        unset($signers[$index]['commentImage']);
    }
    $textAnnotationInputs = $input['textAnnotations'] ?? [];
    if (!is_array($textAnnotationInputs) || count($textAnnotationInputs) > 100) api_error('เพิ่มข้อความได้ไม่เกิน 100 รายการ', 422, 'invalid_text_annotations');
    $storedTextAnnotations = [];
    foreach ($textAnnotationInputs as $annotation) {
        if (!is_array($annotation)) api_error('ข้อมูลข้อความบนเอกสารไม่ถูกต้อง', 422, 'invalid_text_annotations');
        $text = trim((string) ($annotation['text'] ?? ''));
        if ($text === '' || mb_strlen($text) > 500) api_error('ข้อความแต่ละรายการต้องมี 1–500 ตัวอักษร', 422, 'invalid_text_annotations');
        $storedTextAnnotations[] = ['text' => $text, 'placement' => workflow_validate_placement($annotation['placement'] ?? null, true)];
    }
    if ($storedTextAnnotations) $signers[$index]['textAnnotations'] = $storedTextAnnotations;
    $checkmarks = $input['checkmarks'] ?? [];
    if (!is_array($checkmarks)) $checkmarks = [];
    $signers[$index]['checkmarks'] = [
        'noted' => filter_var($checkmarks['noted'] ?? false, FILTER_VALIDATE_BOOLEAN),
        'approved' => filter_var($checkmarks['approved'] ?? false, FILTER_VALIDATE_BOOLEAN),
    ];
    $forwardResult=['targets'=>[]];
    if (str_starts_with($id,'EO-') && isset($input['eofficeForward'])) {
        try {
            if (!is_array($input['eofficeForward'])) throw new RuntimeException('ข้อมูลส่งต่อไม่ถูกต้อง');
            require_once __DIR__ . '/eoffice-sign-forward.php';
            $forwardResult=eoffice_sign_forward($db,$user,$id,$signers,$input['eofficeForward']);
            $signers=$forwardResult['signers'];
            $signers[$index]['endorsementDate']=(string)($input['eofficeForward']['endorsementDate']??'');
        } catch (Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            error_log('eOffice sign forwarding: ' . $e->getMessage());
            api_error($e instanceof PDOException?'บันทึกและส่งต่อไม่สำเร็จ กรุณาลองใหม่':$e->getMessage(),422,'sign_forward_failed');
        }
    }
    $next = $item['currentStep'] + 1;
    $status = $next > count($signers) ? 'completed' : 'in_review';
    $query = $db->prepare('UPDATE document_workflows SET signers_json = ?, current_step = ?, status = ? WHERE id = ?');
    $query->execute([json_encode($signers, JSON_UNESCAPED_UNICODE), $next, $status, $id]);
    if (str_starts_with($id, 'EO-')) {
        $q = $db->prepare('INSERT INTO eoffice_history (book_id,actor_name,action,note) SELECT id,?,?,? FROM eoffice_incoming WHERE workflow_id=?');
        $q->execute([$user['name'],'ลงนามเกษียน',trim((string)($input['comment'] ?? '')),$id]);
    }
    $notifyIds = [];
    if ($next <= count($signers)) $notifyIds[] = (string) ($signers[$next - 1]['userId'] ?? '');
    if ($status === 'completed') $notifyIds[] = $item['createdBy'];
    if (!$forwardResult['targets']) {
        $notice = $status === 'completed' && !str_starts_with($id, 'EO-') ? workflow_completion_notice($item, $signers) : ['message' => $item['title'], 'fields' => []];
        workflow_notify($db, $notifyIds, $status === 'completed' ? 'ลงนามเอกสารครบแล้ว' : 'มีเอกสารรอลงนามลำดับถัดไป', $notice['message'], $id, $notice['fields']);
    }
    $db->commit();
    if ($forwardResult['targets']) {
        try {
            require_once __DIR__ . '/line-notifier.php';
            line_notify_linked_users($db,$forwardResult['targets'],$forwardResult['title'],($forwardResult['lineFields']??['รายละเอียด'=>$forwardResult['message']])+(!empty($forwardResult['ackBook'])?['eoffice_ack_book'=>$forwardResult['ackBook']]:[]));
        } catch (Throwable $e) { error_log('eOffice forwarding LINE: ' . $e->getMessage()); }
    }
    api_respond(['status' => 'success', 'data' => workflow_get($db, $id)]);
}
if ($action === 'reject') {
    $signers[$index]['status'] = 'rejected';
    $signers[$index]['comment'] = trim((string) ($input['comment'] ?? ''));
    $commentImage = workflow_validate_comment_image((string) ($input['commentImage'] ?? ''));
    if ($commentImage !== '') {
        $signers[$index]['commentImage'] = $commentImage;
    } else {
        unset($signers[$index]['commentImage']);
    }
    $query = $db->prepare('UPDATE document_workflows SET signers_json = ?, status = ? WHERE id = ?');
    $query->execute([json_encode($signers, JSON_UNESCAPED_UNICODE), 'rejected', $id]);
    workflow_notify($db, [$item['createdBy']], 'เอกสารถูกส่งกลับแก้ไข', $item['title'] . ' — ' . trim((string) ($input['comment'] ?? '')), $id);
    $db->commit();
    api_respond(['status' => 'success', 'data' => workflow_get($db, $id)]);
}
api_error('ไม่รู้จักคำสั่งที่ร้องขอ', 400, 'invalid_action');

