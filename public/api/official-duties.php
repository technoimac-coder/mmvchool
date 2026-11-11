<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/line-notifier.php';
require_once __DIR__ . '/pending-request-edit.php';

$database = require_database();
$currentUser = require_user();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
try { $database->exec("ALTER TABLE official_duty_requests ADD COLUMN attachments longtext NULL"); } catch (Throwable $ignored) { /* column already exists */ }
try { $database->exec("ALTER TABLE official_duty_requests ADD COLUMN academic_year varchar(10) NULL"); } catch (Throwable $ignored) { /* column already exists */ }
try { $database->exec("ALTER TABLE official_duty_requests ADD COLUMN semester varchar(1) NULL"); } catch (Throwable $ignored) { /* column already exists */ }
$database->exec("UPDATE official_duty_requests SET academic_year = CASE WHEN MONTH(created_at) < 5 THEN YEAR(created_at) + 542 ELSE YEAR(created_at) + 543 END, semester = CASE WHEN MONTH(created_at) BETWEEN 5 AND 10 THEN '1' ELSE '2' END WHERE academic_year IS NULL OR semester IS NULL");

try { $database->exec("ALTER TABLE official_duty_requests ADD COLUMN exchange_lessons longtext NULL"); } catch (Throwable $ignored) { /* column already exists */ }
try { $database->exec("ALTER TABLE official_duty_requests ADD COLUMN secretary_ack longtext NULL"); } catch (PDOException $error) { if ((int) ($error->errorInfo[1] ?? 0) !== 1060) throw $error; }
try { $database->exec("ALTER TABLE official_duty_requests ADD COLUMN secretary_completed_at datetime DEFAULT NULL"); } catch (PDOException $error) { if ((int) ($error->errorInfo[1] ?? 0) !== 1060) throw $error; }
try { $database->exec("ALTER TABLE official_duty_requests ADD COLUMN secretary_completed_by varchar(100) DEFAULT NULL"); } catch (PDOException $error) { if ((int) ($error->errorInfo[1] ?? 0) !== 1060) throw $error; }
pending_request_install($database,'official_duty');
ensure_official_duty_pipeline($database);

$dutyApprovers = [
    'secretary_ack' => workflow_assignee('pipe-duty', 2, 'MMV14'),
    'admin_review' => workflow_assignee('pipe-duty', 3, 'MMV04'),
    'deputy_approval' => workflow_assignee('pipe-duty', 3, 'MMV04'),
    'director_approval' => workflow_assignee('pipe-duty', 4, 'MMV01'),
];

function can_view_all_duty_records(array $user, array $approvers): bool
{
    return is_executive_role($user)
        || in_array((string) ($user['id'] ?? ''), array_values($approvers), true);
}

function duty_json(?string $value): ?array
{
    if (!$value) return null;
    $decoded = json_decode($value, true);
    return is_array($decoded) ? $decoded : null;
}

function duty_payload(array $row): array
{
    $payload = [
        'id' => (string) $row['id'], 'userId' => (string) $row['user_id'],
        'userName' => (string) $row['user_name'], 'userPosition' => (string) $row['user_position'],
        'department' => (string) $row['department'], 'title' => (string) $row['title'],
        'location' => (string) $row['location'], 'organizer' => (string) ($row['organizer'] ?? ''),
        'startDate' => (string) $row['start_date'], 'endDate' => (string) $row['end_date'],
        'totalDays' => (int) $row['total_days'], 'participants' => duty_json($row['participants'] ?? null) ?? [],
        'vehicleType' => (string) $row['vehicle_type'], 'budgetType' => (string) $row['budget_type'],
        'budgetAmount' => (float) $row['budget_amount'], 'status' => (string) $row['status'],
        'currentStage' => (string) $row['current_stage'],
        'forwardedToAcademic' => (bool) $row['forwarded_to_academic'],
        'substituteScheduled' => (bool) $row['substitute_scheduled'],
        'secretaryCompletedAt' => $row['secretary_completed_at'] ?? null,
        'secretaryCompletedBy' => $row['secretary_completed_by'] ?? null,
        'createdAt' => substr((string) $row['created_at'], 0, 10),
        'academicYear' => (string) ($row['academic_year'] ?? ''), 'semester' => (string) ($row['semester'] ?? ''),
    ];
    foreach ([
        'vehicle_id' => 'vehicleId', 'vehicle_name' => 'vehicleName', 'license_plate' => 'licensePlate',
        'driver_name' => 'driverName', 'supervisor_name' => 'supervisorName',
        'personal_license_plate' => 'personalLicensePlate', 'budget_custom_text' => 'budgetCustomText',
        'signature_url' => 'signatureUrl',
    ] as $column => $key) {
        if (!empty($row[$column])) $payload[$key] = (string) $row[$column];
    }
    $payload['exchangeLessons'] = duty_json($row['exchange_lessons'] ?? null) ?? [];
    if (!empty($row['attachments'])) {
        $attachments = json_decode((string) $row['attachments'], true);
        if (is_array($attachments)) $payload['attachments'] = $attachments;
    }
    foreach ([
        'secretary_ack' => 'secretaryAck', 'admin_review' => 'adminReview', 'deputy_approval' => 'deputyApproval',
        'director_approval' => 'directorApproval',
    ] as $column => $key) {
        $value = duty_json($row[$column] ?? null);
        if ($value !== null) $payload[$key] = $value;
    }
    return array_merge($payload,pending_request_metadata('official_duty',$row));
}

function find_duty(PDO $database, string $id): array
{
    $statement = $database->prepare('SELECT * FROM official_duty_requests WHERE id = ? LIMIT 1');
    $statement->execute([$id]);
    $row = $statement->fetch();
    if (!$row) api_error('ไม่พบคำขอไปราชการ', 404, 'duty_not_found');
    return $row;
}

function duty_active_assignee(PDO $database, string $configuredUserId, string $stepLabel): string
{
    // Approval notifications must follow the single account selected in the
    // Admin Console. Silently dropping an inactive/missing account makes the
    // request look successful even though the deputy never receives it.
    $configuredUserId = trim($configuredUserId);
    if ($configuredUserId === '') {
        api_error('ยังไม่ได้กำหนดผู้รับผิดชอบขั้นตอน' . $stepLabel . 'ใน Admin Console', 503, 'duty_assignee_not_configured');
    }

    $statement = $database->prepare("SELECT id FROM users WHERE id = ? AND status = 'active' LIMIT 1");
    $statement->execute([$configuredUserId]);
    $activeUserId = $statement->fetchColumn();
    if (!$activeUserId) {
        api_error('บัญชีผู้รับผิดชอบขั้นตอน' . $stepLabel . 'ไม่พร้อมใช้งาน กรุณาตรวจสอบใน Admin Console', 503, 'duty_assignee_unavailable');
    }

    return (string) $activeUserId;
}

function duty_web_notification(PDO $database, string $userId, string $title, array $fields, string $relatedId): void
{
    if ($userId === '') return;
    $parts = [];
    foreach ($fields as $label => $value) $parts[] = $label . ': ' . $value;
    $statement = $database->prepare(
        'INSERT INTO notifications (user_id, title, message, module, related_id) VALUES (?, ?, ?, ?, ?)'
    );
    $statement->execute([$userId, $title, implode(' • ', $parts), 'official_duty', $relatedId]);
}

function duty_role_user_ids(PDO $database, array $roles): array
{
    $placeholders = implode(',', array_fill(0, count($roles), '?'));
    $statement = $database->prepare("SELECT id FROM users WHERE status = 'active' AND role IN ($placeholders)");
    $statement->execute($roles);
    return array_values(array_unique(array_map(static fn(array $row): string => (string) $row['id'], $statement->fetchAll())));
}

function notify_duty_users(PDO $database, array $userIds, string $title, array $fields, string $relatedId): void
{
    $userIds = array_values(array_unique(array_filter($userIds)));
    if ($userIds) {
        $placeholders = implode(',', array_fill(0, count($userIds), '?'));
        $statement = $database->prepare("SELECT id FROM users WHERE status = 'active' AND id IN ($placeholders)");
        $statement->execute($userIds);
        $userIds = array_map(static fn(array $row): string => (string) $row['id'], $statement->fetchAll());
    }
    foreach ($userIds as $userId) duty_web_notification($database, $userId, $title, $fields, $relatedId);
    line_notify_linked_users($database, $userIds, $title, $fields);
}

if ($method === 'GET') {
    if (can_view_all_duty_records($currentUser, $dutyApprovers)) {
        $rows = $database->query('SELECT * FROM official_duty_requests ORDER BY created_at DESC')->fetchAll();
    } else {
        // Participants must be able to see a request they are named in, not
        // only requests they submitted.  Keep the query broad only within
        // this endpoint, then filter by immutable requester ID or the exact
        // participant name stored in the request JSON.
        $allRows = $database->query('SELECT * FROM official_duty_requests ORDER BY created_at DESC')->fetchAll();
        $currentUserId = (string) ($currentUser['id'] ?? '');
        $currentUserName = trim((string) ($currentUser['name'] ?? ''));
        $rows = array_values(array_filter($allRows, static function (array $row) use ($currentUserId, $currentUserName): bool {
            if ((string) ($row['user_id'] ?? '') === $currentUserId) return true;
            if ($currentUserName === '') return false;
            $participants = duty_json($row['participants'] ?? null) ?? [];
            return in_array($currentUserName, array_map(static fn($name): string => trim((string) $name), $participants), true);
        }));
    }
    api_respond(['status' => 'success', 'data' => array_map('duty_payload', $rows)]);
}

require_method('POST');
require_csrf();
$input = json_body();
$action = (string) ($input['action'] ?? '');

if ($action === 'delete') {
    $id = (string) ($input['dutyId'] ?? '');
    $database->beginTransaction();
    try {
        $statement = $database->prepare('SELECT * FROM official_duty_requests WHERE id = ? FOR UPDATE');
        $statement->execute([$id]);
        $duty = $statement->fetch(PDO::FETCH_ASSOC);
        if (!$duty) throw new RuntimeException('ไม่พบคำขอไปราชการ');
        if ((string) $duty['user_id'] !== (string) $currentUser['id']) throw new RuntimeException('เฉพาะผู้ยื่นคำขอเท่านั้นที่ลบได้');
        pending_request_assert_version($duty, $input);
        if (!pending_request_editable('official_duty', $duty)) throw new RuntimeException('ผู้รับผิดชอบเริ่มดำเนินการแล้ว ไม่สามารถลบคำขอนี้ได้');
        $database->prepare('DELETE FROM official_duty_requests WHERE id = ?')->execute([$id]);
        $database->commit();
        api_respond(['status' => 'success']);
    } catch (Throwable $error) {
        if ($database->inTransaction()) $database->rollBack();
        api_error($error->getMessage(), $error instanceof PendingRequestError ? $error->httpStatus : 409, $error instanceof PendingRequestError ? $error->errorCode : 'delete_locked');
    }
}

if ($action === 'create') {
    foreach (['title', 'location', 'startDate', 'endDate', 'vehicleType', 'budgetType', 'signatureUrl'] as $field) {
        if (trim((string) ($input[$field] ?? '')) === '') {
            api_error('กรุณากรอกข้อมูลและลงลายมือชื่อให้ครบถ้วน', 422, 'validation_error');
        }
    }
    $budgetType = (string) $input['budgetType'];
    $budgetText = $budgetType === 'none' ? null : (trim((string) ($input['budgetCustomText'] ?? '')) ?: null);
    if ($budgetType !== 'none' && $budgetText === null) {
        api_error('กรุณาระบุแหล่งงบประมาณ', 422, 'validation_error');
    }

    $attachments = $input['attachments'] ?? [];
    $lessons = $input['exchangeLessons'] ?? [];
    if (!is_array($attachments) || !array_is_list($attachments) || count($attachments) > 20 || !is_array($lessons) || count($lessons) > 40) {
        api_error('ข้อมูลเอกสารแนบหรือคาบแลกไม่ถูกต้อง', 422, 'invalid_attachments');
    }
    $seen = [];
    foreach ($lessons as $lesson) {
        if (!is_array($lesson)) api_error('ข้อมูลคาบแลกไม่ถูกต้อง', 422, 'invalid_exchange_lessons');
        $date = (string)($lesson['date'] ?? '');
        $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
        $periodNumber = filter_var($lesson['period'] ?? null, FILTER_VALIDATE_INT);
        if (!$parsed || $parsed->format('Y-m-d') !== $date || $date < $input['startDate'] || $date > $input['endDate'] || $periodNumber === false || $periodNumber < 1 || $periodNumber > 8) api_error('วันที่หรือคาบแลกไม่ถูกต้อง', 422, 'invalid_exchange_lessons');
        foreach (['gradeLevel'=>100,'subjectCode'=>100,'subjectName'=>255] as $field => $limit) {
            if (!is_string($lesson[$field] ?? null) || trim($lesson[$field]) === '' || mb_strlen($lesson[$field]) > $limit) api_error('กรุณากรอกข้อมูลแต่ละคาบให้ครบ', 422, 'invalid_exchange_lessons');
        }
        $teacherId = (string)($lesson['substituteTeacherId'] ?? '');
        $q = $database->prepare("SELECT id FROM users WHERE id = ? AND status = 'active'"); $q->execute([$teacherId]);
        if (!$q->fetchColumn() || $teacherId === (string)$currentUser['id']) api_error('กรุณาเลือกครูผู้สอนแทนที่พร้อมใช้งาน', 422, 'invalid_exchange_teacher');
        $key = $date . ':' . $periodNumber;
        if (isset($seen[$key])) api_error('มีคาบแลกซ้ำในคำขอ', 422, 'duplicate_exchange_lesson');
        $seen[$key] = true;
        $q = $database->prepare('SELECT id FROM substitute_teachings WHERE teaching_date = ? AND period = ? AND (original_teacher_id IN (?, ?) OR substitute_teacher_id IN (?, ?)) LIMIT 1');
        $q->execute([$date, $periodNumber, $currentUser['id'], $teacherId, $currentUser['id'], $teacherId]);
        if ($q->fetchColumn()) api_error('มีรายการสอนแทนตรงกับวันที่และคาบที่เลือก กรุณาตรวจสอบ', 409, 'duplicate_lesson');
    }

    // A new request enters the secretary acknowledgement stage first.
    $secretaryRecipientId = duty_active_assignee(
        $database,
        $dutyApprovers['secretary_ack'],
        'เลขานุการรับทราบ'
    );

    $id = 'OD-' . date('Y') . '-' . strtoupper(bin2hex(random_bytes(3)));
    $period = current_academic_period($database);
    $statement = $database->prepare(
        'INSERT INTO official_duty_requests
         (id, user_id, user_name, user_position, department, title, location, organizer,
          start_date, end_date, total_days, participants, vehicle_type, vehicle_id, vehicle_name,
          license_plate, driver_name, supervisor_name, personal_license_plate, budget_type,
          budget_amount, budget_custom_text, signature_url, attachments, exchange_lessons, current_stage, academic_year, semester)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $statement->execute([
        $id, $currentUser['id'], $currentUser['name'], $currentUser['position'] ?? '',
        $currentUser['department'] ?? '', trim((string) $input['title']), trim((string) $input['location']),
        trim((string) ($input['organizer'] ?? '')), $input['startDate'], $input['endDate'],
        max(1, (int) ($input['totalDays'] ?? 1)),
        json_encode($input['participants'] ?? [], JSON_UNESCAPED_UNICODE), $input['vehicleType'],
        $input['vehicleId'] ?? null, $input['vehicleName'] ?? null, $input['licensePlate'] ?? null,
        $input['driverName'] ?? null, $input['supervisorName'] ?? null, $input['personalLicensePlate'] ?? null,
        $budgetType, $budgetType === 'none' ? 0 : max(0, (float) ($input['budgetAmount'] ?? 0)),
        $budgetText, $input['signatureUrl'], json_encode($attachments, JSON_UNESCAPED_UNICODE), json_encode($lessons, JSON_UNESCAPED_UNICODE), 'secretary_ack',
        $period['academicYear'], $period['semester'],
    ]);

    $fields = [
        'เลขที่' => $id, 'ผู้ยื่น' => $currentUser['name'], 'เรื่อง' => $input['title'],
        'สถานที่' => $input['location'], 'วันที่' => $input['startDate'] . ' ถึง ' . $input['endDate'],
    ];
    notify_duty_users($database, [$secretaryRecipientId], 'มีคำขอไปราชการใหม่รอเลขานุการรับทราบ', $fields, $id);
    api_respond(['status' => 'success', 'data' => duty_payload(find_duty($database, $id))], 201);
}

if ($action === 'complete_secretary_followup') {
    if ((string) $currentUser['id'] !== $dutyApprovers['secretary_ack']) api_error('เฉพาะเลขานุการผู้รับผิดชอบเท่านั้น', 403, 'forbidden');
    $id = (string) ($input['dutyId'] ?? '');
    $statement = $database->prepare("UPDATE official_duty_requests SET secretary_completed_at = NOW(), secretary_completed_by = ? WHERE id = ? AND status = 'approved' AND secretary_completed_at IS NULL");
    $statement->execute([(string) $currentUser['id'], $id]);
    $updated = find_duty($database, $id);
    if (!$statement->rowCount()) {
        if ((string) $updated['status'] !== 'approved') api_error('รายการนี้ยังไม่ได้รับอนุมัติ หรือสถานะเปลี่ยนไปแล้ว กรุณารีเฟรช', 409, 'stage_conflict');
        if (empty($updated['secretary_completed_at'])) api_error('บันทึกสถานะไม่สำเร็จ กรุณาลองใหม่', 409, 'completion_failed');
    }
    api_respond(['status' => 'success', 'data' => duty_payload($updated)]);
}

if (in_array($action, ['acknowledge_secretary', 'review', 'approve_deputy', 'approve_director', 'reject'], true)) {
    $id = (string) ($input['dutyId'] ?? '');
    $duty = pending_request_processing_lock($database,'official_duty',$id,$input);
    $expectedStage = $action === 'acknowledge_secretary' ? 'secretary_ack' : ($action === 'review' ? 'admin_review'
        : ($action === 'approve_deputy' ? 'deputy_approval'
        : ($action === 'approve_director' ? 'director_approval' : (string) ($input['stage'] ?? ''))));
    if ((string) $duty['status'] !== 'pending' || (string) $duty['current_stage'] !== $expectedStage) {
        api_error('ขั้นตอนของคำขอนี้เปลี่ยนไปแล้ว กรุณารีเฟรชข้อมูล', 409, 'stage_conflict');
    }
    if ((string) $currentUser['id'] !== ($dutyApprovers[$expectedStage] ?? '')) {
        api_error('รายการนี้ไม่ใช่ขั้นตอนลงนามของคุณ', 403, 'forbidden');
    }
    $signatureUrl = trim((string) ($input['signatureUrl'] ?? ''));
    if ($action === 'reject' && trim((string) ($input['comment'] ?? '')) === '') api_error('กรุณาระบุเหตุผลที่ตีกลับเอกสาร', 422, 'reject_reason_required');
    if ($expectedStage !== 'secretary_ack' && $signatureUrl === '') api_error('กรุณาลงลายมือชื่อก่อนบันทึกผล', 422, 'signature_required');
    $approval = [
        'approvedBy' => $currentUser['name'], 'approverRole' => $currentUser['position'] ?? '',
        'date' => date('Y-m-d'), 'comment' => trim((string) ($input['comment'] ?? '')),
        'status' => $action === 'reject' ? 'rejected' : 'approved', 'signatureUrl' => $signatureUrl,
    ];
    $column = $expectedStage === 'secretary_ack' ? 'secretary_ack' : ($expectedStage === 'admin_review' ? 'admin_review'
        : ($expectedStage === 'deputy_approval' ? 'deputy_approval' : 'director_approval'));

    if ($action === 'reject') {
        $returnStage = $expectedStage === 'secretary_ack' ? 'secretary_ack' : 'rejected';
        $statement = $database->prepare("UPDATE official_duty_requests SET $column = ?, status = 'rejected', current_stage = ? WHERE id = ?");
        $statement->execute([json_encode($approval, JSON_UNESCAPED_UNICODE), $returnStage, $id]);
        notify_duty_users($database, [(string) $duty['user_id']], 'คำขอไปราชการไม่ได้รับการอนุมัติ', [
            'เลขที่' => $id, 'เรื่อง' => $duty['title'], 'พิจารณาโดย' => $currentUser['name'],
            'เหตุผล' => $approval['comment'] ?: 'ไม่อนุมัติ/ส่งคืนแก้ไข',
        ], $id);
    } else {
        $nextStage = $action === 'acknowledge_secretary' || $action === 'review' ? 'deputy_approval'
            : ($action === 'approve_deputy' ? 'director_approval' : 'completed');
        $status = $action === 'approve_director' ? 'approved' : 'pending';
        $forwarded = 0;
        $scheduled = 0;
        $statement = $database->prepare(
            "UPDATE official_duty_requests SET $column = ?, current_stage = ?, status = ?, forwarded_to_academic = ?, substitute_scheduled = ? WHERE id = ?"
        );
        $exchangeNotifications = [];
        if ($action === 'approve_director') {
            $times = [1=>'08:30 - 09:20',2=>'09:20 - 10:10',3=>'10:20 - 11:10',4=>'11:10 - 12:00',5=>'13:00 - 13:50',6=>'13:50 - 14:40',7=>'14:40 - 15:30',8=>'15:30 - 16:20'];
            foreach (duty_json($duty['exchange_lessons'] ?? null) ?? [] as $lesson) {
                $q = $database->prepare("SELECT id, name FROM users WHERE id = ? AND status = 'active'");
                $q->execute([$lesson['substituteTeacherId']]); $teacher = $q->fetch();
                if (!$teacher) { $database->rollBack(); api_error('ครูผู้สอนแทนไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ', 409, 'exchange_teacher_unavailable'); }
                $conflict = $database->prepare('SELECT id FROM substitute_teachings WHERE teaching_date = ? AND period = ? AND (original_teacher_id IN (?, ?) OR substitute_teacher_id IN (?, ?)) LIMIT 1 FOR UPDATE');
                $conflict->execute([$lesson['date'],$lesson['period'],$duty['user_id'],$teacher['id'],$duty['user_id'],$teacher['id']]);
                if ($conflict->fetchColumn()) { $database->rollBack(); api_error('มีคาบสอนแทนซ้ำ กรุณาให้ผู้จัดตารางตรวจสอบก่อนอนุมัติ',409,'duplicate_lesson'); }
                $subId = 'SUB-' . date('Y') . '-' . strtoupper(bin2hex(random_bytes(4)));
                $insert = $database->prepare('INSERT INTO substitute_teachings (id, official_duty_id, original_teacher_id, original_teacher_name, substitute_teacher_id, substitute_teacher_name, teaching_date, period, teaching_time, grade_level, subject_code, subject_name, leave_reason, academic_year, semester, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                try {
                    $insert->execute([$subId,$id,$duty['user_id'],$duty['user_name'],$teacher['id'],$teacher['name'],$lesson['date'],$lesson['period'],$times[(int)$lesson['period']] ?? '',$lesson['gradeLevel'],$lesson['subjectCode'],$lesson['subjectName'],'ไปราชการ: '.$duty['title'],$duty['academic_year'],$duty['semester'],$duty['user_id']]);
                } catch (PDOException $e) {
                    if ($database->inTransaction()) $database->rollBack();
                    if ($e->getCode() === '23000') api_error('มีคาบสอนแทนซ้ำ กรุณาให้ผู้จัดตารางตรวจสอบก่อนอนุมัติ',409,'duplicate_lesson');
                    throw $e;
                }
                $fields = ['ครูประจำวิชา'=>$duty['user_name'],'วิชา'=>$lesson['subjectName'],'ห้อง'=>$lesson['gradeLevel'],'วันที่'=>$lesson['date'],'คาบ'=>(string)$lesson['period'],'ดำเนินการ'=>'กรุณารับทราบหรือปฏิเสธในระบบ'];
                $web = $database->prepare('INSERT INTO notifications (user_id, title, message, module, related_id) VALUES (?, ?, ?, ?, ?)');
                $web->execute([$teacher['id'],'มีคำขอสอนแทนจากการไปราชการ',implode(' • ',array_map(static fn($k,$v)=>$k.': '.$v,array_keys($fields),array_values($fields))),'substitute',$subId]);
                $exchangeNotifications[] = [(string)$teacher['id'], $fields];
            }
            if ($exchangeNotifications) $scheduled = 1;
        }
        $statement->execute([json_encode($approval, JSON_UNESCAPED_UNICODE), $nextStage, $status, $forwarded, $scheduled, $id]);

        if ($action === 'acknowledge_secretary' || $action === 'review') {
            $recipients = [duty_active_assignee(
                $database,
                $dutyApprovers['deputy_approval'],
                'รองผู้อำนวยการตรวจสอบและเสนอความเห็น'
            )];
            $title = 'มีคำขอไปราชการรอพิจารณา';
        } elseif ($action === 'approve_deputy') {
            $recipients = [duty_active_assignee(
                $database,
                $dutyApprovers['director_approval'],
                'ผู้อำนวยการอนุมัติคำสั่ง'
            )];
            $title = 'มีคำขอไปราชการรออนุมัติ';
        } else {
            // Notify the requester only; approved duties no longer enter the
            // substitute-scheduling queue.
            $recipients = [(string) $duty['user_id'], $dutyApprovers['secretary_ack']];
            $title = 'คำขอไปราชการได้รับการอนุมัติแล้ว';
        }
        notify_duty_users($database, $recipients, $title, [
            'เลขที่' => $id, 'ผู้ยื่น' => $duty['user_name'], 'เรื่อง' => $duty['title'],
            'วันที่' => $duty['start_date'] . ' ถึง ' . $duty['end_date'], 'ดำเนินการโดย' => $currentUser['name'],
        ], $id);
    }
    pending_request_processing_commit($database,'official_duty',$id);
    foreach ($exchangeNotifications ?? [] as [$teacherId, $fields]) {
        try { line_notify_linked_users($database, [$teacherId], 'มีคำขอสอนแทนจากการไปราชการ', $fields); } catch (Throwable $error) { error_log('Exchange LINE notification failed: ' . $error->getMessage()); }
    }
    api_respond(['status' => 'success', 'data' => duty_payload(find_duty($database, $id))]);
}

api_error('ไม่รู้จักคำสั่งที่ร้องขอ', 400, 'unknown_action');
