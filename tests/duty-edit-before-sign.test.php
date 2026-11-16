<?php
declare(strict_types=1);
require_once __DIR__ . '/../api/pending-request-edit.php';

function checkDuty(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
}
$pending = ['status'=>'pending', 'current_stage'=>'secretary_ack'];
checkDuty(pending_request_editable('official_duty', $pending), 'New request must be editable');
$acknowledged = ['status'=>'pending', 'current_stage'=>'deputy_approval', 'secretary_ack'=>'{"status":"approved"}', 'first_action_at'=>'2026-11-16 10:00:00'];
checkDuty(pending_request_editable('official_duty', $acknowledged), 'Secretary acknowledgement must not lock the request');
foreach (['admin_review', 'deputy_approval', 'director_approval'] as $field) {
    checkDuty(!pending_request_editable('official_duty', $acknowledged + [$field => '{"status":"approved"}']), "$field must lock the request");
}
checkDuty(!pending_request_editable('official_duty', array_replace($acknowledged, ['status'=>'approved'])), 'Completed request must stay locked');
checkDuty(!pending_request_editable('official_duty', array_replace($acknowledged, ['current_stage'=>'director_approval'])), 'Director stage must stay locked');
echo "PASS: duty edits allowed before signer action and locked afterwards\n";
