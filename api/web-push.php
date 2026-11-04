<?php
declare(strict_types=1);

function web_push_b64url_encode(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function web_push_b64url_decode(string $value): string
{
    $padding = (4 - strlen($value) % 4) % 4;
    return (string) base64_decode(strtr($value . str_repeat('=', $padding), '-_', '+/'), true);
}

function web_push_uuid(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 15) | 64);
    $bytes[8] = chr((ord($bytes[8]) & 63) | 128);
    $hex = bin2hex($bytes);
    return substr($hex,0,8).'-'.substr($hex,8,4).'-'.substr($hex,12,4).'-'.substr($hex,16,4).'-'.substr($hex,20);
}

function web_push_install(PDO $db): void
{
    $db->exec("CREATE TABLE IF NOT EXISTS web_push_config (
      id tinyint unsigned NOT NULL PRIMARY KEY,
      public_key varchar(180) NOT NULL,
      private_key longtext NOT NULL,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $db->exec("CREATE TABLE IF NOT EXISTS web_push_subscriptions (
      id varchar(36) NOT NULL PRIMARY KEY,
      user_id varchar(20) NOT NULL,
      endpoint_hash char(64) NOT NULL,
      endpoint text NOT NULL,
      p256dh varchar(180) NOT NULL,
      auth_secret varchar(80) NOT NULL,
      user_agent varchar(500) NOT NULL DEFAULT '',
      active tinyint(1) NOT NULL DEFAULT 1,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      last_success_at timestamp NULL DEFAULT NULL,
      last_failure_at timestamp NULL DEFAULT NULL,
      last_error varchar(100) NOT NULL DEFAULT '',
      UNIQUE KEY web_push_endpoint (endpoint_hash),
      KEY web_push_user (user_id,active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $db->exec("CREATE TABLE IF NOT EXISTS web_push_deliveries (
      notification_id bigint unsigned NOT NULL,
      subscription_id varchar(36) NOT NULL,
      status enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
      http_status smallint unsigned NOT NULL DEFAULT 0,
      error_code varchar(100) NOT NULL DEFAULT '',
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      attempted_at timestamp NULL DEFAULT NULL,
      sent_at timestamp NULL DEFAULT NULL,
      PRIMARY KEY (notification_id,subscription_id),
      KEY web_push_delivery_status (status,created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    if (!$db->query('SELECT id FROM web_push_config WHERE id=1')->fetchColumn()) {
        $key = openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_EC, 'curve_name' => 'prime256v1']);
        if ($key === false) throw new RuntimeException('web_push_key_generation_failed');
        $privatePem = '';
        if (!openssl_pkey_export($key, $privatePem)) throw new RuntimeException('web_push_key_export_failed');
        $details = openssl_pkey_get_details($key);
        $x = (string) ($details['ec']['x'] ?? '');
        $y = (string) ($details['ec']['y'] ?? '');
        if (strlen($x) !== 32 || strlen($y) !== 32) throw new RuntimeException('web_push_public_key_failed');
        $insert = $db->prepare('INSERT INTO web_push_config (id,public_key,private_key) VALUES (1,?,?)');
        $insert->execute([web_push_b64url_encode("\x04" . $x . $y), $privatePem]);
    }
}

function web_push_config(PDO $db): array
{
    web_push_install($db);
    $row = $db->query('SELECT public_key,private_key FROM web_push_config WHERE id=1')->fetch(PDO::FETCH_ASSOC);
    if (!$row) throw new RuntimeException('web_push_config_missing');
    return $row;
}

function web_push_hkdf(string $prk, string $info, int $length): string
{
    $output = '';
    $previous = '';
    for ($counter = 1; strlen($output) < $length; $counter++) {
        $previous = hash_hmac('sha256', $previous . $info . chr($counter), $prk, true);
        $output .= $previous;
    }
    return substr($output, 0, $length);
}

function web_push_public_pem(string $raw): string
{
    if (strlen($raw) !== 65 || $raw[0] !== "\x04") throw new RuntimeException('invalid_subscription_public_key');
    $der = hex2bin('3059301306072A8648CE3D020106082A8648CE3D030107034200') . $raw;
    return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
}

function web_push_der_signature_to_raw(string $der): string
{
    $offset = 2;
    if (ord($der[1]) & 0x80) $offset = 2 + (ord($der[1]) & 0x7f);
    if (($der[$offset] ?? '') !== "\x02") throw new RuntimeException('invalid_vapid_signature');
    $rLength = ord($der[++$offset]);
    $r = substr($der, ++$offset, $rLength);
    $offset += $rLength;
    if (($der[$offset] ?? '') !== "\x02") throw new RuntimeException('invalid_vapid_signature');
    $sLength = ord($der[++$offset]);
    $s = substr($der, ++$offset, $sLength);
    return str_pad(ltrim($r, "\x00"), 32, "\x00", STR_PAD_LEFT) . str_pad(ltrim($s, "\x00"), 32, "\x00", STR_PAD_LEFT);
}

function web_push_encrypt(string $payload, string $clientPublic, string $authSecret): string
{
    $clientRaw = web_push_b64url_decode($clientPublic);
    $authRaw = web_push_b64url_decode($authSecret);
    $clientKey = openssl_pkey_get_public(web_push_public_pem($clientRaw));
    $serverKey = openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_EC, 'curve_name' => 'prime256v1']);
    if ($clientKey === false || $serverKey === false) throw new RuntimeException('web_push_ec_key_failed');
    $serverDetails = openssl_pkey_get_details($serverKey);
    $serverPublic = "\x04" . (string) ($serverDetails['ec']['x'] ?? '') . (string) ($serverDetails['ec']['y'] ?? '');
    $sharedSecret = openssl_pkey_derive($clientKey, $serverKey, 32);
    if ($sharedSecret === false) throw new RuntimeException('web_push_ecdh_failed');
    $prkKey = hash_hmac('sha256', $sharedSecret, $authRaw, true);
    $ikm = web_push_hkdf($prkKey, "WebPush: info\x00" . $clientRaw . $serverPublic, 32);
    $salt = random_bytes(16);
    $prk = hash_hmac('sha256', $ikm, $salt, true);
    $contentKey = web_push_hkdf($prk, "Content-Encoding: aes128gcm\x00", 16);
    $nonce = web_push_hkdf($prk, "Content-Encoding: nonce\x00", 12);
    $tag = '';
    $ciphertext = openssl_encrypt($payload . "\x02", 'aes-128-gcm', $contentKey, OPENSSL_RAW_DATA, $nonce, $tag);
    if ($ciphertext === false) throw new RuntimeException('web_push_encrypt_failed');
    return $salt . pack('N', 4096) . chr(strlen($serverPublic)) . $serverPublic . $ciphertext . $tag;
}

function web_push_vapid_header(string $endpoint, array $config): string
{
    $parts = parse_url($endpoint);
    $audience = ($parts['scheme'] ?? 'https') . '://' . ($parts['host'] ?? '');
    if (!empty($parts['port'])) $audience .= ':' . $parts['port'];
    $header = web_push_b64url_encode(json_encode(['typ'=>'JWT','alg'=>'ES256'], JSON_THROW_ON_ERROR));
    $claims = web_push_b64url_encode(json_encode(['aud'=>$audience,'exp'=>time()+43200,'sub'=>'mailto:admin@mmvschool.ac.th'], JSON_THROW_ON_ERROR));
    $signature = '';
    $private = openssl_pkey_get_private((string) $config['private_key']);
    if ($private === false || !openssl_sign($header . '.' . $claims, $signature, $private, OPENSSL_ALGO_SHA256)) {
        throw new RuntimeException('web_push_vapid_sign_failed');
    }
    return 'vapid t=' . $header . '.' . $claims . ', k=' . (string) $config['public_key'];
}

function web_push_send(array $subscription, array $message, array $config): array
{
    $endpoint = (string) $subscription['endpoint'];
    $body = web_push_encrypt(json_encode($message, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), (string) $subscription['p256dh'], (string) $subscription['auth_secret']);
    $handle = curl_init($endpoint);
    if ($handle === false) return ['status'=>0,'error'=>'curl_init_failed'];
    curl_setopt_array($handle, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => [
            'TTL: 86400', 'Urgency: normal', 'Content-Type: application/octet-stream',
            'Content-Encoding: aes128gcm', 'Authorization: ' . web_push_vapid_header($endpoint, $config),
        ],
    ]);
    curl_exec($handle);
    $status = (int) curl_getinfo($handle, CURLINFO_HTTP_CODE);
    $error = curl_errno($handle) ? 'curl_error_' . curl_errno($handle) : '';
    curl_close($handle);
    return ['status'=>$status,'error'=>$error];
}

function web_push_module_url(string $module): string
{
    $allowed = ['leave','official_duty','vehicle','room','repair','substitute','document_workflow','eoffice','dashboard'];
    return '/#' . (in_array($module, $allowed, true) ? $module : 'dashboard');
}

function web_push_drain(PDO $db, int $limit = 100): array
{
    web_push_install($db);
    $lock = $db->query("SELECT GET_LOCK('mmv_web_push_drain',0)")->fetchColumn();
    if ((int) $lock !== 1) return ['sent'=>0,'failed'=>0];
    try {
        $config = web_push_config($db);
        $limit = max(1, min(200, $limit));
        $db->exec("INSERT IGNORE INTO web_push_deliveries (notification_id,subscription_id)
          SELECT n.id,s.id FROM notifications n JOIN web_push_subscriptions s ON BINARY s.user_id=BINARY n.user_id
          WHERE s.active=1 AND n.created_at>=s.created_at");
        $rows = $db->query("SELECT d.notification_id,d.subscription_id,n.title,n.message,n.module,n.related_id,s.endpoint,s.p256dh,s.auth_secret
          FROM web_push_deliveries d JOIN notifications n ON n.id=d.notification_id JOIN web_push_subscriptions s ON s.id=d.subscription_id
          WHERE d.status='pending' AND s.active=1 ORDER BY d.created_at ASC LIMIT {$limit}")->fetchAll(PDO::FETCH_ASSOC);
        $update = $db->prepare("UPDATE web_push_deliveries SET status=?,http_status=?,error_code=?,attempted_at=NOW(),sent_at=IF(?='sent',NOW(),NULL) WHERE notification_id=? AND subscription_id=? AND status='pending'");
        $subscriptionUpdate = $db->prepare("UPDATE web_push_subscriptions SET active=?,last_success_at=IF(?='sent',NOW(),last_success_at),last_failure_at=IF(?='failed',NOW(),last_failure_at),last_error=? WHERE id=?");
        $counts = ['sent'=>0,'failed'=>0];
        foreach ($rows as $row) {
            try {
                $result = web_push_send($row, [
                    'title'=>(string) $row['title'], 'body'=>(string) $row['message'],
                    'url'=>web_push_module_url((string) $row['module']), 'tag'=>'mmv-' . (string) $row['notification_id'],
                ], $config);
                $statusCode = (int) $result['status'];
                $status = $statusCode >= 200 && $statusCode < 300 ? 'sent' : 'failed';
                $error = $status === 'sent' ? '' : ((string) ($result['error'] ?: 'http_' . $statusCode));
            } catch (Throwable $exception) {
                $statusCode = 0; $status = 'failed'; $error = substr($exception->getMessage(), 0, 100);
            }
            $update->execute([$status,$statusCode,$error,$status,$row['notification_id'],$row['subscription_id']]);
            $active = in_array($statusCode, [404,410], true) ? 0 : 1;
            $subscriptionUpdate->execute([$active,$status,$status,$error,$row['subscription_id']]);
            $counts[$status]++;
        }
        return $counts;
    } finally {
        try { $db->query("SELECT RELEASE_LOCK('mmv_web_push_drain')"); } catch (Throwable $ignored) {}
    }
}
