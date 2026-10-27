<?php
declare(strict_types=1);
require __DIR__ . '/../api/document-upload.php';
function check(bool $condition, string $message): void { if (!$condition) throw new RuntimeException($message); }
$key = 'bdab1000-8326-4ac6-92d2-d77ec0001111';
$id = document_upload_request_id('teacher-1', $key);
check($id === document_upload_request_id('teacher-1', $key), 'Retry must reuse the workflow ID');
check($id === document_upload_request_id('teacher-1', strtoupper($key)), 'Case does not change a retry ID');
check($id !== document_upload_request_id('teacher-2', $key), 'Two teachers cannot share a retry ID');
check($id !== document_upload_request_id('teacher-1', 'bdab1000-8326-4ac6-92d2-d77ec0001112'), 'Each file needs a separate workflow');
check(strlen($id) <= 64 && str_starts_with($id, 'DOC-'), 'ID fits existing schema and permissions');
check(document_upload_request_id('teacher-1', '') === null, 'Legacy single-file clients still work');
foreach (['../existing', 'DOC-arbitrary', 'bad', str_repeat('a', 500)] as $invalid) {
    try { document_upload_request_id('teacher-1', $invalid); throw new RuntimeException('Accepted invalid request key'); }
    catch (InvalidArgumentException $exception) { /* expected */ }
}
echo "document upload identity: passed\n";
