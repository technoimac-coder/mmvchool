<?php
declare(strict_types=1);
require_once __DIR__.'/../api/eoffice-share-lib.php';
function verify(bool $value,string $message):void {if(!$value)throw new RuntimeException($message);}
$db=new PDO('sqlite::memory:');$db->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
$db->exec('CREATE TABLE eoffice_incoming (id TEXT,stored_name TEXT,file_name TEXT,deleted_at TEXT,title TEXT,receipt_no TEXT,received_date TEXT,created_at TEXT,stamp_enabled INTEGER,workflow_id TEXT); CREATE TABLE eoffice_share_links (book_id TEXT,token_hash TEXT,revoked_at TEXT); CREATE TABLE document_workflows (id TEXT,signers_json TEXT)');
$token=bin2hex(random_bytes(32));$q=$db->prepare('INSERT INTO eoffice_incoming (id,stored_name,file_name,title,receipt_no,received_date,created_at,stamp_enabled,workflow_id) VALUES (?,?,?,?,?,?,?,?,?)');$q->execute(['A','random.pdf','letter.pdf','เรื่อง','123','2026-11-02','2026-11-02 10:00:00',1,'EO-1']);
$q=$db->prepare('INSERT INTO eoffice_share_links VALUES (?,?,NULL)');$q->execute(['A',hash('sha256',$token)]);
verify(eoffice_share_find($db,$token)['file_name']==='letter.pdf','valid token opens PDF');
$q=$db->prepare('INSERT INTO document_workflows VALUES (?,?)');
$q->execute(['EO-1',json_encode([['userId'=>'private-id','userName'=>'Signer','step'=>1,'status'=>'signed','signatureData'=>'data:image/png;base64,abc','privateNote'=>'hidden'],['userId'=>'pending','step'=>2,'status'=>'pending']])]);
$meta=eoffice_share_metadata($db,$token);
verify($meta['receiptStamp']['receiptNo']==='123','receipt number included');
verify(count($meta['signers'])===1 && $meta['signers'][0]['signatureData']==='data:image/png;base64,abc','only signed marks included');
verify(!isset($meta['signers'][0]['privateNote']) && $meta['signers'][0]['userId']!=='private-id','private fields and identifiers excluded');
$q=$db->prepare('UPDATE document_workflows SET signers_json=? WHERE id=?');
$q->execute([json_encode([['userName'=>'Signer','step'=>1,'status'=>'signed'],['userName'=>'Second','step'=>2,'status'=>'signed']]),'EO-1']);
verify(count(eoffice_share_metadata($db,$token)['signers'])===2,'the same token returns the latest signatures');


verify(eoffice_share_find($db,str_repeat('0',64))===null,'unknown token fails');
verify(eoffice_share_find($db,'../../file')===null,'malformed token fails');
$db->exec("UPDATE eoffice_share_links SET revoked_at='2026-01-01'");verify(eoffice_share_find($db,$token)===null && eoffice_share_metadata($db,$token)===null,'revoked token fails');
$db->exec("UPDATE eoffice_share_links SET revoked_at=NULL; UPDATE eoffice_incoming SET deleted_at='2026-01-01'");verify(eoffice_share_find($db,$token)===null,'deleted book fails');
$db->exec("UPDATE eoffice_incoming SET deleted_at=NULL,file_name='not-a-pdf.docx'");verify(eoffice_share_find($db,$token)===null,'non-PDF fails');
echo "PASS: public PDF token, revocation, deletion and file type\n";
