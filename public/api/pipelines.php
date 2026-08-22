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

// One-time migration from the former requester-first substitute workflow.
// Preserve the personnel selected by the administrator while moving the
// scheduler to step 1 and making the assigned-teacher notification automatic.
$legacySubstitute = $database->prepare('SELECT pipeline_json FROM approval_pipelines WHERE pipeline_id = ? LIMIT 1');
$legacySubstitute->execute(['pipe-substitute']);
$legacyJson = $legacySubstitute->fetchColumn();
if (is_string($legacyJson) && $legacyJson !== '') {
    $legacyPipeline = json_decode($legacyJson, true);
    $legacySteps = is_array($legacyPipeline['steps'] ?? null) ? $legacyPipeline['steps'] : [];
    $firstStepName = (string) ($legacySteps[0]['stepName'] ?? '');
    if ($firstStepName !== 'ผู้จัดตารางสอนแทน') {
        $schedulerId = (string) ($legacySteps[1]['assignedUserId'] ?? 'MMV90');
        $academicDeputyId = (string) ($legacySteps[2]['assignedUserId'] ?? 'MMV02');
        $legacyPipeline['steps'] = [
            ['stepNumber' => 1, 'stepName' => 'ผู้จัดตารางสอนแทน', 'assignedUserId' => $schedulerId ?: 'MMV90', 'description' => 'เจ้าหน้าที่วิชาการจัดครูผู้รับมอบหมายสอนแทนตามคาบ'],
            ['stepNumber' => 2, 'stepName' => 'แจ้งครูผู้รับมอบหมายสอนแทน', 'assignedUserId' => '', 'description' => 'ระบบแจ้งเตือนไปยังครูผู้รับมอบหมายสอนแทนโดยอัตโนมัติ'],
            ['stepNumber' => 3, 'stepName' => 'รองผู้อำนวยการฝ่ายวิชาการ รับทราบ', 'assignedUserId' => $academicDeputyId ?: 'MMV02', 'description' => 'ระบบแจ้งรองผู้อำนวยการฝ่ายวิชาการให้รับทราบ'],
        ];
        $migrateSubstitute = $database->prepare('UPDATE approval_pipelines SET pipeline_json = ? WHERE pipeline_id = ?');
        $migrateSubstitute->execute([json_encode($legacyPipeline, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), 'pipe-substitute']);
    }
}

// Upgrade the vehicle workflow from the former combined checker/allocation
// step to four explicit stages, preserving the administrator's assignees.
$legacyVehicle = $database->prepare('SELECT pipeline_json FROM approval_pipelines WHERE pipeline_id = ? LIMIT 1');
$legacyVehicle->execute(['pipe-vehicle']);
$legacyVehicleJson = $legacyVehicle->fetchColumn();
if (is_string($legacyVehicleJson) && $legacyVehicleJson !== '') {
    $vehiclePipeline = json_decode($legacyVehicleJson, true);
    $vehicleSteps = is_array($vehiclePipeline['steps'] ?? null) ? $vehiclePipeline['steps'] : [];
    if (count($vehicleSteps) < 4
        || (string) ($vehicleSteps[1]['stepName'] ?? '') !== 'ผู้ตรวจสอบ รับทราบ'
        || (string) ($vehicleSteps[3]['description'] ?? '') !== 'ระบบแจ้งเตือนผู้ขับรถอัตโนมัติเฉพาะกรณีใช้รถของโรงเรียน') {
        $reviewerId = (string) ($vehicleSteps[1]['assignedUserId'] ?? 'MMV04');
        $deputyId = (string) ($vehicleSteps[2]['assignedUserId'] ?? 'MMV04');
        $vehiclePipeline['steps'] = [
            ['stepNumber' => 1, 'stepName' => 'ผู้ยื่นคำขอใช้รถ', 'assignedUserId' => '', 'description' => 'ครูกรอกแบบฟอร์มขอใช้รถ'],
            ['stepNumber' => 2, 'stepName' => 'ผู้ตรวจสอบ รับทราบ', 'assignedUserId' => $reviewerId ?: 'MMV04', 'description' => 'ตรวจสอบรายละเอียดคำขอและส่งต่อรองผู้อำนวยการ'],
            ['stepNumber' => 3, 'stepName' => 'รองผู้อำนวยการ อนุมัติและจัดสรรรถ', 'assignedUserId' => $deputyId ?: 'MMV04', 'description' => 'อนุมัติ จัดสรรรถและผู้ขับรถ หรือเลือกเช่ารถเมื่อรถไม่เพียงพอ'],
            ['stepNumber' => 4, 'stepName' => 'แจ้งไปยังผู้ขับรถ', 'assignedUserId' => '', 'description' => 'ระบบแจ้งเตือนผู้ขับรถอัตโนมัติเฉพาะกรณีใช้รถของโรงเรียน'],
        ];
        $migrateVehicle = $database->prepare('UPDATE approval_pipelines SET pipeline_json = ? WHERE pipeline_id = ?');
        $migrateVehicle->execute([json_encode($vehiclePipeline, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), 'pipe-vehicle']);
    }
}

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
