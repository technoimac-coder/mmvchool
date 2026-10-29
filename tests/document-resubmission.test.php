<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/../api/document-workflow-revisions.php';
function revision_check(bool $passed, string $message): void { if (!$passed) throw new RuntimeException($message); }
function revision_rejected(callable $action, string $code): void {
    try { $action(); throw new RuntimeException('Expected failure ' . $code); }
    catch (WorkflowRevisionError $exception) { revision_check($exception->errorCode === $code, 'Unexpected failure ' . $exception->errorCode); }
}
foreach ([1,2] as $version) workflow_assert_file_version(['file_version'=>$version], $version);
revision_rejected(static fn() => workflow_assert_file_version(['fileVersion'=>2], 1), 'document_version_changed');

$db = new PDO('mysql:host=127.0.0.1;port=43317;charset=utf8mb4', 'root', '', [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$name = 'mmv_revision_test_' . bin2hex(random_bytes(4));
$db->exec("CREATE DATABASE {$name} CHARACTER SET utf8mb4");
$db->exec("USE {$name}");
$db->exec("CREATE TABLE users (id varchar(20) PRIMARY KEY,status varchar(20)) ENGINE=InnoDB");
$db->exec("INSERT INTO users VALUES ('signer-A','active'),('signer-B','active')");
$db->exec("CREATE TABLE document_workflows (
 id varchar(64) PRIMARY KEY,title varchar(255),topic varchar(30),description text,file_url varchar(500),file_name varchar(255),
 stored_name varchar(100),created_by varchar(20),created_by_name varchar(255),status varchar(20),current_step int,signers_json longtext,
 academic_year varchar(10),semester varchar(2),fiscal_year varchar(5),batch_id varchar(64),batch_notified tinyint,created_at datetime
) ENGINE=InnoDB");
workflow_install_revisions($db);
workflow_install_revisions($db);
$root = sys_get_temp_dir() . '/mmv-revisions-' . bin2hex(random_bytes(5));
mkdir($root . '/teacher-A', 0755, true);
$oldStored = str_repeat('a',24) . '.pdf';
file_put_contents($root . '/teacher-A/' . $oldStored, "%PDF-1.7\nOLD");
$tmp = $root . '/new-upload.pdf'; file_put_contents($tmp, "%PDF-1.7\nREVISED");
$file = ['name'=>'revised.pdf','tmp_name'=>$tmp,'size'=>filesize($tmp),'error'=>UPLOAD_ERR_OK];
$signers = [
 ['userId'=>'signer-A','userName'=>'First','step'=>1,'status'=>'signed','signatureData'=>'old-signature','placement'=>['page'=>1],'signedAt'=>'2026-10-28'],
 ['userId'=>'signer-B','userName'=>'Second','step'=>2,'status'=>'rejected','comment'=>'Please revise','commentImage'=>'old-image']
];
$insert = $db->prepare('INSERT INTO document_workflows (id,title,topic,description,file_url,file_name,stored_name,created_by,created_by_name,status,current_step,signers_json,academic_year,semester,fiscal_year,batch_id,batch_notified,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
foreach ([['DOC-returned','rejected'],['DOC-pending','pending'],['DOC-complete','completed'],['EO-returned','rejected'],['DOC-failed','rejected']] as [$id,$status]) {
 $insert->execute([$id,'Original title','classroom_research','Original details','/api/document_workflows.php?download='.$id,'old.pdf',$oldStored,'teacher-A','Owner',$status,2,json_encode($signers),'2569','2','2570','original-batch',1,'2026-10-28 10:52:00']);
}
$get = static function(string $id) use ($db):array { $q=$db->prepare('SELECT * FROM document_workflows WHERE id=?');$q->execute([$id]);return $q->fetch(PDO::FETCH_ASSOC); };
$key1='bdab1000-8326-4ac6-92d2-d77ec0001111';
$key2='bdab1000-8326-4ac6-92d2-d77ec0001112';
$owner=['id'=>'teacher-A'];
$replace=static fn($source,$target)=>copy($source,$target);
revision_rejected(fn()=>workflow_resubmit($db,['id'=>'unrelated-admin'],'DOC-returned',$file,$key1,1,$root,$replace),'forbidden');
revision_rejected(fn()=>workflow_resubmit($db,$owner,'EO-returned',$file,$key1,1,$root,$replace),'forbidden');
foreach (['DOC-pending','DOC-complete'] as $id) revision_rejected(fn()=>workflow_resubmit($db,$owner,$id,$file,$key1,1,$root,$replace),'document_not_returned');
revision_rejected(fn()=>workflow_resubmit($db,$owner,'DOC-returned',null,$key1,1,$root,$replace),'document_required');
revision_rejected(fn()=>workflow_resubmit($db,$owner,'DOC-returned',$file,'',1,$root,$replace),'invalid_request_id');
$bad=$file;$bad['name']='bad.docx';
revision_rejected(fn()=>workflow_resubmit($db,$owner,'DOC-returned',$bad,$key1,1,$root,$replace),'unsupported_document');
file_put_contents($root.'/not-pdf.pdf','BAD FILE');$bad=$file;$bad['tmp_name']=$root.'/not-pdf.pdf';
revision_rejected(fn()=>workflow_resubmit($db,$owner,'DOC-returned',$bad,$key1,1,$root,$replace),'unsupported_document');
$before=$get('DOC-returned');
$result=workflow_resubmit($db,$owner,'DOC-returned',$file,$key1,1,$root,$replace);
revision_check($result['changed']===true,'First upload should change the existing submission');
$after=$result['row'];
revision_check(!empty($after['resubmitted_at']), 'New submission time must be stored independently');
foreach (['id','title','topic','description','file_url','created_by','created_by_name','academic_year','semester','fiscal_year','batch_id','batch_notified','created_at'] as $field) revision_check($before[$field]===$after[$field],'Original submission field changed: '.$field);
revision_check($after['status']==='pending'&&(int)$after['current_step']===1&&(int)$after['file_version']===2,'New version did not restart');
$reset=json_decode($after['signers_json'],true);
foreach ($reset as $index=>$signer) revision_check($signer===['userId'=>$signers[$index]['userId'],'userName'=>$signers[$index]['userName'],'step'=>$index+1,'status'=>'pending'],'Old signature or comment carried onto the new PDF');
$archive=$db->query("SELECT * FROM document_workflow_revisions WHERE workflow_id='DOC-returned'")->fetch(PDO::FETCH_ASSOC);
revision_check(json_decode($archive['snapshot_json'],true)===$before,'Archived submission history is incomplete');
revision_check(file_get_contents($root.'/teacher-A/'.$oldStored)==="%PDF-1.7\nOLD",'Original PDF changed');
revision_check(file_get_contents($root.'/teacher-A/'.$after['stored_name'])==="%PDF-1.7\nREVISED",'New PDF not saved');
$countFiles=count(glob($root.'/teacher-A/*.pdf'));
$retry=workflow_resubmit($db,$owner,'DOC-returned',$file,$key1,1,$root,$replace);
revision_check($retry['row']['resubmitted_at']===$after['resubmitted_at'], 'Retry changed submission time');
revision_check($retry['changed']===false&&count(glob($root.'/teacher-A/*.pdf'))===$countFiles,'Retry duplicated a version or upload');
revision_rejected(fn()=>workflow_resubmit($db,$owner,'DOC-returned',$file,$key2,1,$root,$replace),'document_version_changed');
revision_rejected(fn()=>workflow_assert_file_version($after,1),'document_version_changed');
revision_check((int)$db->query('SELECT COUNT(*) FROM document_workflows')->fetchColumn()===5,'Resubmission added a new document row');
revision_check((int)$db->query('SELECT COUNT(*) FROM document_workflow_revisions')->fetchColumn()===1,'Resubmission duplicated history');
try {
 workflow_resubmit($db,$owner,'DOC-failed',$file,$key2,1,$root,static function($source,$target){copy($source,$target);throw new RuntimeException('Simulated storage failure');});
 throw new LogicException('Expected storage failure');
} catch (RuntimeException $exception) { revision_check($exception->getMessage()==='Simulated storage failure','Unexpected storage error'); }
revision_check($get('DOC-failed')['status']==='rejected'&&count(glob($root.'/teacher-A/*.pdf'))===$countFiles,'Failed upload changed history or leaked a file');
$db->exec("UPDATE document_workflows SET resubmitted_at=NULL WHERE id='DOC-returned'");
workflow_install_revisions($db);
$restored=$get('DOC-returned');
revision_check($restored['resubmitted_at']===$archive['replaced_at'], 'Legacy revision date not restored from history');
revision_check($restored['created_at']===$before['created_at'], 'Backfill changed original submission time');

echo "Resubmission integration: permissions, statuses, PDF validation, metadata preservation, archived signatures/files, restart, retries, stale signing and rollback passed\n";
