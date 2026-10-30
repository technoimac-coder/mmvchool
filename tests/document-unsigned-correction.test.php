<?php
declare(strict_types=1);
// Uses the isolated local MariaDB fixture; never contacts production or LINE.
require __DIR__ . '/document-resubmission.test.php';
$pending = [['userId'=>'signer-A','userName'=>'First','step'=>1,'status'=>'pending'],
    ['userId'=>'signer-B','userName'=>'Second','step'=>2,'status'=>'pending']];
$insert->execute(['DOC-wrong','Wrong title','lesson_plan_before','Details','/api/document_workflows.php?download=DOC-wrong','old.pdf',$oldStored,'teacher-A','Owner','pending',1,json_encode($pending),'2569','2',null,'original-batch',1,'2026-10-01 09:00:00']);
$original=$get('DOC-wrong');
$correction=['title'=>'Course plan','topic'=>'course_plan','description'=>'Correct category'];
$result=workflow_resubmit($db,$owner,'DOC-wrong',null,$key1,1,$root,$replace,$correction);
$corrected=$result['row'];
revision_check($result['changed'] && $corrected['topic']==='course_plan' && $corrected['title']==='Course plan','Change wrong topic without reupload');
foreach(['id','created_by','created_at','academic_year','semester','batch_id','batch_notified','file_name','stored_name','file_url'] as $field)revision_check($corrected[$field]===$original[$field],'Preserve original '.$field);
revision_check((int)$corrected['file_version']===2 && $corrected['current_step']==1 && $corrected['status']==='pending','Versioned edit remains at first signer');
$archived=$db->query("SELECT snapshot_json FROM document_workflow_revisions WHERE workflow_id='DOC-wrong' AND version=1")->fetchColumn();
revision_check(json_decode($archived,true)===$original,'Archive previous category and original file');
revision_rejected(fn()=>workflow_resubmit($db,$owner,'DOC-wrong',null,$key2,1,$root,$replace,$correction),'document_version_changed');
$count=(int)$db->query("SELECT COUNT(*) FROM document_workflow_revisions WHERE workflow_id='DOC-wrong'")->fetchColumn();
revision_check(!workflow_resubmit($db,$owner,'DOC-wrong',null,$key2,2,$root,$replace,$correction)['changed'],'Unchanged save is a no-op');
revision_check((int)$db->query("SELECT COUNT(*) FROM document_workflow_revisions WHERE workflow_id='DOC-wrong'")->fetchColumn()===$count,'No-op does not archive/notify again');
revision_check(!workflow_resubmit($db,$owner,'DOC-wrong',null,$key1,1,$root,$replace,$correction)['changed'],'Lost-response retry is idempotent');
revision_rejected(fn()=>workflow_resubmit($db,['id'=>'other'],'DOC-wrong',null,$key2,2,$root,$replace,$correction),'forbidden');
revision_rejected(fn()=>workflow_resubmit($db,$owner,'EO-returned',null,$key2,1,$root,$replace,$correction),'forbidden');
revision_rejected(fn()=>workflow_resubmit($db,$owner,'DOC-wrong',null,$key2,2,$root,$replace,['title'=>'X','topic'=>'invalid']),'invalid_metadata');
$research=['title'=>'Research','topic'=>'classroom_research','description'=>'Replaced PDF'];
$result=workflow_resubmit($db,$owner,'DOC-wrong',$file,$key2,2,$root,$replace,$research);
revision_check($result['row']['fiscal_year']==='2570' && $result['row']['topic']==='classroom_research','Recalculate fiscal year from existing period');
revision_check($result['row']['file_name']==='revised.pdf' && $result['row']['stored_name']!==$oldStored,'Wrong PDF replaced');
revision_check(file_get_contents($root.'/teacher-A/'.$oldStored)==="%PDF-1.7\nOLD",'Preserve original PDF');
$signed=$pending; $signed[0]['status']='signed'; $signed[0]['signatureData']='signature';
$db->prepare("UPDATE document_workflows SET signers_json=?,current_step=2,status='in_review' WHERE id='DOC-wrong'")->execute([json_encode($signed)]);
$beforeLocked=$get('DOC-wrong');
revision_rejected(fn()=>workflow_resubmit($db,$owner,'DOC-wrong',null,'33333333-3333-4333-8333-333333333333',3,$root,$replace,$correction),'document_edit_locked');
revision_check($get('DOC-wrong')===$beforeLocked,'First signature prevents metadata/file replacement');
// A stale browser cannot claim that nobody signed. Even inconsistent step/status must lock.
foreach([
 ['status'=>'pending','current_step'=>1,'signers_json'=>json_encode($signed)],
 ['status'=>'pending','current_step'=>1,'signers_json'=>json_encode([array_merge($pending[0],['signedAt'=>'2026-10-30']),$pending[1]])],
 ['status'=>'completed','current_step'=>1,'signers_json'=>json_encode($pending)],
] as $row)revision_rejected(fn()=>workflow_assert_unsigned($row),'document_edit_locked');
workflow_assert_unsigned(['status'=>'pending','currentStep'=>1,'signers'=>$pending]);
workflow_assert_unsigned(['status'=>'rejected','currentStep'=>1,'signers'=>[array_merge($pending[0],['status'=>'rejected']),$pending[1]]]);

// Exercise the real public correction/legacy route including its notification decision.
class CorrectionResponse extends RuntimeException { public function __construct(public array $body,public int $status=200){parent::__construct('response');} }
function api_error(string $message,int $status,string $code): never { throw new CorrectionResponse(['code'=>$code],$status); }
function api_respond(array $body,int $status=200): never { throw new CorrectionResponse($body,$status); }
$notices=[];
function workflow_notify(PDO $db,array $users,string $title,string $message,string $id):void { global $notices; $notices[]=compact('users','title','message','id'); }
$api=file_get_contents(__DIR__.'/../api/document_workflows.php');
$rowBegin=strpos($api,'function workflow_row('); $rowEnd=strpos($api,'function workflow_document_reviewer_ids(',$rowBegin);
eval(substr($api,$rowBegin,$rowEnd-$rowBegin));
$routeBegin=strpos($api,"\$id = (string) (\$input['id'] ?? '');");
$routeEnd=strpos($api,"if (!in_array(\$action, ['sign', 'reject'], true))",$routeBegin);
$route=substr($api,$routeBegin,$routeEnd-$routeBegin);
function correct_route(PDO $db,array $input,string $action='correct_submission'):CorrectionResponse {
    global $route,$owner; $user=$owner; $_FILES=[];
    try {eval($route);throw new RuntimeException('Missing response');}catch(CorrectionResponse $response){return $response;}
}
$db->prepare("UPDATE document_workflows SET signers_json=?,current_step=1,status='pending' WHERE id='DOC-wrong'")->execute([json_encode($pending)]);
$routeInput=['id'=>'DOC-wrong','title'=>'Final course plan','topic'=>'course_plan','description'=>'Final','fileVersion'=>3,'clientRequestId'=>'44444444-4444-4444-8444-444444444444'];
revision_check(correct_route($db,$routeInput)->status===200 && count($notices)===1,'Correction route sends one notice');
revision_check($notices[0]['users']===['signer-A'] && $notices[0]['id']==='DOC-wrong' && str_contains($notices[0]['message'],'revised.pdf'),'Notify original first signer for same document and updated file');
correct_route($db,$routeInput); revision_check(count($notices)===1,'Retry does not duplicate notification');
$db->prepare("UPDATE document_workflows SET signers_json=?,current_step=2,status='in_review' WHERE id='DOC-wrong'")->execute([json_encode($signed)]);
$legacy=correct_route($db,['id'=>'DOC-wrong','title'=>'Bypass','description'=>'','fileVersion'=>4],'update_metadata');
revision_check($legacy->body['code']==='document_edit_locked' && count($notices)===1,'Legacy metadata action cannot bypass signed lock');
$firstReturned=[array_merge($pending[0],['status'=>'rejected','comment'=>'Wrong category']),$pending[1]];
$insert->execute(['DOC-first-return','Wrong','lesson_plan_before','Details','/api/document_workflows.php?download=DOC-first-return','old.pdf',$oldStored,'teacher-A','Owner','rejected',1,json_encode($firstReturned),'2569','2',null,'original-batch',1,'2026-10-01 09:00:00']);
$returnedCorrection=workflow_resubmit($db,$owner,'DOC-first-return',null,$key1,1,$root,$replace,$correction);
revision_check($returnedCorrection['row']['topic']==='course_plan' && $returnedCorrection['row']['status']==='pending','First-step return with zero signatures can correct category and restart');
echo "Unsigned correction integration: category/file replacement, version/history/period, signed lock, old-client bypass, retry and notification passed.\n";
