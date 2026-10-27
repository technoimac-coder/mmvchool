<?php
require __DIR__.'/../api/line-notifier.php';
function expect_readable($value,$message){if(!$value)throw new RuntimeException($message);}
$route=line_notification_presentation('e-Office: เกษียนและเสนอผู้รับลำดับถัดไป',[]);
expect_readable($route['headline']==='มีหนังสือรอให้คุณเกษียน','route instruction');
$ack=line_build_flex_message('e-Office: เกษียนและส่งถึงผู้ปฏิบัติ',['เรื่อง'=>'หนังสือทดสอบ','เลขรับ'=>'2210','ผู้ส่ง'=>'เจ้าหน้าที่','eoffice_ack_book'=>str_repeat('a',32)]);
expect_readable(str_contains($ack['altText'],'คุณได้รับหนังสือเพื่อรับทราบ'),'recipient headline');
expect_readable(count($ack['contents']['footer']['contents'])===2,'keep open and acknowledge buttons');
expect_readable($ack['contents']['footer']['contents'][1]['action']['type']==='postback','keep postback action');
expect_readable(!str_contains(json_encode($ack['contents']['body'],JSON_UNESCAPED_UNICODE),'eoffice_ack_book'),'hide internal metadata');
$done=line_notification_presentation('e-Office: ลงนามเอกสารครบแล้ว',[]);
expect_readable($done['headline']==='หนังสือลงนามครบแล้ว','completed is not pending');
$returned=line_notification_presentation('e-Office: เอกสารถูกส่งกลับแก้ไข',[]);
expect_readable($returned['color']==='#B42318','returned status');
$pending=line_notification_presentation('มีคำขอลารออนุมัติ',[]);
expect_readable($pending['icon']==='🔔','pending approval is not success');
$approved=line_notification_presentation('ใบลาได้รับการอนุมัติแล้ว',[]);
expect_readable($approved['icon']==='✅','approved status');
echo "PASS: clear event instructions, correct statuses, acknowledgement button and hidden metadata\n";