<?php
declare(strict_types=1);
// Run the real signing route with an isolated in-memory PDO double. No LINE credentials/network.
require_once __DIR__ . '/../api/document-workflow-revisions.php';
require_once __DIR__ . '/../api/document-workflow-notification.php';
require_once __DIR__ . '/../api/line-notifier.php';
function completion_check(bool $condition, string $message): void { if (!$condition) throw new RuntimeException($message); }
class CompletionResponse extends RuntimeException {
    public function __construct(public int $status, public array $body) { parent::__construct((string) $status); }
}
function api_error(string $message, int $status, string $code): never { throw new CompletionResponse($status, ['code'=>$code]); }
function api_respond(array $body, int $status=200): never { throw new CompletionResponse($status, $body); }
class CompletionDb extends PDO {
    public array $documents=[];
    public array $notifications=[];
    public array $jobs=[];
    public array $dispatched=[];
    private bool $transaction=false;
    private array $snapshot=[];
    public function __construct() {}
    public function beginTransaction(): bool { $this->snapshot=[$this->documents,$this->notifications,$this->jobs]; $this->transaction=true; return true; }
    public function commit(): bool { $this->transaction=false; return true; }
    public function rollBack(): bool { [$this->documents,$this->notifications,$this->jobs]=$this->snapshot; $this->transaction=false; return true; }
    public function inTransaction(): bool { return $this->transaction; }
    public function prepare(string $sql, array $options=[]): PDOStatement|false { return new CompletionStatement($this,$sql); }
}
function line_outbox_enqueue_completion(PDO $db,array $userIds,string $title,array $fields,string $workflowId):array {
    completion_check($db->inTransaction(),'Completion job must be atomic with signing');
    $db->jobs[$workflowId]=[$userIds,$title,$fields];
    return [$workflowId];
}
function line_outbox_drain(PDO $db,int $limit=3,?array $ids=null):array {
    completion_check(!$db->inTransaction(),'Network dispatch must happen after commit');
    foreach($ids??[] as $id)$db->dispatched[]=$id;
    return [];
}
function line_outbox_enqueue_event(PDO $db,array $ids,string $title,array $fields,?string $image=null):array { return []; }
class CompletionStatement extends PDOStatement {
    public function __construct(private CompletionDb $db, private string $sql) {}
    public function execute(?array $params=null): bool {
        if (str_starts_with($this->sql,'UPDATE document_workflows SET signers_json')) {
            [$signers,$step,$status,$id]=$params;
            $this->db->documents[$id]['signers']=json_decode($signers,true);
            $this->db->documents[$id]['currentStep']=$step;
            $this->db->documents[$id]['status']=$status;
        } elseif (str_starts_with($this->sql,'INSERT INTO notifications')) {
            $this->db->notifications[]=$params;
        } elseif (!str_starts_with($this->sql,'SELECT line_user_id FROM line_accounts')) {
            throw new RuntimeException('Unexpected query: '.$this->sql);
        }
        return true;
    }
    public function fetchAll(int $mode=PDO::FETCH_DEFAULT, mixed ...$args): array { return []; }
}
function workflow_get(PDO $db,string $id,bool $lock=false): array { return $db->documents[$id]; }
$source=file_get_contents(__DIR__.'/../api/document_workflows.php');
$validationStart=strpos($source,'function workflow_validate_comment_image(');
$notificationStart=strpos($source,'function workflow_notify(');
eval(substr($source,$validationStart,$notificationStart-$validationStart));
$notificationEnd=strpos($source,'function workflow_get(',$notificationStart);
eval(str_replace('__DIR__',var_export(dirname(__DIR__).'/api',true),substr($source,$notificationStart,$notificationEnd-$notificationStart)));
$routeStart=strpos($source,"if (!in_array(\$action, ['sign', 'reject'], true))");
$routeStart=strpos($source,'$db->beginTransaction();',$routeStart);
$routeEnd=strpos($source,"if (\$action === 'reject')",$routeStart);
$signingRoute=substr($source,$routeStart,$routeEnd-$routeStart);

function complete_file(CompletionDb $db,string $id,string $userId,int $version=1): int {
    global $signingRoute;
    $action='sign'; $user=['id'=>$userId,'name'=>$userId];
    // A valid transparent 600x200 PNG without relying on a graphics extension.
    $chunk=static fn(string $kind,string $bytes):string=>pack('N',strlen($bytes)).$kind.$bytes.pack('N',crc32($kind.$bytes));
    $png="\x89PNG\r\n\x1a\n".$chunk('IHDR',pack('NNCCCCC',600,200,8,6,0,0,0))
        .$chunk('IDAT',gzcompress(str_repeat("\0".str_repeat("\0",600*4),200))).$chunk('IEND','');
    $input=['fileVersion'=>$version,'signatureData'=>'data:image/png;base64,'.base64_encode($png),
        'placement'=>['page'=>1,'x'=>.1,'y'=>.7,'width'=>.2,'height'=>.05]];
    try { eval($signingRoute); throw new RuntimeException('Missing API response'); }
    catch (CompletionResponse $response) { if($db->inTransaction())$db->rollBack(); return $response->status; }
}

$db=new CompletionDb();
for($index=1;$index<=10;$index++) {
    $id='DOC-plan-'.$index;
    $db->documents[$id]=['id'=>$id,'title'=>'แผนการสอน','fileName'=>'แผนที่ '.$index.'.pdf',
        'createdBy'=>'teacher-A','status'=>'pending','currentStep'=>1,'fileVersion'=>1,'batchId'=>'same-batch',
        'signers'=>[['userId'=>'first','userName'=>'First','step'=>1,'status'=>'pending'],['userId'=>'last','userName'=>'Last','step'=>2,'status'=>'pending']]];
}
completion_check(complete_file($db,'DOC-plan-1','first')===200,'First signer failed');
completion_check(count($db->notifications)===1 && $db->notifications[0][0]==='last','Intermediate signing must notify next signer, not sender');
completion_check(complete_file($db,'DOC-plan-1','last')===200,'Last signer failed');
$notice=$db->notifications[1];
completion_check($notice[0]==='teacher-A' && $notice[3]==='document_workflow' && $notice[4]==='DOC-plan-1','Completion must notify the owner with the exact document ID');
completion_check(str_contains($notice[2],'แผนที่ 1.pdf') && str_contains($notice[2],'2/2') && str_contains($notice[2],'ฉบับที่ 1'),'Web notification must identify filename, completed signatures and version');
completion_check($db->documents['DOC-plan-2']['status']==='pending','Other files in the batch must remain pending');
completion_check(complete_file($db,'DOC-plan-1','last')===409 && count($db->notifications)===2,'A retry must not duplicate a completion notice');
completion_check(complete_file($db,'DOC-plan-2','unrelated')===403 && count($db->notifications)===2,'An unrelated signer must not generate a notice');
completion_check(complete_file($db,'DOC-plan-2','first')===200 && complete_file($db,'DOC-plan-2','last')===200,'Second file failed');
completion_check(str_contains($db->notifications[3][2],'แผนที่ 2.pdf') && $db->notifications[3][4]==='DOC-plan-2','Each completed file must have a separate notice');
$db->documents['DOC-plan-3']['fileVersion']=2;
completion_check(complete_file($db,'DOC-plan-3','first',1)===409,'A stale version must not notify');
completion_check(complete_file($db,'DOC-plan-3','first',2)===200 && complete_file($db,'DOC-plan-3','last',2)===200,'Revised file failed');
completion_check(str_contains($db->notifications[5][2],'ฉบับที่ 2'),'Revised completion must identify the current version');
$details=workflow_completion_notice($db->documents['DOC-plan-3'],$db->documents['DOC-plan-3']['signers']);
$flex=line_build_flex_message('ลงนามเอกสารครบแล้ว',$details['fields']);
$body=json_encode($flex['contents']['body'],JSON_UNESCAPED_UNICODE);
completion_check(str_contains($body,'แผนที่ 3.pdf') && str_contains($body,'ฉบับที่') && str_contains($body,'ลงนามครบแล้ว'),'LINE card must show the completed file and revision');
completion_check(str_contains($flex['altText'],'เอกสารของคุณลงนามครบแล้ว'),'Completion must be shown as success');
completion_check($flex['contents']['footer']['contents'][0]['action']['uri']==='https://mmvschool.ac.th/#document_workflow','Completion button must open the document module');
completion_check(line_notification_presentation('e-Office: ลงนามเอกสารครบแล้ว',[])['module']==='eoffice','Keep e-Office routing separate');
completion_check(count(array_filter($db->documents,static fn($item)=>$item['status']==='pending'))===7,'The remaining batch files must stay pending');
completion_check(count($db->jobs)===3 && count($db->dispatched)===3,'Only completed files should enqueue and dispatch once');
echo "PASS: per-file owner notifications, partial batch completion, next signer, retries, unrelated accounts, stale/revised versions, readable LINE card and separate e-Office routing\n";
