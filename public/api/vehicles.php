<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/line-notifier.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$database = require_database();
$currentUser = require_user();

function vehicle_json(?string $value): array
{
    if (!$value) return [];
    $decoded = json_decode($value, true);
    return is_array($decoded) ? $decoded : [];
}

function fleet_payload(array $row): array
{
    return [
        'id' => (string) $row['id'], 'name' => (string) $row['name'],
        'licensePlate' => (string) ($row['license_plate'] ?? ''), 'type' => (string) ($row['type'] ?? 'van'),
        'capacity' => (int) ($row['capacity'] ?? 0), 'driverName' => (string) ($row['driver_name'] ?? ''),
        'driverPhone' => (string) ($row['driver_phone'] ?? ''), 'status' => (string) ($row['status'] ?? 'available'),
    ];
}

function vehicle_booking_payload(array $row): array
{
    $payload = [
        'id' => (string) $row['id'], 'userId' => (string) $row['user_id'], 'userName' => (string) $row['user_name'],
        'userPhone' => (string) ($row['user_phone'] ?? ''), 'department' => (string) ($row['department'] ?? ''),
        'destination' => (string) $row['destination'], 'purpose' => (string) $row['purpose'],
        'passengerCount' => (int) ($row['passenger_count'] ?? 1),
        'teachersList' => vehicle_json($row['teachers_list'] ?? null),
        'studentsList' => vehicle_json($row['students_list'] ?? null),
        'startDate' => (string) $row['start_date'], 'startTime' => substr((string) $row['start_time'], 0, 5),
        'endDate' => (string) $row['end_date'], 'endTime' => substr((string) $row['end_time'], 0, 5),
        'bookingStage' => (string) $row['booking_stage'], 'status' => (string) $row['status'],
        'createdAt' => substr((string) $row['created_at'], 0, 10),
    ];
    foreach ([
        'approval_letter_no' => 'approvalLetterNo', 'vehicle_id' => 'vehicleId',
        'rental_details' => 'rentalDetails', 'assigned_driver_id' => 'assignedDriverId',
    ] as $column => $key) {
        if (!empty($row[$column])) $payload[$key] = (string) $row[$column];
    }
    if (isset($row['is_external_rental'])) $payload['isExternalRental'] = (bool) $row['is_external_rental'];
    if (isset($row['rental_cost'])) $payload['rentalCost'] = (float) $row['rental_cost'];
    return $payload;
}

function find_vehicle_booking(PDO $database, string $id): array
{
    $statement = $database->prepare('SELECT * FROM vehicle_bookings WHERE id = ? LIMIT 1');
    $statement->execute([$id]);
    $row = $statement->fetch();
    if (!$row) api_error('ไม่พบคำขอใช้รถ', 404, 'booking_not_found');
    return $row;
}

function vehicle_role_user_ids(PDO $database, array $roles): array
{
    $placeholders = implode(',', array_fill(0, count($roles), '?'));
    $statement = $database->prepare("SELECT id FROM users WHERE status = 'active' AND role IN ($placeholders)");
    $statement->execute($roles);
    return array_values(array_unique(array_map(static fn(array $row): string => (string) $row['id'], $statement->fetchAll())));
}

function can_review_vehicle(array $user): bool
{
    if (($user['role'] ?? '') === 'admin') return true;
    return (string) ($user['id'] ?? '') === workflow_assignee('pipe-vehicle', 2, 'MMV04');
}

function can_allocate_vehicle(array $user): bool
{
    if (($user['role'] ?? '') === 'admin') return true;
    return (string) ($user['id'] ?? '') === workflow_assignee('pipe-vehicle', 3, 'MMV04');
}

function notify_vehicle_users(PDO $database, array $userIds, string $title, array $fields, string $relatedId): void
{
    $userIds = array_values(array_unique(array_filter($userIds)));
    if ($userIds) {
        $placeholders = implode(',', array_fill(0, count($userIds), '?'));
        $activeUsers = $database->prepare("SELECT id FROM users WHERE status = 'active' AND id IN ($placeholders)");
        $activeUsers->execute($userIds);
        $userIds = array_map(static fn(array $row): string => (string) $row['id'], $activeUsers->fetchAll());
    }
    $parts = [];
    foreach ($fields as $label => $value) $parts[] = $label . ': ' . $value;
    $statement = $database->prepare(
        'INSERT INTO notifications (user_id, title, message, module, related_id) VALUES (?, ?, ?, ?, ?)'
    );
    foreach ($userIds as $userId) {
        $statement->execute([$userId, $title, implode(' • ', $parts), 'vehicle', $relatedId]);
    }
    line_notify_linked_users($database, $userIds, $title, $fields);
}

if ($method === 'GET') {
    $action = $_GET['action'] ?? 'bookings';
    if ($action === 'fleet') {
        $stmt = $database->query("SELECT * FROM vehicles ORDER BY id ASC");
        api_respond(["status" => "success", "data" => array_map('fleet_payload', $stmt->fetchAll())]);
    } else {
        $role = (string) ($currentUser['role'] ?? '');
        if ($role === 'admin') {
            $stmt = $database->query("SELECT * FROM vehicle_bookings ORDER BY created_at DESC");
        } else {
            $conditions = ['user_id = ?'];
            $parameters = [$currentUser['id']];
            if (can_review_vehicle($currentUser)) {
                $conditions[] = "(status = 'pending' AND booking_stage = 'admin_review')";
            }
            if (can_allocate_vehicle($currentUser)) {
                $conditions[] = "(status = 'pending' AND booking_stage = 'deputy_budget_allocation')";
            }
            $conditions[] = 'assigned_driver_id = ?';
            $parameters[] = $currentUser['id'];
            $stmt = $database->prepare(
                'SELECT * FROM vehicle_bookings WHERE ' . implode(' OR ', $conditions) . ' ORDER BY created_at DESC'
            );
            $stmt->execute($parameters);
        }
        api_respond(["status" => "success", "data" => array_map('vehicle_booking_payload', $stmt->fetchAll())]);
    }
} elseif ($method === 'POST') {
    require_csrf();
    $input = json_body();
    $action = $input['action'] ?? 'create';

    if ($action === 'create') {
        foreach (['destination', 'purpose', 'startDate', 'startTime', 'endDate', 'endTime'] as $requiredField) {
            if (trim((string) ($input[$requiredField] ?? '')) === '') {
                api_error('กรุณากรอกข้อมูลการขอใช้รถให้ครบถ้วน', 422, 'validation_error');
            }
        }
        $id = 'VB-' . date('Y') . '-' . strtoupper(bin2hex(random_bytes(3)));
        $stmt = $database->prepare("INSERT INTO vehicle_bookings
            (id, user_id, user_name, user_phone, department, destination, purpose, passenger_count, approval_letter_no, teachers_list, students_list, start_date, start_time, end_date, end_time, booking_stage, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin_review', 'pending')");
        
        $stmt->execute([
            $id,
            $currentUser['id'],
            $currentUser['name'],
            $currentUser['phone'] ?? '',
            $currentUser['department'] ?? '',
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

        $notificationFields = [
            'เลขที่' => $id,
            'ผู้ขอ' => $currentUser['name'],
            'ปลายทาง' => $input['destination'],
            'วัตถุประสงค์' => $input['purpose'],
            'วันที่' => $input['startDate'] . ' ' . $input['startTime'],
        ];
        notify_vehicle_users(
            $database,
            [workflow_assignee('pipe-vehicle', 2, 'MMV04')],
            'มีคำขอใช้รถส่วนกลางใหม่รอตรวจสอบ',
            $notificationFields,
            $id
        );

        api_respond(["status" => "success", "data" => vehicle_booking_payload(find_vehicle_booking($database, $id))], 201);
    } elseif ($action === 'review') {
        if (!can_review_vehicle($currentUser)) {
            api_error('รายการนี้ไม่ใช่ขั้นตอนตรวจสอบของคุณ', 403, 'forbidden');
        }
        $booking = find_vehicle_booking($database, (string) ($input['bookingId'] ?? ''));
        $stmt = $database->prepare(
            "UPDATE vehicle_bookings SET booking_stage = 'deputy_budget_allocation'
             WHERE id = ? AND status = 'pending' AND booking_stage = 'admin_review'"
        );
        $stmt->execute([$booking['id']]);
        if ($stmt->rowCount() !== 1) api_error('รายการนี้ถูกตรวจสอบไปแล้วหรือสถานะเปลี่ยนแปลงแล้ว', 409, 'stale_booking');
        notify_vehicle_users($database, [workflow_assignee('pipe-vehicle', 3, 'MMV04')], 'คำขอใช้รถผ่านการตรวจสอบ รออนุมัติและจัดสรรรถ', [
            'เลขที่' => $booking['id'],
            'ผู้ขอ' => $booking['user_name'],
            'ปลายทาง' => $booking['destination'],
            'วัตถุประสงค์' => $booking['purpose'],
            'วันที่' => $booking['start_date'] . ' ' . substr((string) $booking['start_time'], 0, 5),
            'ผู้ตรวจสอบ' => $currentUser['name'],
            'ความเห็น' => trim((string) ($input['comment'] ?? '')) ?: 'ตรวจสอบและรับทราบแล้ว',
        ], (string) $booking['id']);
        api_respond(["status" => "success", "data" => vehicle_booking_payload(find_vehicle_booking($database, (string) $booking['id']))]);
    } elseif ($action === 'allocate') {
        if (!can_allocate_vehicle($currentUser)) {
            api_error('รายการนี้ไม่ใช่ขั้นตอนอนุมัติของคุณ', 403, 'forbidden');
        }
        if (trim((string) ($input['driverId'] ?? '')) === '') {
            api_error('กรุณาระบุผู้ขับรถหรือผู้รับแจ้งงานก่อนจัดสรรรถ', 422, 'driver_required');
        }
        $stmt = $database->prepare("UPDATE vehicle_bookings SET
            is_external_rental = ?,
            vehicle_id = ?,
            rental_details = ?,
            rental_cost = ?,
            assigned_driver_id = ?,
            deputy_comment = ?,
            booking_stage = ?,
            status = 'approved'
            WHERE id = ? AND status = 'pending' AND booking_stage = 'deputy_budget_allocation'");
        
        $stmt->execute([
            $input['isRental'] ? 1 : 0,
            $input['vehicleId'] ?? null,
            $input['rentalDetails'] ?? null,
            $input['rentalCost'] ?? 0,
            $input['driverId'] ?? null,
            $input['comment'] ?? '',
            'driver_ack',
            $input['bookingId']
        ]);
        if ($stmt->rowCount() !== 1) api_error('รายการยังไม่ผ่านผู้ตรวจสอบหรือสถานะเปลี่ยนแปลงแล้ว', 409, 'stale_booking');

        $bookingStatement = $database->prepare('SELECT id, user_id, user_name, destination, purpose, start_date, start_time, assigned_driver_id FROM vehicle_bookings WHERE id = ? LIMIT 1');
        $bookingStatement->execute([$input['bookingId']]);
        $updatedBooking = $bookingStatement->fetch();
        if ($updatedBooking) {
            $notificationFields = [
                'เลขที่' => $updatedBooking['id'],
                'ผู้ขอ' => $updatedBooking['user_name'],
                'ปลายทาง' => $updatedBooking['destination'],
                'วัตถุประสงค์' => $updatedBooking['purpose'],
                'วันที่' => $updatedBooking['start_date'] . ' ' . substr((string) $updatedBooking['start_time'], 0, 5),
                'ดำเนินการโดย' => $currentUser['name'],
            ];
            $recipients = [$updatedBooking['user_id']];
            if (!empty($updatedBooking['assigned_driver_id'])) {
                $recipients[] = $updatedBooking['assigned_driver_id'];
            }
            notify_vehicle_users($database, $recipients, 'จัดสรรรถให้คำขอแล้ว', $notificationFields, (string) $updatedBooking['id']);
        }

        api_respond(["status" => "success", "data" => vehicle_booking_payload(find_vehicle_booking($database, (string) $input['bookingId']))]);
    } elseif ($action === 'reject') {
        if (!can_review_vehicle($currentUser) && !can_allocate_vehicle($currentUser)) {
            api_error('รายการนี้ไม่ใช่ขั้นตอนอนุมัติของคุณ', 403, 'forbidden');
        }
        $booking = find_vehicle_booking($database, (string) ($input['bookingId'] ?? ''));
        $stmt = $database->prepare("UPDATE vehicle_bookings SET booking_stage = 'rejected', status = 'rejected', deputy_comment = ? WHERE id = ?");
        $stmt->execute([trim((string) ($input['comment'] ?? '')) ?: 'ไม่อนุมัติคำขอใช้รถ', $booking['id']]);
        notify_vehicle_users($database, [(string) $booking['user_id']], 'คำขอใช้รถไม่ได้รับการอนุมัติ', [
            'เลขที่' => $booking['id'], 'ปลายทาง' => $booking['destination'],
            'เหตุผล' => trim((string) ($input['comment'] ?? '')) ?: 'ไม่อนุมัติคำขอใช้รถ',
            'ดำเนินการโดย' => $currentUser['name'],
        ], (string) $booking['id']);
        api_respond(["status" => "success", "data" => vehicle_booking_payload(find_vehicle_booking($database, (string) $booking['id']))]);
    } elseif ($action === 'driver_ack') {
        if (($currentUser['role'] ?? '') === 'admin') {
            $stmt = $database->prepare("UPDATE vehicle_bookings SET booking_stage = 'completed', status = 'approved' WHERE id = ?");
            $stmt->execute([$input['bookingId'] ?? '']);
        } else {
            $stmt = $database->prepare(
                "UPDATE vehicle_bookings SET booking_stage = 'completed', status = 'approved' WHERE id = ? AND assigned_driver_id = ?"
            );
            $stmt->execute([$input['bookingId'] ?? '', $currentUser['id']]);
        }
        if ($stmt->rowCount() !== 1) {
            api_error('ไม่พบรายการหรือคุณไม่มีสิทธิ์รับงานนี้', 404, 'booking_not_found');
        }
        $bookingStatement = $database->prepare('SELECT user_id, user_name, destination, start_date, start_time FROM vehicle_bookings WHERE id = ? LIMIT 1');
        $bookingStatement->execute([$input['bookingId'] ?? '']);
        $driverBooking = $bookingStatement->fetch();
        $bookingOwnerId = (string) ($driverBooking['user_id'] ?? '');
        $notificationFields = [
            'เลขที่' => $input['bookingId'] ?? '',
            'ผู้ขอ' => $driverBooking['user_name'] ?? '',
            'ปลายทาง' => $driverBooking['destination'] ?? '',
            'วันที่' => isset($driverBooking['start_date']) ? $driverBooking['start_date'] . ' ' . substr((string) ($driverBooking['start_time'] ?? ''), 0, 5) : '',
            'ผู้รับงาน' => $currentUser['name'],
        ];
        notify_vehicle_users($database, [$bookingOwnerId], 'พนักงานขับรถรับงานแล้ว', $notificationFields, (string) ($input['bookingId'] ?? ''));
        api_respond(["status" => "success", "data" => vehicle_booking_payload(find_vehicle_booking($database, (string) ($input['bookingId'] ?? '')))]);
    }
    api_error('ไม่รู้จักคำสั่งที่ร้องขอ', 400, 'unknown_action');
}

api_error('ไม่รองรับวิธีการเรียกนี้', 405, 'method_not_allowed');
