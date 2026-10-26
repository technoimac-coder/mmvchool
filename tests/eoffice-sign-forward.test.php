<?php
declare(strict_types=1);
require_once __DIR__ . '/eoffice-actions.test.php';
require_once __DIR__ . '/../api/eoffice-sign-forward.php';
$user=['id'=>'director','name'=>'Director'];
$signed=[['userId'=>'director','userName'=>'Director','step'=>1,'status'=>'signed','signatureData'=>'saved-signature','textAnnotations'=>[['text'=>'Original instruction']]]];
$db=new OfficeDatabase();$db->beginTransaction();
$result=eoffice_sign_forward($db,$user,'EO-test',$signed,['mode'=>'route','recipientIds'=>['teacher'],'endorsementDate'=>'2026-10-26']);
check($db->inTransaction(),'helper must not commit the signing transaction');
check(count($result['signers'])===2 && $result['signers'][0]===$signed[0],'keep existing signature and text');
check($result['signers'][1]['userId']==='teacher' && $result['signers'][1]['step']===2,'append next signer');
check(count(array_filter($db->writes,fn($w)=>str_contains($w[0],'INSERT INTO notifications')))===1,'notify next signer exactly once');
$db->rollBack();
$db=new OfficeDatabase();$db->people[]=['id'=>'teacher2','name'=>'Teacher Two'];$db->beginTransaction();
$result=eoffice_sign_forward($db,$user,'EO-test',$signed,['mode'=>'distribute','recipientIds'=>['teacher','teacher2'],'instruction'=>'Please proceed','endorsementDate'=>'2026-10-26']);
check(count($result['signers'])===1,'final recipients are task assignees, not extra signatures');
check(count(array_filter($db->writes,fn($w)=>str_contains($w[0],'INSERT INTO eoffice_tasks')))===2,'create independent recipient tasks');
check(count(array_filter($db->writes,fn($w)=>str_contains($w[0],'INSERT INTO notifications')))===2,'one notification per recipient');
$db->rollBack();
foreach ([
 ['mode'=>'route','recipientIds'=>[]],
 ['mode'=>'route','recipientIds'=>['teacher','teacher2']],
 ['mode'=>'distribute','recipientIds'=>['inactive']],
 ['mode'=>'none','endorsementDate'=>'2026-02-30'],
] as $invalid) {
 $db=new OfficeDatabase();$db->beginTransaction();$rejected=false;
 try{eoffice_sign_forward($db,$user,'EO-test',$signed,$invalid);}catch(RuntimeException $e){$rejected=true;}
 check($rejected && !$db->writes,'invalid forwarding must fail before changing records');$db->rollBack();
}
$db=new OfficeDatabase();$db->beginTransaction();$failed=false;
try{eoffice_sign_forward($db,['id'=>'other','name'=>'Other'],'EO-test',$signed,['mode'=>'route','recipientIds'=>['teacher']]);}catch(RuntimeException $e){$failed=true;}
check($failed && !$db->writes,'unrelated actor must not forward while signing');$db->rollBack();
echo "PASS: atomic sign forwarding, preserved annotations, recipient tasks and validation\n";
