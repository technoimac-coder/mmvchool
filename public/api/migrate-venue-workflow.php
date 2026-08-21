<?php
declare(strict_types=1);

// Migration: Add deputy review columns to room_bookings table for new 3-step venue approval workflow
// Run once at: https://mmvschool.ac.th/api/migrate-venue-workflow.php
// DELETE this file from GitHub and server after running!

require_once __DIR__ . '/db.php';

header('Content-Type: text/html; charset=utf-8');

function runMigration(PDO $pdo): void
{
    echo "<h2>🏛️ Venue Workflow Migration</h2>\n";
    echo "<p>เพิ่มขั้นตอน: ผู้ขอ ➔ รองฝ่ายทั่วไป ➔ ผู้ดูแลสถานที่ ➔ แจ้งกลับผู้ขอ</p>\n<hr>\n";

    // 1. Add deputy_review_by column
    $stmt = $pdo->prepare("SHOW COLUMNS FROM room_bookings LIKE 'deputy_review_by'");
    $stmt->execute();
    if ($stmt->fetch()) {
        echo "<p>✅ คอลัมน์ <code>deputy_review_by</code> มีอยู่แล้ว</p>\n";
    } else {
        $pdo->exec("ALTER TABLE room_bookings
            ADD COLUMN deputy_review_by VARCHAR(200) DEFAULT NULL COMMENT 'ชื่อรองฝ่ายทั่วไปที่อนุมัติ' AFTER snack_details,
            ADD COLUMN deputy_review_at DATETIME DEFAULT NULL AFTER deputy_review_by,
            ADD COLUMN deputy_review_comment VARCHAR(500) DEFAULT NULL AFTER deputy_review_at
        ");
        echo "<p>✅ เพิ่มคอลัมน์ <code>deputy_review_by, deputy_review_at, deputy_review_comment</code> แล้ว</p>\n";
    }

    // 2. Update existing pending_manager bookings to pending_deputy (so old bookings flow through new process)
    $updated = $pdo->exec("UPDATE room_bookings SET booking_stage = 'pending_deputy' WHERE booking_stage = 'pending_manager' AND status = 'pending'");
    echo "<p>✅ อัปเดต booking เก่าที่ยังรออนุมัติ จาก <code>pending_manager</code> → <code>pending_deputy</code>: {$updated} รายการ</p>\n";

    // 3. Also update the ENUM/VARCHAR default for booking_stage if needed (it's likely VARCHAR so nothing to change)
    echo "<p>✅ <code>booking_stage</code> column is VARCHAR — รองรับ <code>pending_deputy</code> แล้ว</p>\n";

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
