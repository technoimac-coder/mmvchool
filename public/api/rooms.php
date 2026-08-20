<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/line-notifier.php';

$database = require_database();
$currentUser = require_user();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function room_payload(array $row): array
{
    $facilities = json_decode((string) ($row['facilities'] ?? '[]'), true);
    return [
        'id' => (string) $row['id'],
        'name' => (string) $row['name'],
        'location' => (string) $row['location'],
        'capacity' => (string) $row['capacity'],
        'facilities' => is_array($facilities) ? $facilities : [],
        'image' => (string) ($row['image'] ?? ''),
        'status' => (string) $row['status'],
        'managerId' => $row['manager_id'] ?: null,
        'managerName' => $row['manager_name'] ?: null,
        'managerPosition' => $row['manager_position'] ?: null,
        'managerIds' => $row['manager_id'] ? [(string) $row['manager_id']] : [],
    ];
}

function booking_payload(array $row): array
{
    $equipment = json_decode((string) ($row['equipment_required'] ?? '[]'), true);
    $payload = [
        'id' => (string) $row['id'],
        'userId' => (string) $row['user_id'],
        'userName' => (string) $row['user_name'],
        'department' => (string) $row['department'],
        'roomId' => (string) $row['room_id'],
        'roomName' => (string) $row['room_name'],
        'title' => (string) $row['title'],
        'attendeeCount' => (int) $row['attendee_count'],
        'date' => (string) $row['booking_date'],
        'startTime' => substr((string) $row['start_time'], 0, 5),
        'endTime' => substr((string) $row['end_time'], 0, 5),
        'layoutStyle' => (string) $row['layout_style'],
        'equipmentRequired' => is_array($equipment) ? $equipment : [],
        'snackRequired' => (bool) $row['snack_required'],
        'snackDetails' => $row['snack_details'] ?: null,
        'bookingStage' => (string) $row['booking_stage'],
        'status' => (string) $row['status'],
        'createdAt' => substr((string) $row['created_at'], 0, 10),
    ];
    if (!empty($row['manager_review_by'])) {
        $payload['managerReview'] = [
            'approvedBy' => (string) $row['manager_review_by'],
            'date' => substr((string) $row['manager_review_at'], 0, 10),
            'comment' => (string) ($row['manager_review_comment'] ?? ''),
        ];
    }
    if (!empty($row['completed_at'])) {
        $payload['completedAt'] = substr((string) $row['completed_at'], 0, 10);
    }
    return $payload;
}

function find_booking(PDO $database, string $id): array
{
    $statement = $database->prepare('SELECT * FROM room_bookings WHERE id = ? LIMIT 1');
    $statement->execute([$id]);
    $booking = $statement->fetch();
    if (!$booking) {
        api_error('ไม่พบรายการจองห้อง', 404, 'booking_not_found');
    }
    return $booking;
}

function can_manage_booking(PDO $database, array $user, array $booking): bool
{
    if (in_array($user['role'] ?? '', ['admin', 'director'], true)) {
        return true;
    }
    $statement = $database->prepare('SELECT 1 FROM meeting_rooms WHERE id = ? AND manager_id = ? LIMIT 1');
    $statement->execute([$booking['room_id'], $user['id']]);
    return (bool) $statement->fetchColumn();
}

if ($method === 'GET') {
    $action = (string) ($_GET['action'] ?? 'bookings');
    if ($action === 'rooms') {
        $rows = $database->query(
            'SELECT r.*, u.name AS manager_name, u.position AS manager_position
             FROM meeting_rooms r LEFT JOIN users u ON u.id = r.manager_id ORDER BY r.name'
        )->fetchAll();
        api_respond(['status' => 'success', 'data' => array_map('room_payload', $rows)]);
    }
    if ($action === 'bookings') {
        $rows = $database->query('SELECT * FROM room_bookings ORDER BY booking_date DESC, start_time DESC')->fetchAll();
        api_respond(['status' => 'success', 'data' => array_map('booking_payload', $rows)]);
    }
    api_error('ไม่รู้จักคำสั่งที่ร้องขอ', 400, 'unknown_action');
}

if ($method !== 'POST') {
    api_error('ไม่รองรับวิธีการเรียกนี้', 405, 'method_not_allowed');
}

require_csrf();
$input = json_body();
$action = (string) ($input['action'] ?? '');

if ($action === 'create') {
    foreach (['roomId', 'title', 'date', 'startTime', 'endTime'] as $field) {
        if (trim((string) ($input[$field] ?? '')) === '') {
            api_error('กรุณากรอกข้อมูลการจองให้ครบถ้วน', 422, 'validation_error');
        }
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $input['date']) ||
        !preg_match('/^\d{2}:\d{2}$/', (string) $input['startTime']) ||
        !preg_match('/^\d{2}:\d{2}$/', (string) $input['endTime']) ||
        $input['startTime'] >= $input['endTime']) {
        api_error('วันที่หรือช่วงเวลาไม่ถูกต้อง', 422, 'invalid_schedule');
    }

    $database->beginTransaction();
    try {
        $roomStatement = $database->prepare('SELECT * FROM meeting_rooms WHERE id = ? AND status = \'available\' LIMIT 1 FOR UPDATE');
        $roomStatement->execute([$input['roomId']]);
        $room = $roomStatement->fetch();
        if (!$room) {
            $database->rollBack();
            api_error('ห้องประชุมนี้ไม่พร้อมให้จอง', 409, 'room_unavailable');
        }
        $conflict = $database->prepare(
            "SELECT id, title, start_time, end_time FROM room_bookings
             WHERE room_id = ? AND booking_date = ? AND status <> 'rejected'
             AND booking_stage <> 'completed' AND start_time < ? AND end_time > ? LIMIT 1 FOR UPDATE"
        );
        $conflict->execute([$input['roomId'], $input['date'], $input['endTime'], $input['startTime']]);
        if ($conflict->fetch()) {
            $database->rollBack();
            api_error('ช่วงเวลานี้มีผู้จองแล้ว กรุณาเลือกเวลาใหม่', 409, 'schedule_conflict');
        }

        $id = 'RB-' . date('Y') . '-' . strtoupper(bin2hex(random_bytes(3)));
        $statement = $database->prepare(
            'INSERT INTO room_bookings
             (id, user_id, user_name, user_phone, department, room_id, room_name, title, attendee_count,
              booking_date, start_time, end_time, layout_style, equipment_required, snack_required, snack_details)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $statement->execute([
            $id, $currentUser['id'], $currentUser['name'], $currentUser['phone'] ?? '', $currentUser['department'] ?? '',
            $room['id'], $room['name'], trim((string) $input['title']), max(1, (int) ($input['attendeeCount'] ?? 1)),
            $input['date'], $input['startTime'], $input['endTime'], $input['layoutStyle'] ?? 'classroom',
            json_encode($input['equipmentRequired'] ?? [], JSON_UNESCAPED_UNICODE), !empty($input['snackRequired']) ? 1 : 0,
            trim((string) ($input['snackDetails'] ?? '')) ?: null,
        ]);
        $database->commit();
        $createdBooking = find_booking($database, $id);
        $notificationFields = [
            'เลขที่' => $createdBooking['id'],
            'ผู้ขอ' => $createdBooking['user_name'],
            'ห้อง' => $createdBooking['room_name'],
            'เรื่อง' => $createdBooking['title'],
            'วันที่' => $createdBooking['booking_date'],
            'เวลา' => substr((string) $createdBooking['start_time'], 0, 5) . '–' . substr((string) $createdBooking['end_time'], 0, 5),
        ];
        $sentToManager = !empty($room['manager_id']) && line_notify_linked_users(
            $database,
            [(string) $room['manager_id']],
            'มีคำขอจองห้องใหม่',
            $notificationFields
        );
        if (!$sentToManager) {
            line_notify_event('มีคำขอจองห้องใหม่', $notificationFields);
        }
        api_respond(['status' => 'success', 'data' => booking_payload($createdBooking)], 201);
    } catch (Throwable $exception) {
        if ($database->inTransaction()) {
            $database->rollBack();
        }
        error_log('Room booking create failed: ' . $exception->getMessage());
        api_error('ไม่สามารถบันทึกการจองได้', 500, 'booking_create_failed');
    }
}

if ($action === 'update_manager') {
    require_roles('admin', 'director');
    $managerId = (string) ($input['managerId'] ?? '');
    $manager = $database->prepare("SELECT 1 FROM users WHERE id = ? AND status = 'active' LIMIT 1");
    $manager->execute([$managerId]);
    if (!$manager->fetchColumn()) {
        api_error('ไม่พบบัญชีผู้ดูแลที่เลือก', 422, 'manager_not_found');
    }
    $statement = $database->prepare('UPDATE meeting_rooms SET manager_id = ? WHERE id = ?');
    $statement->execute([$managerId, (string) ($input['roomId'] ?? '')]);
    if ($statement->rowCount() !== 1) {
        $room = $database->prepare('SELECT 1 FROM meeting_rooms WHERE id = ? LIMIT 1');
        $room->execute([(string) ($input['roomId'] ?? '')]);
        if (!$room->fetchColumn()) {
            api_error('ไม่พ1บห้องประชุม', 404, 'room_not_found');
        }
    }
    api_respond(['status' => 'success']);
}

if (in_array($action, ['approve', 'reject', 'complete'], true)) {
    $booking = find_booking($database, (string) ($input['bookingId'] ?? ''));
    $isManager = can_manage_booking($database, $currentUser, $booking);
    if ($action !== 'complete' && !$isManager) {
        api_error('คุณไม่มีสิทธิ์อนุมัติรายการนี้', 403, 'forbidden');
    }
    if ($action === 'complete' && !$isManager && $booking['user_id'] !== $currentUser['id']) {
        api_error('คุณไม่มีสิทธิ์ปิดรายการนี้', 403, 'forbidden');
    }

    if ($action === 'approve') {
        $statement = $database->prepare(
            "UPDATE room_bookings SET booking_stage = 'approved_ready', status = 'approved',
             manager_review_by = ?, manager_review_at = NOW(), manager_review_comment = ?
             WHERE id = ? AND booking_stage = 'pending_manager'"
        );
        $statement->execute([$currentUser['name'] . ' (' . $currentUser['position'] . ')', trim((string) ($input['comment'] ?? '')) ?: 'อนุมัติและจัดเตรียมห้องแล้ว', $booking['id']]);
    } elseif ($action === 'reject') {
        $statement = $database->prepare(
            "UPDATE room_bookings SET booking_stage = 'rejected', status = 'rejected',
             manager_review_by = ?, manager_review_at = NOW(), manager_review_comment = ?
             WHERE id = ? AND booking_stage = 'pending_manager'"
        );
        $statement->execute([$currentUser['name'], trim((string) ($input['comment'] ?? '')) ?: 'ไม่อนุมัติ', $booking['id']]);
    } else {
        $statement = $database->prepare(
            "UPDATE room_bookings SET booking_stage = 'completed', status = 'completed', completed_at = NOW()
             WHERE id = ? AND booking_stage = 'approved_ready'"
        );
        $statement->execute([$booking['id']]);
    }
    if ($statement->rowCount() !== 1) {
        api_error('สถานะรายการถูกเปลี่ยนไปแล้ว กรุณาโหลดใหม่', 409, 'stale_booking');
    }
    $updatedBooking = find_booking($database, $booking['id']);
    $eventTitles = [
        'approve' => 'อนุมัติการจองห้องแล้ว',
        'reject' => 'ไม่อนุมัติการจองห้อง',
        'complete' => 'ปิดรายการจองห้องแล้ว',
    ];
    $notificationFields = [
        'เลขที่' => $updatedBooking['id'],
        'ผู้ขอ' => $updatedBooking['user_name'],
        'ห้อง' => $updatedBooking['room_name'],
        'เรื่อง' => $updatedBooking['title'],
        'วันที่' => $updatedBooking['booking_date'],
        'เวลา' => substr((string) $updatedBooking['start_time'], 0, 5) . '–' . substr((string) $updatedBooking['end_time'], 0, 5),
        'ดำเนินการโดย' => $currentUser['name'],
    ];
    if (!line_notify_linked_users($database, [$updatedBooking['user_id']], $eventTitles[$action], $notificationFields)) {
        line_notify_event($eventTitles[$action], $notificationFields);
    }
    api_respond(['status' => 'success', 'data' => booking_payload($updatedBooking)]);
}

api_error('ไม่รู้จักคำสั่งที่ร้องขอ', 400, 'unknown_action');
