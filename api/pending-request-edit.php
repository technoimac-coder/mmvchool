<?php
declare(strict_types=1);

class PendingRequestError extends RuntimeException {
    public function __construct(string $message, public int $httpStatus=409, public string $errorCode='request_changed') { parent::__construct($message); }
}
function pending_request_table(string $module): string {
    $tables=['leave'=>'leave_requests','official_duty'=>'official_duty_requests','room'=>'room_bookings','repair'=>'repair_tickets','substitute'=>'substitute_teachings'];
    if (!isset($tables[$module])) throw new PendingRequestError('ไม่รองรับระบบงานนี้',422,'invalid_module');
    return $tables[$module];
}
function pending_request_install(PDO $db,string $module): void {
    $table=pending_request_table($module);
    if ($db->inTransaction()) throw new LogicException('Install request schema before transactions');
    $columns=array_column($db->query("SHOW COLUMNS FROM {$table}")->fetchAll(PDO::FETCH_ASSOC),'Field');
    $definitions=['request_version'=>'int NOT NULL DEFAULT 1','request_updated_at'=>'datetime DEFAULT NULL','first_action_at'=>'datetime DEFAULT NULL'];
    if ($module==='substitute') $definitions['created_by']='varchar(20) DEFAULT NULL';
    foreach($definitions as $name=>$definition) if(!in_array($name,$columns,true)) {
        try{$db->exec("ALTER TABLE {$table} ADD COLUMN {$name} {$definition}");}
        catch(PDOException $error){
            // Another request can install the same additive column during rollout.
            if((int)($error->errorInfo[1]??0)!==1060)throw $error;
        }
    }
    if($module==='substitute'&&!in_array('first_action_at',$columns,true)) {
        $db->exec("UPDATE substitute_teachings s SET first_action_at=NOW() WHERE acknowledged_at IS NOT NULL OR rejected_at IS NOT NULL OR stage<>'pending_ack' OR EXISTS(SELECT 1 FROM notifications n WHERE BINARY n.related_id=BINARY s.id AND n.module='substitute' AND n.title LIKE '%ปฏิเสธ%')");
    }
    $db->exec("CREATE TABLE IF NOT EXISTS request_edit_history (
        id bigint unsigned AUTO_INCREMENT PRIMARY KEY,module varchar(30) NOT NULL,request_id varchar(64) NOT NULL,
        request_version int NOT NULL,actor_id varchar(20) NOT NULL,client_request_id char(36) NOT NULL,
        payload_hash char(64) NOT NULL,changed_fields text NOT NULL,created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY request_edit_retry(module,request_id,client_request_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}
function pending_request_empty(mixed $value): bool { return $value===null || $value==='' || $value==='null' || $value==='[]' || $value==='{}'; }
function pending_request_editable(string $module,array $row): bool {
    if(!empty($row['first_action_at']) || ($row['status']??'')!=='pending') return false;
    $empty=static fn(string $key):bool=>pending_request_empty($row[$key]??null);
    return match($module) {
        'leave'=>($row['current_stage']??'')==='admin_review' && $empty('admin_review') && $empty('deputy_approval') && $empty('director_approval'),
        'official_duty'=>in_array($row['current_stage']??'',['admin_review','deputy_approval'],true) && $empty('admin_review') && $empty('deputy_approval') && $empty('director_approval'),
        'room'=>in_array($row['booking_stage']??'',['pending_deputy','pending_manager'],true) && $empty('deputy_review_at') && $empty('manager_review_at') && $empty('deputy_review_by') && $empty('manager_review_by'),
        'repair'=>($row['repair_stage']??'')==='reported' && $empty('head_review') && $empty('technician_report') && $empty('assigned_technician_id'),
        'substitute'=>($row['stage']??'')==='pending_ack' && $empty('acknowledged_at') && $empty('rejected_at'),
        default=>false,
    };
}
function pending_request_metadata(string $module,array $row): array {
    return ['requestVersion'=>(int)($row['request_version']??1),'requestUpdatedAt'=>$row['request_updated_at']??null,
        'processingStartedAt'=>$row['first_action_at']??null,'canEditRequest'=>pending_request_editable($module,$row)]
        + ($module==='substitute'?['createdBy'=>$row['created_by']??null]:[]);
}
function pending_request_assert_version(array $row,array $input): void {
    if((int)($input['requestVersion']??1)!==(int)($row['request_version']??1)) throw new PendingRequestError('ข้อมูลถูกแก้ไขแล้ว กรุณาโหลดใหม่และตรวจข้อมูลล่าสุดก่อนดำเนินการ');
}
function pending_request_processing_lock(PDO $db,string $module,string $id,array $input): array {
    $db->beginTransaction();
    $q=$db->prepare('SELECT * FROM '.pending_request_table($module).' WHERE id=? FOR UPDATE');$q->execute([$id]);$row=$q->fetch(PDO::FETCH_ASSOC);
    if(!$row){$db->rollBack();api_error('ไม่พบรายการ',404,'not_found');}
    try{pending_request_assert_version($row,$input);}catch(PendingRequestError $error){$db->rollBack();api_error($error->getMessage(),$error->httpStatus,$error->errorCode);}
    return $row;
}
function pending_request_processing_commit(PDO $db,string $module,string $id): void {
    $q=$db->prepare('UPDATE '.pending_request_table($module).' SET first_action_at=COALESCE(first_action_at,NOW()) WHERE id=?');$q->execute([$id]);$db->commit();
}
function pending_request_text(array $input,string $key,int $max=255,bool $required=false): string {
    if(isset($input[$key])&&!is_string($input[$key])) throw new PendingRequestError('รูปแบบข้อมูลไม่ถูกต้อง',422,'invalid_input');
    $value=trim((string)($input[$key]??''));
    if(($required&&$value==='')||mb_strlen($value)>$max) throw new PendingRequestError('กรุณากรอกข้อมูลให้ครบและไม่เกินความยาวที่กำหนด',422,'invalid_input');
    return $value;
}
function pending_request_date(string $value): void {
    $date=DateTimeImmutable::createFromFormat('!Y-m-d',$value);
    if(!$date||$date->format('Y-m-d')!==$value) throw new PendingRequestError('วันที่ไม่ถูกต้อง',422,'invalid_date');
}
function pending_request_list(mixed $input,int $max=100): array {
    if(!is_array($input)||array_values($input)!==$input||count($input)>$max) throw new PendingRequestError('ข้อมูลรายการไม่ถูกต้อง',422,'invalid_input');
    foreach($input as $value) if(!is_string($value)||mb_strlen($value)>255) throw new PendingRequestError('ข้อมูลรายการไม่ถูกต้อง',422,'invalid_input');
    return array_values($input);
}
function pending_request_changes(PDO $db,string $module,array $row,array $input): array {
    $changes=[];
    $fields=match($module){
        'leave'=>['writtenAt'=>'written_at','organization'=>'organization','leaveType'=>'leave_type','otherLeaveDetails'=>'other_leave_details','startDate'=>'start_date','endDate'=>'end_date','reason'=>'reason','contactAddress'=>'contact_address','contactPhone'=>'contact_phone'],
        'official_duty'=>['title'=>'title','location'=>'location','organizer'=>'organizer','startDate'=>'start_date','endDate'=>'end_date','vehicleType'=>'vehicle_type','supervisorName'=>'supervisor_name','personalLicensePlate'=>'personal_license_plate','budgetType'=>'budget_type','budgetCustomText'=>'budget_custom_text'],
        'room'=>['title'=>'title','date'=>'booking_date','startTime'=>'start_time','endTime'=>'end_time','layoutStyle'=>'layout_style','snackDetails'=>'snack_details'],
        'repair'=>['category'=>'category','title'=>'title','description'=>'description','location'=>'location','building'=>'building','floor'=>'floor','roomNumber'=>'room_number','urgency'=>'urgency'],
        'substitute'=>['date'=>'teaching_date','time'=>'teaching_time','gradeLevel'=>'grade_level','subjectCode'=>'subject_code','subjectName'=>'subject_name','assignedWork'=>'assigned_work','leaveReason'=>'leave_reason'],
    };
    $required=match($module){'leave'=>['leaveType','startDate','endDate','reason'],'official_duty'=>['title','location','startDate','endDate','vehicleType','budgetType'],'room'=>['title','date','startTime','endTime','layoutStyle'],'repair'=>['category','title','description','location'],'substitute'=>['date','gradeLevel','subjectCode','subjectName']};
    $limits=['contactPhone'=>50,'floor'=>100,'roomNumber'=>100,'time'=>50,'gradeLevel'=>100,'subjectCode'=>100,'personalLicensePlate'=>100];
    foreach($fields as $key=>$column)$changes[$column]=pending_request_text($input,$key,$limits[$key]??(in_array($key,['reason','description','assignedWork','leaveReason','snackDetails'],true)?4000:255),in_array($key,$required,true));
    if(isset($changes['start_date'])){pending_request_date($changes['start_date']);pending_request_date($changes['end_date']);if($changes['end_date']<$changes['start_date'])throw new PendingRequestError('วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น',422,'invalid_date');$changes['total_days']=max(1,(int)(new DateTimeImmutable($changes['start_date']))->diff(new DateTimeImmutable($changes['end_date']))->days+1);}
    if($module==='leave'){
        if(!in_array($changes['leave_type'],['sick','personal','maternity','other'],true)||($changes['leave_type']==='other'&&$changes['other_leave_details']===''))throw new PendingRequestError('ประเภทการลาไม่ถูกต้อง',422,'invalid_leave_type');
        $days=filter_var($input['totalDays']??null,FILTER_VALIDATE_INT);if($days===false||$days<1||$days>$changes['total_days'])throw new PendingRequestError('จำนวนวันลาไม่ถูกต้อง',422,'invalid_days');$changes['total_days']=$days;
    }
    if(in_array($module,['leave','official_duty'],true)){
        $signature=pending_request_text($input,'signatureUrl',3*1024*1024);
        // Existing unsigned requests may have no signature; require one when saving an empty or changed signature.
        if($signature===''&&empty($row['signature_url']))throw new PendingRequestError('กรุณาลงลายมือชื่อผู้ยื่น',422,'invalid_signature');
        if($signature!==(string)($row['signature_url']??'')&&!str_starts_with($signature,'data:image/')&&!str_starts_with($signature,'/storage/')&&!preg_match('~^https://~',$signature))throw new PendingRequestError('ลายเซ็นไม่ถูกต้อง',422,'invalid_signature');
        $changes['signature_url']=$signature;
        $attachments=$input['attachments']??[];if(!is_array($attachments)||array_values($attachments)!==$attachments||count($attachments)>20)throw new PendingRequestError('เอกสารแนบไม่ถูกต้อง',422,'invalid_attachments');
        foreach($attachments as $attachment)if(!is_array($attachment)||!is_string($attachment['name']??null)||!is_string($attachment['dataUrl']??null)||strlen($attachment['dataUrl'])>20*1024*1024||!preg_match('~^data:(application/pdf|image/(png|jpeg|webp));base64,~',$attachment['dataUrl']))throw new PendingRequestError('ไฟล์แนบต้องเป็น PDF หรือรูปภาพ',422,'invalid_attachments');
        $changes['attachments']=json_encode($attachments,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
    }
    if($module==='official_duty'){
        if(!in_array($changes['vehicle_type'],['school_vehicle','personal_car','public_transport'],true)||!in_array($changes['budget_type'],['school_budget','organizer_budget','none'],true))throw new PendingRequestError('ประเภทรถหรือแหล่งงบประมาณไม่ถูกต้อง',422,'invalid_input');
        $changes['participants']=json_encode(pending_request_list($input['participants']??[]),JSON_UNESCAPED_UNICODE);
        $amount=filter_var($input['budgetAmount']??0,FILTER_VALIDATE_FLOAT);if($amount===false||$amount<0||$amount>100000000)throw new PendingRequestError('งบประมาณไม่ถูกต้อง',422,'invalid_input');
        $changes['budget_amount']=$changes['budget_type']==='none'?0:$amount;
        if($changes['budget_type']!=='none'&&$changes['budget_custom_text']==='')throw new PendingRequestError('กรุณาระบุแหล่งงบประมาณ',422,'invalid_input');
        $changes+=['vehicle_id'=>null,'vehicle_name'=>null,'license_plate'=>null,'driver_name'=>null];
        if($changes['vehicle_type']==='school_vehicle'){
            $q=$db->prepare("SELECT * FROM vehicles WHERE id=? AND status<>'maintenance'");$q->execute([pending_request_text($input,'vehicleId',50,true)]);$vehicle=$q->fetch(PDO::FETCH_ASSOC);
            if(!$vehicle)throw new PendingRequestError('รถที่เลือกไม่พร้อมใช้งาน',422,'invalid_vehicle');
            $changes['vehicle_id']=$vehicle['id'];$changes['vehicle_name']=$vehicle['name'];$changes['license_plate']=$vehicle['license_plate'];$changes['driver_name']=$vehicle['driver_name']??null;
        }
    }
    if($module==='room'){
        pending_request_date($changes['booking_date']);
        foreach(['start_time','end_time'] as $key)if(!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/D',$changes[$key]))throw new PendingRequestError('เวลาไม่ถูกต้อง',422,'invalid_time');
        if($changes['start_time']>=$changes['end_time'])throw new PendingRequestError('เวลาสิ้นสุดต้องหลังเวลาเริ่ม',422,'invalid_time');
        $q=$db->prepare("SELECT * FROM meeting_rooms WHERE id=? AND status='available'");$q->execute([pending_request_text($input,'roomId',50,true)]);$room=$q->fetch(PDO::FETCH_ASSOC);
        if(!$room)throw new PendingRequestError('ห้องที่เลือกไม่พร้อมให้จอง',409,'room_unavailable');
        $q=$db->prepare("SELECT id FROM room_bookings WHERE room_id=? AND booking_date=? AND id<>? AND status<>'rejected' AND booking_stage<>'completed' AND start_time<? AND end_time>? LIMIT 1 FOR UPDATE");
        $q->execute([$room['id'],$changes['booking_date'],$row['id'],$changes['end_time'],$changes['start_time']]);if($q->fetchColumn())throw new PendingRequestError('ช่วงเวลานี้มีผู้จองแล้ว กรุณาเลือกเวลาใหม่',409,'schedule_conflict');
        $count=filter_var($input['attendeeCount']??null,FILTER_VALIDATE_INT);if($count===false||$count<1||$count>10000)throw new PendingRequestError('จำนวนผู้เข้าร่วมไม่ถูกต้อง',422,'invalid_input');
        $changes+=['room_id'=>$room['id'],'room_name'=>$room['name'],'attendee_count'=>$count,'equipment_required'=>json_encode(pending_request_list($input['equipmentRequired']??[]),JSON_UNESCAPED_UNICODE),'snack_required'=>!empty($input['snackRequired'])?1:0,'booking_stage'=>str_contains($room['name'],'รวงผึ้ง')?'pending_manager':'pending_deputy'];
        if(!in_array($changes['layout_style'],['classroom','theater','u_shape','boardroom'],true))throw new PendingRequestError('รูปแบบห้องไม่ถูกต้อง',422,'invalid_input');
    }
    if($module==='repair'){
        if(!in_array($changes['category'],['audio_visual','computer_network','building'],true)||!in_array($changes['urgency'],['low','medium','high','critical'],true))throw new PendingRequestError('ประเภทงานหรือความเร่งด่วนไม่ถูกต้อง',422,'invalid_input');
        $changes['photo_url']=pending_request_text($input,'photoUrl',10*1024*1024);
        if($changes['photo_url']!==''&&!preg_match('~^(data:image/(png|jpeg|webp);base64,|https://|/storage/)~',$changes['photo_url']))throw new PendingRequestError('รูปภาพไม่ถูกต้อง',422,'invalid_photo');
    }
    if($module==='substitute'){
        pending_request_date($changes['teaching_date']);$period=filter_var($input['period']??null,FILTER_VALIDATE_INT);if($period===false||$period<1||$period>8)throw new PendingRequestError('คาบเรียนต้องอยู่ระหว่าง 1–8',422,'invalid_period');$changes['period']=$period;
        foreach(['originalTeacherId'=>'original_teacher','substituteTeacherId'=>'substitute_teacher'] as $key=>$prefix){$q=$db->prepare("SELECT id,name FROM users WHERE id=? AND status='active'");$q->execute([pending_request_text($input,$key,20,true)]);$teacher=$q->fetch(PDO::FETCH_ASSOC);if(!$teacher)throw new PendingRequestError('บัญชีครูไม่พร้อมใช้งาน',422,'invalid_teacher');$changes[$prefix.'_id']=$teacher['id'];$changes[$prefix.'_name']=$teacher['name'];}
        if($changes['original_teacher_id']===$changes['substitute_teacher_id'])throw new PendingRequestError('ครูประจำวิชากับครูสอนแทนต้องเป็นคนละคน',422,'same_teacher');
    }
    return $changes;
}

function pending_request_update(PDO $db,array $user,string $module,string $id,array $input,?callable $notify=null): array {
    $table=pending_request_table($module);$requestId=pending_request_text($input,'clientRequestId',36,true);
    if(!preg_match('/^[a-f0-9-]{36}$/D',$requestId))throw new PendingRequestError('รหัสบันทึกไม่ถูกต้อง',422,'invalid_request_id');
    if(!is_array($input['data']??null))throw new PendingRequestError('ข้อมูลไม่ถูกต้อง',422,'invalid_input');
    $db->beginTransaction();
    try{
        // Match room creation's room-first lock order to serialize overlapping edits/bookings.
        if($module==='room'){$q=$db->prepare('SELECT id FROM meeting_rooms WHERE id IN (?,(SELECT room_id FROM room_bookings WHERE id=?)) ORDER BY id FOR UPDATE');$q->execute([(string)($input['data']['roomId']??''),$id]);$q->fetchAll();}
        $q=$db->prepare("SELECT * FROM {$table} WHERE id=? FOR UPDATE");$q->execute([$id]);$row=$q->fetch(PDO::FETCH_ASSOC);
        if(!$row)throw new PendingRequestError('ไม่พบรายการ',404,'not_found');
        $owner=$module==='substitute'?($row['created_by']?:workflow_assignee('pipe-substitute',1,'MMV90')):$row['user_id'];
        if((string)$owner!==(string)$user['id'])throw new PendingRequestError('แก้ไขได้เฉพาะรายการที่ตนเองสร้าง',403,'forbidden');
        $hash=hash('sha256',json_encode($input['data']??[],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR));
        $q=$db->prepare('SELECT payload_hash FROM request_edit_history WHERE module=? AND request_id=? AND client_request_id=?');$q->execute([$module,$id,$requestId]);$previous=$q->fetchColumn();
        if($previous){if($previous!==$hash)throw new PendingRequestError('รหัสบันทึกนี้ใช้กับข้อมูลอื่นแล้ว');$db->commit();return ['row'=>$row,'changed'=>false];}
        pending_request_assert_version($row,$input);
        if(!pending_request_editable($module,$row))throw new PendingRequestError('ผู้รับผิดชอบเริ่มดำเนินการแล้ว ไม่สามารถแก้ไขรายการนี้ได้',409,'request_already_started');
        $data=$input['data']??null;if(!is_array($data))throw new PendingRequestError('ข้อมูลไม่ถูกต้อง',422,'invalid_input');
        $changes=pending_request_changes($db,$module,$row,$data);
        $different=[];
        foreach($changes as $column=>$value){
            $old=$row[$column]??null;
            if(in_array($column,['start_time','end_time'],true))$old=substr((string)$old,0,5);
            if(in_array($column,['attachments','participants','equipment_required'],true)){$same=(json_decode((string)$old,true)??[])===(json_decode((string)$value,true)??[]);}
            elseif(in_array($column,['budget_amount','total_days','attendee_count','period','snack_required'],true))$same=(float)$old===(float)$value;
            else $same=(string)$old===(string)$value;
            if(!$same)$different[]=$column;
        }
        if(!$different){$db->commit();return ['row'=>$row,'changed'=>false];}
        $assignments=implode(',',array_map(static fn(string $key):string=>"{$key}=?",array_keys($changes)));
        $q=$db->prepare("UPDATE {$table} SET {$assignments},request_version=request_version+1,request_updated_at=NOW() WHERE id=? AND request_version=? AND first_action_at IS NULL");
        $q->execute([...array_values($changes),$id,(int)($row['request_version']??1)]);if($q->rowCount()!==1)throw new PendingRequestError('ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่');
        $q=$db->prepare('INSERT INTO request_edit_history(module,request_id,request_version,actor_id,client_request_id,payload_hash,changed_fields) VALUES(?,?,?,?,?,?,?)');$q->execute([$module,$id,(int)($row['request_version']??1)+1,$user['id'],$requestId,$hash,json_encode($different)]);
        $q=$db->prepare("SELECT * FROM {$table} WHERE id=?");$q->execute([$id]);$updated=$q->fetch(PDO::FETCH_ASSOC);
        if($notify)$notify($updated,$row);
        $db->commit();return ['row'=>$updated,'before'=>$row,'changed'=>true];
    }catch(Throwable $error){if($db->inTransaction())$db->rollBack();if($error instanceof PDOException&&$error->getCode()==='23000')throw new PendingRequestError('คาบสอนซ้ำกับรายการอื่น',409,'duplicate_lesson');throw $error;}
}
