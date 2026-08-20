<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/line-notifier.php';

if (!line_notification_status()['enabled']) {
    fwrite(STDERR, "LINE OA is not configured.\n");
    exit(1);
}

$sent = line_notify_event('ทดสอบการแจ้งเตือน MMV Smart MIS', [
    'สถานะ' => 'ระบบเชื่อมต่อสำเร็จ',
    'เว็บไซต์' => 'https://mmvschool.ac.th',
]);

if (!$sent) {
    fwrite(STDERR, "LINE OA rejected the test notification.\n");
    exit(1);
}

fwrite(STDOUT, "LINE OA test notification sent successfully.\n");
