<?php
declare(strict_types=1);

function line_retry_uuid(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 15) | 64);
    $bytes[8] = chr((ord($bytes[8]) & 63) | 128);
    $hex = bin2hex($bytes);
    return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20);
}

/** Only LINE messaging endpoints documented to support retry keys may be retried. */
function line_retry_supported(string $endpoint): bool
{
    return in_array($endpoint, ['https://api.line.me/v2/bot/message/push', 'https://api.line.me/v2/bot/message/broadcast', 'https://api.line.me/v2/bot/message/multicast', 'https://api.line.me/v2/bot/message/narrowcast'], true);
}

function line_curl_request(string $endpoint, array $payload, string $token, string $retryKey): array
{
    if (!function_exists('curl_init')) return ['status'=>0, 'error'=>'curl_unavailable', 'acceptedId'=>''];
    $handle = curl_init($endpoint);
    if ($handle === false) return ['status'=>0, 'error'=>'curl_init_failed', 'acceptedId'=>''];
    $headers = ['Authorization: Bearer ' . $token, 'Content-Type: application/json'];
    if ($retryKey !== '') $headers[] = 'X-Line-Retry-Key: ' . $retryKey;
    $acceptedId = '';
    curl_setopt_array($handle, [
        CURLOPT_POST=>true, CURLOPT_RETURNTRANSFER=>true, CURLOPT_HTTPHEADER=>$headers,
        CURLOPT_POSTFIELDS=>json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
        CURLOPT_CONNECTTIMEOUT=>8, CURLOPT_TIMEOUT=>12, CURLOPT_DNS_CACHE_TIMEOUT=>300,
        CURLOPT_HEADERFUNCTION=>static function ($curl, string $line) use (&$acceptedId): int {
            if (stripos($line, 'x-line-accepted-request-id:') === 0) $acceptedId = trim(substr($line, strlen('x-line-accepted-request-id:')));
            return strlen($line);
        },
    ]);
    $response = curl_exec($handle);
    $status = (int) curl_getinfo($handle, CURLINFO_HTTP_CODE);
    $curlError = curl_errno($handle);
    curl_close($handle);
    // Never log tokens, recipient IDs or payloads. Preserve only a bounded API error reason.
    $error = $curlError ? 'curl_error_' . $curlError : '';
    if ($status >= 400 && is_string($response)) {
        $body = json_decode($response, true);
        $reason = preg_replace('/[\r\n]+/', ' ', (string) ($body['message'] ?? ''));
        if ($reason !== '') $error = mb_substr($reason, 0, 240);
    }
    return ['status'=>$status, 'error'=>$error, 'acceptedId'=>$acceptedId];
}

/** A queue reuses its key across processes; ordinary push/broadcast calls get one key per request. */
function line_delivery_request(string $endpoint, array $payload, string $token, string $retryKey = '', int $maxAttempts = 2, ?callable $send = null, ?callable $wait = null): array
{
    $supportsRetry = line_retry_supported($endpoint);
    if ($supportsRetry && $retryKey === '') $retryKey = line_retry_uuid();
    if (!$supportsRetry) { $retryKey = ''; $maxAttempts = 1; }
    $maxAttempts = max(1, min(2, $maxAttempts));
    $result = ['status'=>0, 'error'=>'not_attempted', 'acceptedId'=>''];
    for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
        try { $result = ($send ?? 'line_curl_request')($endpoint, $payload, $token, $retryKey); }
        catch (Throwable $exception) { $result = ['status'=>0, 'error'=>'transport_exception', 'acceptedId'=>'']; }
        $status = (int) ($result['status'] ?? 0);
        $accepted = ($status >= 200 && $status < 300) || ($supportsRetry && $status === 409 && !empty($result['acceptedId']));
        $retryable = !$accepted && ($status === 0 || $status >= 500);
        if ($accepted || !$retryable || $attempt === $maxAttempts) break;
        if ($wait) $wait(250000); else usleep(250000);
    }
    return $result + ['accepted'=>$accepted, 'retryable'=>$retryable, 'retryKey'=>$retryKey];
}
