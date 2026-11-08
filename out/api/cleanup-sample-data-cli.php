<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/db.php';

$database = require_database();
$execute = in_array('--execute', $argv ?? [], true);
$tables = [
    'notifications',
    'substitute_teachings',
    'room_bookings',
    'vehicle_bookings',
    'official_duty_requests',
    'leave_requests',
];

$counts = [];
foreach ($tables as $table) {
    $counts[$table] = (int) $database->query("SELECT COUNT(*) FROM `{$table}`")->fetchColumn();
}

if (!$execute) {
    fwrite(STDOUT, "Dry run only. No data was deleted.\n");
    foreach ($counts as $table => $count) {
        fwrite(STDOUT, "{$table}: {$count}\n");
    }
    fwrite(STDOUT, "Run again with --execute to clear these transaction tables.\n");
    exit(0);
}

$database->beginTransaction();
try {
    foreach ($tables as $table) {
        $database->exec("DELETE FROM `{$table}`");
    }
    $database->commit();
} catch (Throwable $exception) {
    if ($database->inTransaction()) {
        $database->rollBack();
    }
    fwrite(STDERR, "Cleanup failed; all changes were rolled back.\n");
    exit(1);
}

fwrite(STDOUT, "Sample transaction data cleared.\n");
foreach ($counts as $table => $count) {
    fwrite(STDOUT, "{$table}: {$count} deleted\n");
}
fwrite(STDOUT, "Preserved: users, LINE account links, rooms, vehicles, and system configuration.\n");
