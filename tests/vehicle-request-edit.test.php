<?php
declare(strict_types=1);
// Isolated route test: no production database, credentials or LINE calls.
require_once __DIR__ . '/../api/vehicle-request-edit.php';
function check_vehicle(bool $ok, string $message): void { if (!$ok) throw new RuntimeException($message); }
class VehicleResponse extends RuntimeException {
    public function __construct(public int $status, public array $body) { parent::__construct((string)$status); }
}
function api_error(string $message, int $status, string $code): never { throw new VehicleResponse($status, ['code'=>$code]); }
function api_respond(array $body, int $status=200): never { throw new VehicleResponse($status,$body); }
function workflow_assignee(string $pipe,int $stage,string $fallback): string { return 'stage-'.$stage; }
function notify_vehicle_users(PDO $db,array $ids,string $title,array $fields,string $id): void {
    $db->notices[]=['users'=>array_values(array_unique($ids)),'title'=>$title,'fields'=>$fields,'id'=>$id];
}
class VehicleDb extends PDO {
    public array $rows=[]; public array $notices=[]; private array $snapshot=[]; private bool $transaction=false;
    public function __construct() {}
    public function beginTransaction(): bool { $this->snapshot=$this->rows; $this->transaction=true; return true; }
    public function commit(): bool { $this->transaction=false; return true; }
    public function inTransaction(): bool { return $this->transaction; }
    public function rollBack(): bool { $this->rows=$this->snapshot; $this->transaction=false; return true; }
    public function prepare(string $sql,array $options=[]): PDOStatement|false { return new VehicleStatement($this,$sql); }
}
class VehicleStatement extends PDOStatement {
    private array $params=[]; private int $affected=0;
    public function __construct(private VehicleDb $db, private string $sql) {}
    public function execute(?array $params=null): bool {
        $this->params=$params??[];
        if (str_starts_with($this->sql,'SELECT * FROM vehicle_bookings')) return true;
        if (str_contains($this->sql,'UPDATE vehicle_bookings SET') && str_contains($this->sql,'request_history = ?')) {
            $id=$params[11]; $version=$params[12];
            $row=$this->db->rows[$id];
            if ($row['request_version']!==$version) return true;
            $keys=['destination','purpose','approval_letter_no','start_date','start_time','end_date','end_time',
                'passenger_count','teachers_list','students_list','request_history'];
            foreach($keys as $i=>$key)$row[$key]=$params[$i];
            $row['request_version']++; $row['status']='pending'; $row['booking_stage']='admin_review';
            foreach(['vehicle_id','assigned_driver_id','rental_details','deputy_comment','driver_ack_token_hash','driver_ack_token_expires'] as $key)$row[$key]=null;
            $row['is_external_rental']=0; $row['rental_cost']=0;
            $this->db->rows[$id]=$row; $this->affected=1;
            return true;
        }
        throw new RuntimeException('Unexpected SQL: '.$this->sql);
    }
    public function fetch(int $mode=PDO::FETCH_DEFAULT,int $cursorOrientation=PDO::FETCH_ORI_NEXT,int $cursorOffset=0): mixed { return $this->db->rows[$this->params[0]]??false; }
    public function rowCount(): int { return $this->affected; }
}
$source=file_get_contents(__DIR__.'/../api/vehicles.php');
$begin=strpos($source,'function vehicle_json('); $end=strpos($source,'function vehicle_role_user_ids(');
eval(substr($source,$begin,$end-$begin));
$begin=strpos($source,"} elseif (\$action === 'update_request') {")+strlen("} elseif (\$action === 'update_request') {");
$end=strpos($source,"} elseif (\$action === 'review')",$begin);
$editRoute=substr($source,$begin,$end-$begin);
function edit_trip(VehicleDb $database,array $input,string $owner='teacher'): VehicleResponse {
    global $editRoute; $currentUser=['id'=>$owner,'name'=>$owner];
    try { eval($editRoute); throw new RuntimeException('Missing response'); }
    catch (VehicleResponse $response) { if($database->inTransaction())$database->rollBack(); return $response; }
}
$trip=['id'=>'VB-original','user_id'=>'teacher','user_name'=>'Teacher','user_phone'=>'081','department'=>'Science',
 'destination'=>'Old place','purpose'=>'Study','approval_letter_no'=>'REF-1','start_date'=>'2099-11-10','start_time'=>'08:00:00',
 'end_date'=>'2099-11-10','end_time'=>'17:00:00','passenger_count'=>2,'teachers_list'=>'["Companion (Teacher)"]','students_list'=>'[]',
 'booking_stage'=>'completed','status'=>'approved','vehicle_id'=>'v1','assigned_driver_id'=>'driver',
 'is_external_rental'=>0,'rental_details'=>null,'rental_cost'=>0,'deputy_comment'=>'Approved',
 'driver_ack_token_hash'=>'old-secret-hash','driver_ack_token_expires'=>'2099-11-09','created_at'=>'2099-10-01 12:00:00',
 'academic_year'=>'2642','semester'=>'2','request_version'=>1,'request_history'=>null];
$input=['bookingId'=>'VB-original','requestVersion'=>1,'destination'=>'New place','purpose'=>'Study revised',
 'approvalLetterNo'=>'REF-2','startDate'=>'2099-11-11','startTime'=>'09:00','endDate'=>'2099-11-11','endTime'=>'18:00',
 'passengerCount'=>3,'teachersList'=>['Companion (Teacher)'],'studentsList'=>['Student'],
 'userId'=>'attacker','status'=>'approved','vehicleId'=>'v9','academicYear'=>'9999'];
$db=new VehicleDb(); $db->rows[$trip['id']]=$trip;
$response=edit_trip($db,$input);
check_vehicle($response->status===200,'Owner can edit approved future request');
$saved=$db->rows[$trip['id']];
check_vehicle(count($db->rows)===1 && $saved['id']===$trip['id'],'Same booking, no duplicate');
foreach(['user_id','user_name','user_phone','department','created_at','academic_year','semester'] as $key)check_vehicle($saved[$key]===$trip[$key],'Preserve '.$key);
check_vehicle($saved['destination']==='New place' && $saved['passenger_count']===3,'Persist all changed details');
check_vehicle($saved['status']==='pending' && $saved['booking_stage']==='admin_review','Restart approval');
check_vehicle($saved['request_version']===2 && $response->body['data']['requestVersion']===2,'Return new version');
foreach(['vehicle_id','assigned_driver_id','driver_ack_token_hash','driver_ack_token_expires','deputy_comment'] as $key)check_vehicle($saved[$key]===null,'Clear old '.$key);
$history=json_decode($saved['request_history'],true);
check_vehicle(count($history)===1 && $history[0]['previous']['destination']==='Old place' && $history[0]['previous']['assignedDriverId']==='driver','Save previous details/allocation');
check_vehicle(!str_contains($saved['request_history'],'old-secret-hash'),'Do not archive bearer-token hashes');
check_vehicle($db->notices[0]['users']===['teacher','stage-2','stage-3','driver'],'Notify owner, configured reviewers and old driver');
check_vehicle($db->notices[0]['id']===$trip['id'] && $db->notices[0]['fields']['ปลายทาง']==='New place','Notice references original booking and new details');
check_vehicle(edit_trip($db,$input)->status===409 && count($db->notices)===1,'Stale edit cannot overwrite or notify again');
check_vehicle(edit_trip($db,array_replace($input,['requestVersion'=>2]),'other-teacher')->status===403,'Another teacher cannot edit');
check_vehicle(edit_trip($db,array_replace($input,['requestVersion'=>2]))->status===200 && count($db->notices)===1 && $db->rows[$trip['id']]['request_version']===2,'Unchanged save keeps approval/version/no extra notice');
foreach(['admin_review','deputy_budget_allocation','driver_ack','completed','rejected'] as $stage) {
    $db=new VehicleDb(); $db->rows[$trip['id']]=array_replace($trip,['booking_stage'=>$stage,'status'=>$stage==='rejected'?'rejected':($stage==='admin_review'||$stage==='deputy_budget_allocation'?'pending':'approved')]);
    check_vehicle(edit_trip($db,$input)->status===200,'Editable before departure at '.$stage);
}
foreach([
 ['startDate'=>'2099-02-30'],['endTime'=>'08:00'],['passengerCount'=>0],['teachersList'=>['bad'=>1]],
 ['startTime'=>'99:99'],['requestVersion'=>0],['destination'=>['bad']],['passengerCount'=>20],
] as $bad) {
    $db=new VehicleDb(); $db->rows[$trip['id']]=$trip;
    check_vehicle(edit_trip($db,array_replace($input,$bad))->status>=400 && $db->rows[$trip['id']]===$trip && !$db->notices,'Invalid input has no side effects');
}
$db=new VehicleDb(); $db->rows[$trip['id']]=array_replace($trip,['start_date'=>'2000-01-01']);
check_vehicle(edit_trip($db,$input)->body['code']==='trip_started','Past trips are immutable');
// Real action SQL must guard the current revision/stage; old links must match the revoked token.
foreach(['admin_review','deputy_budget_allocation','driver_ack'] as $stage)check_vehicle(str_contains($source,"booking_stage = '$stage' AND request_version = ?")||str_contains($source,"booking_stage = '$stage' AND status = 'approved' AND request_version = ?"),'Guard stale '.$stage);
check_vehicle(str_contains($source,"driver_ack_token_hash=? AND booking_stage='driver_ack'"),'LINE acknowledgement uses token+stage');
check_vehicle(str_replace("\r\n","\n",file_get_contents(__DIR__.'/../api/vehicles.php'))===str_replace("\r\n","\n",file_get_contents(__DIR__.'/../public/api/vehicles.php')),'Production API mirror');
check_vehicle(hash_file('sha256',__DIR__.'/../api/vehicle-request-edit.php')===hash_file('sha256',__DIR__.'/../public/api/vehicle-request-edit.php'),'Validation mirror');
echo "Vehicle request edit route: ownership, revisions, history, workflow, notices, dates and payload integrity passed.\n";
