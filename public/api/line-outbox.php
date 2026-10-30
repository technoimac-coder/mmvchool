<?php
declare(strict_types=1);
require_once __DIR__ . '/line-notifier.php';

function line_outbox_install(PDO $db): void
{
    static $installed = null;
    $installed ??= new WeakMap();
    if (isset($installed[$db])) return;
    if ($db->inTransaction()) throw new LogicException('Install the LINE outbox before starting business transactions');
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
    $columns = array_column($db->query('SHOW COLUMNS FROM line_notification_outbox')->fetchAll(PDO::FETCH_ASSOC), 'Field');
    foreach ([
        'kind'=>"varchar(20) NOT NULL DEFAULT 'completion'",
        'title'=>"varchar(255) NOT NULL DEFAULT 'ลงนามเอกสารครบแล้ว'",
        'module'=>"varchar(30) NOT NULL DEFAULT 'document_workflow'",
        'subject'=>"varchar(255) NOT NULL DEFAULT ''",
        'last_attempt_at'=>'datetime DEFAULT NULL',
        'retry_round'=>'int NOT NULL DEFAULT 0',
        'attempt_limit'=>'int NOT NULL DEFAULT 8',
    ] as $column=>$definition) {
        if (!in_array($column, $columns, true)) $db->exec("ALTER TABLE line_notification_outbox ADD COLUMN {$column} {$definition}");
    }
    $db->exec("CREATE TABLE IF NOT EXISTS line_delivery_worker_state (
        id tinyint NOT NULL PRIMARY KEY, started_at datetime DEFAULT NULL,
        finished_at datetime DEFAULT NULL, last_error varchar(80) NOT NULL DEFAULT '',
        alerted_at datetime DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $installed[$db] = true;
}

/** Called inside the same transaction as completion + web notice. No DDL or network here. */
function line_outbox_enqueue_completion(PDO $db, array $userIds, string $title, array $fields, string $workflowId): array
{
    $version = max(1, (int) ($fields['ฉบับที่'] ?? 1));
    return line_outbox_enqueue($db, $userIds, $title, $fields, null, 'completion', $workflowId, $version);
}

function line_outbox_enqueue_event(PDO $db, array $userIds, string $title, array $fields, ?string $imageUrl = null): array
{
    return line_outbox_enqueue($db, $userIds, $title, $fields, $imageUrl, 'event', line_retry_uuid(), 0);
}

function line_outbox_enqueue(PDO $db, array $userIds, string $title, array $fields, ?string $imageUrl, string $kind, string $reference, int $version): array
{
    $jobs = [];
    $module = (string) line_notification_presentation($title, $fields)['module'];
    $account = $db->prepare("SELECT line_user_id FROM line_accounts WHERE user_id=? AND status='active' LIMIT 1");
    $active = $db->prepare("SELECT id FROM users WHERE id=? AND status='active'");
    $insert = $db->prepare('INSERT INTO line_notification_outbox (id,dedupe_key,user_id,workflow_id,file_version,payload_json,kind,title,module,subject,status,last_error) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id');
    $find = $db->prepare('SELECT id FROM line_notification_outbox WHERE dedupe_key=?');
    foreach (array_unique(array_filter(array_map('strval', $userIds))) as $userId) {
        $active->execute([$userId]);
        if (!$active->fetchColumn()) continue;
        $account->execute([$userId]);
        $target = $account->fetchColumn();
        $key = hash('sha256', ($kind === 'completion' ? 'workflow-completion:' : 'event:') . $reference . ':' . $version . ':' . $userId);
        $payload = ['to'=>(string) ($target ?: ''), 'messages'=>[line_build_flex_message($title, $fields, $imageUrl)], 'notificationDisabled'=>false];
        $subject=mb_substr(line_clean_text((string)($fields['ชื่อไฟล์']??$fields['เรื่อง']??$fields['รายละเอียด']??'')),0,255);
        $insert->execute([line_retry_uuid(), $key, $userId, $reference, $version, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), $kind, mb_substr($title,0,255), $module, $subject, $target ? 'pending' : 'failed', $target ? '' : 'account_not_linked']);
        $find->execute([$key]);
        $jobs[] = (string) $find->fetchColumn();
    }
    return $jobs;
}

/** One post-response dispatcher per connection. Rolled-back jobs are never visible to it. */
function line_outbox_schedule(PDO $db, array $ids): void
{
    static $queued = [];
    $key = spl_object_id($db);
    if (isset($queued[$key])) { $queued[$key] = array_merge($queued[$key], $ids); return; }
    $queued[$key] = $ids;
    register_shutdown_function(static function () use ($db, $key, &$queued): void {
        if ($db->inTransaction()) return;
        if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
        if (function_exists('fastcgi_finish_request')) fastcgi_finish_request();
        try { line_outbox_drain($db, 3, array_values(array_unique($queued[$key]))); }
        catch (Throwable $exception) { error_log('LINE delivery deferred to scheduled worker'); }
    });
}

function line_outbox_worker_state(PDO $db, bool $finished, string $error = ''): void
{
    $column = $finished ? 'finished_at' : 'started_at';
    $query = $db->prepare("INSERT INTO line_delivery_worker_state (id,{$column},last_error) VALUES(1,NOW(),?) ON DUPLICATE KEY UPDATE {$column}=NOW(),last_error=VALUES(last_error)");
    $query->execute([$error]);
}

/** Web-only fallback: no recursive LINE alerts while LINE itself is unavailable. */
function line_outbox_alert_admins(PDO $db): void
{
    $failed = (int) $db->query("SELECT COUNT(*) FROM line_notification_outbox WHERE (status='failed' AND created_at>=DATE_SUB(NOW(),INTERVAL 1 DAY)) OR (status='pending' AND created_at<DATE_SUB(NOW(),INTERVAL 15 MINUTE) AND next_attempt_at<NOW())")->fetchColumn();
    if (!$failed) return;
    $db->beginTransaction();
    try {
        $state = $db->query('SELECT TIMESTAMPDIFF(SECOND,alerted_at,NOW()) AS age FROM line_delivery_worker_state WHERE id=1 FOR UPDATE')->fetch(PDO::FETCH_ASSOC);
        if (!$state || ($state['age'] !== null && (int) $state['age'] < 21600)) { $db->commit(); return; }
        $statement = $db->prepare("INSERT INTO notifications(user_id,title,message,module,related_id,created_at) SELECT id,?,?, 'system', 'line-delivery-monitor',NOW() FROM users WHERE status='active' AND role IN ('admin','director')");
        $statement->execute(['มีการแจ้งเตือน LINE ที่ต้องตรวจสอบ', 'พบ '.$failed.' รายการที่ส่งไม่สำเร็จหรือรอส่งนาน กรุณาตรวจศูนย์ควบคุมผู้ดูแลระบบ > การส่ง LINE รวมถึงบัญชีที่ยังไม่ผูก LINE']);
        $db->exec('UPDATE line_delivery_worker_state SET alerted_at=NOW() WHERE id=1');
        $db->commit();
    } catch (Throwable $exception) { if ($db->inTransaction()) $db->rollBack(); throw $exception; }
}

/** Claim under a short DB lock, then do network I/O after commit. All workers reuse the job UUID. */
function line_outbox_drain(PDO $db, int $limit = 3, ?array $onlyIds = null, ?callable $send = null): array
{
    if ($db->inTransaction()) throw new LogicException('Dispatch LINE only after workflow commit');
    $counts = ['accepted'=>0, 'pending'=>0, 'failed'=>0, 'cancelled'=>0];
    $token = line_notification_config()['token'];
    if ($token === '' && $send === null) { error_log('LINE completion queue: token is not configured'); return $counts; }
    $limit = max(1, min(100, $limit));
    $started = microtime(true);
    if ($onlyIds !== null && !$onlyIds) return $counts;
    for ($index = 0; $index < $limit; $index++) {
        if (microtime(true) - $started >= 40) break;
        $db->beginTransaction();
        try {
            $where = $onlyIds === null ? '' : ' AND id IN (' . implode(',', array_fill(0, count($onlyIds), '?')) . ')';
            $query = $db->prepare("SELECT * FROM line_notification_outbox WHERE ((status='pending' AND next_attempt_at<=NOW()) OR (status='sending' AND lease_until<NOW())){$where} ORDER BY next_attempt_at,id LIMIT 1 FOR UPDATE");
            $query->execute($onlyIds ?? []);
            $job = $query->fetch(PDO::FETCH_ASSOC);
            if (!$job) { $db->commit(); break; }
            $claim = $db->prepare("UPDATE line_notification_outbox SET status='sending',attempts=attempts+1,last_attempt_at=NOW(),lease_until=DATE_ADD(NOW(),INTERVAL 60 SECOND) WHERE id=?");
            $claim->execute([$job['id']]);
            $db->commit();
        } catch (Throwable $exception) { if ($db->inTransaction()) $db->rollBack(); throw $exception; }
        $payload = json_decode($job['payload_json'], true);
        $row = null;
        if ($job['kind'] === 'completion') {
            $document = $db->prepare('SELECT status,file_version,deleted_at,created_by FROM document_workflows WHERE id=?');
            $document->execute([$job['workflow_id']]);
            $row = $document->fetch(PDO::FETCH_ASSOC);
        }
        $active = $db->prepare("SELECT id FROM users WHERE id=? AND status='active'");
        $active->execute([$job['user_id']]);
        $activeUser = (bool) $active->fetchColumn();
        $account = $db->prepare("SELECT line_user_id FROM line_accounts WHERE user_id=? AND status='active' LIMIT 1");
        $account->execute([$job['user_id']]);
        $target = $account->fetchColumn();
        $ageQuery = $db->prepare('SELECT TIMESTAMPDIFF(SECOND,created_at,NOW()) FROM line_notification_outbox WHERE id=?');
        $ageQuery->execute([$job['id']]);
        $age = (int) $ageQuery->fetchColumn();
        if (!$activeUser || ($job['kind'] === 'completion' && (!$row || $row['deleted_at'] || $row['status'] !== 'completed' || (int) $row['file_version'] !== (int) $job['file_version'] || $row['created_by'] !== $job['user_id']))) {
            $state = 'cancelled'; $status = 0; $error = 'document_no_longer_current';
        } elseif (!$target || !is_array($payload) || $payload['to'] !== $target) {
            $state = 'failed'; $status = 0; $error = 'linked_account_changed';
        } elseif ($age >= 23 * 3600) {
            $state = 'failed'; $status = 0; $error = 'retry_window_expired';
        } elseif ((int) $job['attempts'] >= (int) $job['attempt_limit']) {
            $state = 'failed'; $status = 0; $error = 'retry_attempts_exhausted';
        } else {
            $result = line_delivery_request('https://api.line.me/v2/bot/message/push', $payload, $token, $job['id'], 1, $send);
            $status = (int) $result['status']; $error = (string) $result['error'];
            $state = $result['accepted'] ? 'sent' : ($result['retryable'] && (int) $job['attempts'] < (int) $job['attempt_limit'] - 1 ? 'pending' : 'failed');
        }
        $roundAttempt = max(0, (int) $job['attempts'] - ((int) $job['attempt_limit'] - 8));
        $delay = min(3600, 60 * (2 ** min(6, $roundAttempt)));
        $update = $db->prepare("UPDATE line_notification_outbox SET status=?,lease_until=NULL,next_attempt_at=DATE_ADD(NOW(),INTERVAL {$delay} SECOND),last_http_status=?,last_error=?,sent_at=IF(?='sent',NOW(),sent_at) WHERE id=?");
        $update->execute([$state, $status, mb_substr($error, 0, 255), $state, $job['id']]);
        $counts[$state === 'sent' ? 'accepted' : $state]++;
        if ($state === 'failed') error_log('LINE completion queue failed: job=' . $job['id'] . ' HTTP=' . $status . ' reason=' . $error);
    }
    return $counts;
}
