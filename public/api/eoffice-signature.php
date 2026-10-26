<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';
$db=require_database();$user=require_user();
$db->exec("CREATE TABLE IF NOT EXISTS eoffice_signatures (
 user_id varchar(20) NOT NULL PRIMARY KEY, position varchar(255) NOT NULL,
 school varchar(255) NOT NULL, signature_data mediumtext NOT NULL,
 updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
if (($_SERVER['REQUEST_METHOD']??'GET')==='GET') {
 $q=$db->prepare('SELECT position,school,signature_data AS signatureData FROM eoffice_signatures WHERE user_id=?');
 $q->execute([$user['id']]);api_respond(['status'=>'success','data'=>$q->fetch()?:null]);
}
require_method('POST');require_csrf();$input=json_body();
$position=trim((string)($input['position']??''));$school=trim((string)($input['school']??''));
$signature=(string)($input['signatureData']??'');
if ($position==='' || $school==='' || mb_strlen($position)>255 || mb_strlen($school)>255) api_error('กรุณากรอกตำแหน่งและโรงเรียน ไม่เกินช่องละ 255 ตัวอักษร',422,'invalid_signature_profile');
if (strlen($signature)>200000 || !str_starts_with($signature,'data:image/png;base64,')) api_error('กรุณาเลือกรูปลายเซ็นใหม่',422,'invalid_signature');
$bytes=base64_decode(substr($signature,22),true);$size=$bytes===false?false:@getimagesizefromstring($bytes);
if (!$size || $size[2]!==IMAGETYPE_PNG || $size[0]!==600 || $size[1]!==200) api_error('รูปแบบลายเซ็นไม่ถูกต้อง กรุณาอัปโหลดใหม่',422,'invalid_signature');
$q=$db->prepare('INSERT INTO eoffice_signatures (user_id,position,school,signature_data) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE position=VALUES(position),school=VALUES(school),signature_data=VALUES(signature_data)');
$q->execute([$user['id'],$position,$school,$signature]);
api_respond(['status'=>'success']);
