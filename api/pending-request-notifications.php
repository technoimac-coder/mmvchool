<?php
declare(strict_types=1);
function pending_request_recipients(PDO $db,string $module,array $row): array {
    if($module==='leave'){
        $q=$db->prepare('SELECT personnel_type FROM users WHERE id=?');$q->execute([$row['user_id']]);
        return [$q->fetchColumn()==='ครูต่างชาติ'?workflow_assignee('pipe-leave-foreign',1,'MMV11'):workflow_assignee('pipe-leave',2,'MMV14')];
    }
    if($module==='official_duty')return [workflow_assignee('pipe-duty',2,'MMV04')];
    if($module==='repair'){
        $q=$db->prepare('SELECT user_id FROM repair_assignments WHERE role_key=?');
        $q->execute([$row['category']==='building'?'building_reviewer':'audiovisual_handler']);
        return [(string)($q->fetchColumn()?:($row['category']==='building'?'MMV03':'MMV18'))];
    }
    if($module==='substitute')return [(string)$row['substitute_teacher_id']];
    if($row['booking_stage']==='pending_deputy')return [workflow_assignee('pipe-room',2,'MMV03')];
    $q=$db->prepare('SELECT manager_id,manager_ids FROM meeting_rooms WHERE id=?');$q->execute([$row['room_id']]);$room=$q->fetch(PDO::FETCH_ASSOC);
    return array_values(array_unique(array_filter(array_merge([(string)($room['manager_id']??'')],json_decode((string)($room['manager_ids']??'[]'),true)?:[]))));
}
function pending_request_notify(PDO $db,string $module,array $row,array $before,array $user): void {
    $labels=['leave'=>'ใบลา','official_duty'=>'คำขอไปราชการ','room'=>'คำขอใช้อาคารสถานที่','repair'=>'รายการแจ้งซ่อม','substitute'=>'รายการสอนแทน'];
    $title=$labels[$module].'มีการแก้ไข รอดำเนินการ';
    $fields=['เลขที่'=>$row['id'],'ผู้แก้ไข'=>$user['name'],'รายการ'=>$row['title']??$row['subject_name']??$row['leave_type'],'ฉบับข้อมูล'=>(string)$row['request_version'],'ดำเนินการ'=>'กรุณาเปิดตรวจข้อมูลล่าสุดก่อนดำเนินการ'];
    $targets=pending_request_recipients($db,$module,$row);
    if(!$targets)throw new PendingRequestError('ยังไม่ได้ตั้งค่าผู้รับผิดชอบ กรุณาติดต่อผู้ดูแลระบบ',503,'reviewer_unavailable');
    $bilingual=false;if($module==='leave'){$q=$db->prepare('SELECT personnel_type FROM users WHERE id=?');$q->execute([$row['user_id']]);$bilingual=$q->fetchColumn()==='ครูต่างชาติ';}
    if($bilingual){$title.=' / Request updated, awaiting review';$fields['Action']='Open the latest request details before taking action.';}
    $oldTargets=array_values(array_diff(pending_request_recipients($db,$module,$before),$targets));
    $active=$db->prepare("SELECT id FROM users WHERE id=? AND status='active'");
    $insert=$db->prepare('INSERT INTO notifications(user_id,title,message,module,related_id,created_at) VALUES(?,?,?,?,?,NOW())');
    foreach([[$targets,$title],[$oldTargets,$labels[$module].'เปลี่ยนข้อมูลหรือผู้รับผิดชอบแล้ว']] as [$ids,$label]){
        $ids=array_values(array_unique(array_filter($ids)));$valid=[];
        foreach($ids as $target){$active->execute([$target]);$canonical=$active->fetchColumn();if($canonical){$valid[]=(string)$canonical;$insert->execute([$canonical,$label,$fields['รายการ'].' — ฉบับข้อมูล '.$row['request_version'],$module,$row['id']]);}}
        if($ids===$targets&&count($valid)!==count($ids))throw new PendingRequestError('บัญชีผู้รับผิดชอบไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ',503,'reviewer_unavailable');
        if($valid)line_notify_linked_users($db,$valid,$label,$fields);
    }
}
