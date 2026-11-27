<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

$database = require_database();
$currentUser = require_user();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Keep deployment self-contained on Plesk. The matching SQL migration remains
// available for controlled/manual database installation.
$database->exec(
    "CREATE TABLE IF NOT EXISTS school_news (
        id varchar(64) NOT NULL,
        title varchar(255) NOT NULL,
        content text NOT NULL,
        category varchar(30) NOT NULL DEFAULT 'general',
        author_id varchar(20) NOT NULL,
        author_name varchar(255) NOT NULL,
        department varchar(255) NOT NULL DEFAULT '',
        published_date date NOT NULL,
        image_url text NULL,
        is_pinned tinyint(1) NOT NULL DEFAULT 0,
        view_count int unsigned NOT NULL DEFAULT 0,
        attachment_url text NULL,
        attachment_name varchar(255) NULL,
        academic_year varchar(10) NULL,
        semester varchar(1) NULL,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY school_news_date (published_date, created_at),
        KEY school_news_author (author_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
);
$database->exec(
    "CREATE TABLE IF NOT EXISTS school_orders (
        id varchar(64) NOT NULL,
        order_number varchar(100) NOT NULL,
        title varchar(255) NOT NULL,
        category varchar(30) NOT NULL DEFAULT 'academic',
        sign_date date NOT NULL,
        signed_by varchar(255) NOT NULL,
        department varchar(255) NOT NULL DEFAULT '',
        file_url text NULL,
        file_name varchar(255) NOT NULL DEFAULT '',
        file_size varchar(50) NOT NULL DEFAULT '',
        academic_year varchar(10) NULL,
        semester varchar(1) NULL,
        created_by varchar(20) NOT NULL,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY school_orders_number (order_number),
        KEY school_orders_date (sign_date, created_at),
        KEY school_orders_creator (created_by)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
);

// Add period columns to databases created before period-based content history.
foreach ([
    ['school_news', 'academic_year varchar(10) NULL'],
    ['school_news', 'semester varchar(1) NULL'],
    ['school_orders', 'academic_year varchar(10) NULL'],
    ['school_orders', 'semester varchar(1) NULL'],
] as [$table, $definition]) {
    $column = explode(' ', $definition, 2)[0];
    $columns = $database->query("SHOW COLUMNS FROM {$table}")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array($column, $columns, true)) {
        $database->exec("ALTER TABLE {$table} ADD COLUMN {$definition}");
    }
}

function news_payload(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'title' => (string) $row['title'],
        'content' => (string) $row['content'],
        'category' => (string) $row['category'],
        'author' => (string) $row['author_name'],
        'ownerId' => (string) $row['author_id'],
        'department' => (string) $row['department'],
        'date' => (string) $row['published_date'],
        'imageUrl' => (string) ($row['image_url'] ?? ''),
        'isPinned' => (bool) $row['is_pinned'],
        'viewCount' => (int) $row['view_count'],
        'attachmentUrl' => (string) ($row['attachment_url'] ?? ''),
        'attachmentName' => (string) ($row['attachment_name'] ?? ''),
        'academicYear' => (string) ($row['academic_year'] ?? ''),
        'semester' => (string) ($row['semester'] ?? ''),
    ];
}

function order_payload(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'orderNumber' => (string) $row['order_number'],
        'ownerId' => (string) $row['created_by'],
        'title' => (string) $row['title'],
        'category' => (string) $row['category'],
        'signDate' => (string) $row['sign_date'],
        'signedBy' => (string) $row['signed_by'],
        'department' => (string) $row['department'],
        'fileUrl' => (string) ($row['file_url'] ?? ''),
        'fileName' => (string) $row['file_name'],
        'fileSize' => (string) $row['file_size'],
        'academicYear' => (string) ($row['academic_year'] ?? ''),
        'semester' => (string) ($row['semester'] ?? ''),
    ];
}

function content_replacement(string $field, string $folder, int $limit, array $types): ?array
{
    $file = $_FILES[$field] ?? null;
    if ($file === null || ($file['error'] ?? null) === UPLOAD_ERR_NO_FILE) return null;
    if (($file['error'] ?? null) !== UPLOAD_ERR_OK || (int) $file['size'] <= 0 || (int) $file['size'] > $limit * 1024 * 1024) {
        api_error("อัปโหลดไฟล์ไม่สำเร็จ กรุณาเลือกไฟล์ขนาดไม่เกิน {$limit} MB", 422, 'invalid_upload');
    }
    $name = basename(str_replace('\\', '/', (string) $file['name']));
    $extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    if (!in_array($mime, $types[$extension] ?? [], true)) {
        api_error('ชนิดไฟล์ไม่รองรับหรือไม่ตรงกับนามสกุล', 422, 'unsupported_upload');
    }
    $url = '/uploads/' . $folder . '/' . bin2hex(random_bytes(16)) . '.' . $extension;
    return ['url' => $url, 'name' => mb_substr($name, 0, 255), 'size' => (int) $file['size'], 'tmp' => $file['tmp_name']];
}

function require_content_publisher(array $user): void
{
    // Every authenticated staff member may publish announcements and orders.
    // Authentication and active-account checks are still enforced by require_user().
}

function content_id(string $prefix): string
{
    return $prefix . '-' . bin2hex(random_bytes(12));
}

if ($method === 'GET') {
    $newsRows = $database->query(
        'SELECT * FROM school_news ORDER BY is_pinned DESC, published_date DESC, created_at DESC'
    )->fetchAll();
    $orderRows = $database->query(
        'SELECT * FROM school_orders ORDER BY sign_date DESC, created_at DESC'
    )->fetchAll();
    api_respond([
        'status' => 'success',
        'news' => array_map('news_payload', $newsRows),
        'orders' => array_map('order_payload', $orderRows),
    ]);
}

require_method('POST');
require_csrf();
$contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
$input = str_starts_with($contentType, 'multipart/form-data') ? $_POST : json_body();
$action = (string) ($input['action'] ?? '');

if (in_array($action, ['update_news', 'update_order'], true)) {
    $isNews = $action === 'update_news';
    $table = $isNews ? 'school_news' : 'school_orders';
    $ownerColumn = $isNews ? 'author_id' : 'created_by';
    $id = trim((string) ($input['id'] ?? ''));
    $lookup = $database->prepare("SELECT * FROM $table WHERE id = ?");
    $lookup->execute([$id]);
    $row = $lookup->fetch();
    $isAdmin = ($currentUser['role'] ?? '') === 'admin';
    if (!$row || (!$isAdmin && (string) $row[$ownerColumn] !== (string) $currentUser['id'])) {
        api_error('ไม่มีสิทธิ์แก้ไขรายการนี้', 403, 'forbidden');
    }
    $title = trim((string) ($input['title'] ?? ''));
    $category = trim((string) ($input['category'] ?? ''));
    $department = trim((string) ($input['department'] ?? ''));
    $categories = $isNews ? ['academic', 'general', 'personnel', 'activity', 'urgent']
        : ['academic_administration', 'personnel_administration', 'budget_administration', 'general_administration', 'executive_office', 'english_program'];
    if ($title === '' || mb_strlen($title) > 255 || mb_strlen($department) > 255
        || ($category !== (string) $row['category'] && !in_array($category, $categories, true))) {
        api_error('กรุณาตรวจสอบหัวข้อ หมวดหมู่ และหน่วยงาน', 422, 'validation_error');
    }
    if ($isNews) {
        $content = trim((string) ($input['content'] ?? ''));
        if ($content === '') api_error('กรุณากรอกเนื้อหาประกาศ', 422, 'validation_error');
        $fields = 'title = ?, category = ?, department = ?, content = ?';
        $values = [$title, $category, $department, $content];
    } else {
        $number = trim((string) ($input['orderNumber'] ?? ''));
        $signDate = trim((string) ($input['signDate'] ?? ''));
        $signedBy = trim((string) ($input['signedBy'] ?? ''));
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $signDate);
        if ($number === '' || mb_strlen($number) > 100 || $signedBy === '' || mb_strlen($signedBy) > 255
            || !$date || $date->format('Y-m-d') !== $signDate) {
            api_error('กรุณาตรวจสอบเลขที่คำสั่ง วันที่ และชื่อผู้ลงนาม', 422, 'validation_error');
        }
        $fields = 'title = ?, category = ?, department = ?, order_number = ?, sign_date = ?, signed_by = ?';
        $values = [$title, $category, $department, $number, $signDate, $signedBy];
    }
    $images = ['jpg' => ['image/jpeg'], 'jpeg' => ['image/jpeg'], 'png' => ['image/png']];
    $pdf = ['pdf' => ['application/pdf']];
    $uploads = [];
    if ($isNews) {
        $image = content_replacement('image', 'news', 5, $images + ['webp' => ['image/webp']]);
        $attachment = content_replacement('attachment', 'news-documents', 15, $pdf);
        if ($image || ($input['removeImage'] ?? '') === '1') {
            $fields .= ', image_url = ?';
            $values[] = $image['url'] ?? '';
        }
        if ($attachment || ($input['removeAttachment'] ?? '') === '1') {
            $fields .= ', attachment_url = ?, attachment_name = ?';
            array_push($values, $attachment['url'] ?? '', $attachment['name'] ?? '');
        }
        $uploads = array_filter([$image, $attachment]);
    } else {
        $zip = ['application/zip', 'application/x-zip-compressed'];
        $office = [
            'doc' => ['application/msword'],
            'xls' => ['application/vnd.ms-excel'],
            'ppt' => ['application/vnd.ms-powerpoint'],
            'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', ...$zip],
            'xlsx' => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ...$zip],
            'pptx' => ['application/vnd.openxmlformats-officedocument.presentationml.presentation', ...$zip],
        ];
        $document = content_replacement('document', 'orders', 15, $pdf + $office + $images);
        if ($document) {
            $fields .= ', file_url = ?, file_name = ?, file_size = ?';
            array_push($values, $document['url'], $document['name'], number_format($document['size'] / 1048576, 1) . ' MB');
            $uploads[] = $document;
        }
    }
    $where = $isAdmin ? 'id = ?' : "id = ? AND $ownerColumn = ?";
    $values[] = $id;
    if (!$isAdmin) $values[] = (string) $currentUser['id'];
    $storedPaths = [];
    try {
        foreach ($uploads as $upload) {
            $path = __DIR__ . '/..' . $upload['url'];
            $directory = dirname($path);
            if ((!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory))
                || !move_uploaded_file($upload['tmp'], $path)) {
                throw new RuntimeException('Could not store replacement file');
            }
            $storedPaths[] = $path;
        }
        $database->prepare("UPDATE $table SET $fields WHERE $where")->execute($values);
    } catch (Throwable $error) {
        foreach ($storedPaths as $path) unlink($path);
        if (!$isNews && $error instanceof PDOException && (int) ($error->errorInfo[1] ?? 0) === 1062) {
            api_error('เลขที่คำสั่งนี้มีอยู่แล้ว', 409, 'duplicate_order_number');
        }
        api_error('บันทึกการแก้ไขหรือไฟล์แนบไม่สำเร็จ', 500, 'content_update_failed');
    }
    $lookup->execute([$id]);
    $saved = $lookup->fetch();
    api_respond(['status' => 'success', 'data' => $isNews ? news_payload($saved) : order_payload($saved)]);
}

require_content_publisher($currentUser);

if ($action === 'create_news') {
    $title = trim((string) ($input['title'] ?? ''));
    $content = trim((string) ($input['content'] ?? ''));
    $category = trim((string) ($input['category'] ?? 'general'));
    $allowedCategories = ['academic', 'general', 'personnel', 'activity', 'urgent'];
    if ($title === '' || $content === '' || !in_array($category, $allowedCategories, true)) {
        api_error('กรุณากรอกข้อมูลข่าวให้ครบถ้วน', 422, 'validation_error');
    }
    $imageUrl = trim((string) ($input['imageUrl'] ?? ''));
    $image = $_FILES['image'] ?? null;
    if (is_array($image) && (int) ($image['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
        if ((int) ($image['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            api_error('ไม่สามารถอัปโหลดรูปภาพได้', 422, 'image_upload_error');
        }
        $fileSize = (int) ($image['size'] ?? 0);
        if ($fileSize <= 0 || $fileSize > 5 * 1024 * 1024) {
            api_error('รูปภาพต้องมีขนาดไม่เกิน 5 MB', 422, 'image_too_large');
        }
        $mimeType = (new finfo(FILEINFO_MIME_TYPE))->file((string) ($image['tmp_name'] ?? ''));
        $mimeExtensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        if (!isset($mimeExtensions[$mimeType])) {
            api_error('รองรับเฉพาะรูปภาพ JPG, PNG หรือ WebP', 422, 'unsupported_image');
        }
        $directory = __DIR__ . '/../uploads/news';
        if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
            api_error('ไม่สามารถสร้างพื้นที่จัดเก็บรูปภาพได้', 500, 'image_storage_error');
        }
        $storedName = bin2hex(random_bytes(16)) . '.' . $mimeExtensions[$mimeType];
        $storedPath = $directory . '/' . $storedName;
        if (!move_uploaded_file((string) $image['tmp_name'], $storedPath)) {
            api_error('ไม่สามารถบันทึกรูปภาพได้', 500, 'image_storage_error');
        }
        $imageUrl = '/uploads/news/' . $storedName;
    }
    $attachmentUrl = trim((string) ($input['attachmentUrl'] ?? ''));
    $attachmentName = trim((string) ($input['attachmentName'] ?? ''));
    $attachment = $_FILES['attachment'] ?? null;
    if (is_array($attachment) && (int) ($attachment['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
        if ((int) ($attachment['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            api_error('ไม่สามารถอัปโหลดเอกสาร PDF ได้', 422, 'attachment_upload_error');
        }
        $fileSize = (int) ($attachment['size'] ?? 0);
        if ($fileSize <= 0 || $fileSize > 15 * 1024 * 1024) {
            api_error('เอกสาร PDF ต้องมีขนาดไม่เกิน 15 MB', 422, 'attachment_too_large');
        }
        $mimeType = (new finfo(FILEINFO_MIME_TYPE))->file((string) ($attachment['tmp_name'] ?? ''));
        if ($mimeType !== 'application/pdf') {
            api_error('รองรับเฉพาะเอกสาร PDF เท่านั้น', 422, 'unsupported_attachment');
        }
        $directory = __DIR__ . '/../uploads/news-documents';
        if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
            api_error('ไม่สามารถสร้างพื้นที่จัดเก็บเอกสารได้', 500, 'attachment_storage_error');
        }
        $storedName = bin2hex(random_bytes(16)) . '.pdf';
        $storedPath = $directory . '/' . $storedName;
        if (!move_uploaded_file((string) $attachment['tmp_name'], $storedPath)) {
            api_error('ไม่สามารถบันทึกเอกสาร PDF ได้', 500, 'attachment_storage_error');
        }
        $attachmentUrl = '/uploads/news-documents/' . $storedName;
        $attachmentName = basename((string) ($attachment['name'] ?? 'เอกสารประกอบ.pdf'));
    }
    $id = content_id('news');
    $statement = $database->prepare(
        'INSERT INTO school_news
         (id, title, content, category, author_id, author_name, department, published_date,
          image_url, is_pinned, attachment_url, attachment_name, academic_year, semester)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?)'
    );
    $statement->execute([
        $id,
        $title,
        $content,
        $category,
        (string) $currentUser['id'],
        (string) $currentUser['name'],
        (string) ($currentUser['department'] ?? ''),
        $imageUrl,
        !empty($input['isPinned']) ? 1 : 0,
        $attachmentUrl,
        $attachmentName,
        trim((string) ($input['academicYear'] ?? '')) ?: null,
        in_array((string) ($input['semester'] ?? ''), ['1', '2'], true) ? (string) $input['semester'] : null,
    ]);
    $lookup = $database->prepare('SELECT * FROM school_news WHERE id = ? LIMIT 1');
    $lookup->execute([$id]);
    api_respond(['status' => 'success', 'data' => news_payload($lookup->fetch())], 201);
}

if ($action === 'create_order') {
    $orderNumber = trim((string) ($input['orderNumber'] ?? ''));
    $title = trim((string) ($input['title'] ?? ''));
    $category = trim((string) ($input['category'] ?? 'academic'));
    $signDate = trim((string) ($input['signDate'] ?? ''));
    $allowedCategories = [
        'academic_administration',
        'personnel_administration',
        'budget_administration',
        'general_administration',
        'executive_office',
        'english_program',
    ];
    if ($orderNumber === '' || $title === '' ||
        !in_array($category, $allowedCategories, true) ||
        !preg_match('/^\d{4}-\d{2}-\d{2}$/', $signDate)) {
        api_error('กรุณากรอกข้อมูลคำสั่งให้ครบถ้วน', 422, 'validation_error');
    }
    $document = $_FILES['document'] ?? null;
    if (!is_array($document) || (int) ($document['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        api_error('กรุณาแนบไฟล์คำสั่งหรือเอกสาร', 422, 'document_required');
    }
    $fileSize = (int) ($document['size'] ?? 0);
    if ($fileSize <= 0 || $fileSize > 15 * 1024 * 1024) {
        api_error('ไฟล์เอกสารต้องมีขนาดไม่เกิน 15 MB', 422, 'document_too_large');
    }
    $originalName = trim((string) ($document['name'] ?? 'document'));
    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png'];
    if (!in_array($extension, $allowedExtensions, true)) {
        api_error('ชนิดไฟล์เอกสารไม่รองรับ', 422, 'unsupported_document');
    }
    $fileInfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = (string) $fileInfo->file((string) $document['tmp_name']);
    $allowedMimeTypes = [
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/zip', 'application/x-zip-compressed',
        'image/jpeg', 'image/png',
    ];
    if (!in_array($mimeType, $allowedMimeTypes, true)) {
        api_error('เนื้อหาไฟล์เอกสารไม่ถูกต้องหรือไม่รองรับ', 422, 'invalid_document');
    }
    $uploadDir = __DIR__ . '/../uploads/orders';
    if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
        api_error('ไม่สามารถเตรียมพื้นที่เก็บเอกสารได้', 500, 'upload_directory_failed');
    }
    $storedName = bin2hex(random_bytes(16)) . '.' . $extension;
    $storedPath = $uploadDir . '/' . $storedName;
    if (!move_uploaded_file((string) $document['tmp_name'], $storedPath)) {
        api_error('ไม่สามารถบันทึกไฟล์เอกสารได้', 500, 'document_save_failed');
    }
    $fileUrl = '/uploads/orders/' . $storedName;
    $id = content_id('ord');
    try {
        $statement = $database->prepare(
            'INSERT INTO school_orders
             (id, order_number, title, category, sign_date, signed_by, department,
              file_url, file_name, file_size, created_by, academic_year, semester)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $statement->execute([
            $id,
            $orderNumber,
            $title,
            $category,
            $signDate,
            trim((string) ($input['signedBy'] ?? '')),
            trim((string) ($input['department'] ?? '')),
            $fileUrl,
            mb_substr($originalName, 0, 255),
            number_format($fileSize / 1024 / 1024, 1) . ' MB',
            (string) $currentUser['id'],
            trim((string) ($input['academicYear'] ?? '')) ?: null,
            in_array((string) ($input['semester'] ?? ''), ['1', '2'], true) ? (string) $input['semester'] : null,
        ]);
    } catch (PDOException $exception) {
        if (is_file($storedPath)) unlink($storedPath);
        if ((string) $exception->getCode() === '23000') {
            api_error('เลขที่คำสั่งนี้มีอยู่ในระบบแล้ว', 409, 'duplicate_order_number');
        }
        throw $exception;
    }
    $lookup = $database->prepare('SELECT * FROM school_orders WHERE id = ? LIMIT 1');
    $lookup->execute([$id]);
    api_respond(['status' => 'success', 'data' => order_payload($lookup->fetch())], 201);
}

api_error('ไม่รู้จักคำสั่งที่ร้องขอ', 400, 'unknown_action');
