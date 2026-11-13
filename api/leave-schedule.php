<?php
declare(strict_types=1);

/** Validate explicit dates and derive the total on the server. */
function leave_schedule_validate(mixed $schedule, string $start, string $end): array {
    $first = DateTimeImmutable::createFromFormat('!Y-m-d', $start, new DateTimeZone('UTC'));
    $last = DateTimeImmutable::createFromFormat('!Y-m-d', $end, new DateTimeZone('UTC'));
    if (!$first || !$last || $first->format('Y-m-d') !== $start || $last->format('Y-m-d') !== $end || $last < $first || $first->diff($last)->days >= 366)
        throw new InvalidArgumentException('ช่วงวันที่ลาไม่ถูกต้อง');
    if (!is_array($schedule) || array_values($schedule) !== $schedule || count($schedule) !== $first->diff($last)->days + 1)
        throw new InvalidArgumentException('กรุณาระบุช่วงเวลาลาให้ครบทุกวัน');
    $total = 0.0;
    foreach ($schedule as $index => $entry) {
        $date = $first->modify('+' . $index . ' days');
        if (!is_array($entry) || ($entry['date'] ?? '') !== $date->format('Y-m-d') || !in_array($entry['period'] ?? '', ['none', 'full', 'morning', 'afternoon'], true))
            throw new InvalidArgumentException('ข้อมูลช่วงเวลาลาไม่ถูกต้อง');
        $period = $entry['period'];
        if ((int)$date->format('N') >= 6 && $period !== 'none') throw new InvalidArgumentException('วันเสาร์–อาทิตย์ไม่นับวันลา');
        $total += $period === 'full' ? 1 : (in_array($period, ['morning', 'afternoon'], true) ? 0.5 : 0);
    }
    if ($total < 0.5) throw new InvalidArgumentException('กรุณาเลือกวันลาอย่างน้อยครึ่งวัน');
    return ['days' => $schedule, 'total' => $total];
}
