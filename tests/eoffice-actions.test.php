<?php
declare(strict_types=1);
// Exercise state transitions without a production database or LINE credentials.
require_once __DIR__ . '/../api/eoffice-actions.php';
class OfficeResponse extends RuntimeException { public function __construct(public int $status) {} }
function api_respond(array $body, int $status=200): never { throw new OfficeResponse($status); }
function api_error(string $message,int $status,string $code): never { throw new OfficeResponse($status); }
class OfficeDatabase extends PDO {
    public bool $transaction=false;
    public array $writes=[];
    public array $book=['id'=>'book','title'=>'Test letter','receipt_no'=>'12','sender'=>'District','academic_year'=>'2569','file_name'=>'test.pdf','workflow_id'=>'EO-test','stage'=>'routing','created_by'=>'staff'];
    public array $workflow=['id'=>'EO-test','status'=>'completed','signers_json'=>'[{"userId":"director","userName":"Director","step":1,"status":"signed","comment":"Keep this note"}]'];
    public array $people=[['id'=>'teacher','name'=>'Teacher']];
    public mixed $task=false;
    public int $pending=0;
    public function __construct() {}
    public function beginTransaction(): bool {$this->transaction=true;return true;}
    public function commit(): bool {$this->transaction=false;return true;}
    public function rollBack(): bool {$this->transaction=false;$this->writes=[];return true;}
    public function inTransaction(): bool {return $this->transaction;}
    public function prepare(string $query,array $options=[]): PDOStatement|false {return new OfficeStatement($this,$query);}
}
class OfficeStatement extends PDOStatement {
    public function __construct(private OfficeDatabase $db,private string $sql) {}
    public function execute(?array $params=null): bool {
        if (!str_starts_with($this->sql,'SELECT')) $this->db->writes[]=[$this->sql,$params];
        return true;
    }
    public function fetch(int $mode=PDO::FETCH_DEFAULT,int $orientation=PDO::FETCH_ORI_NEXT,int $offset=0): mixed {
        if (str_contains($this->sql,'FROM eoffice_incoming')) return $this->db->book;
        if (str_contains($this->sql,'FROM document_workflows')) return $this->db->workflow;
        if (str_contains($this->sql,'FROM eoffice_tasks')) return $this->db->task;
        return false;
    }
    public function fetchAll(int $mode=PDO::FETCH_DEFAULT,mixed ...$args): array {return $this->db->people;}
    public function fetchColumn(int $column=0): mixed {return $this->db->pending;}
}
function check(bool $value,string $label): void {if (!$value) throw new RuntimeException($label);}
function perform(OfficeDatabase $db,string $action,bool $staff=true,array $extra=[]): int {
    $_POST=['id'=>'book','action'=>$action]+$extra;
    try {eoffice_action($db,['id'=>'staff','name'=>'Staff'],$staff);}
    catch(OfficeResponse $response){check(!$db->inTransaction(),'transaction must be closed');return $response->status;}
}
$db=new OfficeDatabase();
check(perform($db,'route',true,['user_ids'=>['teacher']])===200,'route completed document');
$update=array_values(array_filter($db->writes,fn($write)=>str_contains($write[0],'UPDATE document_workflows')))[0];
$signers=json_decode($update[1][0],true);
check(count($signers)===2 && $signers[0]['comment']==='Keep this note' && $signers[1]['userId']==='teacher','preserve old annotations and append new signer');
$db=new OfficeDatabase();$db->workflow['status']='pending';
check(perform($db,'distribute',true,['user_ids'=>['teacher']])===422 && !$db->writes,'block distribution before signing');
$db=new OfficeDatabase();
check(perform($db,'route',false,['user_ids'=>['teacher']])===422,'block unrelated staff forwarding');
$db=new OfficeDatabase();$db->people[]=['id'=>'teacher2','name'=>'Teacher Two'];
check(perform($db,'distribute',true,['user_ids'=>['teacher','teacher2']])===200,'distribute to several people');
check(count(array_filter($db->writes,fn($w)=>str_contains($w[0],'INSERT INTO eoffice_tasks')))===2,'one task per recipient');
$db=new OfficeDatabase();$db->pending=1;
check(perform($db,'archive')===422 && !$db->writes,'block archive with pending tasks');
$db=new OfficeDatabase();
check(perform($db,'report',false,['note'=>'Done'])===422,'only an assignee may report');
$db=new OfficeDatabase();$db->task=['id'=>1,'status'=>'pending'];
check(perform($db,'acknowledge',false)===200,'assignee acknowledges');
$db=new OfficeDatabase();$db->task=['id'=>1,'status'=>'acknowledged'];
check(perform($db,'report',false,['note'=>'Done'])===200,'assignee reports and notifies owner');
check(count(array_filter($db->writes,fn($w)=>str_contains($w[0],'INSERT INTO notifications')))===1,'report notifies registrar');
$db=new OfficeDatabase();$db->book['stage']='archived';
check(perform($db,'follow',true,['follow_date'=>'2026-10-26'])===422,'archived records are closed');
check(eoffice_valid_date('2026-10-26')&&!eoffice_valid_date('2026-02-30'),'validate dates');
echo "PASS: routing, annotation preservation, authorization, distribution, reporting, archive and dates\n";
