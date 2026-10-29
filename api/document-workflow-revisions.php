<?php
declare(strict_types=1);
require_once __DIR__ . '/document-upload.php';

class WorkflowRevisionError extends RuntimeException
{
    public function __construct(string $message, public int $httpStatus, public string $errorCode)
    {
        parent::__construct($message);
    }
}

function workflow_install_revisions(PDO $db): void
{
    $columns = $db->query('SHOW COLUMNS FROM document_workflows')->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('file_version', $columns, true)) {
        try { $db->exec('ALTER TABLE document_workflows ADD COLUMN file_version int NOT NULL DEFAULT 1'); }
        catch (PDOException $exception) { if ((int) ($exception->errorInfo[1] ?? 0) !== 1060) throw $exception; }
    }
    $db->exec("CREATE TABLE IF NOT EXISTS document_workflow_revisions (
        workflow_id varchar(64) NOT NULL,
        version int NOT NULL,
        file_name varchar(255) NOT NULL,
        stored_name varchar(100) NOT NULL,
        snapshot_json longtext NOT NULL,
        request_key varchar(64) NOT NULL,
        replaced_by varchar(20) NOT NULL,
        replaced_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (workflow_id, version),
        UNIQUE KEY workflow_revision_retry (workflow_id, request_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function workflow_assert_file_version(array $row, int $expectedVersion): void
{
    if ($expectedVersion !== (int) ($row['file_version'] ?? $row['fileVersion'] ?? 1)) {
        throw new WorkflowRevisionError('เอกสารมีฉบับใหม่แล้ว กรุณาปิดแล้วเปิดรายการอีกครั้งก่อนดำเนินการ', 409, 'document_version_changed');
    }
}

function workflow_validate_revision_pdf(?array $file): void
{
    $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if (in_array($error, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) throw new WorkflowRevisionError('ไฟล์เกินขนาดที่เซิร์ฟเวอร์อนุญาต', 413, 'upload_limit_exceeded');
    if (!$file || $error !== UPLOAD_ERR_OK) throw new WorkflowRevisionError('กรุณาแนบ PDF ฉบับแก้ไขให้ครบถ้วน', 422, 'document_required');
    $path = (string) ($file['tmp_name'] ?? '');
    $size = is_file($path) ? filesize($path) : 0;
    if (!$size || $size > 15 * 1024 * 1024) throw new WorkflowRevisionError('ไฟล์ต้องไม่ว่างและมีขนาดไม่เกิน 15 MB', 422, 'document_too_large');
    if (mb_strlen((string) ($file['name'] ?? '')) > 255 || strtolower(pathinfo((string) ($file['name'] ?? ''), PATHINFO_EXTENSION)) !== 'pdf' || file_get_contents($path, false, null, 0, 5) !== '%PDF-') {
        throw new WorkflowRevisionError('กรุณาแนบไฟล์ PDF ฉบับแก้ไข', 422, 'unsupported_document');
    }
}

/** Replace a returned file atomically; keep the same submission and archive its complete previous state. */
function workflow_resubmit(PDO $db, array $user, string $id, ?array $file, string $requestId, int $expectedVersion, string $storageRoot, ?callable $moveUpload = null): array
{
    try { $key = document_upload_request_id((string) $user['id'], $requestId); }
    catch (InvalidArgumentException $exception) { throw new WorkflowRevisionError($exception->getMessage(), 422, 'invalid_request_id'); }
    if ($key === null) throw new WorkflowRevisionError('กรุณาเลือกไฟล์ฉบับแก้ไขใหม่', 422, 'invalid_request_id');
    $newPath = null;
    $db->beginTransaction();
    try {
        $query = $db->prepare('SELECT * FROM document_workflows WHERE id = ? FOR UPDATE');
        $query->execute([$id]);
        $row = $query->fetch(PDO::FETCH_ASSOC);
        if (!$row) throw new WorkflowRevisionError('ไม่พบเอกสาร', 404, 'not_found');
        if (str_starts_with($id, 'EO-') || (string) $row['created_by'] !== (string) $user['id']) throw new WorkflowRevisionError('เฉพาะผู้ส่งเอกสารเดิมเท่านั้นที่อัปโหลดฉบับแก้ไขได้', 403, 'forbidden');
        $retry = $db->prepare('SELECT 1 FROM document_workflow_revisions WHERE workflow_id = ? AND request_key = ?');
        $retry->execute([$id, $key]);
        if ($retry->fetchColumn()) {
            $db->commit();
            return ['changed' => false, 'row' => $row];
        }
        workflow_assert_file_version($row, $expectedVersion);
        if ($row['status'] !== 'rejected') throw new WorkflowRevisionError('อัปโหลดฉบับแก้ไขได้เฉพาะเอกสารที่ถูกส่งกลับแก้ไข', 409, 'document_not_returned');
        workflow_validate_revision_pdf($file);
        $previousSigners = json_decode((string) $row['signers_json'], true);
        if (!is_array($previousSigners) || !$previousSigners) throw new WorkflowRevisionError('ไม่พบลำดับผู้ลงนามเดิม กรุณาติดต่อผู้ดูแล', 409, 'missing_signers');
        $signers = [];
        foreach (array_values($previousSigners) as $index => $signer) {
            if (empty($signer['userId']) || (int) ($signer['step'] ?? 0) !== $index + 1) throw new WorkflowRevisionError('ลำดับผู้ลงนามเดิมไม่ถูกต้อง กรุณาติดต่อผู้ดูแล', 409, 'invalid_signers');
            // Old signatures, positions, comments and dates belong only to the archived version.
            $signers[] = ['userId' => (string) $signer['userId'], 'userName' => (string) ($signer['userName'] ?? ''), 'step' => $index + 1, 'status' => 'pending'];
        }
        $first = $db->prepare("SELECT id FROM users WHERE id = ? AND status = 'active'");
        $first->execute([$signers[0]['userId']]);
        if (!$first->fetchColumn()) throw new WorkflowRevisionError('ผู้ลงนามคนแรกเดิมไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแล', 409, 'signer_unavailable');
        $safeUser = preg_replace('/[^A-Za-z0-9_-]/', '_', (string) $user['id']);
        $directory = rtrim($storageRoot, '/\\') . '/' . $safeUser;
        if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) throw new RuntimeException('Cannot create document directory');
        $storedName = bin2hex(random_bytes(12)) . '.pdf';
        $newPath = $directory . '/' . $storedName;
        if (!(($moveUpload ?? 'move_uploaded_file')((string) $file['tmp_name'], $newPath))) throw new RuntimeException('Cannot store revised document');
        $version = (int) ($row['file_version'] ?? 1);
        $archive = $db->prepare('INSERT INTO document_workflow_revisions (workflow_id,version,file_name,stored_name,snapshot_json,request_key,replaced_by) VALUES (?,?,?,?,?,?,?)');
        $archive->execute([$id, $version, $row['file_name'], $row['stored_name'], json_encode($row, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), $key, $user['id']]);
        $update = $db->prepare("UPDATE document_workflows SET file_name=?,stored_name=?,signers_json=?,status='pending',current_step=1,file_version=? WHERE id=?");
        $update->execute([(string) $file['name'], $storedName, json_encode($signers, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), $version + 1, $id]);
        $query->execute([$id]);
        $updated = $query->fetch(PDO::FETCH_ASSOC);
        $db->commit();
        return ['changed' => true, 'row' => $updated];
    } catch (Throwable $exception) {
        if ($db->inTransaction()) $db->rollBack();
        if ($newPath !== null && is_file($newPath)) unlink($newPath);
        throw $exception;
    }
}
