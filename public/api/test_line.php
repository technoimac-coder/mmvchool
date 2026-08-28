<?php
declare(strict_types=1);

// Force error display for debugging
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

try {
    require_once __DIR__ . '/db.php';
    require_once __DIR__ . '/line-notifier.php';
} catch (Throwable $e) {
    echo "<h2>Error Loading Modules</h2>";
    echo "Message: " . htmlspecialchars($e->getMessage()) . "<br>";
    echo "File: " . htmlspecialchars($e->getFile()) . " on line " . $e->getLine() . "<br>";
    exit;
}

$database = require_database();

header('Content-Type: text/html; charset=utf-8');

echo "<h2>LINE Notify Test Diagnostic</h2>";

// 1. Get channel token status
$config = line_notification_config();
echo "LINE Bot Token: " . ($config['token'] !== '' ? 'Configured (starts with ' . substr($config['token'], 0, 10) . '...)' : 'EMPTY ❌') . "<br>";
echo "LINE Mode: " . $config['mode'] . "<br>";

// 2. Query Sriburachai
echo "<h3>Checking User containing 'ศรีบุระไชย'</h3>";
$stmt = $database->prepare("SELECT id, name, status FROM users WHERE name LIKE ?");
$stmt->execute(['%ศรีบุระไชย%']);
$foundUsers = $stmt->fetchAll();
if (empty($foundUsers)) {
    echo "❌ No users containing 'ศรีบุระไชย' found in users table!<br>";
    exit;
}
foreach ($foundUsers as $user) {
    echo "Found user: ID: <b>{$user['id']}</b>, Name: <b>{$user['name']}</b>, Status: <b>{$user['status']}</b><br>";
}
// Use the first found user for testing
$user = $foundUsers[0];

// 3. Query linked LINE accounts
$stmt = $database->prepare("SELECT line_user_id, status FROM line_accounts WHERE user_id = ?");
$stmt->execute([$user['id']]);
$la = $stmt->fetch();
if (!$la) {
    echo "❌ No LINE account linked for user ID '{$user['id']}' in line_accounts table!<br>";
    exit;
}
echo "LINE User ID: <b>{$la['line_user_id']}</b>, Status: <b>{$la['status']}</b><br>";

// 4. Send test message
echo "<h3>Sending Test Message to LINE ID: {$la['line_user_id']}</h3>";
$token = $config['token'];
if ($token === '') {
    echo "❌ Cannot send: Access Token is empty.<br>";
    exit;
}

$payload = [
    'to' => $la['line_user_id'],
    'messages' => [
        [
            'type' => 'text',
            'text' => '🔔 ทดสอบส่งข้อความจากระบบ MMV Smart School ถึงคุณ ' . $user['name']
        ]
    ]
];

$ch = curl_init('https://api.line.me/v2/bot/message/push');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $token,
        'Content-Type: application/json',
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_SSL_VERIFYPEER => false,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "HTTP Response Code: <b>{$httpCode}</b><br>";
if ($error) {
    echo "cURL Error: <span style='color:red'>{$error}</span><br>";
}
echo "LINE API Response: <pre>" . htmlspecialchars((string)$response) . "</pre>";
