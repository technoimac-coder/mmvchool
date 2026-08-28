<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/line-notifier.php';

$database = require_database();
$currentUser = require_user();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function room_payload(array $row, PDO $database): array
{
    $facilities = json_decode((string) ($row['facilities'] ?? '[]'), true);
    
    // Parse multiple manager IDs
    $managerIds = json_decode((string) ($row['manager_ids'] ?? '[]'), true);
    if (!is_array($managerIds)) {
        $managerIds = $row['manager_id'] ? [(string) $row['manager_id']] : [];
    }
    $managerIds = array_values(array_filter($managerIds));
    
    // Fetch names and positions for all manager IDs
    $managerNames = [];
    $managerPositions = [];
    if (!empty($managerIds)) {
        $inQuery = implode(',', array_fill(0, count($managerIds), '?'));
        $stmt = $database->prepare("SELECT name, position FROM users WHERE id IN ($inQuery)");
        $stmt->execute($managerIds);
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($users as $u) {
            $managerNames[] = $u['name'];
            $managerPositions[] = $u['position'];
        }
    }
    
    $imagePath = (string) ($row['image'] ?? '');
    if ($imagePath !== '' && str_starts_with($imagePath, '/uploads/')) {
        $fullPath = __DIR__ . '/..' . $imagePath;
        if (file_exists($fullPath)) {
            $imagePath .= '?t=' . filemtime($fullPath);
        }
    }

    return [
        'id' => (string) $row['id'],
        'name' => (string) $row['name'],
        'location' => (string) $row['location'],
        'capacity' => (string) $row['capacity'],
        'facilities' => is_array($facilities) ? $facilities : [],
        'image' => $imagePath,
        'status' => (string) $row['status'],
        'managerId' => $managerIds[0] ?? null,
        'managerName' => implode(', ', $managerNames) ?: 'ยังไม่กำหนด',
        'managerPosition' => !empty($managerPositions) ? implode(', ', $managerPositions) : null,
        'managerIds' => $managerIds,
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
    if (!empty($row['deputy_review_by'])) {
        $payload['deputyReview'] = [
            'approvedBy' => (string) $row['deputy_review_by'],
            'date' => substr((string) $row['deputy_review_at'], 0, 10),
            'comment' => (string) ($row['deputy_review_comment'] ?? ''),
        ];
    }
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

function notify_room_users(PDO $database, array $userIds, string $title, array $fields, string $relatedId): void
{
    $userIds = array_values(array_unique(array_filter(array_map('strval', $userIds))));
    if (!$userIds) return;
    $parts = [];
    foreach ($fields as $label => $value) $parts[] = $label . ': ' . $value;
    $statement = $database->prepare(
        'INSERT INTO notifications (user_id, title, message, module, related_id) VALUES (?, ?, ?, ?, ?)'
    );
    foreach ($userIds as $userId) {
        $statement->execute([$userId, $title, implode(' • ', $parts), 'room', $relatedId]);
    }
    line_notify_linked_users($database, $userIds, $title, $fields);
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
    if (($user['role'] ?? '') === 'admin') {
        return true;
    }
    $userId = (string) ($user['id'] ?? '');
    // Check pipeline assignee
    $pipelineManagerId = workflow_assignee('pipe-room', 3, 'MMV03');
    if ($pipelineManagerId !== '' && $userId === $pipelineManagerId) {
        return true;
    }
    // Check actual room managers from DB
    $statement = $database->prepare(
        'SELECT 1 FROM meeting_rooms
         WHERE id = ? AND (manager_id = ? OR (manager_ids IS NOT NULL AND JSON_CONTAINS(manager_ids, JSON_QUOTE(?)))) LIMIT 1'
    );
    $statement->execute([$booking['room_id'], $userId, $userId]);
    return (bool) $statement->fetchColumn();
}

function can_approve_room_by_deputy(array $user): bool
{
    return ($user['role'] ?? '') === 'admin'
        || (string) ($user['id'] ?? '') === workflow_assignee('pipe-room', 2, 'MMV03');
}

if ($method === 'GET') {
    $action = (string) ($_GET['action'] ?? 'bookings');
    if ($action === 'rooms') {
        // Auto-sync room photos from uploads/rooms directory if they are missing in the DB
        $roomDir = __DIR__ . '/../uploads/rooms';
        if (is_dir($roomDir)) {
            $files = scandir($roomDir);
            $rooms = $database->query("SELECT id, name FROM meeting_rooms")->fetchAll();
            $syncStmt = $database->prepare("UPDATE meeting_rooms SET image = ? WHERE id = ?");
            foreach ($files as $file) {
                if ($file === '.' || $file === '..') continue;
                
                $filename = pathinfo($file, PATHINFO_FILENAME);
                $cleanName = mb_strtolower(trim($filename), 'UTF-8');
                $normalizedName = preg_replace('/[^a-zA-Z0-9]/', '', $cleanName);
                
                $matchedRoomId = null;
                
                // Match by ID
                foreach ($rooms as $r) {
                    $rIdNorm = preg_replace('/[^a-zA-Z0-9]/', '', strtolower($r['id']));
                    if ($rIdNorm === $normalizedName) {
                        $matchedRoomId = $r['id'];
                        break;
                    }
                }
                
                // Match by Room Name (e.g. "รวงผึ้ง" matches "ห้องประชุมรวงผึ้ง")
                if ($matchedRoomId === null) {
                    foreach ($rooms as $r) {
                        $rNameNorm = mb_strtolower($r['name'], 'UTF-8');
                        if (mb_strpos($rNameNorm, $cleanName) !== false || mb_strpos($cleanName, $rNameNorm) !== false) {
                            $matchedRoomId = $r['id'];
                            break;
                        }
                    }
                }
                
                if ($matchedRoomId !== null) {
                    $dbPath = '/uploads/rooms/' . $file;
                    $checkStmt = $database->prepare("SELECT image FROM meeting_rooms WHERE id = ?");
                    $checkStmt->execute([$matchedRoomId]);
                    $currentImage = $checkStmt->fetchColumn();
                    // Overwrite if empty OR currently pointing to external mock URL (like Unsplash)
                    if (empty($currentImage) || !str_starts_with((string)$currentImage, '/uploads/rooms/')) {
                        $syncStmt->execute([$dbPath, $matchedRoomId]);
                    }
                }
            }
        }

        $rows = $database->query('SELECT * FROM meeting_rooms ORDER BY name')->fetchAll();
        api_respond(['status' => 'success', 'data' => array_map(function($row) use ($database) {
            return room_payload($row, $database);
        }, $rows)]);
    }
    if ($action === 'bookings') {
        if (($currentUser['role'] ?? '') === 'admin') {
            $rows = $database->query('SELECT * FROM room_bookings ORDER BY booking_date DESC, start_time DESC')->fetchAll();
        } else {
            $conditions = ['user_id = ?'];
            $parameters = [$currentUser['id']];
            if (can_approve_room_by_deputy($currentUser)) {
                $conditions[] = "(status = 'pending' AND booking_stage = 'pending_deputy')";
            }
            if ((string) $currentUser['id'] === workflow_assignee('pipe-room', 3, 'MMV03')) {
                $conditions[] = "(status = 'pending' AND booking_stage = 'pending_manager')";
            }
            $statement = $database->prepare(
                'SELECT * FROM room_bookings
                 WHERE ' . implode(' OR ', $conditions) . '
                 ORDER BY booking_date DESC, start_time DESC'
            );
            $statement->execute($parameters);
            $rows = $statement->fetchAll();
        }
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
            api_error('อาคาร/ห้องนี้ไม่พร้อมให้ขอใช้', 409, 'room_unavailable');
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

        $isBypassDeputy = (strpos((string) $room['name'], 'รวงผึ้ง') !== false);
        $initialStage = $isBypassDeputy ? 'pending_manager' : 'pending_deputy';

        $id = 'RB-' . date('Y') . '-' . strtoupper(bin2hex(random_bytes(3)));
        $statement = $database->prepare(
            'INSERT INTO room_bookings
             (id, user_id, user_name, user_phone, department, room_id, room_name, title, attendee_count,
              booking_date, start_time, end_time, layout_style, equipment_required, snack_required, snack_details,
              booking_stage)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $statement->execute([
            $id, $currentUser['id'], $currentUser['name'], $currentUser['phone'] ?? '', $currentUser['department'] ?? '',
            $room['id'], $room['name'], trim((string) $input['title']), max(1, (int) ($input['attendeeCount'] ?? 1)),
            $input['date'], $input['startTime'], $input['endTime'], $input['layoutStyle'] ?? 'classroom',
            json_encode($input['equipmentRequired'] ?? [], JSON_UNESCAPED_UNICODE), !empty($input['snackRequired']) ? 1 : 0,
            trim((string) ($input['snackDetails'] ?? '')) ?: null,
            $initialStage,
        ]);
        $database->commit();
        $createdBooking = find_booking($database, $id);
        $notificationFields = [
            'เลขที่' => $createdBooking['id'],
            'ผู้ขอ' => $createdBooking['user_name'],
            'สถานที่' => $createdBooking['room_name'],
            'เรื่อง' => $createdBooking['title'],
            'วันที่' => $createdBooking['booking_date'],
            'เวลา' => substr((string) $createdBooking['start_time'], 0, 5) . '–' . substr((string) $createdBooking['end_time'], 0, 5),
        ];

        if ($isBypassDeputy) {
            // Notify ONLY actual room managers from DB (exclude pipeline manager MMV03 who is deputy)
            $roomManagerIds = json_decode((string) ($room['manager_ids'] ?? '[]'), true);
            if (!is_array($roomManagerIds)) $roomManagerIds = [];
            if (!empty($room['manager_id'])) $roomManagerIds[] = (string) $room['manager_id'];
            $roomManagerIds = array_values(array_unique(array_filter($roomManagerIds)));
            if (!empty($roomManagerIds)) {
                notify_room_users($database, $roomManagerIds, 'มีคำขอใช้อาคารสถานที่ใหม่ รอผู้ดูแลสถานที่ยืนยัน (ส่งตรงผู้ดูแลห้อง)', $notificationFields, (string) $createdBooking['id']);
            }
        } else {
            // Notify deputy general affairs
            $deputyIds = [workflow_assignee('pipe-room', 2, 'MMV03')];
            notify_room_users($database, $deputyIds, 'คำขอใช้อาคารสถานที่ใหม่ รอการอนุมัติ', $notificationFields, (string) $createdBooking['id']);
        }
        api_respond(['status' => 'success', 'data' => booking_payload($createdBooking)], 201);
    } catch (Throwable $exception) {
        if ($database->inTransaction()) {
            $database->rollBack();
        }
        error_log('Room booking create failed: ' . $exception->getMessage());
        api_error('ไม่สามารถบันทึกคำขอได้', 500, 'booking_create_failed');
    }
}

if ($action === 'update_manager') {
    require_roles('admin', 'director');
    $managerIds = $input['managerIds'] ?? [];
    if (!is_array($managerIds)) {
        $managerIds = [];
    }
    $managerIds = array_values(array_filter($managerIds));
    
    // Check that all selected manager accounts exist
    if (!empty($managerIds)) {
        $inQuery = implode(',', array_fill(0, count($managerIds), '?'));
        $stmt = $database->prepare("SELECT COUNT(*) FROM users WHERE id IN ($inQuery) AND status = 'active'");
        $stmt->execute($managerIds);
        if ($stmt->fetchColumn() !== count($managerIds)) {
            api_error('ไม่พบบัญชีผู้ดูแลบางส่วนที่เลือก', 422, 'manager_not_found');
        }
    }
    
    $legacyManagerId = $managerIds[0] ?? null;
    $jsonManagerIds = json_encode($managerIds);
    
    $statement = $database->prepare('UPDATE meeting_rooms SET manager_id = ?, manager_ids = ? WHERE id = ?');
    $statement->execute([$legacyManagerId, $jsonManagerIds, (string) ($input['roomId'] ?? '')]);
    
    if ($statement->rowCount() !== 1) {
        $room = $database->prepare('SELECT 1 FROM meeting_rooms WHERE id = ? LIMIT 1');
        $room->execute([(string) ($input['roomId'] ?? '')]);
        if (!$room->fetchColumn()) {
            api_error('ไม่พบอาคาร/ห้อง', 404, 'room_not_found');
        }
    }
    api_respond(['status' => 'success']);
}

if ($action === 'update_room') {
    require_roles('admin', 'director');
    foreach (['roomId', 'name', 'location', 'capacity'] as $field) {
        if (trim((string) ($input[$field] ?? '')) === '') {
            api_error('กรุณากรอกข้อมูลให้ครบถ้วน', 422, 'validation_error');
        }
    }
    
    $imageUrl = (string) ($input['image'] ?? '');
    
    // Clean any query string parameter (e.g. cache-buster ?t=...)
    if ($imageUrl !== '') {
        $parts = explode('?', $imageUrl);
        $imageUrl = $parts[0];
    }
    
    $dbImageUrl = null;
    if (str_starts_with($imageUrl, 'data:image/')) {
        $pos = strpos($imageUrl, ';base64,');
        if ($pos !== false) {
            $header = substr($imageUrl, 0, $pos);
            $data = substr($imageUrl, $pos + 8);
            $extension = 'jpg';
            if (str_contains($header, 'png')) {
                $extension = 'png';
            } elseif (str_contains($header, 'webp')) {
                $extension = 'webp';
            }
            $binary = base64_decode($data);
            if ($binary !== false) {
                $uploadDir = __DIR__ . '/../uploads/rooms';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0777, true);
                }
                $filename = (string) $input['roomId'] . '.' . $extension;
                file_put_contents($uploadDir . '/' . $filename, $binary);
                $dbImageUrl = '/uploads/rooms/' . $filename;
            }
        }
    } else {
        $dbImageUrl = $imageUrl !== '' ? $imageUrl : null;
    }

    // Check if room exists
    $check = $database->prepare('SELECT COUNT(*) FROM meeting_rooms WHERE id = ?');
    $check->execute([(string) $input['roomId']]);
    $exists = $check->fetchColumn() > 0;
    
    if ($exists) {
        if ($dbImageUrl !== null) {
            $statement = $database->prepare('UPDATE meeting_rooms SET name = ?, location = ?, capacity = ?, image = ? WHERE id = ?');
            $statement->execute([
                trim((string) $input['name']),
                trim((string) $input['location']),
                trim((string) $input['capacity']),
                $dbImageUrl,
                (string) $input['roomId']
            ]);
        } else {
            $statement = $database->prepare('UPDATE meeting_rooms SET name = ?, location = ?, capacity = ? WHERE id = ?');
            $statement->execute([
                trim((string) $input['name']),
                trim((string) $input['location']),
                trim((string) $input['capacity']),
                (string) $input['roomId']
            ]);
        }
    } else {
        $statement = $database->prepare('INSERT INTO meeting_rooms (id, name, location, capacity, image, facilities, status, manager_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $statement->execute([
            (string) $input['roomId'],
            trim((string) $input['name']),
            trim((string) $input['location']),
            trim((string) $input['capacity']),
            $dbImageUrl,
            json_encode(['โปรเจกเตอร์', 'ระบบเสียง', 'ไมโครโฟน'], JSON_UNESCAPED_UNICODE),
            'available',
            json_encode([])
        ]);
    }
    api_respond(['status' => 'success']);
}

// Approve by deputy general (step 1)
if ($action === 'approve_deputy') {
    $booking = find_booking($database, (string) ($input['bookingId'] ?? ''));
    $isDeputy = can_approve_room_by_deputy($currentUser);
    if (!$isDeputy) {
        api_error('คุณไม่มีสิทธิ์ดำเนินการนี้ ต้องเป็นรองผู้อำนวยการฝ่ายทั่วไป', 403, 'forbidden');
    }
    $statement = $database->prepare(
        "UPDATE room_bookings SET booking_stage = 'approved_ready', status = 'approved',
         deputy_review_by = ?, deputy_review_at = NOW(), deputy_review_comment = ?
         WHERE id = ? AND booking_stage = 'pending_deputy'"
    );
    $statement->execute([
        $currentUser['name'] . ' (' . ($currentUser['position'] ?? '') . ')',
        trim((string) ($input['comment'] ?? '')) ?: 'อนุมัติความเห็นชอบ',
        $booking['id']
    ]);
    if ($statement->rowCount() !== 1) {
        api_error('สถานะรายการถูกเปลี่ยนไปแล้ว กรุณาโหลดใหม่', 409, 'stale_booking');
    }
    $updatedBooking = find_booking($database, $booking['id']);
    // Notify room managers (actual room managers from DB + pipeline assignee)
    $roomRow = $database->prepare('SELECT manager_id, manager_ids FROM meeting_rooms WHERE id = ? LIMIT 1');
    $roomRow->execute([$updatedBooking['room_id']]);
    $roomData = $roomRow->fetch();
    $managerIds = [];
    if ($roomData) {
        $dbManagerIds = json_decode((string) ($roomData['manager_ids'] ?? '[]'), true);
        if (is_array($dbManagerIds)) $managerIds = $dbManagerIds;
        if (!empty($roomData['manager_id'])) $managerIds[] = (string) $roomData['manager_id'];
    }
    $pipelineManagerId = workflow_assignee('pipe-room', 3, 'MMV03');
    if ($pipelineManagerId !== '') $managerIds[] = $pipelineManagerId;
    $managerIds = array_values(array_unique(array_filter($managerIds)));
    $notificationFields = [
        'เลขที่' => $updatedBooking['id'],
        'ผู้ขอ' => $updatedBooking['user_name'],
        'สถานที่' => $updatedBooking['room_name'],
        'เรื่อง' => $updatedBooking['title'],
        'วันที่' => $updatedBooking['booking_date'],
        'อนุมัติโดย' => $currentUser['name'],
    ];
    if (!empty($managerIds)) {
        notify_room_users($database, $managerIds, 'รองฝ่ายทั่วไปอนุมัติแล้ว พร้อมใช้งาน (แจ้งเพื่อเตรียมความพร้อมสถานที่)', $notificationFields, (string) $updatedBooking['id']);
    }
    // Also notify applicant that booking is approved and ready
    notify_room_users($database, [(string) $updatedBooking['user_id']], 'การขอใช้อาคารสถานที่ได้รับการอนุมัติแล้ว พร้อมใช้งาน', $notificationFields, (string) $updatedBooking['id']);
    api_respond(['status' => 'success', 'data' => booking_payload($updatedBooking)]);
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
        $statement->execute([$currentUser['name'] . ' (' . ($currentUser['position'] ?? '') . ')', trim((string) ($input['comment'] ?? '')) ?: 'จัดเตรียมสถานที่เรียบร้อยแล้ว', $booking['id']]);
    } elseif ($action === 'reject') {
        $statement = $database->prepare(
            "UPDATE room_bookings SET booking_stage = 'rejected', status = 'rejected',
             manager_review_by = ?, manager_review_at = NOW(), manager_review_comment = ?
             WHERE id = ? AND booking_stage IN ('pending_deputy','pending_manager')"
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
        'approve' => 'ผู้ดูแลสถานที่ยืนยันพร้อมใช้งานแล้ว',
        'reject'  => 'ไม่อนุมัติคำขอใช้อาคารสถานที่',
        'complete' => 'ปิดรายการใช้อาคารสถานที่แล้ว',
    ];
    $notificationFields = [
        'เลขที่' => $updatedBooking['id'],
        'ผู้ขอ' => $updatedBooking['user_name'],
        'สถานที่' => $updatedBooking['room_name'],
        'เรื่อง' => $updatedBooking['title'],
        'วันที่' => $updatedBooking['booking_date'],
        'เวลา' => substr((string) $updatedBooking['start_time'], 0, 5) . '–' . substr((string) $updatedBooking['end_time'], 0, 5),
        'ดำเนินการโดย' => $currentUser['name'],
    ];
    notify_room_users($database, [(string) $updatedBooking['user_id'], (string) workflow_assignee('pipe-room', 2, 'MMV03')], $eventTitles[$action], $notificationFields, (string) $updatedBooking['id']);
    api_respond(['status' => 'success', 'data' => booking_payload($updatedBooking)]);
}

api_error('ไม่รู้จักคำสั่งที่ร้องขอ', 400, 'unknown_action');
