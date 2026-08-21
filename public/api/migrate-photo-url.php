<?php
declare(strict_types=1);

// Migration: Add photo_url column to users table for storing personnel photo paths
// Run once at: https://mmvschool.ac.th/api/migrate-photo-url.php
// DELETE this file from GitHub and server after running!

require_once __DIR__ . '/db.php';

header('Content-Type: text/html; charset=utf-8');

function runMigration(PDO $pdo): void
{
    echo "<h2>📸 Photo URL Migration</h2>\n";

    // 1. Check if photo_url column already exists
    $stmt = $pdo->prepare("SHOW COLUMNS FROM users LIKE 'photo_url'");
    $stmt->execute();
    if ($stmt->fetch()) {
        echo "<p>✅ <code>photo_url</code> column already exists — no action needed.</p>\n";
    } else {
        $pdo->exec("ALTER TABLE users ADD COLUMN photo_url VARCHAR(500) DEFAULT NULL COMMENT 'Path to stored photo, e.g. /uploads/avatars/MMV01.jpg'");
        echo "<p>✅ Added <code>photo_url VARCHAR(500)</code> column to <code>users</code> table.</p>\n";
    }

    // 2. Create uploads/avatars directory hint
    $uploadPath = dirname(__DIR__) . '/uploads/avatars';
    if (!is_dir($uploadPath)) {
        mkdir($uploadPath, 0775, true);
        echo "<p>✅ Created directory: <code>uploads/avatars/</code></p>\n";
    } else {
        echo "<p>✅ Directory <code>uploads/avatars/</code> already exists.</p>\n";
    }

    echo "<hr>\n";
    echo "<p style='color:green;font-weight:bold;'>Migration completed successfully! You can close this page.</p>\n";
    echo "<p style='color:red;'>⚠️ Please delete this migration file from the server and GitHub after running.</p>\n";
}

try {
    $pdo = require_database();
    runMigration($pdo);
} catch (Throwable $e) {
    echo "<p style='color:red;'>❌ Error: " . htmlspecialchars($e->getMessage()) . "</p>\n";
}
