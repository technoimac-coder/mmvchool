<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$database = require_database();
$filePath = __DIR__ . '/pipelines_config.json';

$database->exec("CREATE TABLE IF NOT EXISTS approval_pipelines (
  pipeline_id varchar(80) NOT NULL PRIMARY KEY,
  pipeline_json longtext NOT NULL,
  updated_by varchar(20) DEFAULT NULL,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

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

    require_csrf();
    $database->beginTransaction();
    try {
        $database->exec('DELETE FROM approval_pipelines');
        $statement = $database->prepare('INSERT INTO approval_pipelines (pipeline_id, pipeline_json, updated_by) VALUES (?, ?, ?)');
        foreach ($data as $pipeline) {
            $statement->execute([(string) $pipeline['id'], json_encode($pipeline, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), $currentUser['id']]);
        }
        $database->commit();
    } catch (Throwable $exception) {
        if ($database->inTransaction()) $database->rollBack();
        api_error('ไม่สามารถบันทึกขั้นตอนการอนุมัติลงฐานข้อมูลได้', 500, 'pipeline_write_failed');
    }
    echo json_encode(['success' => true]);
    exit;
}

// GET method
header('Content-Type: application/json; charset=utf-8');
$rows = $database->query('SELECT pipeline_json FROM approval_pipelines ORDER BY pipeline_id')->fetchAll(PDO::FETCH_COLUMN);
if ($rows) {
    echo json_encode(array_map(static fn(string $json): array => json_decode($json, true), $rows), JSON_UNESCAPED_UNICODE);
} elseif (file_exists($filePath)) {
    echo file_get_contents($filePath);
} else echo json_encode([]);
