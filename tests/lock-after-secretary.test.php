<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') exit(1);
$target = ($argv[1] ?? '') === 'public' ? 'public/api' : 'api';
require_once __DIR__ . '/../' . $target . '/pending-request-edit.php';
function checkLock(bool $ok, string $message): void { if (!$ok) throw new RuntimeException($message); }
foreach (['leave', 'official_duty'] as $module) {
    $before = ['status'=>'pending', 'current_stage'=>'secretary_ack'];
    checkLock(pending_request_editable($module, $before), "$module must be editable before acknowledgement");
    $ack = ['status'=>'pending', 'current_stage'=>'admin_review', 'secretary_ack'=>'{"status":"approved"}', 'first_action_at'=>'2026-11-16 10:00:00'];
    checkLock(!pending_request_editable($module, $ack), "$module must be locked after acknowledgement");
    checkLock(!pending_request_editable($module, array_replace($before, ['secretary_ack'=>'{"status":"approved"}'])), "$module must reject acknowledged records even with an old stage");
    checkLock(!pending_request_editable($module, array_replace($before, ['first_action_at'=>'2026-11-16 10:00:00'])), "$module must reject an action that has already started");
}
echo "PASS: $target locks leave and official duty after secretary acknowledgement\n";
