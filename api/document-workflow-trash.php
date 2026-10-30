<?php
declare(strict_types=1);
require_once __DIR__ . '/document-workflow-revisions.php';

function workflow_install_trash(PDO $db): void
{
    $columns = $db->query('SHOW COLUMNS FROM document_workflows')->fetchAll(PDO::FETCH_COLUMN);
    foreach (['deleted_at' => 'datetime DEFAULT NULL', 'deleted_by' => 'varchar(20) DEFAULT NULL', 'lifecycle_version' => 'int NOT NULL DEFAULT 0'] as $name => $definition) {
        if (in_array($name, $columns, true)) continue;
        try { $db->exec("ALTER TABLE document_workflows ADD COLUMN {$name} {$definition}"); }
        catch (PDOException $exception) { if ((int) ($exception->errorInfo[1] ?? 0) !== 1060) throw $exception; }
    }
    $db->exec("CREATE TABLE IF NOT EXISTS document_workflow_trash_events (
        workflow_id varchar(64) NOT NULL,
        lifecycle_version int NOT NULL,
        action varchar(10) NOT NULL,
        actor_id varchar(20) NOT NULL,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (workflow_id, lifecycle_version)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

/** Soft-delete only unsigned owned submissions. A separate generation prevents stale retries after restoration. */
function workflow_change_deleted(PDO $db, array $user, string $id, bool $remove, int $fileVersion, int $generation): array
{
    if ($generation < 0) throw new WorkflowRevisionError('รุ่นรายการไม่ถูกต้อง กรุณาโหลดข้อมูลใหม่', 422, 'invalid_lifecycle_version');
    $db->beginTransaction();
    try {
        $query = $db->prepare('SELECT * FROM document_workflows WHERE id=? FOR UPDATE');
        $query->execute([$id]);
        $row = $query->fetch(PDO::FETCH_ASSOC);
        if (!$row) throw new WorkflowRevisionError('ไม่พบเอกสาร', 404, 'not_found');
        if (str_starts_with($id, 'EO-') || (string) $row['created_by'] !== (string) $user['id']) throw new WorkflowRevisionError('เฉพาะผู้ส่งเท่านั้นที่ลบหรือนำเอกสารกลับคืนได้', 403, 'forbidden');
        workflow_assert_file_version($row, $fileVersion);
        $current = (int) $row['lifecycle_version'];
        if ($current === $generation + 1 && !empty($row['deleted_at']) === $remove) {
            $db->commit();
            return ['changed' => false, 'row' => $row];
        }
        if ($current !== $generation || !empty($row['deleted_at']) === $remove) throw new WorkflowRevisionError('รายการมีการเปลี่ยนแปลง กรุณาโหลดข้อมูลใหม่', 409, 'document_state_changed');
        try { workflow_assert_unsigned($row); }
        catch (WorkflowRevisionError $exception) { throw new WorkflowRevisionError('ลบหรือนำกลับคืนได้เฉพาะเอกสารที่ยังไม่มีผู้ลงนาม', 409, 'document_delete_locked'); }
        $update = $db->prepare($remove
            ? 'UPDATE document_workflows SET deleted_at=NOW(),deleted_by=?,lifecycle_version=lifecycle_version+1 WHERE id=?'
            : 'UPDATE document_workflows SET deleted_at=NULL,deleted_by=NULL,lifecycle_version=lifecycle_version+1 WHERE id=?');
        $update->execute($remove ? [$user['id'], $id] : [$id]);
        $event = $db->prepare('INSERT INTO document_workflow_trash_events (workflow_id,lifecycle_version,action,actor_id) VALUES (?,?,?,?)');
        $event->execute([$id, $current + 1, $remove ? 'delete' : 'restore', $user['id']]);
        $query->execute([$id]);
        $updated = $query->fetch(PDO::FETCH_ASSOC);
        $db->commit();
        return ['changed' => true, 'row' => $updated];
    } catch (Throwable $exception) {
        if ($db->inTransaction()) $db->rollBack();
        throw $exception;
    }
}
