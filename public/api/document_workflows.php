<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';
$db = require_database();
$user = require_user();
try {
  $db->exec("CREATE TABLE IF NOT EXISTS document_workflows (
 id varchar(64) PRIMARY KEY, title varchar(255) NOT NULL, topic varchar(30) NOT NULL, description text NOT NULL,
 file_url varchar(500) NOT NULL, file_name varchar(255) NOT NULL, created_by varchar(20) NOT NULL, created_by_name varchar(255) NOT NULL,
 status varchar(20) NOT NULL DEFAULT 'pending', current_step int NOT NULL DEFAULT 1, signers_json longtext NOT NULL,
 created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, KEY workflow_creator(created_by), KEY workflow_status(status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
} catch (Throwable $exception) {
  // Some production DB users can read/write the existing table but cannot CREATE.
  // Continue when the table is already present; otherwise return a useful error.
  try {
    $exists = $db->query("SHOW TABLES LIKE 'document_workflows'")->fetchColumn();
  } catch (Throwable $checkException) {
    $exists = false;
  }
  if (!$exists) api_error('ไม่สามารถเตรียมตารางเอกสารได้', 500, 'workflow_table_unavailable');
}
function workflow_row(array $row): array { $signers=json_decode((string)$row['signers_json'],true); return ['id'=>$row['id'],'title'=>$row['title'],'topic'=>$row['topic'],'description'=>$row['description'],'fileUrl'=>$row['file_url'],'fileName'=>$row['file_name'],'createdBy'=>$row['created_by'],'createdByName'=>$row['created_by_name'],'status'=>$row['status'],'currentStep'=>(int)$row['current_step'],'signers'=>is_array($signers)?$signers:[],'createdAt'=>$row['created_at']]; }
function workflow_get(PDO $db,string $id): array { $q=$db->prepare('SELECT * FROM document_workflows WHERE id=?');$q->execute([$id]);$r=$q->fetch();if(!$r)api_error('ไม่พบเอกสาร',404,'not_found');return workflow_row($r); }
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
  if (isset($_GET['download'])) { $q=$db->prepare('SELECT * FROM document_workflows WHERE id=?');$q->execute([(string)$_GET['download']]);$r=$q->fetch();if(!$r)api_error('ไม่พบเอกสาร',404,'not_found');$safe=preg_replace('/[^A-Za-z0-9_-]/','_',(string)$r['created_by']);$matches=glob(__DIR__.'/../uploads/workflows/'.$safe.'/*');$path='';foreach($matches?:[] as $candidate)if(is_file($candidate)){$path=$candidate;break;}if($path==='')api_error('ไม่พบไฟล์เอกสาร',404,'file_not_found');header('Content-Type: application/octet-stream');header('Content-Disposition: inline; filename="'.basename((string)$r['file_name']).'"');readfile($path);exit; }
  $rows=$db->query('SELECT * FROM document_workflows ORDER BY created_at DESC')->fetchAll(); api_respond(['status'=>'success','data'=>array_map('workflow_row',$rows)]);
}
require_method('POST'); require_csrf();
$input=$_POST; if (empty($input) && str_contains((string)($_SERVER['CONTENT_TYPE']??''),'application/json')) $input=json_body();
$action=(string)($input['action']??'');
if($action==='create') {
  $title=trim((string)($input['title']??''));$topic=trim((string)($input['topic']??''));$desc=trim((string)($input['description']??''));$ids=$input['signerIds']??[];if(!is_array($ids))$ids=[$ids];$ids=array_values(array_unique(array_filter(array_map('strval',$ids)));
  if($title===''||!in_array($topic,['lesson_plan','plc','id_plan','sar','other'],true)||count($ids)<1)api_error('กรุณากรอกหัวข้อและเลือกผู้ลงนามอย่างน้อย 1 คน',422,'validation_error');
  $file=$_FILES['document']??null;if(!is_array($file)||($file['error']??1)!==UPLOAD_ERR_OK)api_error('กรุณาแนบเอกสาร',422,'document_required');if((int)$file['size']>15*1024*1024)api_error('ไฟล์ต้องมีขนาดไม่เกิน 15 MB',422,'document_too_large');
  $ext=strtolower(pathinfo((string)$file['name'],PATHINFO_EXTENSION));if(!in_array($ext,['pdf','doc','docx','xls','xlsx','ppt','pptx','jpg','jpeg','png'],true))api_error('ชนิดไฟล์ไม่รองรับ',422,'unsupported_document');
  $dir=__DIR__.'/../uploads/workflows/'.preg_replace('/[^A-Za-z0-9_-]/','_',(string)$user['id']);if(!is_dir($dir)&&!mkdir($dir,0755,true)&&!is_dir($dir))api_error('สร้างพื้นที่เก็บไฟล์ไม่สำเร็จ',500,'upload_failed');$stored=bin2hex(random_bytes(12)).'.'.$ext;if(!move_uploaded_file((string)$file['tmp_name'],$dir.'/'.$stored))api_error('บันทึกไฟล์ไม่สำเร็จ',500,'upload_failed');
  $ph=implode(',',array_fill(0,count($ids),'?'));$q=$db->prepare("SELECT id,name FROM users WHERE status='active' AND id IN ($ph)");$q->execute($ids);$people=$q->fetchAll();$byId=[];foreach($people as $p)$byId[(string)$p['id']]=$p; if(count($byId)!==count($ids))api_error('พบผู้ลงนามบางรายไม่พร้อมใช้งาน',422,'invalid_signers');$signers=[];foreach($ids as $i=>$id)$signers[]=['userId'=>$id,'userName'=>$byId[$id]['name'],'step'=>$i+1,'status'=>'pending'];
  $id='DOC-'.date('YmdHis').'-'.strtoupper(bin2hex(random_bytes(3)));$q=$db->prepare('INSERT INTO document_workflows (id,title,topic,description,file_url,file_name,created_by,created_by_name,status,current_step,signers_json) VALUES (?,?,?,?,?,?,?,?,?,?,?)');$q->execute([$id,$title,$topic,$desc,'/api/document_workflows.php?download='.$id,(string)$file['name'],$user['id'],$user['name'],'pending',1,json_encode($signers,JSON_UNESCAPED_UNICODE)]);api_respond(['status'=>'success','data'=>workflow_get($db,$id)],201);
}
$json=$input; $id=(string)($json['id']??'');$item=workflow_get($db,$id);$signers=$item['signers'];$index=-1;foreach($signers as $i=>$s)if((string)$s['userId']===(string)$user['id']&&(int)$s['step']===(int)$item['currentStep']&&$s['status']==='pending'){$index=$i;break;}if($index<0)api_error('ยังไม่ถึงลำดับการลงนามของคุณ',403,'not_current_signer');
if($action==='sign'){ $signers[$index]['status']='signed';$signers[$index]['signedAt']=date('c');$signers[$index]['signatureData']=substr((string)($json['signatureData']??''),0,200000);$signers[$index]['comment']=trim((string)($json['comment']??''));$next=$item['currentStep']+1;$status=$next>count($signers)?'completed':'in_review';$q=$db->prepare('UPDATE document_workflows SET signers_json=?,current_step=?,status=? WHERE id=?');$q->execute([json_encode($signers,JSON_UNESCAPED_UNICODE),$next,$status,$id]);api_respond(['status'=>'success','data'=>workflow_get($db,$id)]);}
if($action==='reject'){ $signers[$index]['status']='rejected';$signers[$index]['comment']=trim((string)($json['comment']??''));$q=$db->prepare('UPDATE document_workflows SET signers_json=?,status=? WHERE id=?');$q->execute([json_encode($signers,JSON_UNESCAPED_UNICODE),'rejected',$id]);api_respond(['status'=>'success','data'=>workflow_get($db,$id)]);}
api_error('ไม่รู้จักคำสั่งที่ร้องขอ',400,'invalid_action');
