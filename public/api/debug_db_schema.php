<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

header('Content-Type: text/plain; charset=utf-8');

try {
    $database = require_database();
    $stmt = $database->query("DESCRIBE users");
    $columns = $stmt->fetchAll();
    foreach ($columns as $c) {
        echo $c['Field'] . " - " . $c['Type'] . "\n";
    }
} catch (Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
