<?php
declare(strict_types=1);
// Isolated local MariaDB, actual route/helper and notifications stubbed; no live documents or LINE.
require __DIR__ . '/document-unsigned-correction.test.php';
require_once __DIR__ . '/../api/document-workflow-trash.php';
workflow_install_trash($db);
workflow_install_trash($db);
$insert->execute(['DOC-trash','Test plan','course_plan','Details','/api/document_workflows.php?download=DOC-trash','old.pdf',$oldStored,'teacher-A','Owner','pending',1,json_encode($pending),'2569','2',null,'original-batch',1,'2026-10-01 09:00:00']);
$beforeTrash=$get('DOC-trash');
$historyBefore=(int)$db->query('SELECT COUNT(*) FROM document_workflow_revisions')->fetchColumn();
revision_rejected(fn()=>workflow_change_deleted($db,['id'=>'unrelated-admin'],'DOC-trash',true,1,0),'forbidden');
revision_rejected(fn()=>workflow_change_deleted($db,$owner,'EO-returned',true,1,0),'forbidden');
revision_rejected(fn()=>workflow_change_deleted($db,$owner,'DOC-trash',true,2,0),'document_version_changed');
revision_rejected(fn()=>workflow_change_deleted($db,$owner,'DOC-wrong',true,4,0),'document_delete_locked');
$notices=[];
$deleted=correct_route($db,['id'=>'DOC-trash','fileVersion'=>1,'lifecycleVersion'=>0],'delete_submission');
revision_check($deleted->status===200 && $deleted->body['data']['deletedAt'] && $deleted->body['data']['lifecycleVersion']===1,'Delete route returns recoverable tombstone');
revision_check(count($notices)===1 && $notices[0]['users']===['signer-A'] && str_contains($notices[0]['message'],'ไม่ต้องลงนาม'),'Notify original first signer of cancellation');
revision_check(correct_route($db,['id'=>'DOC-trash','fileVersion'=>1,'lifecycleVersion'=>0],'delete_submission')->status===200 && count($notices)===1,'Delete retry does not notify again');
$afterTrash=$get('DOC-trash');
foreach($beforeTrash as $field=>$value) if(!in_array($field,['deleted_at','deleted_by','lifecycle_version'],true)) revision_check($afterTrash[$field]===$value,'Deletion altered original '.$field);
revision_check($afterTrash['deleted_by']==='teacher-A' && file_get_contents($root.'/teacher-A/'.$oldStored)==="%PDF-1.7\nOLD",'Original file remains for restoration');
revision_check((int)$db->query('SELECT COUNT(*) FROM document_workflow_revisions')->fetchColumn()===$historyBefore,'Deletion must not create misleading PDF revisions');
revision_rejected(fn()=>workflow_assert_live($afterTrash),'document_deleted');
revision_rejected(fn()=>workflow_resubmit($db,$owner,'DOC-trash',null,$key2,1,$root,$replace,$correction),'document_deleted');
// Verify the real workflow_get used by download/history/sign/reject denies a stale URL.
function workflow_allowed(array $item): bool { return true; }
$getBegin=strpos($api,'function workflow_get('); $getEnd=strpos($api,"if (defined('MMV_WORKFLOW_LIBRARY_ONLY'))",$getBegin);
eval(substr($api,$getBegin,$getEnd-$getBegin));
try { workflow_get($db,'DOC-trash');throw new RuntimeException('Deleted URL opened'); }
catch(CorrectionResponse $response){revision_check($response->status===410 && $response->body['code']==='document_deleted','Old download/sign URLs must be closed');}
$restored=correct_route($db,['id'=>'DOC-trash','fileVersion'=>1,'lifecycleVersion'=>1],'restore_submission');
revision_check($restored->status===200 && !$restored->body['data']['deletedAt'] && $restored->body['data']['lifecycleVersion']===2,'Owner can restore the same submission');
revision_check(count($notices)===2 && str_contains($notices[1]['title'],'กลับคืน'),'Notify first signer after restoration');
correct_route($db,['id'=>'DOC-trash','fileVersion'=>1,'lifecycleVersion'=>1],'restore_submission');
revision_check(count($notices)===2,'Restore retry must not duplicate notifications');
revision_check(correct_route($db,['id'=>'DOC-trash','fileVersion'=>1,'lifecycleVersion'=>0],'delete_submission')->status===409,'Old deletion retry cannot delete a restored document');
revision_check(workflow_get($db,'DOC-trash')['id']==='DOC-trash','Restored document opens again');
revision_check((int)$db->query("SELECT COUNT(*) FROM document_workflow_trash_events WHERE workflow_id='DOC-trash'")->fetchColumn()===2,'Keep who/when delete and restore history');
// A signer wins the row before a stale sender deletion arrives, including inconsistent status/step.
$db->prepare("UPDATE document_workflows SET signers_json=? WHERE id='DOC-trash'")->execute([json_encode($signed)]);
revision_rejected(fn()=>workflow_change_deleted($db,$owner,'DOC-trash',true,1,2),'document_delete_locked');
revision_check(!$get('DOC-trash')['deleted_at'],'Signature race must not hide a signed document');
// Run the actual owner-only trash list route with a second sender's tombstone.
$db->prepare("UPDATE document_workflows SET signers_json=? WHERE id='DOC-trash'")->execute([json_encode($pending)]);
workflow_change_deleted($db,$owner,'DOC-trash',true,1,2);
$insert->execute(['DOC-other-trash','Private','other','Private','/api/document_workflows.php?download=DOC-other-trash','old.pdf',$oldStored,'other-owner','Other','pending',1,json_encode($pending),'2569','2',null,'another-batch',1,'2026-10-01 09:00:00']);
workflow_change_deleted($db,['id'=>'other-owner'],'DOC-other-trash',true,1,0);
$_GET=['trash'=>'1']; $user=$owner;
$getStart=strpos($api,"if ((\$_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {"); $getStop=strpos($api,"require_method('POST');",$getStart);
try { eval(substr($api,$getStart,$getStop-$getStart));throw new RuntimeException('Missing list response'); }
catch(CorrectionResponse $response){revision_check(array_column($response->body['data'],'id')===['DOC-trash'],'Trash list leaks other teachers documents');}
$_GET=[];
try { eval(substr($api,$getStart,$getStop-$getStart));throw new RuntimeException('Missing active list response'); }
catch(CorrectionResponse $response){revision_check(!in_array('DOC-trash',array_column($response->body['data'],'id'),true) && !in_array('DOC-other-trash',array_column($response->body['data'],'id'),true),'Active list/report must exclude tombstones');}
echo "PASS: unsigned delete/restore, owner/EO/signed/version/race guards, original files/history, closed URLs, personal trash, active reports, retry generations and notifications\n";
