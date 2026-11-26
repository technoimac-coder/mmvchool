<?php
declare(strict_types=1);

function sick_notice_endpoint(PDO $database, array $user, string $method, string $secretaryId): never
{
    $isSecretary = (string) $user['id'] === $secretaryId;
    if ($method !== 'GET') {
        require_method('POST');
        require_csrf();
        if (!$isSecretary) api_error('เฉพาะเลขานุการที่บันทึกรับแจ้งลาป่วยได้', 403, 'forbidden');
    }

    $database->exec("CREATE TABLE IF NOT EXISTS sick_leave_notices (
        user_id varchar(64) NOT NULL,
        notice_date date NOT NULL,
        recorded_by varchar(64) NOT NULL,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, notice_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    if ($method === 'POST') {
        $input = json_body();
        $userId = trim((string) ($input['userId'] ?? ''));
        $start = (string) ($input['startDate'] ?? '');
        $end = (string) ($input['endDate'] ?? '');
        $first = DateTimeImmutable::createFromFormat('!Y-m-d', $start);
        $last = DateTimeImmutable::createFromFormat('!Y-m-d', $end);
        if (!$first || !$last || $first->format('Y-m-d') !== $start || $last->format('Y-m-d') !== $end
            || $first > $last || $first->diff($last)->days > 365) {
            api_error('กรุณาระบุช่วงวันที่ให้ถูกต้องและไม่เกิน 366 วัน', 422, 'invalid_notice_dates');
        }
        $lookup = $database->prepare("SELECT id FROM users WHERE id = ? AND status = 'active'");
        $lookup->execute([$userId]);
        if (!$lookup->fetchColumn()) api_error('ไม่พบบัญชีบุคลากรที่ใช้งานอยู่', 422, 'invalid_notice_user');
        $dates = [];
        for ($day = $first; $day <= $last; $day = $day->modify('+1 day')) {
            if ((int) $day->format('N') <= 5) $dates[] = $day->format('Y-m-d');
        }
        if (!$dates) api_error('ช่วงที่เลือกไม่มีวันทำการ', 422, 'empty_notice_dates');
        $values = implode(',', array_fill(0, count($dates), '(?, ?, ?)'));
        $params = [];
        foreach ($dates as $date) array_push($params, $userId, $date, (string) $user['id']);
        $database->prepare("INSERT INTO sick_leave_notices (user_id, notice_date, recorded_by) VALUES $values
            ON DUPLICATE KEY UPDATE notice_date = VALUES(notice_date)")->execute($params);
        api_respond(['status' => 'success'], 201);
    }

    $sql = "SELECT n.user_id, n.notice_date, u.name AS user_name, l.id AS leave_id, l.leave_schedule
        FROM sick_leave_notices n JOIN users u ON BINARY u.id = BINARY n.user_id
        LEFT JOIN leave_requests l ON BINARY l.user_id = BINARY n.user_id AND l.leave_type = 'sick'
            AND l.status IN ('pending','approved') AND l.deleted_at IS NULL
            AND n.notice_date BETWEEN l.start_date AND l.end_date";
    if (!$isSecretary) $sql .= ' WHERE n.user_id = ?';
    $statement = $database->prepare($sql . ' ORDER BY n.notice_date DESC, n.user_id, l.created_at');
    $statement->execute($isSecretary ? [] : [(string) $user['id']]);
    $notices = [];
    while ($row = $statement->fetch(PDO::FETCH_ASSOC)) {
        $key = $row['user_id'] . ':' . $row['notice_date'];
        $notices[$key] ??= ['userId' => $row['user_id'], 'userName' => $row['user_name'],
            'date' => $row['notice_date'], 'leaveId' => null];
        if (!$row['leave_id'] || $notices[$key]['leaveId']) continue;
        $schedule = leave_json($row['leave_schedule']);
        if (!$schedule) {
            $notices[$key]['leaveId'] = $row['leave_id'];
            continue;
        }
        foreach ($schedule as $day) {
            if (($day['date'] ?? '') === $row['notice_date'] && in_array($day['period'] ?? '', ['full','morning','afternoon'], true)) {
                $notices[$key]['leaveId'] = $row['leave_id'];
                break;
            }
        }
    }
    api_respond(['status' => 'success', 'data' => array_values($notices)]);
}
