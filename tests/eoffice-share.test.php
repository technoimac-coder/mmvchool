<?php
declare(strict_types=1);
require_once __DIR__.'/../api/eoffice-share-lib.php';
function verify(bool $value,string $message):void {if(!$value)throw new RuntimeException($message);}
$db=new PDO('sqlite::memory:');$db->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
$db->exec('CREATE TABLE eoffice_incoming (id TEXT,stored_name TEXT,file_name TEXT,deleted_at TEXT); CREATE TABLE eoffice_share_links (book_id TEXT,token_hash TEXT,revoked_at TEXT)');
$token=bin2hex(random_bytes(32));$q=$db->prepare('INSERT INTO eoffice_incoming VALUES (?,?,?,NULL)');$q->execute(['A','random.pdf','letter.pdf']);
$q=$db->prepare('INSERT INTO eoffice_share_links VALUES (?,?,NULL)');$q->execute(['A',hash('sha256',$token)]);
verify(eoffice_share_find($db,$token)['file_name']==='letter.pdf','valid token opens PDF');
verify(eoffice_share_find($db,str_repeat('0',64))===null,'unknown token fails');
verify(eoffice_share_find($db,'../../file')===null,'malformed token fails');
$db->exec("UPDATE eoffice_share_links SET revoked_at='2026-01-01'");verify(eoffice_share_find($db,$token)===null,'revoked token fails');
$db->exec("UPDATE eoffice_share_links SET revoked_at=NULL; UPDATE eoffice_incoming SET deleted_at='2026-01-01'");verify(eoffice_share_find($db,$token)===null,'deleted book fails');
$db->exec("UPDATE eoffice_incoming SET deleted_at=NULL,file_name='not-a-pdf.docx'");verify(eoffice_share_find($db,$token)===null,'non-PDF fails');
echo "PASS: public PDF token, revocation, deletion and file type\n";
