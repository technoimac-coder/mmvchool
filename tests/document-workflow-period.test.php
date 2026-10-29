<?php
declare(strict_types=1);
require_once __DIR__ . '/../api/document-workflow-period.php';
function period_check(bool $passed, string $message): void { if (!$passed) throw new RuntimeException($message); }

$cases = [['2568', '2', '2569'], ['2569', '1', '2569'], ['2569', '2', '2570'], ['2570', '1', '2570'], ['2574', '2', '2575']];
foreach ($cases as [$year, $semester, $expected]) {
    period_check(workflow_fiscal_year('classroom_research', $year, $semester) === $expected, "Incorrect fiscal pair {$semester}/{$year}");
}
foreach (['lesson_plan', 'innovation_report', 'other'] as $topic) {
    period_check(workflow_fiscal_year($topic, '2569', '2') === null, 'Non-research must not acquire a fiscal year');
}
foreach ([['', '2'], ['all', '1'], ['2569', ''], ['2569', 'all'], ['2569', '3'], ["2569\n", '1']] as [$year, $semester]) {
    period_check(workflow_fiscal_year('classroom_research', $year, $semester) === null, 'Unknown period must remain unset');
}

$db = new PDO('sqlite::memory:');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->sqliteCreateFunction('regexp', static fn(string $pattern, string $value): int => preg_match('~' . $pattern . '~D', $value) === 1 ? 1 : 0, 2);
$db->exec('CREATE TABLE document_workflows (id TEXT PRIMARY KEY, topic TEXT, academic_year TEXT, semester TEXT, fiscal_year TEXT, created_by TEXT, status TEXT, file_url TEXT, signers_json TEXT, batch_id TEXT, created_at TEXT)');
$insert = $db->prepare('INSERT INTO document_workflows VALUES (?,?,?,?,?,?,?,?,?,?,?)');
foreach ($cases as $index => [$year, $semester, $expected]) {
    $insert->execute(["research-{$index}", 'classroom_research', $year, $semester, null, 'teacher-A', 'completed', '/original.pdf', '[{"status":"signed"}]', 'original-batch', '2026-09-01']);
}
$insert->execute(['ordinary', 'lesson_plan', '2569', '2', null, 'teacher-B', 'pending', '/lesson.pdf', '[]', null, '2026-10-01']);
$insert->execute(['unknown', 'classroom_research', '', '', null, 'teacher-A', 'pending', '/unknown.pdf', '[]', null, '2026-10-29']);
$insert->execute(['already-stored', 'classroom_research', '2569', '1', '2569', 'teacher-A', 'completed', '/existing.pdf', '[]', null, '2026-10-29']);
$before = $db->query('SELECT * FROM document_workflows ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
workflow_backfill_fiscal_year($db);
foreach ($cases as $index => [$year, $semester, $expected]) {
    $query = $db->prepare('SELECT fiscal_year FROM document_workflows WHERE id=?');
    $query->execute(["research-{$index}"]);
    period_check($query->fetchColumn() === $expected, 'Backfill must match new-document fiscal calculation');
}
$after = $db->query('SELECT * FROM document_workflows ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
foreach ($before as $index => $original) {
    $updated = $after[$index];
    unset($original['fiscal_year'], $updated['fiscal_year']);
    period_check($original === $updated, 'Migration changed original document/period/owner/signature data');
}
period_check($db->query("SELECT fiscal_year FROM document_workflows WHERE id='ordinary'")->fetchColumn() === null, 'Ordinary document changed');
period_check($db->query("SELECT fiscal_year FROM document_workflows WHERE id='unknown'")->fetchColumn() === null, 'Missing term must not be guessed from upload date or active settings');
workflow_backfill_fiscal_year($db);
period_check($after === $db->query('SELECT * FROM document_workflows ORDER BY id')->fetchAll(PDO::FETCH_ASSOC), 'Backfill must be idempotent');
echo "Workflow fiscal storage: term pairs, legacy backfill, preservation and retry checks passed\n";

// Optional integration check against an isolated, explicitly named MySQL test database.
if (in_array('--mysql', $argv ?? [], true)) {
    $server = new PDO('mysql:host=127.0.0.1;port=43317;charset=utf8mb4', 'root', '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $server->exec('CREATE DATABASE IF NOT EXISTS mmv_workflow_period_test CHARACTER SET utf8mb4');
    $server->exec('USE mmv_workflow_period_test');
    $server->exec("CREATE TABLE document_workflows (
        id varchar(64) PRIMARY KEY, topic varchar(30), academic_year varchar(10), semester varchar(2),
        created_by varchar(20), file_name varchar(255), status varchar(20), signers_json longtext
    ) ENGINE=InnoDB");
    $server->exec("INSERT INTO document_workflows VALUES
        ('legacy-research','classroom_research','2569','2','teacher-A','original.pdf','completed','[{\"status\":\"signed\"}]'),
        ('legacy-lesson','lesson_plan','2569','2','teacher-B','lesson.pdf','pending','[]'),
        ('legacy-unknown','classroom_research','','','teacher-A','unknown.pdf','pending','[]')");
    workflow_install_period_storage($server);
    workflow_install_period_storage($server);
    period_check($server->query("SELECT fiscal_year FROM document_workflows WHERE id='legacy-research'")->fetchColumn() === '2570', 'MySQL research backfill failed');
    period_check($server->query("SELECT fiscal_year FROM document_workflows WHERE id='legacy-unknown'")->fetchColumn() === null, 'MySQL unknown period changed');
    period_check($server->query("SELECT fiscal_year FROM document_workflows WHERE id='legacy-lesson'")->fetchColumn() === null, 'MySQL lesson changed');
    $indexes = array_unique(array_column($server->query('SHOW INDEX FROM document_workflows')->fetchAll(PDO::FETCH_ASSOC), 'Key_name'));
    foreach (['workflow_owner_period', 'workflow_academic_period', 'workflow_research_fiscal'] as $index) period_check(in_array($index, $indexes, true), 'Missing index ' . $index);
    period_check($server->query('SELECT COUNT(*) FROM document_workflows')->fetchColumn() == 3, 'Migration removed records');
    $saved = $server->query("SELECT file_name,status,signers_json FROM document_workflows WHERE id='legacy-research'")->fetch(PDO::FETCH_ASSOC);
    period_check($saved === ['file_name' => 'original.pdf', 'status' => 'completed', 'signers_json' => '[{"status":"signed"}]'], 'MySQL migration changed file/signature history');
    echo "MySQL schema upgrade: separate fiscal column, indexes, backfill, and repeat installation passed\n";
}
