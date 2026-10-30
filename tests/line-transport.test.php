<?php
declare(strict_types=1);
require_once __DIR__ . '/../api/line-transport.php';
function transport_check(bool $ok,string $message):void { if(!$ok)throw new RuntimeException($message); }
$endpoint='https://api.line.me/v2/bot/message/push';
$payload=['to'=>'synthetic-recipient','messages'=>[['type'=>'text','text'=>'test']]];
foreach ([[0,200],[503,200],[0,409]] as $statuses) {
    $calls=[];
    $send=static function($url,$data,$token,$key)use(&$calls,$statuses){
        $status=$statuses[count($calls)];$calls[]=[$url,$data,$key];
        return ['status'=>$status,'error'=>'simulated','acceptedId'=>$status===409?'previously-accepted':''];
    };
    $result=line_delivery_request($endpoint,$payload,'synthetic-token','',2,$send,static fn($delay)=>null);
    transport_check($result['accepted'] && count($calls)===2,'Transient failures should retry');
    transport_check($calls[0]===$calls[1],'Retries must retain endpoint, payload and retry UUID');
    transport_check((bool)preg_match('/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/',$calls[0][2]),'Use a UUID retry key');
}
foreach ([400,401,403,409,429] as $status) {
    $count=0;
    $result=line_delivery_request($endpoint,$payload,'synthetic-token','',2,static function()use(&$count,$status){$count++;return ['status'=>$status,'error'=>'simulated','acceptedId'=>''];},static fn($delay)=>null);
    transport_check(!$result['accepted'] && !$result['retryable'] && $count===1,'Do not retry validation/auth/rate errors or unconfirmed conflicts');
}
foreach (['reply','validate/push'] as $path) {
    $keys=[];
    line_delivery_request('https://api.line.me/v2/bot/message/'.$path,$payload,'synthetic-token','',2,static function($u,$p,$t,$key)use(&$keys){$keys[]=$key;return ['status'=>0,'error'=>'simulated','acceptedId'=>''];});
    transport_check($keys===[''],'Do not attach unsupported retry headers or retry reply/validation');
}
$persistentKey=line_retry_uuid();$captured='';
line_delivery_request($endpoint,$payload,'synthetic-token',$persistentKey,1,static function($u,$p,$t,$key)use(&$captured){$captured=$key;return ['status'=>200,'error'=>'','acceptedId'=>''];});
transport_check($captured===$persistentKey,'Outbox retries must reuse their persisted UUID');
echo "PASS: DNS/5xx retries, unchanged payload/key, accepted conflicts, bounded attempts, 4xx and unsupported endpoint guards\n";
