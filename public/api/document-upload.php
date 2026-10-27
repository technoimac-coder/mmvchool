<?php
declare(strict_types=1);

// Scope retry keys to the authenticated teacher; never trust an owner from POST.
function document_upload_request_id(string $userId, string $requestId): ?string
{
    if ($requestId === '') return null;
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $requestId)) {
        throw new InvalidArgumentException('รหัสการส่งไฟล์ไม่ถูกต้อง กรุณาเลือกไฟล์ใหม่');
    }
    return 'DOC-' . substr(hash('sha256', $userId . ':' . strtolower($requestId)), 0, 40);
}
