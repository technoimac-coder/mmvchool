<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

$database = require_database();
$currentUser = require_user();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$database->exec(
    "CREATE TABLE IF NOT EXISTS staff_portfolios (
        id varchar(64) NOT NULL,
        user_id varchar(20) NOT NULL,
        user_name varchar(255) NOT NULL,
        department varchar(255) NOT NULL DEFAULT '',
        title varchar(255) NOT NULL,
        category varchar(30) NOT NULL,
        semester varchar(1) NOT NULL,
        academic_year varchar(10) NOT NULL,
        date_received date NOT NULL,
        organizer varchar(255) NOT NULL,
        description text NOT NULL,
        attachments_json longtext NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'approved',
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY staff_portfolios_owner (user_id, created_at),
        KEY staff_portfolios_date (date_received, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
);

function portfolio_payload(array $row): array
{
    $attachments = json_decode((string) ($row['attachments_json'] ?? '[]'), true);
    return [
        'id' => (string) $row['id'],
        'userId' => (string) $row['user_id'],
        'userName' => (string) $row['user_name'],
        'department' => (string) $row['department'],
        'title' => (string) $row['title'],
        'category' => (string) $row['category'],
        'semester' => (string) $row['semester'],
        'academicYear' => (string) $row['academic_year'],
        'dateReceived' => (string) $row['date_received'],
        'organizer' => (string) $row['organizer'],
        'description' => (string) $row['description'],
        'attachments' => is_array($attachments) ? $attachments : [],
        'status' => (string) $row['status'],
        'createdAt' => (string) $row['created_at'],
    ];
}

function portfolio_files(): array
{
    $files = $_FILES['attachments'] ?? null;
    if (!is_array($files) || !isset($files['name'])) {
        return [];
    }
    if (!is_array($files['name'])) {
        return [$files];
    }
    $normalized = [];
    foreach ($files['name'] as $index => $name) {
        $normalized[] = [
            'name' => $name,
            'type' => $files['type'][$index] ?? '',
            'tmp_name' => $files['tmp_name'][$index] ?? '',
            'error' => $files['error'][$index] ?? UPLOAD_ERR_NO_FILE,
            'size' => $files['size'][$index] ?? 0,
        ];
    }
    return $normalized;
}

if ($method === 'GET') {
    // Every authenticated account can browse every person's portfolio folder.
    $rows = $database->query(
        'SELECT * FROM staff_portfolios ORDER BY date_received DESC, created_at DESC'
    )->fetchAll();
    api_respond(['status' => 'success', 'data' => array_map('portfolio_payload', $rows)]);
}

require_method('POST');
require_csrf();
$input = $_POST;
$action = (string) ($input['action'] ?? '');
if (!in_array($action, ['create', 'update'], true)) {
    api_error('ไม่รู้จักคำสั่งที่ร้องขอ', 400, 'invalid_action');
}
$existing = null;
$attachments = [];
$id = trim((string) ($input['id'] ?? ''));
if ($action === 'update') {
    $lookup = $database->prepare('SELECT * FROM staff_portfolios WHERE id = ? LIMIT 1');
    $lookup->execute([$id]);
    $existing = $lookup->fetch();
    if (!$existing || (string) $existing['user_id'] !== (string) $currentUser['id']) {
        api_error('ไม่พบรายการหรือไม่มีสิทธิ์แก้ไข', 403, 'forbidden');
    }
    $attachments = portfolio_payload($existing)['attachments'];
    $removedUrls = json_decode((string) ($input['removedAttachmentUrls'] ?? '[]'), true);
    if (!is_array($removedUrls) || !array_is_list($removedUrls)) {
        api_error('ข้อมูลไฟล์แนบไม่ถูกต้อง', 422, 'invalid_attachments');
    }
    $attachments = array_values(array_filter($attachments, static fn ($attachment) =>
        !in_array($attachment['url'] ?? null, $removedUrls, true)));
}

$title = trim((string) ($input['title'] ?? ''));
$category = trim((string) ($input['category'] ?? ''));
$period = current_academic_period($database);
$semester = $existing ? trim((string) ($input['semester'] ?? '')) : $period['semester'];
$academicYear = $existing ? trim((string) ($input['academicYear'] ?? $existing['academic_year'])) : $period['academicYear'];
$dateReceived = trim((string) ($input['dateReceived'] ?? ''));
$organizer = trim((string) ($input['organizer'] ?? ''));
$description = trim((string) ($input['description'] ?? ''));
$allowedCategories = ['award', 'training', 'work', 'certificate', 'school', 'administration'];

if ($title === '' || $organizer === '' || $description === '' ||
    !in_array($category, $allowedCategories, true) ||
    !in_array($semester, ['1', '2'], true) ||
    !preg_match('/^\d{4}$/', $academicYear) ||
    !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateReceived)) {
    api_error('กรุณากรอกข้อมูลผลงานให้ครบถ้วน', 422, 'validation_error');
}

$files = portfolio_files();
if (count($attachments) + count($files) > 10) {
    api_error('แนบไฟล์ได้ไม่เกิน 10 ไฟล์ต่อรายการ', 422, 'too_many_attachments');
}

$allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'webp'];
$allowedMimeTypes = [
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip', 'application/x-zip-compressed',
    'image/jpeg', 'image/png', 'image/webp',
];
$fileInfo = new finfo(FILEINFO_MIME_TYPE);
$validatedFiles = [];
foreach ($files as $file) {
    $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($error === UPLOAD_ERR_NO_FILE) {
        continue;
    }
    $size = (int) ($file['size'] ?? 0);
    $originalName = trim((string) ($file['name'] ?? 'document'));
    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    if ($error !== UPLOAD_ERR_OK || $size <= 0 || $size > 10 * 1024 * 1024) {
        api_error('แต่ละไฟล์ต้องมีขนาดไม่เกิน 10 MB', 422, 'attachment_too_large');
    }
    $mimeType = (string) $fileInfo->file((string) ($file['tmp_name'] ?? ''));
    if (!in_array($extension, $allowedExtensions, true) || !in_array($mimeType, $allowedMimeTypes, true)) {
        api_error('พบชนิดไฟล์ที่ไม่รองรับ กรุณาใช้รูปภาพ PDF หรือเอกสาร Office', 422, 'unsupported_attachment');
    }
    $validatedFiles[] = compact('file', 'size', 'originalName', 'extension', 'mimeType');
}

$safeUserId = preg_replace('/[^A-Za-z0-9_-]/', '_', (string) $currentUser['id']);
$uploadDir = __DIR__ . '/../uploads/portfolios/' . $safeUserId;
if ($validatedFiles && !is_dir($uploadDir) && !mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
    api_error('ไม่สามารถเตรียมแฟ้มเอกสารรายบุคคลได้', 500, 'upload_directory_failed');
}

$storedPaths = [];
foreach ($validatedFiles as $validated) {
    $storedName = bin2hex(random_bytes(16)) . '.' . $validated['extension'];
    $storedPath = $uploadDir . '/' . $storedName;
    if (!move_uploaded_file((string) $validated['file']['tmp_name'], $storedPath)) {
        foreach ($storedPaths as $path) {
            if (is_file($path)) unlink($path);
        }
        api_error('ไม่สามารถบันทึกไฟล์แนบได้', 500, 'attachment_save_failed');
    }
    $storedPaths[] = $storedPath;
    $attachments[] = [
        'name' => $validated['originalName'],
        'url' => '/uploads/portfolios/' . $safeUserId . '/' . $storedName,
        'type' => str_starts_with($validated['mimeType'], 'image/') ? 'image' : 'document',
        'mimeType' => $validated['mimeType'],
        'size' => $validated['size'],
    ];
}

if ($existing) {
    try {
        $database->beginTransaction();
        $lock = $database->prepare('SELECT attachments_json FROM staff_portfolios WHERE id = ? AND user_id = ? FOR UPDATE');
        $lock->execute([$id, $currentUser['id']]);
        if ($lock->fetchColumn() !== $existing['attachments_json']) {
            $database->rollBack();
            foreach ($storedPaths as $path) unlink($path);
            api_error('ไฟล์แนบถูกแก้ไขแล้ว กรุณาเปิดรายการใหม่', 409, 'stale_portfolio');
        }
        $update = $database->prepare('UPDATE staff_portfolios SET title = ?, category = ?, semester = ?, academic_year = ?, date_received = ?, organizer = ?, description = ?, attachments_json = ? WHERE id = ? AND user_id = ?');
        $update->execute([$title, $category, $semester, $academicYear, $dateReceived, $organizer, $description,
            json_encode($attachments, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), $id, $currentUser['id']]);
        $lookup->execute([$id]);
        $saved = $lookup->fetch();
        $database->commit();
    } catch (Throwable $error) {
        if ($database->inTransaction()) $database->rollBack();
        foreach ($storedPaths as $path) if (is_file($path)) unlink($path);
        api_error('ไม่สามารถบันทึกข้อมูลผลงานลงฐานข้อมูลได้', 500, 'portfolio_save_failed');
    }
    api_respond(['status' => 'success', 'data' => portfolio_payload($saved)]);
}

$id = 'PF-' . date('YmdHis') . '-' . strtoupper(bin2hex(random_bytes(3)));
try {
    $statement = $database->prepare(
        'INSERT INTO staff_portfolios
         (id, user_id, user_name, department, title, category, semester, academic_year,
          date_received, organizer, description, attachments_json, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $statement->execute([
        $id,
        (string) $currentUser['id'],
        (string) $currentUser['name'],
        (string) ($currentUser['department'] ?? ''),
        $title,
        $category,
        $semester,
        $academicYear,
        $dateReceived,
        $organizer,
        $description,
        json_encode($attachments, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'approved',
    ]);
} catch (Throwable $error) {
    foreach ($storedPaths as $path) {
        if (is_file($path)) unlink($path);
    }
    api_error('ไม่สามารถบันทึกข้อมูลผลงานลงฐานข้อมูลได้', 500, 'portfolio_save_failed');
}

$lookup = $database->prepare('SELECT * FROM staff_portfolios WHERE id = ? LIMIT 1');
$lookup->execute([$id]);
api_respond(['status' => 'success', 'data' => portfolio_payload($lookup->fetch())], 201);
