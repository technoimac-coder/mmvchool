<?php
declare(strict_types=1);

function line_notification_config(): array
{
    global $mmvLineChannelAccessToken, $mmvLineMode, $mmvLineTargetIds;

    $token = trim((string) (getenv('MMV_LINE_CHANNEL_ACCESS_TOKEN') ?: ($mmvLineChannelAccessToken ?? '')));
    $mode = strtolower(trim((string) (getenv('MMV_LINE_MODE') ?: ($mmvLineMode ?? 'push'))));
    if (!in_array($mode, ['push', 'broadcast'], true)) {
        $mode = 'push';
    }

    $environmentTargets = trim((string) (getenv('MMV_LINE_TARGET_IDS') ?: ''));
    $targets = $environmentTargets !== ''
        ? preg_split('/\s*,\s*/', $environmentTargets, -1, PREG_SPLIT_NO_EMPTY)
        : ($mmvLineTargetIds ?? []);
    if (!is_array($targets)) {
        $targets = preg_split('/\s*,\s*/', (string) $targets, -1, PREG_SPLIT_NO_EMPTY);
    }
    $targets = array_values(array_unique(array_filter(array_map(
        static fn ($target): string => trim((string) $target),
        $targets
    ))));

    return [
        'token' => $token,
        'mode' => $mode,
        'targets' => $targets,
        'enabled' => $token !== '' && ($mode === 'broadcast' || count($targets) > 0),
    ];
}

function line_notification_status(): array
{
    $config = line_notification_config();
    return [
        'enabled' => $config['enabled'],
        'mode' => $config['mode'],
        'targetCount' => count($config['targets']),
    ];
}

function line_clean_text(string $value): string
{
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '';
    return trim(preg_replace('/\s+/u', ' ', $value) ?? '');
}

function line_build_event_message(string $title, array $fields): string
{
    $lines = ['🔔 MMV Smart MIS', line_clean_text($title)];
    foreach ($fields as $label => $value) {
        $cleanValue = line_clean_text((string) $value);
        if ($cleanValue !== '') {
            $lines[] = line_clean_text((string) $label) . ': ' . $cleanValue;
        }
    }
    $message = implode("\n", $lines);
    return function_exists('mb_substr')
        ? mb_substr($message, 0, 5000, 'UTF-8')
        : substr($message, 0, 5000);
}

function line_format_display_value(string $label, mixed $value): string
{
    $display = line_clean_text((string) $value);
    $leaveTypes = [
        'personal' => 'ลากิจส่วนตัว',
        'sick' => 'ลาป่วย',
        'maternity' => 'ลาคลอดบุตร',
        'other' => 'ลาอื่น ๆ',
    ];
    if ($label === 'ประเภท' && isset($leaveTypes[$display])) {
        $display = $leaveTypes[$display];
    }

    $thaiMonths = [1 => 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    $display = preg_replace_callback('/\b(\d{4})-(\d{2})-(\d{2})\b/', static function (array $matches) use ($thaiMonths): string {
        $month = (int) $matches[2];
        if ($month < 1 || $month > 12) return $matches[0];
        return (int) $matches[3] . ' ' . $thaiMonths[$month] . ' ' . ((int) $matches[1] + 543);
    }, $display) ?? $display;

    return function_exists('mb_substr') ? mb_substr($display, 0, 180, 'UTF-8') : substr($display, 0, 180);
}

function line_notification_presentation(string $title, array $fields): array
{
    $haystack = $title . ' ' . implode(' ', array_keys($fields));
    $isRejected = str_contains($haystack, 'ไม่อนุมัติ') || str_contains($haystack, 'ปฏิเสธ')
        || str_contains($haystack, 'ไม่สำเร็จ') || str_contains($haystack, 'ล้มเหลว')
        || str_contains($haystack, 'ไม่ถูกต้อง') || str_contains($haystack, 'หมดอายุ');
    $isSuccess = !$isRejected && (str_contains($haystack, 'อนุมัติ') || str_contains($haystack, 'สำเร็จ')
        || str_contains($haystack, 'จัดสรร') || str_contains($haystack, 'รับงาน')
        || str_contains($haystack, 'ปิดรายการ') || str_contains($haystack, 'พร้อม'));
    $isPending = !$isRejected && !$isSuccess && (str_contains($haystack, 'คำขอ')
        || str_contains($haystack, 'ใหม่') || str_contains($haystack, 'รอ'));

    $module = 'dashboard';
    $buttonLabel = 'เปิด MMV Smart School';
    if (str_contains($haystack, 'ใบลา') || str_contains($haystack, 'คำขอลา') || array_key_exists('ประเภท', $fields)) {
        $module = 'leave';
        $buttonLabel = $isPending ? 'เปิดพิจารณาใบลา' : 'ดูรายละเอียดใบลา';
    } elseif (str_contains($haystack, 'สอนแทน') || array_key_exists('ครูประจำวิชา', $fields) || array_key_exists('ครูสอนแทน', $fields) || array_key_exists('คาบ', $fields)) {
        $module = 'substitute';
        $buttonLabel = 'รับทราบการสอนแทน';
    } elseif (str_contains($haystack, 'ห้อง') || str_contains($haystack, 'อาคาร') || str_contains($haystack, 'สถานที่') || array_key_exists('ห้อง', $fields)) {
        $module = 'room';
        $buttonLabel = $isPending ? 'เปิดพิจารณาการจอง' : 'ดูรายละเอียดการจอง';
    } elseif (str_contains($haystack, 'ไปราชการ') || (array_key_exists('เรื่อง', $fields) && array_key_exists('สถานที่', $fields))) {
        $module = 'official_duty';
        $buttonLabel = $isPending ? 'เปิดพิจารณาคำขอไปราชการ' : 'ดูคำขอไปราชการ';
    } elseif (str_contains($haystack, 'ซ่อม') || array_key_exists('งานที่มอบหมาย', $fields) || array_key_exists('งานที่แจ้ง', $fields)) {
        $module = 'repair';
        $buttonLabel = $isPending ? 'เปิดงานซ่อมที่ได้รับมอบหมาย' : 'ดูรายละเอียดงานซ่อม';
    } elseif (str_contains($haystack, 'รถ') || array_key_exists('ปลายทาง', $fields) || array_key_exists('ผู้รับงาน', $fields)) {
        $module = 'vehicle';
        $buttonLabel = $isPending ? 'เปิดพิจารณาคำขอรถ' : 'ดูรายละเอียดคำขอรถ';
    }

    $headline = line_clean_text($title);
    $headlineMap = [
        'มีใบลาใหม่รอตรวจสอบ' => 'มีคำขอลารออนุมัติ',
        'ใบลาผ่านการพิจารณาแล้ว' => 'คำขอลาผ่านการพิจารณา',
        'ใบลาได้รับการอนุมัติแล้ว' => 'คำขอลาได้รับการอนุมัติ',
        'ใบลาไม่ได้รับการอนุมัติ' => 'คำขอลาไม่ได้รับการอนุมัติ',
    ];
    if (isset($headlineMap[$headline])) $headline = $headlineMap[$headline];

    if ($isRejected) {
        return compact('module', 'buttonLabel', 'headline') + [
            'icon' => '❌', 'color' => '#B42318', 'softColor' => '#FEF3F2',
            'subtitle' => 'โปรดตรวจสอบรายละเอียดและเหตุผลในระบบ',
        ];
    }
    if ($isSuccess) {
        return compact('module', 'buttonLabel', 'headline') + [
            'icon' => '✅', 'color' => '#067647', 'softColor' => '#ECFDF3',
            'subtitle' => 'ดำเนินการเรียบร้อยแล้ว',
        ];
    }
    if ($isPending) {
        return compact('module', 'buttonLabel', 'headline') + [
            'icon' => '🔔', 'color' => '#B54708', 'softColor' => '#FFFAEB',
            'subtitle' => 'มีรายการใหม่ที่รอการตรวจสอบหรือพิจารณา',
        ];
    }
    return compact('module', 'buttonLabel', 'headline') + [
        'icon' => '📣', 'color' => '#175CD3', 'softColor' => '#EFF8FF',
        'subtitle' => 'การแจ้งเตือนจากระบบบริหารงานโรงเรียน',
    ];
}

function line_build_flex_message(string $title, array $fields): array
{
    $presentation = line_notification_presentation($title, $fields);
    $rows = [];
    foreach (array_slice(array_filter($fields, static fn($label) => $label !== 'ยืนยันรับทราบ URL', ARRAY_FILTER_USE_KEY), 0, 8, true) as $label => $value) {
        $cleanLabel = line_clean_text((string) $label);
        $cleanValue = line_format_display_value($cleanLabel, $value);
        if ($cleanLabel === '' || $cleanValue === '') continue;
        $rows[] = [
            'type' => 'box', 'layout' => 'horizontal', 'spacing' => 'md',
            'contents' => [
                ['type' => 'text', 'text' => $cleanLabel, 'size' => 'sm', 'color' => '#667085', 'flex' => 3, 'wrap' => true],
                ['type' => 'text', 'text' => $cleanValue, 'size' => 'sm', 'color' => '#101828', 'weight' => 'bold', 'flex' => 5, 'wrap' => true],
            ],
        ];
    }
    if (count($rows) === 0) {
        $rows[] = ['type' => 'text', 'text' => 'เปิดระบบเพื่อดูรายละเอียดเพิ่มเติม', 'size' => 'sm', 'color' => '#667085', 'wrap' => true];
    }

    $altText = $presentation['icon'] . ' ' . $presentation['headline'];
    return [
        'type' => 'flex',
        'altText' => function_exists('mb_substr') ? mb_substr($altText, 0, 400, 'UTF-8') : substr($altText, 0, 400),
        'contents' => [
            'type' => 'bubble',
            'size' => 'mega',
            'header' => [
                'type' => 'box', 'layout' => 'vertical', 'backgroundColor' => '#05603A',
                'paddingAll' => '18px',
                'contents' => [
                    ['type' => 'text', 'text' => 'MMV SMART SCHOOL', 'color' => '#FFFFFF', 'weight' => 'bold', 'size' => 'lg'],
                    ['type' => 'text', 'text' => 'โรงเรียนมกุฎเมืองราชวิทยาลัย', 'color' => '#D1FADF', 'size' => 'xs', 'margin' => 'sm'],
                ],
            ],
            'body' => [
                'type' => 'box', 'layout' => 'vertical', 'paddingAll' => '20px',
                'contents' => [
                    [
                        'type' => 'box', 'layout' => 'vertical', 'backgroundColor' => $presentation['softColor'],
                        'cornerRadius' => '12px', 'paddingAll' => '14px',
                        'contents' => [
                            ['type' => 'text', 'text' => $presentation['icon'] . ' ' . $presentation['headline'], 'color' => $presentation['color'], 'weight' => 'bold', 'size' => 'xl', 'wrap' => true],
                            ['type' => 'text', 'text' => $presentation['subtitle'], 'color' => '#667085', 'size' => 'sm', 'wrap' => true, 'margin' => 'sm'],
                        ],
                    ],
                    ['type' => 'separator', 'margin' => 'xl', 'color' => '#EAECF0'],
                    ['type' => 'box', 'layout' => 'vertical', 'spacing' => 'md', 'margin' => 'xl', 'contents' => $rows],
                ],
            ],
            'footer' => [
                'type' => 'box', 'layout' => 'vertical', 'paddingAll' => '16px',
                'contents' => [[
                    'type' => 'button', 'style' => 'primary', 'height' => 'sm', 'color' => $presentation['color'],
                    'action' => [
                        'type' => 'uri', 'label' => array_key_exists('ยืนยันรับทราบ URL', $fields) ? 'ยืนยันรับทราบการขับรถ' : $presentation['buttonLabel'],
                        'uri' => array_key_exists('ยืนยันรับทราบ URL', $fields) ? (string) $fields['ยืนยันรับทราบ URL'] : 'https://mmvschool.ac.th/#' . $presentation['module'],
                    ],
                ]],
            ],
        ],
    ];
}

function line_normalize_messages(string|array $message): array
{
    if (is_string($message)) return [['type' => 'text', 'text' => $message]];
    if (isset($message['type'])) return [$message];
    return $message;
}

function line_post_message(string $endpoint, array $payload, string $token): bool
{
    if (!function_exists('curl_init')) {
        error_log('LINE notification skipped: PHP cURL extension is unavailable');
        return false;
    }

    $handle = curl_init($endpoint);
    if ($handle === false) {
        error_log('LINE notification failed: unable to initialize cURL');
        return false;
    }

    curl_setopt_array($handle, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_TIMEOUT => 8,
    ]);
    $response = curl_exec($handle);
    $status = (int) curl_getinfo($handle, CURLINFO_HTTP_CODE);
    $error = curl_error($handle);
    curl_close($handle);

    if ($response === false || $status < 200 || $status >= 300) {
        error_log('LINE notification failed: HTTP ' . $status . ($error !== '' ? ' / ' . $error : ''));
        return false;
    }
    return true;
}

function line_send_notification(string|array $message): bool
{
    $config = line_notification_config();
    if (!$config['enabled']) {
        return false;
    }

    $messages = line_normalize_messages($message);
    if ($config['mode'] === 'broadcast') {
        return line_post_message(
            'https://api.line.me/v2/bot/message/broadcast',
            ['messages' => $messages, 'notificationDisabled' => false],
            $config['token']
        );
    }

    $success = true;
    foreach ($config['targets'] as $target) {
        $sent = line_post_message(
            'https://api.line.me/v2/bot/message/push',
            ['to' => $target, 'messages' => $messages, 'notificationDisabled' => false],
            $config['token']
        );
        $success = $sent && $success;
    }
    return $success;
}

function line_send_push_to_ids(array $lineUserIds, string|array $message): bool
{
    $config = line_notification_config();
    if ($config['token'] === '' || count($lineUserIds) === 0) {
        return false;
    }

    $success = true;
    foreach (array_values(array_unique($lineUserIds)) as $lineUserId) {
        $sent = line_post_message(
            'https://api.line.me/v2/bot/message/push',
            [
                'to' => $lineUserId,
                'messages' => line_normalize_messages($message),
                'notificationDisabled' => false,
            ],
            $config['token']
        );
        $success = $sent && $success;
    }
    return $success;
}

function line_notify_linked_users(PDO $database, array $userIds, string $title, array $fields): bool
{
    $userIds = array_values(array_unique(array_filter(array_map('strval', $userIds))));
    if (count($userIds) === 0) {
        return false;
    }
    $placeholders = implode(',', array_fill(0, count($userIds), '?'));
    $statement = $database->prepare(
        "SELECT line_user_id FROM line_accounts
         WHERE status = 'active' AND user_id IN ($placeholders)"
    );
    $statement->execute($userIds);
    $targets = $statement->fetchAll(PDO::FETCH_COLUMN);
    if (count($targets) === 0) {
        return false;
    }
    return line_send_push_to_ids($targets, line_build_flex_message($title, $fields));
}

function line_notify_linked_roles(PDO $database, array $roles, string $title, array $fields): bool
{
    $roles = array_values(array_unique(array_filter(array_map('strval', $roles))));
    if (count($roles) === 0) {
        return false;
    }
    $placeholders = implode(',', array_fill(0, count($roles), '?'));
    $statement = $database->prepare(
        "SELECT la.line_user_id FROM line_accounts la
         INNER JOIN users u ON u.id = la.user_id
         WHERE la.status = 'active' AND u.status = 'active' AND u.role IN ($placeholders)"
    );
    $statement->execute($roles);
    $targets = $statement->fetchAll(PDO::FETCH_COLUMN);
    if (count($targets) === 0) {
        return false;
    }
    return line_send_push_to_ids($targets, line_build_flex_message($title, $fields));
}

function line_reply_message(string $replyToken, string|array $message): bool
{
    $config = line_notification_config();
    if ($config['token'] === '' || $replyToken === '') {
        return false;
    }
    return line_post_message(
        'https://api.line.me/v2/bot/message/reply',
        [
            'replyToken' => $replyToken,
            'messages' => line_normalize_messages($message),
            'notificationDisabled' => false,
        ],
        $config['token']
    );
}

function line_reply_event(string $replyToken, string $title, array $fields): bool
{
    return line_reply_message($replyToken, line_build_flex_message($title, $fields));
}

function line_notify_event(string $title, array $fields): bool
{
    try {
        return line_send_notification(line_build_flex_message($title, $fields));
    } catch (Throwable $exception) {
        error_log('LINE notification skipped after unexpected error: ' . $exception->getMessage());
        return false;
    }
}
