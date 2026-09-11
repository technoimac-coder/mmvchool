<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/line-notifier.php';

$database = require_database();

header('Content-Type: text/html; charset=utf-8');

echo "<h2>Debug LINE & Rooms Mapping</h2>";

// 1. Check all users with Sriburachai
echo "<h3>1. Users with 'ศรีบุระไชย' in Name:</h3>";
$stmt = $database->prepare("SELECT id, name, role, status FROM users WHERE name LIKE ?");
$stmt->execute(['%ศรีบุระไชย%']);
$users = $stmt->fetchAll();
if (empty($users)) {
    echo "No users found with name containing 'ศรีบุระไชย'<br>";
} else {
    foreach ($users as $u) {
        $lineStmt = $database->prepare("SELECT line_user_id, status, linked_at FROM line_accounts WHERE user_id = ?");
        $lineStmt->execute([$u['id']]);
        $la = $lineStmt->fetch();
        $lineStatus = $la ? "Linked (LINE ID: {$la['line_user_id']}, Status: {$la['status']})" : "Not Linked";
        echo "ID: <b>{$u['id']}</b>, Name: <b>{$u['name']}</b>, Role: {$u['role']}, Status: {$u['status']} | LINE: <b>{$lineStatus}</b><br>";
    }
}

// 2. Check Ruangphueng Room
echo "<h3>2. Room 'ห้องประชุมรวงผึ้ง' Configuration:</h3>";
$stmt = $database->prepare("SELECT id, name, manager_id, manager_ids FROM meeting_rooms WHERE name LIKE ?");
$stmt->execute(['%รวงผึ้ง%']);
$rooms = $stmt->fetchAll();
if (empty($rooms)) {
    echo "No room found with name containing 'รวงผึ้ง'<br>";
} else {
    foreach ($rooms as $r) {
        echo "Room ID: <b>{$r['id']}</b>, Name: <b>{$r['name']}</b>, Manager ID (legacy): <b>{$r['manager_id']}</b>, Manager IDs (array): <b>{$r['manager_ids']}</b><br>";
    }
}

// 3. Last Room Booking for Ruangphueng
echo "<h3>3. Last booking for Ruangphueng:</h3>";
$stmt = $database->prepare("SELECT id, room_name, user_name, booking_stage, status, created_at FROM room_bookings WHERE room_name LIKE ? ORDER BY created_at DESC LIMIT 1");
$stmt->execute(['%รวงผึ้ง%']);
$booking = $stmt->fetch();
if ($booking) {
    echo "Booking ID: <b>{$booking['id']}</b>, Room: {$booking['room_name']}, User: {$booking['user_name']}, Stage: {$booking['booking_stage']}, Status: {$booking['status']}, Created: {$booking['created_at']}<br>";
} else {
    echo "No bookings found for Ruangphueng<br>";
}
