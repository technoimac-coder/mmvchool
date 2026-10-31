<?php
declare(strict_types=1);
// Synthetic records in a random, disposable LOCAL database; no production credentials or LINE calls.
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require_once __DIR__.'/../api/pending-request-edit.php';
require_once __DIR__.'/../api/pending-request-notifications.php';
require_once __DIR__.'/../api/eoffice-actions.php';
function verify_pending(bool $ok,string $label):void {if(!$ok)throw new RuntimeException($label);}
function workflow_assignee(string $pipe,int $step,string $fallback=''):string{return $pipe==='pipe-substitute'?'owner':'reviewer';}
function api_error(string $message,int $status,string $code):never{throw new PendingRequestError($message,$status,$code);}
function line_notify_linked_users(PDO $db,array $ids,string $title,array $fields):void {
    verify_pending($db->inTransaction(),'Queue notice inside transaction');
    $q=$db->prepare('INSERT INTO test_notice_queue(targets,title) VALUES(?,?)');$q->execute([json_encode($ids),$title]);
}
$db=new PDO('mysql:host=127.0.0.1;port=43317;charset=utf8mb4','root','',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
$name='mmv_pending_test_'.bin2hex(random_bytes(4));$db->exec("CREATE DATABASE {$name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
$owner=['id'=>'owner','name'=>'Synthetic owner'];$count=0;
function pending_expect_error(callable $call,string $code):void {
    try{$call();throw new RuntimeException('Expected '.$code);}catch(PendingRequestError $error){verify_pending($error->errorCode===$code,'Expected '.$code.', got '.$error->errorCode);}
}
function pending_insert(PDO $db,string $table,array $row):void {$q=$db->prepare('INSERT INTO '.$table.'('.implode(',',array_keys($row)).') VALUES('.implode(',',array_fill(0,count($row),'?')).')');$q->execute(array_values($row));}
function pending_row(PDO $db,string $module,string $id):array {$q=$db->prepare('SELECT * FROM '.pending_request_table($module).' WHERE id=?');$q->execute([$id]);return $q->fetch();}
function pending_input(array $data,int $version=1):array {return ['data'=>$data,'requestVersion'=>$version,'clientRequestId'=>sprintf('%08x-0000-4000-8000-000000000000',random_int(1,0x7fffffff))];}
try {
    $db->exec("USE {$name}");
    $db->exec("CREATE TABLE users(id varchar(20) PRIMARY KEY,name varchar(255),status varchar(20),personnel_type varchar(100)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $db->exec("INSERT INTO users VALUES('owner','Synthetic owner','active','ครู'),('other','Other','active','ครู'),('reviewer','Reviewer','active','ครู'),('tech','Technician','active','ครู')");
    $db->exec('CREATE TABLE test_notice_queue(id int AUTO_INCREMENT PRIMARY KEY,targets text,title text) ENGINE=InnoDB');
    $db->exec('CREATE TABLE notifications(id int AUTO_INCREMENT PRIMARY KEY,user_id varchar(20),title varchar(255),message text,module varchar(30),related_id varchar(64),created_at datetime) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    // Use the actual production CREATE statements, without executing their controllers/bootstrap.
    $sources=['leave_requests'=>file_get_contents(__DIR__.'/../database/migrations/004_leave_workflow_notifications.sql'),
      'official_duty_requests'=>file_get_contents(__DIR__.'/../api/migrate-official-duty-cli.php'),
      'substitute_teachings'=>file_get_contents(__DIR__.'/../api/migrate-substitutes-cli.php'),
      'room_bookings'=>file_get_contents(__DIR__.'/../database/migrations/002_room_bookings.sql'),
      'meeting_rooms'=>file_get_contents(__DIR__.'/../database/migrations/002_room_bookings.sql'),
      'repair_tickets'=>file_get_contents(__DIR__.'/../api/repairs.php')];
    foreach($sources as $table=>$source){preg_match('/CREATE TABLE IF NOT EXISTS `?'.preg_quote($table,'/').'`? \([\s\S]*?\) ENGINE=InnoDB[^;"\r\n]*/',$source,$match);verify_pending(!empty($match),'Find schema '.$table);$db->exec($match[0]);}
    foreach(['leave_requests','official_duty_requests'] as $table)$db->exec("ALTER TABLE {$table} ADD attachments longtext NULL");
    foreach(['official_duty_requests','substitute_teachings','room_bookings'] as $table)$db->exec("ALTER TABLE {$table} ADD academic_year varchar(10),ADD semester varchar(1)");
    $db->exec('ALTER TABLE room_bookings ADD deputy_review_by varchar(255),ADD deputy_review_at datetime,ADD deputy_review_comment text');
    $db->exec('ALTER TABLE meeting_rooms ADD manager_ids text');
    $db->exec("CREATE TABLE repair_assignments(role_key varchar(50) PRIMARY KEY,user_id varchar(20)) ENGINE=InnoDB");
    $db->exec("INSERT INTO repair_assignments VALUES('audiovisual_handler','reviewer'),('building_reviewer','tech')");
    foreach(['leave','official_duty','room','repair','substitute'] as $module){pending_request_install($db,$module);pending_request_install($db,$module);}
    $db->exec("INSERT INTO meeting_rooms(id,name,status,manager_id,manager_ids) VALUES('room1','Meeting','available','tech','[\"tech\"]'),('room2','รวงผึ้ง','available','tech','[\"tech\"]')");
    $common=['user_id'=>'owner','user_name'=>'Synthetic owner','academic_year'=>'2569','semester'=>'2','created_at'=>'2026-10-01 10:00:00'];
    $fixtures=[
      'leave'=>[$common+['id'=>'leave','leave_type'=>'personal','start_date'=>'2099-11-01','end_date'=>'2099-11-02','total_days'=>2,'reason'=>'Original','signature_url'=>'data:image/png;base64,c3ludGhldGlj'],['writtenAt'=>'School','organization'=>'School','leaveType'=>'personal','startDate'=>'2099-11-01','endDate'=>'2099-11-02','totalDays'=>2,'reason'=>'Revised leave','signatureUrl'=>'data:image/png;base64,c3ludGhldGlj','attachments'=>[]]],
      'official_duty'=>[$common+['id'=>'duty','title'=>'Original','location'=>'School','start_date'=>'2099-11-01','end_date'=>'2099-11-02','vehicle_type'=>'public_transport','budget_type'=>'none','signature_url'=>'data:image/png;base64,c3ludGhldGlj'],['title'=>'Revised duty','location'=>'School','organizer'=>'School','startDate'=>'2099-11-01','endDate'=>'2099-11-02','vehicleType'=>'public_transport','budgetType'=>'none','signatureUrl'=>'data:image/png;base64,c3ludGhldGlj','participants'=>[],'attachments'=>[]]],
      'room'=>[$common+['id'=>'room','room_id'=>'room1','room_name'=>'Meeting','title'=>'Original','booking_date'=>'2099-11-01','start_time'=>'09:00','end_time'=>'10:00','booking_stage'=>'pending_deputy'],['title'=>'Revised meeting','roomId'=>'room1','date'=>'2099-11-01','startTime'=>'09:00','endTime'=>'10:00','attendeeCount'=>3,'layoutStyle'=>'classroom','equipmentRequired'=>[]]],
      'repair'=>[$common+['id'=>'repair','title'=>'Original','description'=>'Original','category'=>'audio_visual','location'=>'School'],['title'=>'Revised repair','description'=>'Revised repair','category'=>'audio_visual','location'=>'School','urgency'=>'medium']],
      'substitute'=>[['id'=>'sub','created_by'=>'owner','original_teacher_id'=>'other','original_teacher_name'=>'Other','substitute_teacher_id'=>'reviewer','substitute_teacher_name'=>'Reviewer','teaching_date'=>'2099-11-01','period'=>1,'grade_level'=>'M1','subject_code'=>'SCI','subject_name'=>'Original','academic_year'=>'2569','semester'=>'2','created_at'=>'2026-10-01 10:00:00'],['date'=>'2099-11-01','period'=>1,'originalTeacherId'=>'other','substituteTeacherId'=>'reviewer','gradeLevel'=>'M1','subjectCode'=>'SCI','subjectName'=>'Revised subject','time'=>'09:00','assignedWork'=>'Exercise']],
    ];
    foreach($fixtures as $module=>[$row,$data]){
        $table=pending_request_table($module);$id=$row['id'];pending_insert($db,$table,$row);
        verify_pending(pending_request_editable($module,pending_row($db,$module,$id)),'Initially editable '.$module);
        $input=pending_input($data+['userId'=>'other','status'=>'approved','academicYear'=>'9999']);
        $notify=static fn($new,$old)=>pending_request_notify($db,$module,$new,$old,$owner);
        pending_expect_error(static fn()=>pending_request_update($db,['id'=>'other'],$module,$id,$input,$notify),'forbidden');
        $result=pending_request_update($db,$owner,$module,$id,$input,$notify);$saved=$result['row'];
        verify_pending($result['changed']&&(int)$saved['request_version']===2,'Edit bumps revision '.$module);
        foreach(['id','created_at','academic_year','semester'] as $key)verify_pending($saved[$key]===$row[$key],'Preserve '.$key.' '.$module);
        verify_pending($saved['status']==='pending','Untrusted status ignored');
        $before=(int)$db->query('SELECT COUNT(*) FROM notifications')->fetchColumn();
        verify_pending(!pending_request_update($db,$owner,$module,$id,$input,$notify)['changed'],'Idempotent retry '.$module);
        verify_pending((int)$db->query('SELECT COUNT(*) FROM notifications')->fetchColumn()===$before,'No duplicate notices');
        pending_expect_error(static fn()=>pending_request_update($db,$owner,$module,$id,pending_input($data),$notify),'request_changed');
        verify_pending(!pending_request_update($db,$owner,$module,$id,pending_input($data,2),$notify)['changed'],'No-op edit '.$module);
        $modified=$data;$modified[$module==='leave'?'reason':($module==='substitute'?'subjectName':'title')]='Rollback';
        try{pending_request_update($db,$owner,$module,$id,pending_input($modified,2),static function($new,$old)use($notify){$notify($new,$old);throw new RuntimeException('Synthetic queue failure');});throw new LogicException('Expected rollback');}catch(RuntimeException $error){verify_pending($error->getMessage()==='Synthetic queue failure','Notify failure');}
        verify_pending((int)pending_row($db,$module,$id)['request_version']===2&&(int)$db->query('SELECT COUNT(*) FROM notifications')->fetchColumn()===$before,'Atomic data/history/web/queue rollback');
        pending_expect_error(static fn()=>pending_request_processing_lock($db,$module,$id,['requestVersion'=>1]),'request_changed');
        verify_pending(!$db->inTransaction(),'Stale review closes transaction');
        pending_request_processing_lock($db,$module,$id,['requestVersion'=>2]);pending_request_processing_commit($db,$module,$id);
        verify_pending(!pending_request_editable($module,pending_row($db,$module,$id)),'First action permanently locks edit '.$module);
        pending_expect_error(static fn()=>pending_request_update($db,$owner,$module,$id,pending_input($data,2),$notify),'request_already_started');
        $count++;
    }
    verify_pending(!str_contains((string)$db->query('SELECT GROUP_CONCAT(changed_fields) FROM request_edit_history')->fetchColumn(),'base64'),'History stores field names, not biometric data');
    verify_pending((int)$db->query("SELECT COUNT(*) FROM notifications WHERE user_id NOT IN('reviewer','tech')")->fetchColumn()===0,'Only configured related reviewers notified');
    $db->exec("UPDATE room_bookings SET first_action_at=NULL WHERE id='room'");
    pending_insert($db,'room_bookings',$common+['id'=>'conflict','room_id'=>'room1','room_name'=>'Meeting','title'=>'Other booking','booking_date'=>'2099-11-01','start_time'=>'10:00','end_time'=>'11:00']);
    pending_expect_error(static fn()=>pending_request_update($db,$owner,'room','room',pending_input(array_replace($fixtures['room'][1],['endTime'=>'10:30']),2)),'schedule_conflict');
    $moved=pending_request_update($db,$owner,'room','room',pending_input(array_replace($fixtures['room'][1],['roomId'=>'room2']),2));
    verify_pending($moved['row']['booking_stage']==='pending_manager','Changed room routes to correct first reviewer');
    $db->exec("UPDATE substitute_teachings SET first_action_at=NULL WHERE id='sub'");
    pending_expect_error(static fn()=>pending_request_update($db,$owner,'substitute','sub',pending_input(array_replace($fixtures['substitute'][1],['originalTeacherId'=>'reviewer']),2)),'same_teacher');
    pending_insert($db,'substitute_teachings',array_replace($fixtures['substitute'][0],['id'=>'slot','period'=>2]));
    pending_expect_error(static fn()=>pending_request_update($db,$owner,'substitute','sub',pending_input(array_replace($fixtures['substitute'][1],['period'=>2]),2)),'duplicate_lesson');
    // First-review race: a separate connection cannot overwrite a row held for processing.
    $db->exec("UPDATE repair_tickets SET first_action_at=NULL WHERE id='repair'");
    pending_request_processing_lock($db,'repair','repair',['requestVersion'=>2]);
    $other=new PDO('mysql:host=127.0.0.1;port=43317;dbname='.$name.';charset=utf8mb4','root','',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);$other->exec('SET SESSION innodb_lock_wait_timeout=1');
    try{pending_request_update($other,$owner,'repair','repair',pending_input(array_replace($fixtures['repair'][1],['title'=>'Concurrent edit']),2));throw new LogicException('Expected lock');}catch(PDOException $error){verify_pending((int)$error->errorInfo[1]===1205,'Review serializes concurrent edit');}
    pending_request_processing_commit($db,'repair','repair');
    pending_expect_error(static fn()=>pending_request_update($other,$owner,'repair','repair',pending_input($fixtures['repair'][1],2)),'request_already_started');
    $other=null;
    $db->exec("CREATE TABLE document_workflows(id varchar(64) PRIMARY KEY,title varchar(255),status varchar(30),file_version int,signers_json text) ENGINE=InnoDB");
    $db->exec("CREATE TABLE eoffice_incoming(id varchar(64) PRIMARY KEY,created_by varchar(20),stage varchar(30),workflow_id varchar(64),title varchar(255),request_version int DEFAULT 1,deleted_at datetime NULL) ENGINE=InnoDB");
    $db->exec('CREATE TABLE eoffice_history(id int AUTO_INCREMENT PRIMARY KEY,book_id varchar(64),actor_name varchar(255),action varchar(255),note text) ENGINE=InnoDB');
    pending_insert($db,'document_workflows',['id'=>'EO-test','title'=>'Original','status'=>'in_review','file_version'=>1,'signers_json'=>json_encode([['userId'=>'owner','status'=>'signed'],['userId'=>'reviewer','status'=>'pending']])]);
    pending_insert($db,'eoffice_incoming',['id'=>'book','created_by'=>'owner','stage'=>'routing','workflow_id'=>'EO-test','title'=>'Original']);
    verify_pending(eoffice_update_book($db,$owner,'book',['title'=>'New e-Office title'],1),'Registrar may edit before external first action');
    verify_pending((int)$db->query("SELECT file_version FROM document_workflows WHERE id='EO-test'")->fetchColumn()===2,'Invalidate stale signer view');
    pending_expect_error(static fn()=>eoffice_update_book($db,['id'=>'other'],'book',['title'=>'Bad'],2),'forbidden');
    pending_expect_error(static fn()=>eoffice_update_book($db,$owner,'book',['title'=>'Bad'],1),'request_changed');
    $q=$db->prepare('UPDATE document_workflows SET signers_json=? WHERE id=?');$q->execute([json_encode([['userId'=>'owner','status'=>'signed'],['userId'=>'reviewer','status'=>'signed']]),'EO-test']);
    pending_expect_error(static fn()=>eoffice_update_book($db,$owner,'book',['title'=>'Bad'],2),'request_already_started');
    echo "Pending request edit: {$count} modules, actual SQL migrations, owner-only edits, no-op/idempotency, immutable identity/period, atomic notifications, stale reviewers, first-action race, room conflicts, substitute slots and e-Office passed.\n";
}finally{if($db->inTransaction())$db->rollBack();$db->exec("DROP DATABASE {$name}");}
