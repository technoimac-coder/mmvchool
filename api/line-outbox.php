<?php
declare(strict_types=1);
require_once __DIR__ . '/line-notifier.php';

function line_outbox_install(PDO $db): void
{
    $db->exec("CREATE TABLE IF NOT EXISTS line_notification_outbox (
        id char(36) NOT NULL PRIMARY KEY,
        dedupe_key char(64) NOT NULL UNIQUE,
        user_id varchar(20) NOT NULL,
        workflow_id varchar(64) NOT NULL,
        file_version int NOT NULL,
        payload_json longtext NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'pending',
        attempts int NOT NULL DEFAULT 0,
        next_attempt_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        lease_until datetime DEFAULT NULL,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        sent_at datetime DEFAULT NULL,
        last_http_status int DEFAULT NULL,
        last_error varchar(255) DEFAULT NULL,
        KEY line_outbox_due(status,next_attempt_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

/** Called inside the same transaction as completion + web notice. No DDL or network here. */
function line_outbox_enqueue_completion(PDO $db, array $userIds, string $title, array $fields, string $workflowId): array
{
    $version = max(1, (int) ($fields['ฉบับที่'] ?? 1));
    $jobs = [];
    $account = $db->prepare("SELECT line_user_id FROM line_accounts WHERE user_id=? AND status='active' LIMIT 1");
    $insert = $db->prepare('INSERT INTO line_notification_outbox (id,dedupe_key,user_id,workflow_id,file_version,payload_json) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id');
    $find = $db->prepare('SELECT id FROM line_notification_outbox WHERE dedupe_key=?');
    foreach (array_unique(array_filter(array_map('strval', $userIds))) as $userId) {
        $account->execute([$userId]);
        $target = $account->fetchColumn();
        if (!$target) { error_log('LINE completion queue: recipient has no active linked account'); continue; }
        $key = hash('sha256', 'workflow-completion:' . $workflowId . ':' . $version . ':' . $userId);
        $payload = ['to'=>(string) $target, 'messages'=>[line_build_flex_message($title, $fields)], 'notificationDisabled'=>false];
        $insert->execute([line_retry_uuid(), $key, $userId, $workflowId, $version, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)]);
        $find->execute([$key]);
        $jobs[] = (string) $find->fetchColumn();
    }
    return $jobs;
}

/** Claim under a short DB lock, then do network I/O after commit. All workers reuse the job UUID. */
function line_outbox_drain(PDO $db, int $limit = 3, ?array $onlyIds = null, ?callable $send = null): array
{
    if ($db->inTransaction()) throw new LogicException('Dispatch LINE only after workflow commit');
    $counts = ['accepted'=>0, 'pending'=>0, 'failed'=>0, 'cancelled'=>0];
    $token = line_notification_config()['token'];
    if ($token === '' && $send === null) { error_log('LINE completion queue: token is not configured'); return $counts; }
    $limit = max(1, min(3, $limit));
    if ($onlyIds !== null && !$onlyIds) return $counts;
    for ($index = 0; $index < $limit; $index++) {
        $db->beginTransaction();
        try {
            $where = $onlyIds === null ? '' : ' AND id IN (' . implode(',', array_fill(0, count($onlyIds), '?')) . ')';
            $query = $db->prepare("SELECT * FROM line_notification_outbox WHERE ((status='pending' AND next_attempt_at<=NOW()) OR (status='sending' AND lease_until<NOW())){$where} ORDER BY next_attempt_at,id LIMIT 1 FOR UPDATE");
            $query->execute($onlyIds ?? []);
            $job = $query->fetch(PDO::FETCH_ASSOC);
            if (!$job) { $db->commit(); break; }
            $claim = $db->prepare("UPDATE line_notification_outbox SET status='sending',attempts=attempts+1,lease_until=DATE_ADD(NOW(),INTERVAL 60 SECOND) WHERE id=?");
            $claim->execute([$job['id']]);
            $db->commit();
        } catch (Throwable $exception) { if ($db->inTransaction()) $db->rollBack(); throw $exception; }
        $payload = json_decode($job['payload_json'], true);
        $document = $db->prepare('SELECT status,file_version,deleted_at,created_by FROM document_workflows WHERE id=?');
        $document->execute([$job['workflow_id']]);
        $row = $document->fetch(PDO::FETCH_ASSOC);
        $account = $db->prepare("SELECT line_user_id FROM line_accounts WHERE user_id=? AND status='active' LIMIT 1");
        $account->execute([$job['user_id']]);
        $target = $account->fetchColumn();
        $ageQuery = $db->prepare('SELECT TIMESTAMPDIFF(SECOND,created_at,NOW()) FROM line_notification_outbox WHERE id=?');
        $ageQuery->execute([$job['id']]);
        $age = (int) $ageQuery->fetchColumn();
        if (!$row || $row['deleted_at'] || $row['status'] !== 'completed' || (int) $row['file_version'] !== (int) $job['file_version'] || $row['created_by'] !== $job['user_id']) {
            $state = 'cancelled'; $status = 0; $error = 'document_no_longer_current';
        } elseif (!$target || !is_array($payload) || $payload['to'] !== $target) {
            $state = 'failed'; $status = 0; $error = 'linked_account_changed';
        } elseif ($age >= 23 * 3600) {
            $state = 'failed'; $status = 0; $error = 'retry_window_expired';
        } elseif ((int) $job['attempts'] >= 8) {
            $state = 'failed'; $status = 0; $error = 'retry_attempts_exhausted';
        } else {
            $result = line_delivery_request('https://api.line.me/v2/bot/message/push', $payload, $token, $job['id'], 1, $send);
            $status = (int) $result['status']; $error = (string) $result['error'];
            $state = $result['accepted'] ? 'sent' : ($result['retryable'] && (int) $job['attempts'] < 7 ? 'pending' : 'failed');
        }
        $delay = min(3600, 60 * (2 ** min(6, (int) $job['attempts'])));
        $update = $db->prepare("UPDATE line_notification_outbox SET status=?,lease_until=NULL,next_attempt_at=DATE_ADD(NOW(),INTERVAL {$delay} SECOND),last_http_status=?,last_error=?,sent_at=IF(?='sent',NOW(),sent_at) WHERE id=?");
        $update->execute([$state, $status, mb_substr($error, 0, 255), $state, $job['id']]);
        $counts[$state === 'sent' ? 'accepted' : $state]++;
        if ($state === 'failed') error_log('LINE completion queue failed: job=' . $job['id'] . ' HTTP=' . $status . ' reason=' . $error);
    }
    return $counts;
}
