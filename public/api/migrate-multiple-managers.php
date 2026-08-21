<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

header('Content-Type: text/html; charset=utf-8');

try {
    $database = require_database();
    
    // Check if column manager_ids exists
    $result = $database->query("SHOW COLUMNS FROM meeting_rooms LIKE 'manager_ids'")->fetch();
    if (!$result) {
        $database->exec("ALTER TABLE meeting_rooms ADD COLUMN manager_ids text DEFAULT NULL");
        echo "Successfully added manager_ids column to meeting_rooms table!<br>";
        
        // Migrate existing manager_id data
        $rooms = $database->query("SELECT id, manager_id FROM meeting_rooms")->fetchAll();
        foreach ($rooms as $r) {
            if (!empty($r['manager_id'])) {
                $ids = json_encode([$r['manager_id']]);
                $stmt = $database->prepare("UPDATE meeting_rooms SET manager_ids = ? WHERE id = ?");
                $stmt->execute([$ids, $r['id']]);
            }
        }
        echo "Successfully migrated existing managers data!<br>";
    } else {
        echo "manager_ids column already exists.<br>";
    }
    
    echo "Migration completed successfully! You can close this page.";
} catch (Throwable $e) {
    echo "Error: " . $e->getMessage() . "<br>";
}
