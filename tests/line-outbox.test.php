<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require_once __DIR__.'/../api/line-outbox.php';
require_once __DIR__.'/../api/line-delivery-admin.php';
function outbox_check(bool $ok,string $message):void {if(!$ok)throw new RuntimeException($message);}
$db=new PDO('mysql:host=127.0.0.1;port=43317;charset=utf8mb4','root','',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
$name='mmv_line_test_'.bin2hex(random_bytes(4));
$db->exec("CREATE DATABASE {$name} CHARACTER SET utf8mb4");
try {
 $db->exec("USE {$name}");
 $db->exec('CREATE TABLE document_workflows(id varchar(64) PRIMARY KEY,status varchar(20),file_version int,deleted_at datetime NULL,created_by varchar(20)) ENGINE=InnoDB');
 $db->exec('CREATE TABLE line_accounts(user_id varchar(20) PRIMARY KEY,line_user_id varchar(64),status varchar(20)) ENGINE=InnoDB');
 $db->exec('CREATE TABLE users(id varchar(20) PRIMARY KEY,name varchar(100),status varchar(20),role varchar(20)) ENGINE=InnoDB');
 $db->exec("INSERT INTO users VALUES ('teacher-test','Synthetic teacher','active','teacher'),('unlinked','Not linked','active','teacher'),('disabled','Inactive','inactive','teacher'),('admin-test','Admin','active','admin'),('director-test','Director','active','director')");
 $db->exec('CREATE TABLE notifications(id int AUTO_INCREMENT PRIMARY KEY,user_id varchar(20),title varchar(255),message text,module varchar(30),related_id varchar(80),created_at datetime) ENGINE=InnoDB');
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
 $retryIds=line_delivery_retry($db,$ids[0],8);
 try{line_delivery_retry($db,$ids[0],8);throw new LogicException('Expected stale retry guard');}catch(LineDeliveryError $expected){}
 line_outbox_drain($db,1,$retryIds,static fn()=>['status'=>200,'error'=>'','acceptedId'=>'']);
 outbox_check($get($ids[0])['status']==='sent' && (int)$get($ids[0])['attempts']===9,'Admin retry must retain total attempt count and permit the next round');
 try{line_delivery_retry($db,$ids[0],9);throw new LogicException('Expected already accepted guard');}catch(LineDeliveryError $expected){}
 $db->beginTransaction();$generic=line_outbox_enqueue_event($db,['teacher-test'],'มีเอกสารรอลงนาม',['เรื่อง'=>'synthetic']);$db->rollBack();
 outbox_check($get($generic[0])===false,'Other notification queues must roll back with their business event');
 foreach(['มีใบลารอลงนามขั้นถัดไป','คำขอใช้รถได้รับการอนุมัติ','ได้รับมอบหมายสอนแทน','e-Office: แจ้งหนังสือ','มีรายการแจ้งซ่อมใหม่รอตรวจสอบ'] as $title){
    $generic=line_outbox_enqueue_event($db,['teacher-test'],$title,['รายละเอียด'=>'synthetic']);
    line_outbox_drain($db,1,$generic,static fn()=>['status'=>200,'error'=>'','acceptedId'=>'']);
    outbox_check($get($generic[0])['kind']==='event' && $get($generic[0])['status']==='sent','Other school modules must use the durable queue');
 }
 $unlinked=line_outbox_enqueue_event($db,['unlinked','disabled'],'synthetic',['รายละเอียด'=>'synthetic']);
 outbox_check(count($unlinked)===1 && $get($unlinked[0])['last_error']==='account_not_linked','Record unlinked recipients without exposing or sending to inactive accounts');
 try{line_delivery_retry($db,$unlinked[0],0);throw new LogicException('Expected missing-link guard');}catch(LineDeliveryError $expected){}
 $db->exec("INSERT INTO line_accounts VALUES ('unlinked','synthetic-new-link','active')");
 line_delivery_retry($db,$unlinked[0],0);
 line_outbox_drain($db,1,$unlinked,static fn()=>['status'=>200,'error'=>'','acceptedId'=>'']);
 outbox_check($get($unlinked[0])['status']==='sent','A first send after linking may attach the newly verified recipient');
 $failedIds=$enqueue('DOC-expired-manual');$q=$db->prepare("UPDATE line_notification_outbox SET status='failed',created_at=DATE_SUB(NOW(),INTERVAL 24 HOUR) WHERE id=?");$q->execute([$failedIds[0]]);
 try{line_delivery_retry($db,$failedIds[0],0);throw new LogicException('Expected retry-window guard');}catch(LineDeliveryError $expected){}
 line_outbox_worker_state($db,false);line_outbox_worker_state($db,true);
 line_outbox_alert_admins($db);line_outbox_alert_admins($db);
 outbox_check((int)$db->query('SELECT COUNT(*) FROM notifications')->fetchColumn()===2,'Send one web-only failure alert per administrator, with cooldown');
 outbox_check((int)$db->query("SELECT COUNT(*) FROM notifications WHERE user_id='teacher-test'")->fetchColumn()===0,'Administrator failure alerts must not be broadcast to teachers');
 // Exercise the real report controller and bootstrap role/CSRF guards on fixture data.
 foreach(['position','academic_position','department','email','phone','avatar','organization','personnel_type','assigned_duties'] as $column)$db->exec("ALTER TABLE users ADD COLUMN {$column} varchar(255) DEFAULT ''");
 $db->exec('ALTER TABLE users ADD COLUMN must_change_password tinyint DEFAULT 0');
 $db->exec('ALTER TABLE line_accounts ADD COLUMN linked_at datetime DEFAULT NULL');
 $pdo=$db;
 $bootstrap=file_get_contents(__DIR__.'/../api/bootstrap.php');
 $start=strpos($bootstrap,'function require_csrf(');$end=strpos($bootstrap,'function is_executive_role(',$start);
 eval(substr($bootstrap,$start,$end-$start));
 $controller=file_get_contents(__DIR__.'/../api/line-delivery.php');$controller=substr($controller,strpos($controller,'$operator=require_roles'));
 $request=static function(string $userId,string $method='GET',array $filters=[],array $body=[])use($controller):array{
    global $pdo,$db,$testBody;$_SESSION=['user'=>['id'=>$userId],'csrf_token'=>'synthetic-csrf'];$_SERVER['REQUEST_METHOD']=$method;unset($_SERVER['HTTP_X_CSRF_TOKEN']);$_GET=$filters;$testBody=$body;
    try{eval($controller);throw new RuntimeException('Missing API response');}catch(LineReportResponse $result){return [$result->status,$result->body];}
 };
 outbox_check($request('teacher-test')[0]===403,'Ordinary teachers must not inspect other staff delivery data');
 outbox_check($request('admin-test','POST',[],['action'=>'retry','id'=>$ids[0]])[0]===403,'Retry must enforce the real CSRF check');
 [$code,$report]=$request('admin-test');
 outbox_check($code===200 && $report['summary']['sent']>0 && count($report['accounts'])===4,'Admin report must expose delivery counts and only active school accounts');
 $encoded=json_encode($report);
 outbox_check(!str_contains($encoded,'synthetic-line-id') && !str_contains($encoded,'payload_json') && !str_contains($encoded,'dedupe_key'),'Report must never return LINE identities or private payloads');
 [$code,$filtered]=$request('director-test','GET',['status'=>'sent','search'=>'Synthetic']);
 outbox_check($code===200 && $filtered['total']>0 && count(array_filter($filtered['jobs'],static fn($job)=>$job['status']!=='sent'))===0,'Director report filtering must be server-side');
 outbox_check($request('admin-test','GET',['status'=>'invalid'])[0]===422,'Validate report filters');
 echo "PASS: atomic rollback, durable retry, due times, idempotency, HTTP outcomes, privacy/version guards, worker lease recovery and bounded retries\n";
 echo "PASS: multiple modules, missing links, guarded manual retry, accepted-message protection, retry window and administrator alert deduplication\n";
 echo "PASS: real report SQL, role checks, CSRF protection, active accounts, filtering and private-data projection\n";
}finally{if($db->inTransaction())$db->rollBack();$db->exec("DROP DATABASE {$name}");}

class LineReportResponse extends RuntimeException { public function __construct(public int $status,public array $body){parent::__construct('Test API response');} }
function api_respond(array $body,int $status=200):never{throw new LineReportResponse($status,$body);}
function api_error(string $message,int $status,string $code):never{api_respond(['message'=>$message,'code'=>$code],$status);}
function require_database():PDO{return $GLOBALS['pdo'];}
function require_method(string ...$methods):void{if(!in_array($_SERVER['REQUEST_METHOD'], $methods,true))api_error('Unsupported',405,'method_not_allowed');}
function json_body():array{return $GLOBALS['testBody'];}
