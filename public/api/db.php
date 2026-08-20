<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$localConfig = __DIR__ . '/config.local.php';
if (is_file($localConfig)) {
    require $localConfig;
}

$host = getenv('MMV_DB_HOST') ?: ($mmvDbHost ?? '');
$dbName = getenv('MMV_DB_NAME') ?: ($mmvDbName ?? '');
$username = getenv('MMV_DB_USER') ?: ($mmvDbUser ?? '');
$password = getenv('MMV_DB_PASSWORD') ?: ($mmvDbPassword ?? '');

$pdo = null;
if ($host !== '' && $dbName !== '' && $username !== '' && $password !== '') {
    try {
        $pdo = new PDO(
            "mysql:host={$host};dbname={$dbName};charset=utf8mb4",
            $username,
            $password,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
    } catch (PDOException $exception) {
        error_log('MMV database connection failed: ' . $exception->getCode());
    }
}

function require_database(): PDO
{
    global $pdo;
    if (!$pdo instanceof PDO) {
        api_error('ระบบฐานข้อมูลยังไม่พร้อมใช้งาน', 503, 'database_unavailable');
    }
    return $pdo;
}
