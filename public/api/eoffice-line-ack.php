<?php
declare(strict_types=1);
// Only called after LINE webhook signature verification.
function eoffice_line_ack(PDO $db,string $lineUserId,string $bookId):string {
 $q=$db->prepare("SELECT u.id,u.name FROM line_accounts a JOIN users u ON u.id=a.user_id WHERE a.line_user_id=? AND a.status='active' AND u.status='active'");
 $q->execute([$lineUserId]);$user=$q->fetch();
 if(!$user)return 'กรุณาเชื่อมบัญชี LINE กับบัญชีบุคลากรก่อน';
 $db->beginTransaction();
 try{
  $q=$db->prepare('SELECT id,title,stage,deleted_at FROM eoffice_incoming WHERE id=? FOR UPDATE');$q->execute([$bookId]);$book=$q->fetch();
  if(!$book || $book['deleted_at']!==null){$db->rollBack();return 'ไม่พบหนังสือหรือถูกลบแล้ว';}
  $q=$db->prepare('SELECT id,status FROM eoffice_tasks WHERE book_id=? AND user_id=? FOR UPDATE');$q->execute([$bookId,$user['id']]);$task=$q->fetch();
  if(!$task){$db->rollBack();return 'คุณไม่ได้เป็นผู้รับหนังสือฉบับนี้';}
  if(in_array($task['status'],['acknowledged','completed'],true)){$db->commit();return 'คุณรับทราบหนังสือฉบับนี้แล้ว: '.$book['title'];}
  if($book['stage']!=='distributed'||$task['status']!=='pending'){$db->rollBack();return 'หนังสือยังไม่พร้อมรับทราบหรือจัดเก็บแล้ว';}
  $db->prepare("UPDATE eoffice_tasks SET status='acknowledged',acknowledged_at=NOW() WHERE id=? AND status='pending'")->execute([$task['id']]);
  $db->prepare('INSERT INTO eoffice_history (book_id,actor_name,action,note) VALUES (?,?,?,?)')->execute([$bookId,$user['name'],'รับทราบ','รับทราบผ่าน LINE']);
  $db->commit();return 'บันทึกรับทราบแล้ว: '.$book['title'];
 }catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
}
