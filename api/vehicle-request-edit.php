<?php
declare(strict_types=1);

/** Validate an owner's replacement details before any write or notification. */
function vehicle_request_changes(array $booking, array $user, array $input, ?DateTimeImmutable $now = null): array
{
    $now = $now ?? new DateTimeImmutable('now', new DateTimeZone('Asia/Bangkok'));
    if ((string) $booking['user_id'] !== (string) $user['id']) {
        api_error('แก้ไขได้เฉพาะคำขอใช้รถของตนเอง', 403, 'forbidden');
    }
    if ((int) ($input['requestVersion'] ?? 0) !== (int) ($booking['request_version'] ?? 1)) {
        api_error('ข้อมูลคำขอเปลี่ยนแปลงแล้ว กรุณาโหลดใหม่ก่อนแก้ไข', 409, 'stale_booking');
    }
    $dateTime = static function (string $date, string $time) use ($now): ?DateTimeImmutable {
        $value = $date . ' ' . $time;
        $parsed = DateTimeImmutable::createFromFormat('!Y-m-d H:i', $value, $now->getTimezone());
        return $parsed && $parsed->format('Y-m-d H:i') === $value ? $parsed : null;
    };
    $originalStart = $dateTime((string) $booking['start_date'], substr((string) $booking['start_time'], 0, 5));
    if (!$originalStart || $originalStart <= $now || !in_array($booking['status'], ['pending', 'approved', 'rejected'], true)) {
        api_error('แก้ไขได้เฉพาะคำขอที่ยังไม่ถึงเวลาเดินทาง', 409, 'trip_started');
    }
    $changes = [];
    foreach (['destination' => 'destination', 'purpose' => 'purpose', 'approvalLetterNo' => 'approval_letter_no',
        'startDate' => 'start_date', 'startTime' => 'start_time', 'endDate' => 'end_date', 'endTime' => 'end_time'] as $key => $column) {
        if (isset($input[$key]) && !is_string($input[$key])) api_error('รูปแบบข้อมูลไม่ถูกต้อง', 422, 'validation_error');
        $changes[$column] = trim((string) ($input[$key] ?? ''));
        if ($key !== 'approvalLetterNo' && $changes[$column] === '') api_error('กรุณากรอกข้อมูลการขอใช้รถให้ครบถ้วน', 422, 'validation_error');
    }
    if (mb_strlen($changes['destination']) > 255 || mb_strlen($changes['approval_letter_no']) > 255 || strlen($changes['purpose']) > 30000) {
        api_error('ข้อความยาวเกินไป', 422, 'validation_error');
    }
    $start = $dateTime($changes['start_date'], $changes['start_time']);
    $end = $dateTime($changes['end_date'], $changes['end_time']);
    if (!$start || !$end || $start <= $now || $end <= $start) {
        api_error('กรุณาระบุวันเวลาเดินทางในอนาคต และเวลากลับหลังเวลาออกเดินทาง', 422, 'invalid_trip_dates');
    }
    $passengers = filter_var($input['passengerCount'] ?? null, FILTER_VALIDATE_INT);
    if ($passengers === false || $passengers < 1 || $passengers > 1000) api_error('กรุณาระบุจำนวนผู้โดยสาร 1–1,000 คน', 422, 'validation_error');
    $changes['passenger_count'] = $passengers;
    foreach (['teachersList' => 'teachers_list', 'studentsList' => 'students_list'] as $key => $column) {
        $list = $input[$key] ?? [];
        if (!is_array($list) || array_values($list) !== $list || count($list) > 1000) api_error('รายชื่อผู้ร่วมเดินทางไม่ถูกต้อง', 422, 'validation_error');
        foreach ($list as $name) if (!is_string($name) || trim($name) === '' || strlen($name) > 1500) api_error('รายชื่อผู้ร่วมเดินทางไม่ถูกต้อง', 422, 'validation_error');
        $changes[$column] = json_encode(array_values($list), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    }
    $listed = count($input['teachersList'] ?? []) + count($input['studentsList'] ?? []);
    if ($passengers < $listed || $passengers > $listed + 1) api_error('จำนวนผู้โดยสารไม่ตรงกับรายชื่อ', 422, 'validation_error');
    return $changes;
}

function vehicle_request_is_changed(array $booking, array $changes): bool
{
    foreach ($changes as $column => $value) {
        $old = $booking[$column] ?? '';
        if (in_array($column, ['start_time', 'end_time'], true)) $old = substr((string) $old, 0, 5);
        if (in_array($column, ['teachers_list', 'students_list'], true)) {
            if ((json_decode((string) $old, true) ?? []) !== json_decode((string) $value, true)) return true;
        } elseif ((string) $old !== (string) $value) return true;
    }
    return false;
}
