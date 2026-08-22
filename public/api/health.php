<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/line-notifier.php';

$databaseReady = $pdo instanceof PDO;
$schemaReady = false;
if ($databaseReady) {
    try {
        $requiredTables = ['users', 'vehicles', 'vehicle_bookings', 'meeting_rooms', 'room_bookings', 'line_accounts', 'line_link_codes', 'leave_requests', 'official_duty_requests', 'substitute_teachings', 'repair_tickets', 'notifications'];
        $placeholders = implode(',', array_fill(0, count($requiredTables), '?'));
        $statement = $pdo->prepare(
            "SELECT TABLE_NAME FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ($placeholders)"
        );
        $statement->execute($requiredTables);
        $schemaReady = count($statement->fetchAll(PDO::FETCH_COLUMN)) === count($requiredTables);
    } catch (PDOException $exception) {
        error_log('MMV health schema check failed: ' . $exception->getCode());
    }
}

$ready = $databaseReady && $schemaReady;
api_respond([
    'status' => $ready ? 'ready' : 'degraded',
    'database' => $databaseReady ? 'connected' : 'unavailable',
    'schema' => $schemaReady ? 'ready' : 'migration_required',
    'lineNotifications' => line_notification_status()['enabled'] ? 'ready' : 'configuration_required',
], $ready ? 200 : 503);
