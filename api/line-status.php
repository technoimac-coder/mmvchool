<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/line-notifier.php';

$currentUser = require_roles('admin', 'director');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    api_respond(['status' => 'success', 'line' => line_notification_status()]);
}

if ($method === 'POST') {
    require_csrf();
    $input = json_body();
    if (($input['action'] ?? '') !== 'test') {
        api_error('ไม่รู้จักคำสั่งที่ร้องขอ', 400, 'unknown_action');
    }
    if (!line_notification_status()['enabled']) {
        api_error('ยังไม่ได้ตั้งค่า LINE OA บนเซิร์ฟเวอร์', 503, 'line_not_configured');
    }
    $sent = line_notify_event('ทดสอบการแจ้งเตือน LINE OA', [
        'ผู้ทดสอบ' => $currentUser['name'],
        'เว็บไซต์' => 'https://mmvschool.ac.th',
    ]);
    if (!$sent) {
        api_error('LINE OA ปฏิเสธข้อความหรือเชื่อมต่อไม่ได้ กรุณาตรวจ token และปลายทาง', 502, 'line_send_failed');
    }
    api_respond(['status' => 'success', 'message' => 'ส่งข้อความทดสอบแล้ว']);
}

api_error('ไม่รองรับวิธีการเรียกนี้', 405, 'method_not_allowed');
