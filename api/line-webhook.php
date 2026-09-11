<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/line-notifier.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    http_response_code(405);
    exit;
}

$rawBody = file_get_contents('php://input') ?: '';
$signature = (string) ($_SERVER['HTTP_X_LINE_SIGNATURE'] ?? '');
global $mmvLineChannelSecret;
$channelSecret = trim((string) (getenv('MMV_LINE_CHANNEL_SECRET') ?: ($mmvLineChannelSecret ?? '')));

if ($channelSecret === '' || $signature === '') {
    http_response_code(401);
    exit;
}
$expectedSignature = base64_encode(hash_hmac('sha256', $rawBody, $channelSecret, true));
if (!hash_equals($expectedSignature, $signature)) {
    http_response_code(401);
    exit;
}

$payload = json_decode($rawBody, true);
if (!is_array($payload)) {
    http_response_code(400);
    exit;
}

$database = require_database();
foreach (($payload['events'] ?? []) as $event) {
    if (!is_array($event) || ($event['type'] ?? '') !== 'message' || ($event['message']['type'] ?? '') !== 'text') {
        continue;
    }
    $replyToken = (string) ($event['replyToken'] ?? '');
    $sourceType = (string) ($event['source']['type'] ?? '');
    $lineUserId = (string) ($event['source']['userId'] ?? '');
    $text = trim((string) ($event['message']['text'] ?? ''));

    if (!preg_match('/^(?:ผูกบัญชี|LINK)\s*([0-9]{8})$/iu', $text, $matches)) {
        continue;
    }
    if ($sourceType !== 'user' || $lineUserId === '') {
        line_reply_event($replyToken, 'กรุณาเชื่อมบัญชีในแชตส่วนตัว', [
            'รายละเอียด' => 'ส่งรหัสเชื่อมบัญชีในแชตส่วนตัวกับ MMV Smart School',
        ]);
        continue;
    }

    $code = $matches[1];
    $statement = $database->query(
        'SELECT c.user_id, c.code_hash, u.name
         FROM line_link_codes c INNER JOIN users u ON u.id = c.user_id
         WHERE c.expires_at >= NOW() ORDER BY c.created_at DESC'
    );
    $matchedUser = null;
    foreach ($statement->fetchAll() as $candidate) {
        if (password_verify($code, (string) $candidate['code_hash'])) {
            $matchedUser = $candidate;
            break;
        }
    }
    if (!$matchedUser) {
        line_reply_event($replyToken, 'เชื่อมบัญชีไม่สำเร็จ', [
            'รายละเอียด' => 'รหัสเชื่อมบัญชีไม่ถูกต้องหรือหมดอายุ',
            'วิธีแก้ไข' => 'กรุณาสร้างรหัสใหม่จากเว็บไซต์',
        ]);
        continue;
    }

    $database->beginTransaction();
    try {
        $database->prepare('DELETE FROM line_accounts WHERE line_user_id = ? AND user_id <> ?')
            ->execute([$lineUserId, $matchedUser['user_id']]);
        $database->prepare(
            "INSERT INTO line_accounts (user_id, line_user_id, status, linked_at)
             VALUES (?, ?, 'active', NOW())
             ON DUPLICATE KEY UPDATE line_user_id = VALUES(line_user_id), status = 'active', linked_at = NOW()"
        )->execute([$matchedUser['user_id'], $lineUserId]);
        $database->prepare('DELETE FROM line_link_codes WHERE user_id = ?')->execute([$matchedUser['user_id']]);
        $database->commit();
        line_reply_event(
            $replyToken,
            'เชื่อมบัญชีสำเร็จ',
            [
                'บัญชีบุคลากร' => line_clean_text((string) $matchedUser['name']),
                'สถานะ' => 'พร้อมรับการแจ้งเตือนที่เกี่ยวข้องโดยตรง',
            ]
        );
    } catch (Throwable $exception) {
        if ($database->inTransaction()) {
            $database->rollBack();
        }
        error_log('LINE account linking failed: ' . $exception->getMessage());
        line_reply_event($replyToken, 'เชื่อมบัญชีไม่สำเร็จ', [
            'รายละเอียด' => 'ระบบไม่สามารถเชื่อมบัญชีได้ในขณะนี้',
            'วิธีแก้ไข' => 'กรุณาลองใหม่ภายหลัง',
        ]);
    }
}

http_response_code(200);
echo 'OK';
