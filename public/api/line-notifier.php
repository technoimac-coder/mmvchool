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

function line_send_notification(string $message): bool
{
    $config = line_notification_config();
    if (!$config['enabled']) {
        return false;
    }

    $messages = [['type' => 'text', 'text' => $message]];
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

function line_send_push_to_ids(array $lineUserIds, string $message): bool
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
                'messages' => [['type' => 'text', 'text' => $message]],
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
    return line_send_push_to_ids($targets, line_build_event_message($title, $fields));
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
    return line_send_push_to_ids($targets, line_build_event_message($title, $fields));
}

function line_reply_message(string $replyToken, string $message): bool
{
    $config = line_notification_config();
    if ($config['token'] === '' || $replyToken === '') {
        return false;
    }
    return line_post_message(
        'https://api.line.me/v2/bot/message/reply',
        [
            'replyToken' => $replyToken,
            'messages' => [['type' => 'text', 'text' => $message]],
            'notificationDisabled' => false,
        ],
        $config['token']
    );
}

function line_notify_event(string $title, array $fields): bool
{
    try {
        return line_send_notification(line_build_event_message($title, $fields));
    } catch (Throwable $exception) {
        error_log('LINE notification skipped after unexpected error: ' . $exception->getMessage());
        return false;
    }
}
