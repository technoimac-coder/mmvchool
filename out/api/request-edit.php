<?php
declare(strict_types=1);
require_once __DIR__.'/db.php';
require_once __DIR__.'/pending-request-edit.php';
$db=require_database();$user=require_user();require_method('POST');require_csrf();$input=json_body();
if(($input['action']??'')!=='update_request')api_error('ไม่รู้จักคำสั่ง',400,'unknown_action');
$module=(string)($input['module']??'');$id=(string)($input['id']??'');
require_once __DIR__.'/line-notifier.php';
require_once __DIR__.'/pending-request-notifications.php';
try {
    pending_request_install($db,$module);
    if($module==='repair')ensure_repair_assignments($db);
    $result=pending_request_update($db,$user,$module,$id,$input,static fn(array $row,array $before)=>pending_request_notify($db,$module,$row,$before,$user));
    api_respond(['status'=>'success','changed'=>$result['changed']]);
}catch(PendingRequestError $error){api_error($error->getMessage(),$error->httpStatus,$error->errorCode);}
catch(Throwable $error){error_log('Pending request edit: '.$error->getCode());api_error('ไม่สามารถบันทึกการแก้ไขได้ กรุณาลองใหม่',500,'request_edit_failed');}
