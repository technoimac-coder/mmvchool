<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$filePath = __DIR__ . '/pipelines_config.json';

if ($method === 'POST') {
    $currentUser = require_user();
    if (($currentUser['role'] ?? '') !== 'admin' && ($currentUser['role'] ?? '') !== 'director') {
        api_error('เฉพาะผู้ดูแลระบบเท่านั้นที่ได้รับอนุญาตให้แก้ไขขั้นตอน', 403, 'unauthorized');
    }

    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    if (!is_array($data)) {
        api_error('รูปแบบข้อมูลไม่ถูกต้อง', 400, 'invalid_json');
    }

    file_put_contents($filePath, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    echo json_encode(['success' => true]);
    exit;
}

// GET method
header('Content-Type: application/json; charset=utf-8');
if (file_exists($filePath)) {
    echo file_get_contents($filePath);
} else {
    echo json_encode([]);
}
