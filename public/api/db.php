<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$localConfig = __DIR__ . '/config.local.php';
if (is_file($localConfig)) {
    require $localConfig;
}

$host = getenv('MMV_DB_HOST') ?: ($mmvDbHost ?? '');
$dbName = getenv('MMV_DB_NAME') ?: ($mmvDbName ?? '');
$username = getenv('MMV_DB_USER') ?: ($mmvDbUser ?? '');
$password = getenv('MMV_DB_PASSWORD') ?: ($mmvDbPassword ?? '');

$pdo = null;
if ($host !== '' && $dbName !== '' && $username !== '' && $password !== '') {
    try {
        $pdo = new PDO(
            "mysql:host={$host};dbname={$dbName};charset=utf8mb4",
            $username,
            $password,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
    } catch (PDOException $exception) {
        error_log('MMV database connection failed: ' . $exception->getCode());
    }
}

function require_database(): PDO
{
    global $pdo;
    if (!$pdo instanceof PDO) {
        api_error('ระบบฐานข้อมูลยังไม่พร้อมใช้งาน', 503, 'database_unavailable');
    }
    return $pdo;
}

function workflow_pipelines(): array
{
    static $pipelines = null;
    if (is_array($pipelines)) {
        return $pipelines;
    }

    // The Admin Console persists workflow assignments in MySQL. Every API
    // authorization and notification lookup must read the same source of
    // truth; otherwise a refresh appears to restore the bundled defaults.
    global $pdo;
    if ($pdo instanceof PDO) {
        try {
            $tableExists = $pdo->query("SHOW TABLES LIKE 'approval_pipelines'")->fetchColumn();
            if ($tableExists) {
                $rows = $pdo->query('SELECT pipeline_json FROM approval_pipelines ORDER BY pipeline_id')
                    ->fetchAll(PDO::FETCH_COLUMN);
                if ($rows) {
                    $decodedRows = [];
                    foreach ($rows as $json) {
                        $decoded = json_decode((string) $json, true);
                        if (is_array($decoded)) $decodedRows[] = $decoded;
                    }
                    if ($decodedRows) return $pipelines = $decodedRows;
                }
            }
        } catch (Throwable $exception) {
            error_log('Workflow database lookup failed; using bundled fallback: ' . $exception->getCode());
        }
    }

    $filePath = __DIR__ . '/pipelines_config.json';
    if (!is_file($filePath)) {
        return $pipelines = [];
    }

    $decoded = json_decode((string) file_get_contents($filePath), true);
    return $pipelines = is_array($decoded) && array_is_list($decoded) ? $decoded : [];
}

function ensure_official_duty_pipeline(PDO $database): void
{
    $tableExists = $database->query("SHOW TABLES LIKE 'approval_pipelines'")->fetchColumn();
    if (!$tableExists) return;
    $query = $database->prepare('SELECT pipeline_json FROM approval_pipelines WHERE pipeline_id = ? LIMIT 1');
    $query->execute(['pipe-duty']);
    $json = $query->fetchColumn();
    if (!is_string($json) || $json === '') return;
    $pipeline = json_decode($json, true);
    if (!is_array($pipeline) || !is_array($pipeline['steps'] ?? null)) return;
    $steps = $pipeline['steps'];
    if (count($steps) !== 3 || (int) ($steps[1]['stepNumber'] ?? 0) !== 2
        || (int) ($steps[2]['stepNumber'] ?? 0) !== 3) return;
    // Preserve administrator-selected deputy and director accounts when adding
    // the missing secretary stage to older three-step configurations.
    $steps[1]['stepNumber'] = 3;
    $steps[2]['stepNumber'] = 4;
    array_splice($steps, 1, 0, [[
        'stepNumber' => 2, 'stepName' => 'เลขานุการ รับทราบคำขอไปราชการ',
        'assignedUserId' => 'MMV14',
        'description' => 'เลขานุการรับทราบหรือตีกลับพร้อมเหตุผลก่อนส่งต่อรองผู้อำนวยการ',
    ]]);
    $pipeline['steps'] = $steps;
    $save = $database->prepare('UPDATE approval_pipelines SET pipeline_json = ? WHERE pipeline_id = ? AND pipeline_json = ?');
    $save->execute([json_encode($pipeline, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), 'pipe-duty', $json]);
}

function workflow_assignee(string $pipelineId, int $stepNumber, string $fallback = ''): string
{
    foreach (workflow_pipelines() as $pipeline) {
        if (!is_array($pipeline) || (string) ($pipeline['id'] ?? '') !== $pipelineId) {
            continue;
        }
        foreach (($pipeline['steps'] ?? []) as $step) {
            if (!is_array($step) || (int) ($step['stepNumber'] ?? 0) !== $stepNumber) {
                continue;
            }
            $assignedUserId = trim((string) ($step['assignedUserId'] ?? ''));
            return $assignedUserId !== '' ? $assignedUserId : $fallback;
        }
    }
    return $fallback;
}

function repair_assignment_definitions(): array
{
    return [
        'audiovisual_handler' => ['label' => 'ผู้ดูแลงานโสตทัศนูปกรณ์และไอที', 'pipeline' => 'pipe-repair-av', 'step' => 2, 'default' => 'MMV18'],
        'building_reviewer' => ['label' => 'ผู้รับแจ้งงานอาคารสถานที่', 'pipeline' => 'pipe-repair-build', 'step' => 2, 'default' => 'MMV03'],
        'building_technician' => ['label' => 'ผู้ดำเนินการซ่อมอาคารสถานที่', 'pipeline' => 'pipe-repair-build', 'step' => 3, 'default' => 'MMV20'],
    ];
}

function ensure_repair_assignments(PDO $database): void
{
    $database->exec("CREATE TABLE IF NOT EXISTS repair_assignments (
      role_key varchar(50) NOT NULL PRIMARY KEY,
      role_label varchar(255) NOT NULL,
      pipeline_id varchar(80) NOT NULL,
      step_number tinyint unsigned NOT NULL,
      user_id varchar(20) NOT NULL,
      updated_by varchar(20) DEFAULT NULL,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY repair_pipeline_step (pipeline_id, step_number),
      KEY repair_assignment_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $insert = $database->prepare('INSERT IGNORE INTO repair_assignments (role_key, role_label, pipeline_id, step_number, user_id) VALUES (?, ?, ?, ?, ?)');
    foreach (repair_assignment_definitions() as $roleKey => $definition) {
        $configuredUserId = workflow_assignee($definition['pipeline'], $definition['step'], $definition['default']);
        $insert->execute([$roleKey, $definition['label'], $definition['pipeline'], $definition['step'], $configuredUserId]);
    }
}

function repair_assignment(PDO $database, string $roleKey, string $fallback = ''): string
{
    ensure_repair_assignments($database);
    $statement = $database->prepare('SELECT user_id FROM repair_assignments WHERE role_key = ? LIMIT 1');
    $statement->execute([$roleKey]);
    $userId = trim((string) ($statement->fetchColumn() ?: ''));
    return $userId !== '' ? $userId : $fallback;
}

function repair_assignment_ids(PDO $database, string $roleKey, array $fallback = []): array
{
    ensure_repair_assignments($database);
    $statement = $database->prepare('SELECT user_id, user_ids FROM repair_assignments WHERE role_key = ? LIMIT 1');
    $statement->execute([$roleKey]);
    $row = $statement->fetch();
    $ids = [];
    if (is_array($row)) {
        $decoded = json_decode((string) ($row['user_ids'] ?? ''), true);
        if (is_array($decoded)) $ids = $decoded;
        $legacyId = trim((string) ($row['user_id'] ?? ''));
        if ($legacyId !== '') $ids[] = $legacyId;
    }
    return array_values(array_unique(array_filter(array_map(static fn($id): string => trim((string) $id), [...$ids, ...$fallback]))));
}

// Schema changes must precede any business transaction: DDL in a notifier could
// otherwise implicitly commit a partially saved request.
if ($pdo instanceof PDO && (PHP_SAPI === 'cli' || !empty($_SESSION['user']['id']))) {
    require_once __DIR__ . '/line-outbox.php';
    try { line_outbox_install($pdo); }
    catch (Throwable $exception) { error_log('LINE outbox schema is not ready: ' . $exception->getCode()); }
}
