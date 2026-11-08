<?php
declare(strict_types=1);

/** A separate completion notice for the current file/version, never the entire batch. */
function workflow_completion_notice(array $item, array $signers): array
{
    $fileName = trim((string) ($item['fileName'] ?? ''));
    $title = trim((string) ($item['title'] ?? ''));
    if ($fileName === '') $fileName = $title !== '' ? $title : 'เอกสาร';
    $version = max(1, (int) ($item['fileVersion'] ?? 1));
    $signed = count(array_filter($signers, static fn(array $signer): bool => ($signer['status'] ?? '') === 'signed'));
    $total = count($signers);
    return [
        'message' => 'ไฟล์: ' . $fileName . ' — ลงนามครบแล้ว (' . $signed . '/' . $total . ' คน)'
            . ($title !== '' ? ' — เรื่อง: ' . $title : '') . ' — ฉบับที่ ' . $version,
        'fields' => [
            'ชื่อไฟล์' => $fileName,
            'เรื่อง' => $title,
            'สถานะ' => 'ลงนามครบแล้ว',
            'ลงนามแล้ว' => $signed . ' / ' . $total . ' คน',
            'ฉบับที่' => (string) $version,
        ],
    ];
}
