<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

header('Content-Type: text/plain; charset=utf-8');

try {
    $database = require_database();
    $stmt = $database->query("SELECT id, name, department, role, assigned_duties FROM users WHERE status = 'active' AND (id = 'MMV11' OR id = 'MMV68')");
    $users = $stmt->fetchAll();
    foreach ($users as $u) {
        echo "ID: " . $u['id'] . "\n";
        echo "Name: " . $u['name'] . "\n";
        echo "Department: " . $u['department'] . "\n";
        echo "Role: " . $u['role'] . "\n";
        echo "Assigned Duties: " . $u['assigned_duties'] . "\n\n";
    }
} catch (Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
