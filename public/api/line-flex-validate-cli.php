<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/line-notifier.php';

$config = line_notification_config();
if ($config['token'] === '') {
    fwrite(STDERR, "LINE OA is not configured.\n");
    exit(1);
}

$samples = [
    line_build_flex_message('มีใบลาใหม่รอตรวจสอบ', [
        'เลขที่' => 'LV2569-123456', 'ผู้ยื่น' => 'ตัวอย่าง บุคลากร', 'ประเภท' => 'personal',
        'จำนวน' => '1 วัน', 'วันที่' => '2026-08-20 ถึง 2026-08-20',
    ]),
    line_build_flex_message('อนุมัติการจองห้องแล้ว', [
        'เลขที่' => 'RB-2026-123456', 'ผู้ขอ' => 'ตัวอย่าง บุคลากร', 'ห้อง' => 'ห้องประชุม',
        'วันที่' => '2026-08-20', 'เวลา' => '09:00–10:00',
    ]),
    line_build_flex_message('จัดสรรรถให้คำขอแล้ว', [
        'เลขที่' => 'VB-2026-123456', 'ผู้ขอ' => 'ตัวอย่าง บุคลากร', 'ปลายทาง' => 'สำนักงานเขตพื้นที่การศึกษา',
        'วันที่' => '2026-08-20 08:00',
    ]),
    line_build_flex_message('เชื่อมบัญชีไม่สำเร็จ', [
        'รายละเอียด' => 'รหัสเชื่อมบัญชีไม่ถูกต้องหรือหมดอายุ',
    ]),
];

foreach ($samples as $index => $message) {
    $valid = line_post_message(
        'https://api.line.me/v2/bot/message/validate/push',
        ['messages' => [$message]],
        $config['token']
    );
    if (!$valid) {
        fwrite(STDERR, 'Flex Message sample ' . ($index + 1) . " is invalid.\n");
        exit(1);
    }
}

fwrite(STDOUT, "All LINE Flex Message samples are valid.\n");
