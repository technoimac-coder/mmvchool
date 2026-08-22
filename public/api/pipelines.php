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
    if (!is_array($data) || !array_is_list($data)) {
        api_error('รูปแบบข้อมูลไม่ถูกต้อง', 400, 'invalid_json');
    }

    foreach ($data as $pipeline) {
        if (!is_array($pipeline) || trim((string) ($pipeline['id'] ?? '')) === '' || !is_array($pipeline['steps'] ?? null)) {
            api_error('ข้อมูลขั้นตอนการอนุมัติไม่ครบถ้วน', 422, 'invalid_pipeline');
        }
        foreach ($pipeline['steps'] as $step) {
            if (!is_array($step) || (int) ($step['stepNumber'] ?? 0) < 1) {
                api_error('ข้อมูลลำดับขั้นตอนการอนุมัติไม่ถูกต้อง', 422, 'invalid_pipeline_step');
            }
        }
    }

    $encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);
    if (file_put_contents($filePath, $encoded, LOCK_EX) === false) {
        api_error('ไม่สามารถบันทึกขั้นตอนการอนุมัติบนเซิร์ฟเวอร์ได้', 500, 'pipeline_write_failed');
    }
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
