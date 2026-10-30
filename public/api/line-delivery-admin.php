<?php
declare(strict_types=1);
require_once __DIR__ . '/line-outbox.php';

class LineDeliveryError extends RuntimeException {}

function line_delivery_reason(array $row): string
{
    $error = (string) ($row['last_error'] ?? '');
    $known = [
        'account_not_linked'=>'ยังไม่ผูกบัญชี LINE',
        'linked_account_changed'=>'บัญชี LINE เปลี่ยน ต้องตรวจสอบผู้รับก่อน',
        'document_no_longer_current'=>'เอกสารเปลี่ยนฉบับ ถูกลบ หรือบัญชีไม่พร้อมใช้งาน',
        'retry_window_expired'=>'เกินเวลาส่งซ้ำอย่างปลอดภัย โปรดตรวจสอบในระบบ',
        'retry_attempts_exhausted'=>'ลองส่งอัตโนมัติครบจำนวนแล้ว',
    ];
    if (isset($known[$error])) return $known[$error];
    $http = (int) ($row['last_http_status'] ?? 0);
    if ($http === 401 || $http === 403) return 'LINE ปฏิเสธสิทธิ์ กรุณาตรวจการตั้งค่า LINE OA';
    if ($http === 429) return 'เกินโควตาหรืออัตราส่งของ LINE กรุณาตรวจแพ็กเกจ/โควตา';
    if ($http >= 500) return 'บริการ LINE ขัดข้อง';
    if ($http >= 400) return 'LINE ปฏิเสธคำขอ กรุณาให้ผู้ดูแลตรวจสอบ';
    if ($error !== '') return 'เชื่อมต่อ LINE ไม่สำเร็จหรือหมดเวลา';
    return '';
}

function line_delivery_retry_allowed(array $row): bool
{
    return $row['status'] === 'failed' && (int) ($row['age_seconds'] ?? 86400) < 23*3600
        && (int) ($row['retry_round'] ?? 0) < 3
        && !in_array($row['last_error'] ?? '', ['linked_account_changed','document_no_longer_current','retry_window_expired'], true)
        && !in_array((int) ($row['last_http_status'] ?? 0), [400,404,409], true);
}

function line_delivery_retry(PDO $db, string $id, int $attempts): array
{
    if (!preg_match('/^[a-f0-9-]{36}$/D', $id)) throw new LineDeliveryError('ไม่พบรายการแจ้งเตือน');
    $db->beginTransaction();
    try {
        $q=$db->prepare('SELECT *,TIMESTAMPDIFF(SECOND,created_at,NOW()) AS age_seconds FROM line_notification_outbox WHERE id=? FOR UPDATE');
        $q->execute([$id]);$row=$q->fetch(PDO::FETCH_ASSOC);
        if (!$row || !line_delivery_retry_allowed($row) || (int) $row['attempts'] !== $attempts) throw new LineDeliveryError('รายการเปลี่ยนสถานะแล้ว หรือไม่สามารถส่งซ้ำอย่างปลอดภัยได้ กรุณาโหลดใหม่');
        $account=$db->prepare("SELECT la.line_user_id FROM line_accounts la JOIN users u ON BINARY u.id=BINARY la.user_id WHERE la.user_id=? AND la.status='active' AND u.status='active'");
        $account->execute([$row['user_id']]);$target=$account->fetchColumn();
        if (!$target) throw new LineDeliveryError('ผู้รับยังไม่ผูกบัญชี LINE หรือบัญชีไม่พร้อมใช้งาน');
        $payload=json_decode($row['payload_json'],true,512,JSON_THROW_ON_ERROR);
        if (($payload['to'] ?? '') === '' && (int) $row['attempts'] === 0) $payload['to']=$target;
        if (($payload['to'] ?? '') !== $target) throw new LineDeliveryError('บัญชี LINE ผู้รับเปลี่ยนแล้ว ไม่ส่งข้อความเก่าไปยังบัญชีใหม่');
        if ($row['kind'] === 'completion') {
            $doc=$db->prepare('SELECT created_by,status,file_version,deleted_at FROM document_workflows WHERE id=?');$doc->execute([$row['workflow_id']]);$document=$doc->fetch(PDO::FETCH_ASSOC);
            if (!$document || $document['created_by']!==$row['user_id'] || $document['deleted_at'] || $document['status']!=='completed' || (int) $document['file_version']!==(int) $row['file_version']) throw new LineDeliveryError('เอกสารนี้ไม่ใช่ฉบับที่ลงนามครบแล้วในปัจจุบัน');
        }
        $update=$db->prepare("UPDATE line_notification_outbox SET status='pending',retry_round=retry_round+1,attempt_limit=attempts+8,next_attempt_at=NOW(),lease_until=NULL,last_error='',payload_json=? WHERE id=?");
        $update->execute([json_encode($payload,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),$id]);
        $db->commit();return [$id];
    } catch (Throwable $exception) { if ($db->inTransaction()) $db->rollBack();throw $exception; }
}
