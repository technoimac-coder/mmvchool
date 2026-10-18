<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/line-notifier.php';

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
        created_by varchar(20) NOT NULL,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY school_orders_number (order_number),
        KEY school_orders_date (sign_date, created_at),
        KEY school_orders_creator (created_by)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
);

function news_payload(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'title' => (string) $row['title'],
        'content' => (string) $row['content'],
        'category' => (string) $row['category'],
        'author' => (string) $row['author_name'],
        'department' => (string) $row['department'],
        'date' => (string) $row['published_date'],
        'imageUrl' => (string) ($row['image_url'] ?? ''),
        'isPinned' => (bool) $row['is_pinned'],
        'viewCount' => (int) $row['view_count'],
        'attachmentUrl' => (string) ($row['attachment_url'] ?? ''),
        'attachmentName' => (string) ($row['attachment_name'] ?? ''),
    ];
}

function order_payload(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'orderNumber' => (string) $row['order_number'],
        'title' => (string) $row['title'],
        'category' => (string) $row['category'],
        'signDate' => (string) $row['sign_date'],
        'signedBy' => (string) $row['signed_by'],
        'department' => (string) $row['department'],
        'fileUrl' => (string) ($row['file_url'] ?? ''),
        'fileName' => (string) $row['file_name'],
        'fileSize' => (string) $row['file_size'],
    ];
}

function require_content_publisher(array $user): void
{
    $allowedRoles = ['admin', 'director', 'head', 'academic_affairs'];
    if (!in_array((string) ($user['role'] ?? ''), $allowedRoles, true)) {
        api_error('คุณไม่มีสิทธิ์เผยแพร่ข่าวหรือคำสั่งโรงเรียน', 403, 'forbidden');
    }
}

function content_id(string $prefix): string
{
    return $prefix . '-' . bin2hex(random_bytes(12));
}

function content_public_url(string $path): string
{
    if (filter_var($path, FILTER_VALIDATE_URL)) return $path;
    $host = (string) ($_SERVER['HTTP_HOST'] ?? 'mmvschool.ac.th');
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    return ($isHttps ? 'https://' : 'http://') . $host . '/' . ltrim($path, '/');
}

function content_notify_staff(PDO $database, string $title, array $fields, ?string $imageUrl = null): void
{
    $ids = $database->query("SELECT id FROM users WHERE status = 'active'")->fetchAll(PDO::FETCH_COLUMN);
    line_notify_linked_users($database, array_map('strval', $ids), $title, $fields, $imageUrl);
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
require_content_publisher($currentUser);
$contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
$input = str_starts_with($contentType, 'multipart/form-data') ? $_POST : json_body();
$action = (string) ($input['action'] ?? '');

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
    $id = content_id('news');
    $statement = $database->prepare(
        'INSERT INTO school_news
         (id, title, content, category, author_id, author_name, department, published_date,
          image_url, is_pinned, attachment_url, attachment_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?)'
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
        trim((string) ($input['attachmentUrl'] ?? '')),
        trim((string) ($input['attachmentName'] ?? '')),
    ]);
    $lookup = $database->prepare('SELECT * FROM school_news WHERE id = ? LIMIT 1');
    $lookup->execute([$id]);
    $notificationImage = $imageUrl !== '' && !str_contains($imageUrl, 'images.unsplash.com')
        ? content_public_url($imageUrl)
        : null;
    content_notify_staff($database, 'ประกาศข่าวใหม่จากโรงเรียน', [
        'หัวข้อ' => $title,
        'ผู้ประกาศ' => (string) $currentUser['name'],
        'รายละเอียด' => mb_substr($content, 0, 300),
    ], $notificationImage);
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
              file_url, file_name, file_size, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
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
    content_notify_staff($database, 'คำสั่งโรงเรียนฉบับใหม่', [
        'เลขที่คำสั่ง' => $orderNumber,
        'เรื่อง' => $title,
        'วันที่ออกคำสั่ง' => $signDate,
        'ผู้บันทึก' => (string) $currentUser['name'],
    ]);
    api_respond(['status' => 'success', 'data' => order_payload($lookup->fetch())], 201);
}

api_error('ไม่รู้จักคำสั่งที่ร้องขอ', 400, 'unknown_action');
