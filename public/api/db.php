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
