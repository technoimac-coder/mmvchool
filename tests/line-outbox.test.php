<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require_once __DIR__.'/../api/line-outbox.php';
function outbox_check(bool $ok,string $message):void {if(!$ok)throw new RuntimeException($message);}
$db=new PDO('mysql:host=127.0.0.1;port=43317;charset=utf8mb4','root','',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
$name='mmv_line_test_'.bin2hex(random_bytes(4));
$db->exec("CREATE DATABASE {$name} CHARACTER SET utf8mb4");
try {
 $db->exec("USE {$name}");
 $db->exec('CREATE TABLE document_workflows(id varchar(64) PRIMARY KEY,status varchar(20),file_version int,deleted_at datetime NULL,created_by varchar(20)) ENGINE=InnoDB');
 $db->exec('CREATE TABLE line_accounts(user_id varchar(20) PRIMARY KEY,line_user_id varchar(64),status varchar(20)) ENGINE=InnoDB');
 $db->exec("INSERT INTO line_accounts VALUES('teacher-test','synthetic-line-id','active')");
 line_outbox_install($db);line_outbox_install($db);
 $fields=['ชื่อไฟล์'=>'synthetic.pdf','ฉบับที่'=>'1'];
 $enqueue=static function(string $id)use($db,$fields):array{
    $q=$db->prepare('INSERT INTO document_workflows VALUES(?,?,1,NULL,?)');$q->execute([$id,'completed','teacher-test']);
    return line_outbox_enqueue_completion($db,['teacher-test'],'ลงนามเอกสารครบแล้ว',$fields,$id);
 };
 $get=static function($id)use($db){$q=$db->prepare('SELECT * FROM line_notification_outbox WHERE id=?');$q->execute([$id]);return $q->fetch(PDO::FETCH_ASSOC);};
 $due=static function($id)use($db){$q=$db->prepare('UPDATE line_notification_outbox SET next_attempt_at=DATE_SUB(NOW(),INTERVAL 1 SECOND) WHERE id=?');$q->execute([$id]);};
 $db->beginTransaction();$enqueue('DOC-rollback');$db->rollBack();
 outbox_check((int)$db->query('SELECT COUNT(*) FROM line_notification_outbox')->fetchColumn()===0,'Rollback must remove its queued notification');
 $db->beginTransaction();$jobs=$enqueue('DOC-retry');
 try{line_outbox_drain($db);throw new RuntimeException('Expected transaction guard');}catch(LogicException $e){}
 $db->commit();$id=$jobs[0];$calls=[];
 $sender=static function($endpoint,$payload,$token,$key)use(&$calls){$calls[]=[$payload,$key];return ['status'=>count($calls)===1?0:200,'error'=>'simulated_dns','acceptedId'=>''];};
 $counts=line_outbox_drain($db,1,$jobs,$sender);
 outbox_check($counts['pending']===1 && $get($id)['status']==='pending','DNS failure must persist across requests');
 line_outbox_drain($db,1,$jobs,$sender);
 outbox_check(count($calls)===1,'Do not retry until next attempt is due');
 $due($id);line_outbox_drain($db,1,$jobs,$sender);
 outbox_check($get($id)['status']==='sent' && (int)$get($id)['attempts']===2,'Later worker should deliver the queued completion');
 outbox_check($calls[0]===$calls[1] && $calls[0][1]===$id,'Keep original payload and retry UUID across workers');
 $again=line_outbox_enqueue_completion($db,['teacher-test'],'ลงนามเอกสารครบแล้ว',$fields,'DOC-retry');
 line_outbox_drain($db,1,$again,$sender);
 outbox_check($again===$jobs && count($calls)===2,'Duplicate enqueue/recovery must not resend an accepted message');
 foreach([['DOC-conflict',409,'accepted-before','sent'],['DOC-auth',401,'','failed'],['DOC-conflict-unconfirmed',409,'','failed']] as [$doc,$status,$acceptedId,$expected]){
    $ids=$enqueue($doc);
    line_outbox_drain($db,1,$ids,static fn()=>['status'=>$status,'error'=>'simulated','acceptedId'=>$acceptedId]);
    outbox_check($get($ids[0])['status']===$expected,'HTTP acceptance classification failed');
 }
 foreach(['deleted','version','owner','account','expired'] as $case){
    $doc='DOC-'.$case;$ids=$enqueue($doc);
    if($case==='deleted')$db->exec("UPDATE document_workflows SET deleted_at=NOW() WHERE id='{$doc}'");
    if($case==='version')$db->exec("UPDATE document_workflows SET file_version=2 WHERE id='{$doc}'");
    if($case==='owner')$db->exec("UPDATE document_workflows SET created_by='different' WHERE id='{$doc}'");
    if($case==='account')$db->exec("UPDATE line_accounts SET line_user_id='different'");
    if($case==='expired'){$q=$db->prepare('UPDATE line_notification_outbox SET created_at=DATE_SUB(NOW(),INTERVAL 23 HOUR) WHERE id=?');$q->execute([$ids[0]]);}
    line_outbox_drain($db,1,$ids,static function(){throw new RuntimeException('Must not attempt network');});
    outbox_check($get($ids[0])['status']=== (in_array($case,['account','expired'],true)?'failed':'cancelled'),'Stale/private document or account guard failed');
    $db->exec("UPDATE line_accounts SET line_user_id='synthetic-line-id'");
 }
 $ids=$enqueue('DOC-leased');$q=$db->prepare("UPDATE line_notification_outbox SET status='sending',lease_until=DATE_ADD(NOW(),INTERVAL 60 SECOND) WHERE id=?");$q->execute([$ids[0]]);
 outbox_check(array_sum(line_outbox_drain($db,1,$ids,$sender))===0,'Active lease must prevent concurrent dispatch');
 $q=$db->prepare('UPDATE line_notification_outbox SET lease_until=DATE_SUB(NOW(),INTERVAL 1 SECOND) WHERE id=?');$q->execute([$ids[0]]);
 line_outbox_drain($db,1,$ids,$sender);
 outbox_check($get($ids[0])['status']==='sent','Expired lease must recover a crashed worker');
 $ids=$enqueue('DOC-max-attempts');
 for($i=0;$i<8;$i++){$due($ids[0]);line_outbox_drain($db,1,$ids,static fn()=>['status'=>503,'error'=>'simulated','acceptedId'=>'']);}
 outbox_check($get($ids[0])['status']==='failed' && (int)$get($ids[0])['attempts']===8,'Bound retries to eight attempts');
 echo "PASS: atomic rollback, durable retry, due times, idempotency, HTTP outcomes, privacy/version guards, worker lease recovery and bounded retries\n";
}finally{if($db->inTransaction())$db->rollBack();$db->exec("DROP DATABASE {$name}");}
