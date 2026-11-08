<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/db.php';

$source = $argv[1] ?? '';
if ($source === '' || !is_file($source)) {
    fwrite(STDERR, "Authentication import file not found.\n");
    exit(1);
}

$rows = json_decode(file_get_contents($source) ?: '[]', true);
if (!is_array($rows)) {
    fwrite(STDERR, "Authentication import file is invalid.\n");
    exit(1);
}

$database = require_database();
$statement = $database->prepare(
    "UPDATE users SET citizen_id = ?, password_hash = ?, must_change_password = 1, status = 'active' WHERE id = ?"
);
$updated = 0;

$database->beginTransaction();
try {
    foreach ($rows as $row) {
        $citizenId = preg_replace('/\D/', '', (string) ($row['citizenId'] ?? ''));
        $initialPassword = (string) ($row['initialPassword'] ?? '');
        $id = (string) ($row['id'] ?? '');
        if ($id === '' || !in_array(strlen($citizenId), [12, 13], true) || $initialPassword === '') {
            throw new RuntimeException('Invalid authentication record for ' . ($id ?: 'unknown user'));
        }
        $statement->execute([$citizenId, password_hash($initialPassword, PASSWORD_DEFAULT), $id]);
        $updated += $statement->rowCount();
    }
    $database->commit();
} catch (Throwable $exception) {
    $database->rollBack();
    fwrite(STDERR, "Import failed: {$exception->getMessage()}\n");
    exit(1);
}

fwrite(STDOUT, "Authentication records updated: {$updated}\n");
