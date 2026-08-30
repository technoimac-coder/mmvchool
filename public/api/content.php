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
$input = json_body();
$action = (string) ($input['action'] ?? '');

if ($action === 'create_news') {
    $title = trim((string) ($input['title'] ?? ''));
    $content = trim((string) ($input['content'] ?? ''));
    $category = trim((string) ($input['category'] ?? 'general'));
    $allowedCategories = ['academic', 'general', 'personnel', 'activity', 'urgent'];
    if ($title === '' || $content === '' || !in_array($category, $allowedCategories, true)) {
        api_error('กรุณากรอกข้อมูลข่าวให้ครบถ้วน', 422, 'validation_error');
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
        trim((string) ($input['imageUrl'] ?? '')),
        !empty($input['isPinned']) ? 1 : 0,
        trim((string) ($input['attachmentUrl'] ?? '')),
        trim((string) ($input['attachmentName'] ?? '')),
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
    $allowedCategories = ['duty', 'appointment', 'committee', 'academic', 'budget'];
    if ($orderNumber === '' || $title === '' ||
        !in_array($category, $allowedCategories, true) ||
        !preg_match('/^\d{4}-\d{2}-\d{2}$/', $signDate)) {
        api_error('กรุณากรอกข้อมูลคำสั่งให้ครบถ้วน', 422, 'validation_error');
    }
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
            trim((string) ($input['fileUrl'] ?? '')),
            trim((string) ($input['fileName'] ?? '')),
            trim((string) ($input['fileSize'] ?? '')),
            (string) $currentUser['id'],
        ]);
    } catch (PDOException $exception) {
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
