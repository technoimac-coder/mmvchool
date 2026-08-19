<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

if (!$pdo) {
    echo json_encode(["status" => "offline_mode", "message" => "Database not configured yet. Fallback to browser storage.", "data" => []]);
    exit();
}

if ($method === 'GET') {
    $action = $_GET['action'] ?? 'bookings';
    if ($action === 'fleet') {
        $stmt = $pdo->query("SELECT * FROM vehicles ORDER BY id ASC");
        echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
    } else {
        $stmt = $pdo->query("SELECT * FROM vehicle_bookings ORDER BY created_at DESC");
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['teachersList'] = json_decode($r['teachers_list'] ?? '[]', true);
            $r['studentsList'] = json_decode($r['students_list'] ?? '[]', true);
        }
        echo json_encode(["status" => "success", "data" => $rows]);
    }
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? 'create';

    if ($action === 'create') {
        $id = 'VB-' . date('Y') . '-' . sprintf('%03d', rand(1, 999));
        $stmt = $pdo->prepare("INSERT INTO vehicle_bookings 
            (id, user_id, user_name, user_phone, department, destination, purpose, passenger_count, approval_letter_no, teachers_list, students_list, start_date, start_time, end_date, end_time, booking_stage, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'deputy_budget_allocation', 'pending')");
        
        $stmt->execute([
            $id,
            $input['userId'] ?? '',
            $input['userName'] ?? '',
            $input['userPhone'] ?? '',
            $input['department'] ?? '',
            $input['destination'] ?? '',
            $input['purpose'] ?? '',
            $input['passengerCount'] ?? 1,
            $input['approvalLetterNo'] ?? '',
            json_encode($input['teachersList'] ?? [], JSON_UNESCAPED_UNICODE),
            json_encode($input['studentsList'] ?? [], JSON_UNESCAPED_UNICODE),
            $input['startDate'] ?? date('Y-m-d'),
            $input['startTime'] ?? '08:00',
            $input['endDate'] ?? date('Y-m-d'),
            $input['endTime'] ?? '17:00'
        ]);

        echo json_encode(["status" => "success", "bookingId" => $id]);
    } elseif ($action === 'allocate') {
        $stmt = $pdo->prepare("UPDATE vehicle_bookings SET 
            is_external_rental = ?,
            vehicle_id = ?,
            rental_details = ?,
            rental_cost = ?,
            assigned_driver_id = ?,
            deputy_comment = ?,
            booking_stage = ?,
            status = 'approved'
            WHERE id = ?");
        
        $stmt->execute([
            $input['isRental'] ? 1 : 0,
            $input['vehicleId'] ?? null,
            $input['rentalDetails'] ?? null,
            $input['rentalCost'] ?? 0,
            $input['driverId'] ?? null,
            $input['comment'] ?? '',
            $input['isRental'] ? 'completed' : 'driver_ack',
            $input['bookingId']
        ]);

        echo json_encode(["status" => "success"]);
    } elseif ($action === 'driver_ack') {
        $stmt = $pdo->prepare("UPDATE vehicle_bookings SET booking_stage = 'driver_ack' WHERE id = ?");
        $stmt->execute([$input['bookingId']]);
        echo json_encode(["status" => "success"]);
    }
}
