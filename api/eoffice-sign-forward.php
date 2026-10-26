<?php
declare(strict_types=1);
// Called inside the signing transaction: signature and forwarding succeed together.
function eoffice_sign_forward(PDO $db, array $user, string $workflowId, array $signers, array $forward): array {
    $mode=(string)($forward['mode']??'none');
    if (!in_array($mode,['none','route','distribute'],true)) throw new RuntimeException('วิธีส่งต่อไม่ถูกต้อง');
    $date=(string)($forward['endorsementDate']??'');
    if ($date!=='') {
        $parsed=DateTimeImmutable::createFromFormat('!Y-m-d',$date);
        if (!$parsed || $parsed->format('Y-m-d')!==$date) throw new RuntimeException('วันที่เกษียนไม่ถูกต้อง');
    }
    if ($mode==='none') return ['signers'=>$signers,'targets'=>[]];
    $q=$db->prepare('SELECT * FROM eoffice_incoming WHERE workflow_id=? FOR UPDATE');
    $q->execute([$workflowId]);$book=$q->fetch();
    if (!$book || in_array($book['stage'],['archived','distributed'],true)) throw new RuntimeException('หนังสือนี้ไม่พร้อมส่งต่อ');
    $last=$signers ? end($signers) : null;
    if (!$last || $last['userId']!==$user['id'] || $last['status']!=='signed') throw new RuntimeException('ส่งต่อได้เมื่อลงนามขั้นสุดท้ายแล้ว');
    $ids=$forward['recipientIds']??[];
    if (!is_array($ids)) throw new RuntimeException('รายชื่อผู้รับไม่ถูกต้อง');
    $ids=array_values(array_unique(array_filter(array_map('strval',$ids))));
    if (!$ids || count($ids)>100 || ($mode==='route' && count($ids)!==1)) throw new RuntimeException('เลือกผู้รับเกษียน 1 คน หรือผู้ปฏิบัติ 1–100 คน');
    $q=$db->prepare("SELECT id,name FROM users WHERE status='active' AND id IN (" . implode(',',array_fill(0,count($ids),'?')) . ')');
    $q->execute($ids);$people=$q->fetchAll();
    if (count($people)!==count($ids) || array_diff($ids,array_map('strval',array_column($people,'id')))) throw new RuntimeException('ผู้รับบางคนไม่ได้ปฏิบัติงาน กรุณาเลือกใหม่');
    $note=mb_substr(trim((string)($forward['instruction']??'')),0,4000);
    if ($mode==='route') {
        $signers[]=['userId'=>$people[0]['id'],'userName'=>$people[0]['name'],'step'=>count($signers)+1,'status'=>'pending'];
        $q=$db->prepare("UPDATE eoffice_incoming SET responsible_id=?,responsible_name=?,stage='routing' WHERE id=?");
        $q->execute([$people[0]['id'],$people[0]['name'],$book['id']]);
        $label='เกษียนและเสนอผู้รับลำดับถัดไป';
    } else {
        $q=$db->prepare('INSERT INTO eoffice_tasks (book_id,user_id,user_name,instruction) VALUES (?,?,?,?)');
        foreach ($people as $person) $q->execute([$book['id'],$person['id'],$person['name'],$note]);
        $db->prepare("UPDATE eoffice_incoming SET stage='distributed' WHERE id=?")->execute([$book['id']]);
        $label='เกษียนและส่งถึงผู้ปฏิบัติ';
    }
    $q=$db->prepare('INSERT INTO eoffice_history (book_id,actor_name,action,note) VALUES (?,?,?,?)');
    $q->execute([$book['id'],$user['name'],$label,implode(', ',array_column($people,'name')) . ($note?' — ' . $note:'')]);
    $q=$db->prepare('INSERT INTO notifications (user_id,title,message,module,related_id,created_at) VALUES (?,?,?,?,?,NOW())');
    foreach ($ids as $target) $q->execute([$target,'e-Office: ' . $label,$book['title'] . ($note?' — ' . $note:''),'eoffice',$book['id']]);
    return ['signers'=>$signers,'targets'=>$ids,'title'=>'e-Office: ' . $label,'message'=>$book['title'] . ($note?' — ' . $note:''),'ackBook'=>$mode==='distribute'?$book['id']:null];
}

