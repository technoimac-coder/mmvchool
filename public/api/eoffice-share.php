<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';
require_method('GET');
require_once __DIR__.'/eoffice-share-lib.php';
$token=(string)($_GET['token']??'');
$db=require_database();
$book=eoffice_share_find($db,$token);
if (!$book) api_error('ลิงก์ถูกยกเลิกหรือไม่พบเอกสาร',404,'not_found');
$path=__DIR__.'/../storage/eoffice/'.basename((string)$book['stored_name']);
if (!is_file($path)) api_error('ไม่พบไฟล์เอกสาร',404,'not_found');
header('Content-Type: application/pdf');
header("Content-Disposition: inline; filename*=UTF-8''".rawurlencode((string)$book['file_name']));
header('Content-Length: '.filesize($path));
header('Referrer-Policy: no-referrer');
readfile($path); exit;
