<?php
declare(strict_types=1);
require_once __DIR__.'/db.php';
require_once __DIR__.'/line-delivery-admin.php';
$operator=require_roles('admin','director');
$db=require_database();
line_outbox_install($db);
if (($_SERVER['REQUEST_METHOD']??'GET')==='POST') {
    require_csrf();$input=json_body();
    if (($input['action']??'')!=='retry') api_error('ไม่รู้จักคำสั่ง',400,'unknown_action');
    if (line_notification_config()['token']==='') api_error('ยังไม่ได้ตั้งค่า LINE OA บนเซิร์ฟเวอร์',503,'line_not_configured');
    try {$ids=line_delivery_retry($db,(string)($input['id']??''),(int)($input['attempts']??-1));}
    catch(LineDeliveryError $exception){api_error($exception->getMessage(),409,'line_retry_unavailable');}
    line_outbox_schedule($db,$ids);
    api_respond(['status'=>'success','message'=>'นำรายการเข้าคิวส่งซ้ำแล้ว']);
}
require_method('GET');
$search=mb_substr(trim((string)($_GET['search']??'')),0,100);
$status=(string)($_GET['status']??'all');
if (!in_array($status,['all','sent','pending','failed','cancelled'],true)) api_error('ตัวกรองไม่ถูกต้อง',422,'invalid_filter');
$page=max(1,min(10000,(int)($_GET['page']??1)));$offset=($page-1)*20;
$where="o.created_at>=DATE_SUB(NOW(),INTERVAL 7 DAY)";$params=[];
if ($status==='pending') $where.=" AND o.status IN ('pending','sending')";
elseif ($status!=='all') {$where.=' AND o.status=?';$params[]=$status;}
if ($search!=='') {$where.=' AND (u.name LIKE ? OR o.user_id LIKE ? OR o.title LIKE ? OR o.subject LIKE ?)';array_push($params,'%'.$search.'%','%'.$search.'%','%'.$search.'%','%'.$search.'%');}
$count=$db->prepare("SELECT COUNT(*) FROM line_notification_outbox o LEFT JOIN users u ON BINARY u.id=BINARY o.user_id WHERE {$where}");$count->execute($params);
$total=(int)$count->fetchColumn();
$query=$db->prepare("SELECT o.id,o.user_id,u.name,o.title,o.subject,o.module,o.status,o.attempts,o.retry_round,o.created_at,o.sent_at,o.next_attempt_at,o.last_attempt_at,o.last_http_status,o.last_error,TIMESTAMPDIFF(SECOND,o.created_at,NOW()) AS age_seconds FROM line_notification_outbox o LEFT JOIN users u ON BINARY u.id=BINARY o.user_id WHERE {$where} ORDER BY o.created_at DESC,o.id DESC LIMIT 20 OFFSET {$offset}");
$query->execute($params);
$jobs=array_map(static function(array $row):array {
    return ['id'=>$row['id'],'userId'=>$row['user_id'],'userName'=>$row['name']?:$row['user_id'],'title'=>$row['title'],'subject'=>$row['subject'],'module'=>$row['module'],'status'=>$row['status'],'attempts'=>(int)$row['attempts'],'createdAt'=>$row['created_at'],'acceptedAt'=>$row['sent_at'],'nextAttemptAt'=>$row['next_attempt_at'],'lastAttemptAt'=>$row['last_attempt_at'],'reason'=>line_delivery_reason($row),'canRetry'=>line_delivery_retry_allowed($row)];
},$query->fetchAll(PDO::FETCH_ASSOC));
$summary=['sent'=>0,'pending'=>0,'failed'=>0,'cancelled'=>0];
foreach($db->query("SELECT status,COUNT(*) AS total FROM line_notification_outbox WHERE created_at>=DATE_SUB(NOW(),INTERVAL 7 DAY) GROUP BY status")->fetchAll(PDO::FETCH_ASSOC) as $row){$key=$row['status']==='sending'?'pending':$row['status'];if(isset($summary[$key]))$summary[$key]+=(int)$row['total'];}
$accounts=$db->query("SELECT u.id,u.name,la.linked_at,CASE WHEN la.user_id IS NULL THEN 0 ELSE 1 END AS linked,s.accepted_at FROM users u LEFT JOIN line_accounts la ON BINARY la.user_id=BINARY u.id AND la.status='active' LEFT JOIN (SELECT user_id,MAX(sent_at) AS accepted_at FROM line_notification_outbox WHERE status='sent' GROUP BY user_id) s ON BINARY s.user_id=BINARY u.id WHERE u.status='active' ORDER BY u.id")->fetchAll(PDO::FETCH_ASSOC);
$accounts=array_map(static fn(array $row):array=>['id'=>$row['id'],'name'=>$row['name'],'linked'=>(bool)$row['linked'],'linkedAt'=>$row['linked_at'],'lastAcceptedAt'=>$row['accepted_at']],$accounts);
$worker=$db->query("SELECT started_at,finished_at,last_error,TIMESTAMPDIFF(SECOND,GREATEST(COALESCE(started_at,'2000-01-01'),COALESCE(finished_at,'2000-01-01')),NOW()) AS age FROM line_delivery_worker_state WHERE id=1")->fetch(PDO::FETCH_ASSOC);
api_respond(['status'=>'success','jobs'=>$jobs,'total'=>$total,'page'=>$page,'summary'=>$summary,'accounts'=>$accounts,'worker'=>['lastRunAt'=>$worker['finished_at']??null,'healthy'=>$worker && (int)$worker['age']<180 && $worker['last_error']===''],'configured'=>line_notification_config()['token']!=='']);
