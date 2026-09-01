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

function mmv_bilingual_notification_title(string $title): string
{
    if (str_contains($title, "\nEN: ")) return $title;
    $englishTitles = [
        'มีใบลาใหม่รอตรวจสอบ' => 'New leave request awaiting review',
        'ใบลาไม่ได้รับการอนุมัติ' => 'Leave request was not approved',
        'ใบลาได้รับการอนุมัติแล้ว' => 'Leave request approved',
        'มีใบลารอลงนามขั้นถัดไป' => 'Leave request awaiting the next approval',
        'มีคำขอไปราชการใหม่รอตรวจสอบและเสนอความเห็น' => 'New official duty request awaiting review',
        'คำขอไปราชการไม่ได้รับการอนุมัติ' => 'Official duty request was not approved',
        'มีคำขอไปราชการรอพิจารณา' => 'Official duty request awaiting consideration',
        'มีคำขอไปราชการรออนุมัติ' => 'Official duty request awaiting approval',
        'คำขอไปราชการได้รับการอนุมัติแล้ว' => 'Official duty request approved',
        'มีรายการแจ้งซ่อมใหม่รอตรวจสอบ' => 'New repair request awaiting review',
        'คุณได้รับมอบหมายงานซ่อมใหม่' => 'You have been assigned a new repair job',
        'งานซ่อมเสร็จแล้ว (รอผู้แจ้งยืนยัน)' => 'Repair completed — awaiting requester confirmation',
        'รายการแจ้งซ่อมถูกปฏิเสธ' => 'Repair request rejected',
        'ได้รับมอบหมายสอนแทน' => 'Substitute teaching assignment',
        'ครูผู้สอนแทนรับทราบแล้ว' => 'Substitute teacher acknowledged the assignment',
        'มีคำขอใช้รถส่วนกลางใหม่รอตรวจสอบ' => 'New school vehicle request awaiting review',
        'คำขอใช้รถผ่านการตรวจสอบ รออนุมัติและจัดสรรรถ' => 'Vehicle request reviewed — awaiting approval and allocation',
        'จัดสรรรถให้คำขอแล้ว' => 'Vehicle allocated to the request',
        'คุณได้รับมอบหมายขับรถ' => 'You have been assigned to drive',
        'คำขอใช้รถไม่ได้รับการอนุมัติ' => 'Vehicle request was not approved',
        'พนักงานขับรถรับงานแล้ว' => 'Driver accepted the assignment',
        'มีคำขอใช้อาคารสถานที่ใหม่ รอผู้ดูแลสถานที่ยืนยัน (ส่งตรงผู้ดูแลห้อง)' => 'New facility request awaiting room manager confirmation',
        'มีคำขอใช้อาคารสถานที่ใหม่ รอการอนุมัติ' => 'New facility request awaiting approval',
        'รองฝ่ายทั่วไปอนุมัติแล้ว พร้อมใช้งาน (แจ้งเพื่อเตรียมความพร้อมสถานที่)' => 'Facility request approved — please prepare the venue',
        'การขอใช้อาคารสถานที่ได้รับการอนุมัติแล้ว พร้อมใช้งาน' => 'Facility request approved and ready for use',
        'ผู้ดูแลสถานที่ยืนยันพร้อมใช้งานแล้ว' => 'Room manager confirmed the facility is ready',
        'ไม่อนุมัติคำขอใช้อาคารสถานที่' => 'Facility request was not approved',
        'ปิดรายการใช้อาคารสถานที่แล้ว' => 'Facility request closed',
    ];
    $english = $englishTitles[$title] ?? 'MMV Smart School notification — open the system for details';
    return $title . "\nEN: " . $english;
}

function mmv_bilingual_notification_fields(array $fields): array
{
    $labels = [
        'เลขที่' => 'Request ID', 'ผู้ยื่น' => 'Requester', 'ผู้ขอ' => 'Requester',
        'ประเภท' => 'Type', 'วันที่' => 'Date', 'เวลา' => 'Time', 'จำนวน' => 'Duration',
        'เรื่อง' => 'Subject', 'สถานที่' => 'Location', 'ห้อง' => 'Room',
        'ปลายทาง' => 'Destination', 'วัตถุประสงค์' => 'Purpose', 'เหตุผล' => 'Reason',
        'รายละเอียด' => 'Details', 'งานที่แจ้ง' => 'Reported Issue', 'งานที่มอบหมาย' => 'Assigned Work',
        'ผู้ตรวจสอบ' => 'Reviewer', 'พิจารณาโดย' => 'Reviewed By', 'ดำเนินการโดย' => 'Processed By',
        'มอบหมายโดย' => 'Assigned By', 'ผู้รับงาน' => 'Assignee', 'ครูประจำวิชา' => 'Original Teacher',
        'ครูผู้สอนแทน' => 'Substitute Teacher', 'วิชา' => 'Subject', 'คาบ' => 'Period',
        'วันเวลาเดินทาง' => 'Travel Date and Time', 'รถที่ได้รับ' => 'Assigned Vehicle',
        'ยืนยันรับทราบ URL' => 'Acknowledgement URL',
    ];
    $result = [];
    foreach ($fields as $label => $value) {
        // Keep this internal action key unchanged so the LINE acknowledgement
        // button can detect it and the URL is excluded from visible detail rows.
        if ((string) $label === 'ยืนยันรับทราบ URL') {
            $result[(string) $label] = (string) $value;
            continue;
        }
        $englishLabel = $labels[(string) $label] ?? 'Information';
        $displayValue = str_replace(' ถึง ', ' to ', (string) $value);
        $result[(string) $label . ' / ' . $englishLabel] = $displayValue;
    }
    return $result;
}

function mmv_bilingual_notification_message(array $fields): string
{
    $parts = [];
    foreach (mmv_bilingual_notification_fields($fields) as $label => $value) {
        if (trim((string) $value) !== '') $parts[] = $label . ': ' . $value;
    }
    return implode(' • ', $parts);
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
    $buttonLabel = 'เปิดระบบ / Open MMV Smart School';
    if (str_contains($haystack, 'ใบลา') || str_contains($haystack, 'คำขอลา') || array_key_exists('ประเภท', $fields)) {
        $module = 'leave';
        $buttonLabel = $isPending ? 'พิจารณาใบลา / Review Leave' : 'ดูใบลา / View Leave';
    } elseif (str_contains($haystack, 'สอนแทน') || array_key_exists('ครูประจำวิชา', $fields) || array_key_exists('ครูสอนแทน', $fields) || array_key_exists('คาบ', $fields)) {
        $module = 'substitute';
        $buttonLabel = 'รับทราบ / Acknowledge';
    } elseif (str_contains($haystack, 'ห้อง') || str_contains($haystack, 'อาคาร') || str_contains($haystack, 'สถานที่') || array_key_exists('ห้อง', $fields)) {
        $module = 'room';
        $buttonLabel = $isPending ? 'พิจารณาการจอง / Review' : 'ดูการจอง / View Booking';
    } elseif (str_contains($haystack, 'ไปราชการ') || (array_key_exists('เรื่อง', $fields) && array_key_exists('สถานที่', $fields))) {
        $module = 'official_duty';
        $buttonLabel = $isPending ? 'พิจารณาคำขอ / Review' : 'ดูคำขอ / View Request';
    } elseif (str_contains($haystack, 'ซ่อม') || array_key_exists('งานที่มอบหมาย', $fields) || array_key_exists('งานที่แจ้ง', $fields)) {
        $module = 'repair';
        $buttonLabel = $isPending ? 'เปิดงานซ่อม / Open Repair' : 'ดูงานซ่อม / View Repair';
    } elseif (str_contains($haystack, 'รถ') || array_key_exists('ปลายทาง', $fields) || array_key_exists('ผู้รับงาน', $fields)) {
        $module = 'vehicle';
        $buttonLabel = $isPending ? 'พิจารณาคำขอรถ / Review' : 'ดูคำขอรถ / View Request';
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
            'subtitle' => 'โปรดตรวจสอบรายละเอียดในระบบ / Please review the details in the system',
        ];
    }
    if ($isSuccess) {
        return compact('module', 'buttonLabel', 'headline') + [
            'icon' => '✅', 'color' => '#067647', 'softColor' => '#ECFDF3',
            'subtitle' => 'ดำเนินการเรียบร้อยแล้ว / Completed successfully',
        ];
    }
    if ($isPending) {
        return compact('module', 'buttonLabel', 'headline') + [
            'icon' => '🔔', 'color' => '#B54708', 'softColor' => '#FFFAEB',
            'subtitle' => 'มีรายการใหม่รอพิจารณา / A new item is awaiting review',
        ];
    }
    return compact('module', 'buttonLabel', 'headline') + [
        'icon' => '📣', 'color' => '#175CD3', 'softColor' => '#EFF8FF',
        'subtitle' => 'การแจ้งเตือนจากระบบโรงเรียน / School system notification',
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
        $rows[] = ['type' => 'text', 'text' => 'เปิดระบบเพื่อดูรายละเอียด / Open the system for details', 'size' => 'sm', 'color' => '#667085', 'wrap' => true];
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
                        'type' => 'uri', 'label' => array_key_exists('ยืนยันรับทราบ URL', $fields) ? 'ยืนยันรับทราบ / Acknowledge' : $presentation['buttonLabel'],
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
