<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
set_exception_handler(static function (Throwable $exception): void {
    fwrite(STDERR, 'LINE delivery worker failed: ' . $exception->getMessage() . PHP_EOL);
    exit(1);
});
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/line-outbox.php';
require_once __DIR__ . '/document-workflow-notification.php';
if (!$pdo instanceof PDO) throw new RuntimeException('Database connection is unavailable');
$db = $pdo;
line_outbox_install($db);
$options = getopt('', ['recover-notification:', 'recipient:']);
if (isset($options['recover-notification'])) {
    $recipient = (string) ($options['recipient'] ?? '');
    $notification = $db->prepare("SELECT related_id,message FROM notifications WHERE id=? AND user_id=? AND module='document_workflow' AND title='ลงนามเอกสารครบแล้ว'");
    $notification->execute([(string) $options['recover-notification'], $recipient]);
    $original = $notification->fetch(PDO::FETCH_ASSOC);
    $id = $original['related_id'] ?? '';
    if (!$id || str_starts_with((string) $id, 'EO-')) throw new RuntimeException('Completed document notification not found for the specified recipient');
    $find = $db->prepare("SELECT * FROM document_workflows WHERE id=? AND created_by=? AND status='completed' AND deleted_at IS NULL");
    $find->execute([$id, $recipient]);
    $row = $find->fetch(PDO::FETCH_ASSOC);
    if (!$row) throw new RuntimeException('Current completed document not found');
    if (!preg_match('/ฉบับที่ (\d+)/u', (string) $original['message'], $match) || (int) $match[1] !== (int) $row['file_version']) throw new RuntimeException('Notification does not refer to the current file version');
    $notice = workflow_completion_notice(['title'=>$row['title'], 'fileName'=>$row['file_name'], 'fileVersion'=>(int) $row['file_version']], json_decode($row['signers_json'], true));
    $jobs = line_outbox_enqueue_completion($db, [$recipient], 'ลงนามเอกสารครบแล้ว', $notice['fields'], (string) $id);
    if (!$jobs) throw new RuntimeException('Recipient has no active linked LINE account');
    $counts = line_outbox_drain($db, 1, $jobs);
} else {
    $counts = line_outbox_drain($db);
}
if (array_sum($counts)) fwrite(STDOUT, json_encode($counts, JSON_THROW_ON_ERROR) . PHP_EOL);
