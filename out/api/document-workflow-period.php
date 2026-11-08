<?php
declare(strict_types=1);

/** School fiscal reporting follows academic terms, never the upload date. */
function workflow_fiscal_year(string $topic, string $academicYear, string $semester): ?string
{
    if ($topic !== 'classroom_research' || !preg_match('/^[0-9]{4}$/D', $academicYear) || !in_array($semester, ['1', '2'], true)) return null;
    return (string) ((int) $academicYear + ($semester === '2' ? 1 : 0));
}

/** Fill only known research periods; preserve original academic period and document history. */
function workflow_backfill_fiscal_year(PDO $db): void
{
    $db->exec("UPDATE document_workflows
        SET fiscal_year = CAST(CAST(academic_year AS UNSIGNED) + CASE WHEN semester = '2' THEN 1 ELSE 0 END AS CHAR)
        WHERE topic = 'classroom_research' AND fiscal_year IS NULL
          AND LENGTH(academic_year) = 4 AND academic_year REGEXP '^[0-9]{4}$' AND semester IN ('1', '2')");
}

/** Add separate period fields and searchable indexes to existing installations. Safe to retry. */
function workflow_install_period_storage(PDO $db): void
{
    $columns = $db->query('SHOW COLUMNS FROM document_workflows')->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('fiscal_year', $columns, true)) {
        try {
            $db->exec('ALTER TABLE document_workflows ADD COLUMN fiscal_year varchar(5) DEFAULT NULL');
        } catch (PDOException $exception) {
            // Another authenticated request may have installed the same column.
            if ((int) ($exception->errorInfo[1] ?? 0) !== 1060) throw $exception;
        }
    }
    $indexes = array_column($db->query('SHOW INDEX FROM document_workflows')->fetchAll(PDO::FETCH_ASSOC), 'Key_name');
    foreach ([
        'workflow_owner_period' => 'created_by, academic_year, semester, topic',
        'workflow_academic_period' => 'academic_year, semester, topic',
        'workflow_research_fiscal' => 'topic, fiscal_year, created_by',
    ] as $name => $fields) {
        if (in_array($name, $indexes, true)) continue;
        try {
            $db->exec("ALTER TABLE document_workflows ADD INDEX {$name} ({$fields})");
        } catch (PDOException $exception) {
            if ((int) ($exception->errorInfo[1] ?? 0) !== 1061) throw $exception;
        }
    }
    // Indexed NULL lookup also catches legacy writers. Failed backfills retry on the next request.
    workflow_backfill_fiscal_year($db);
}
