<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/line-notifier.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$database = require_database();
$database->exec("ALTER TABLE vehicle_bookings ADD COLUMN IF NOT EXISTS driver_ack_token_hash varchar(128) DEFAULT NULL, ADD COLUMN IF NOT EXISTS driver_ack_token_expires datetime DEFAULT NULL");
$database->exec("ALTER TABLE vehicles
    ADD COLUMN IF NOT EXISTS province varchar(120) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS model varchar(255) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS driver_id varchar(20) DEFAULT NULL");

// One-time LINE driver acknowledgement link (no web login required).
if ($method === 'GET' && isset($_GET['driver_token'])) {
    $token = trim((string) $_GET['driver_token']);
    $stmt = $database->prepare('SELECT * FROM vehicle_bookings WHERE driver_ack_token_hash = ? AND driver_ack_token_expires > NOW() LIMIT 1');
    $stmt->execute([hash('sha256', $token)]);
    $booking = $stmt->fetch();
    if (!$booking) { http_response_code(410); echo '<meta charset="utf-8"><h2>ลิงก์หมดอายุหรือถูกใช้แล้ว</h2>'; exit; }
    $update = $database->prepare("UPDATE vehicle_bookings SET booking_stage='completed', status='approved', driver_ack_token_hash=NULL, driver_ack_token_expires=NULL WHERE id=? AND driver_ack_token_hash=? AND booking_stage='driver_ack'");
    $update->execute([$booking['id'], hash('sha256', $token)]);
    if ($update->rowCount() !== 1) { http_response_code(409); echo '<meta charset="utf-8"><h2>รายการนี้ได้รับการยืนยันแล้ว</h2>'; exit; }
    notify_vehicle_users(
        $database,
        [(string) $booking['user_id'], workflow_assignee('pipe-vehicle', 3, 'MMV04')],
        'พนักงานขับรถรับงานแล้ว',
        ['เลขที่' => $booking['id'], 'ผู้ขอ' => $booking['user_name'], 'ปลายทาง' => $booking['destination']],
        (string) $booking['id']
    );
    header('Content-Type: text/html; charset=UTF-8');
    echo '<meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>body{font-family:Arial,sans-serif;background:#eef6ff;padding:28px;color:#123}main{max-width:520px;margin:auto;background:#fff;border-radius:18px;padding:28px;text-align:center;box-shadow:0 8px 30px #0002}h1{color:#087443}</style><main><h1>ยืนยันรับทราบเรียบร้อยแล้ว</h1><p>ระบบบันทึกการรับงานขับรถเลขที่ '.htmlspecialchars((string)$booking['id'], ENT_QUOTES, 'UTF-8').' แล้ว</p><p>ผู้ขอและผู้จัดสรรรถได้รับแจ้งเตือนแล้ว</p></main>'; exit;
}
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
        'province' => (string) ($row['province'] ?? ''), 'model' => (string) ($row['model'] ?? ($row['name'] ?? '')),
        'driverId' => (string) ($row['driver_id'] ?? ''),
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
    return (string) ($user['id'] ?? '') === workflow_assignee('pipe-vehicle', 2, 'MMV47');
}

function can_allocate_vehicle(array $user): bool
{
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
        // ตารางคำขอและปฏิทินการใช้รถเป็นข้อมูลส่วนกลางของโรงเรียน
        // ผู้ใช้ที่เข้าสู่ระบบทุกคนจึงเห็นรายการเดียวกัน ส่วนสิทธิ์ดำเนินการ
        // ยังคงตรวจด้วยผู้รับผิดชอบตาม Pipeline ในแต่ละ action ด้านล่าง
        $stmt = $database->query("SELECT * FROM vehicle_bookings ORDER BY created_at DESC");
        api_respond(["status" => "success", "data" => array_map('vehicle_booking_payload', $stmt->fetchAll())]);
    }
} elseif ($method === 'POST') {
    require_csrf();
    $input = json_body();
    $action = $input['action'] ?? 'create';

    if ($action === 'save_fleet') {
        require_roles('admin', 'director');
        foreach (['vehicleId', 'name', 'licensePlate', 'type'] as $requiredField) {
            if (trim((string) ($input[$requiredField] ?? '')) === '') {
                api_error('กรุณากรอกข้อมูลรถให้ครบถ้วน', 422, 'validation_error');
            }
        }
        $driverId = trim((string) ($input['driverId'] ?? ''));
        $driver = null;
        if ($driverId !== '') {
            $driverStatement = $database->prepare("SELECT id, name, phone FROM users WHERE id = ? AND status = 'active' LIMIT 1");
            $driverStatement->execute([$driverId]);
            $driver = $driverStatement->fetch();
            if (!$driver) api_error('ไม่พบบัญชีพนักงานขับรถที่เลือก', 422, 'driver_not_found');
        }
        $statement = $database->prepare(
            'INSERT INTO vehicles
             (id, name, license_plate, type, capacity, driver_name, driver_phone, status, province, model, driver_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE name = VALUES(name), license_plate = VALUES(license_plate),
             type = VALUES(type), capacity = VALUES(capacity), driver_name = VALUES(driver_name),
             driver_phone = VALUES(driver_phone), status = VALUES(status), province = VALUES(province),
             model = VALUES(model), driver_id = VALUES(driver_id)'
        );
        $statement->execute([
            trim((string) $input['vehicleId']), trim((string) $input['name']),
            trim((string) $input['licensePlate']), trim((string) $input['type']),
            max(1, (int) ($input['capacity'] ?? 1)), (string) ($driver['name'] ?? ''),
            (string) ($driver['phone'] ?? ''),
            in_array((string) ($input['status'] ?? ''), ['available', 'maintenance', 'in_use'], true)
                ? (string) $input['status'] : 'available',
            trim((string) ($input['province'] ?? '')), trim((string) ($input['model'] ?? $input['name'])),
            $driverId !== '' ? $driverId : null,
        ]);
        $saved = $database->prepare('SELECT * FROM vehicles WHERE id = ? LIMIT 1');
        $saved->execute([trim((string) $input['vehicleId'])]);
        api_respond(['status' => 'success', 'data' => fleet_payload($saved->fetch())]);
    } elseif ($action === 'create') {
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
            [workflow_assignee('pipe-vehicle', 2, 'MMV47')],
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
        $isRental = !empty($input['isRental']);
        $assignedDriverId = null;
        if (!$isRental) {
            $vehicleId = trim((string) ($input['vehicleId'] ?? ''));
            $fleetStatement = $database->prepare('SELECT id, license_plate FROM vehicles WHERE id = ? LIMIT 1');
            $fleetStatement->execute([$vehicleId]);
            $selectedFleet = $fleetStatement->fetch();
            if (!$selectedFleet) api_error('ไม่พบรถที่เลือก', 422, 'vehicle_not_found');
            $licensePlate = (string) ($selectedFleet['license_plate'] ?? '');
            if ((string) $selectedFleet['id'] === 'v1' || str_contains($licensePlate, '1456')) {
                $assignedDriverId = 'MMV98';
            } elseif ((string) $selectedFleet['id'] === 'v2' || str_contains($licensePlate, '7555')) {
                $assignedDriverId = 'MMV99';
            } else {
                $assignedDriverId = trim((string) ($input['driverId'] ?? ''));
                if ($assignedDriverId === '') api_error('กรุณาค้นหาและเลือกบุคลากรผู้ขับรถหมุนเวียน', 422, 'driver_required');
            }
            $driverStatement = $database->prepare("SELECT id FROM users WHERE id = ? AND status = 'active' LIMIT 1");
            $driverStatement->execute([$assignedDriverId]);
            if (!$driverStatement->fetchColumn()) api_error('ไม่พบบุคลากรผู้ขับรถที่เลือกหรือบัญชีไม่ได้ใช้งาน', 422, 'driver_not_found');
        }
        $driverToken = null;
        if (!$isRental && $assignedDriverId !== null) $driverToken = bin2hex(random_bytes(32));
        $stmt = $database->prepare("UPDATE vehicle_bookings SET
            is_external_rental = ?,
            vehicle_id = ?,
            rental_details = ?,
            rental_cost = ?,
            assigned_driver_id = ?,
            deputy_comment = ?,
            booking_stage = ?, driver_ack_token_hash = ?, driver_ack_token_expires = ?,
            status = 'approved'
            WHERE id = ? AND status = 'pending' AND booking_stage = 'deputy_budget_allocation'");
        
        $stmt->execute([
            $isRental ? 1 : 0,
            $input['vehicleId'] ?? null,
            $input['rentalDetails'] ?? null,
            $input['rentalCost'] ?? 0,
            $assignedDriverId,
            $input['comment'] ?? '',
            $isRental ? 'completed' : 'driver_ack',
            $driverToken ? hash('sha256', $driverToken) : null,
            $driverToken ? date('Y-m-d H:i:s', time() + 86400) : null,
            $input['bookingId']
        ]);
        if ($stmt->rowCount() !== 1) api_error('รายการยังไม่ผ่านผู้ตรวจสอบหรือสถานะเปลี่ยนแปลงแล้ว', 409, 'stale_booking');

        $bookingStatement = $database->prepare(
            'SELECT vb.id, vb.user_id, vb.user_name, vb.destination, vb.purpose,
                    vb.start_date, vb.start_time, vb.end_date, vb.end_time,
                    vb.assigned_driver_id, v.name AS vehicle_name, v.license_plate
             FROM vehicle_bookings vb
             LEFT JOIN vehicles v ON v.id = vb.vehicle_id
             WHERE vb.id = ? LIMIT 1'
        );
        $bookingStatement->execute([$input['bookingId']]);
        $updatedBooking = $bookingStatement->fetch();
        if ($updatedBooking) {
            $ownerNotificationFields = [
                'เลขที่' => $updatedBooking['id'],
                'ผู้ขอ' => $updatedBooking['user_name'],
                'ปลายทาง' => $updatedBooking['destination'],
                'วัตถุประสงค์' => $updatedBooking['purpose'],
                'วันที่' => $updatedBooking['start_date'] . ' ' . substr((string) $updatedBooking['start_time'], 0, 5),
                'ดำเนินการโดย' => $currentUser['name'],
            ];
            notify_vehicle_users(
                $database,
                [(string) $updatedBooking['user_id']],
                'จัดสรรรถให้คำขอแล้ว',
                $ownerNotificationFields,
                (string) $updatedBooking['id']
            );

            if (!empty($updatedBooking['assigned_driver_id'])) {
                $vehicleLabel = trim(implode(' ', array_filter([
                    (string) ($updatedBooking['vehicle_name'] ?? ''),
                    (string) ($updatedBooking['license_plate'] ?? ''),
                ])));
                $dateTimeLabel = (string) $updatedBooking['start_date'] . ' ' . substr((string) $updatedBooking['start_time'], 0, 5);
                if (!empty($updatedBooking['end_date'])) {
                    $dateTimeLabel .= ' ถึง ' . $updatedBooking['end_date'] . ' ' . substr((string) ($updatedBooking['end_time'] ?? ''), 0, 5);
                }
                notify_vehicle_users(
                    $database,
                    [(string) $updatedBooking['assigned_driver_id']],
                    'คุณได้รับมอบหมายขับรถ',
                    [
                        'เลขที่' => $updatedBooking['id'],
                        'ผู้ขอ' => $updatedBooking['user_name'],
                        'ปลายทาง' => $updatedBooking['destination'],
                        'วัตถุประสงค์' => $updatedBooking['purpose'],
                        'วันเวลาเดินทาง' => $dateTimeLabel,
                        'รถที่ได้รับ' => $vehicleLabel !== '' ? $vehicleLabel : 'รถยนต์ส่วนกลาง',
                        'มอบหมายโดย' => $currentUser['name'],
                        'ยืนยันรับทราบ URL' => 'https://mmvschool.ac.th/api/vehicles.php?driver_token=' . urlencode((string) $driverToken),
                    ],
                    (string) $updatedBooking['id']
                );
            }
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
        $stmt = $database->prepare(
            "UPDATE vehicle_bookings SET booking_stage = 'completed', status = 'approved' WHERE id = ? AND assigned_driver_id = ?"
        );
        $stmt->execute([$input['bookingId'] ?? '', $currentUser['id']]);
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
