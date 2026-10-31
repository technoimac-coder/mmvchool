<?php
declare(strict_types=1);
require_once __DIR__.'/pending-request-edit.php';
function eoffice_book_editable(PDO $db,array $book,?array $workflow=null): bool {
    if(!empty($book['deleted_at'])||!in_array($book['stage']??'',['registered','routing'],true))return false;
    if(!empty($book['workflow_id'])){
        if($workflow===null){$q=$db->prepare('SELECT * FROM document_workflows WHERE id=?');$q->execute([$book['workflow_id']]);$workflow=$q->fetch(PDO::FETCH_ASSOC)?:null;}
        if(!$workflow||in_array($workflow['status'],['rejected'],true))return false;
        foreach(json_decode((string)$workflow['signers_json'],true)?:[] as $signer)if(($signer['userId']??'')!==($book['created_by']??'')&&($signer['status']??'pending')!=='pending')return false;
    }
    return true;
}
function eoffice_update_book(PDO $db,array $user,string $id,array $fields,int $version,?callable $notify=null): bool {
    $db->beginTransaction();
    try {
        $q=$db->prepare('SELECT * FROM eoffice_incoming WHERE id=? FOR UPDATE');$q->execute([$id]);$before=$q->fetch(PDO::FETCH_ASSOC);
        if(!$before||!empty($before['deleted_at']))throw new PendingRequestError('ไม่พบหนังสือ',404,'not_found');
        if((string)$before['created_by']!==(string)$user['id'])throw new PendingRequestError('แก้ไขได้เฉพาะหนังสือที่ตนเองลงทะเบียน',403,'forbidden');
        if((int)($before['request_version']??1)!==$version)throw new PendingRequestError('ข้อมูลเปลี่ยนแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนแก้ไข');
        $workflow=null;
        if(!empty($before['workflow_id'])){$q=$db->prepare('SELECT * FROM document_workflows WHERE id=? FOR UPDATE');$q->execute([$before['workflow_id']]);$workflow=$q->fetch(PDO::FETCH_ASSOC)?:null;}
        if(!eoffice_book_editable($db,$before,$workflow))throw new PendingRequestError('ผู้รับเริ่มดำเนินการแล้ว ไม่สามารถแก้ไขหนังสือได้',409,'request_already_started');
        $allowed=['receipt_no','academic_year','book_no','title','sender','book_date','received_date','recipient','details','urgency'];
        $fields=array_intersect_key($fields,array_flip($allowed));
        $changes=[];foreach($fields as $key=>$value)if((string)($before[$key]??'')!==(string)$value)$changes[]=$key;
        if(!$changes){$db->commit();return false;}
        $q=$db->prepare('UPDATE eoffice_incoming SET '.implode(',',array_map(static fn($key)=>$key.'=?',array_keys($fields))).',request_version=request_version+1 WHERE id=?');$q->execute([...array_values($fields),$id]);
        if($workflow){$q=$db->prepare('UPDATE document_workflows SET title=?,file_version=file_version+1 WHERE id=?');$q->execute([$fields['title']??$before['title'],$workflow['id']]);}
        eoffice_history($db,$id,$user['name'],'แก้ไขข้อมูลหนังสือ',json_encode(['fields'=>$changes,'version'=>$version+1],JSON_UNESCAPED_UNICODE));
        if($notify)$notify(array_replace($before,$fields,['request_version'=>$version+1]),$workflow);
        $db->commit();return true;
    }catch(Throwable $error){if($db->inTransaction())$db->rollBack();throw $error;}
}
function eoffice_valid_date(string $value): bool {
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    return $date && $date->format('Y-m-d') === $value;
}
function eoffice_history(PDO $db, string $id, string $actor, string $action, string $note): void {
    $q = $db->prepare('INSERT INTO eoffice_history (book_id,actor_name,action,note) VALUES (?,?,?,?)');
    $q->execute([$id,$actor,$action,$note]);
}
function eoffice_action(PDO $db, array $user, bool $staff): never {
    $action = (string) $_POST['action'];
    $id = (string) ($_POST['id'] ?? '');
    $targets = []; $path = null;
    $db->beginTransaction();
    try {
        $q = $db->prepare('SELECT * FROM eoffice_incoming WHERE id=? FOR UPDATE');
        $q->execute([$id]); $book = $q->fetch();
        if (!$book) throw new RuntimeException('ไม่พบหนังสือ');
        $workflow = null;
        if ($book['workflow_id']) {
            $q = $db->prepare('SELECT * FROM document_workflows WHERE id=? FOR UPDATE');
            $q->execute([$book['workflow_id']]); $workflow = $q->fetch();
        }
        $signers = $workflow ? json_decode($workflow['signers_json'],true) : [];
        // The last officer who has signed may forward the same document.
        $last = $signers ? end($signers) : null;
        $canForward = $staff || ($last && $last['userId'] === $user['id'] && $last['status'] === 'signed');
        $note = mb_substr(trim((string) ($_POST['note'] ?? '')),0,4000);
        if ($book['stage'] === 'archived') throw new RuntimeException('หนังสือจัดเก็บแล้ว');
        if (in_array($action,['route','distribute'],true)) {
            if (!$canForward) throw new RuntimeException('คุณไม่มีสิทธิ์ส่งต่อหนังสือ');
            if ($workflow && $workflow['status'] !== 'completed' && !($staff && $workflow['status'] === 'rejected' && $action === 'route')) throw new RuntimeException('กรุณาให้ผู้รับปัจจุบันลงนามให้เสร็จก่อนส่งต่อ');
            if ($book['stage'] === 'distributed') throw new RuntimeException('หนังสือนี้ส่งถึงผู้ปฏิบัติแล้ว');
            $ids = $_POST['user_ids'] ?? [];
            if (!is_array($ids)) $ids = [$ids];
            $ids = array_values(array_unique(array_filter(array_map('strval',$ids))));
            if (!$ids || count($ids)>100) throw new RuntimeException('เลือกผู้รับ 1–100 คน');
            if ($action === 'route' && count($ids)!==1) throw new RuntimeException('เสนอเกษียนได้ครั้งละหนึ่งคน');
            $q = $db->prepare("SELECT id,name FROM users WHERE status='active' AND id IN (" . implode(',',array_fill(0,count($ids),'?')) . ')');
            $q->execute($ids); $people = $q->fetchAll();
            if (count($people)!==count($ids)) throw new RuntimeException('ผู้รับบางคนไม่พร้อมใช้งาน');
            if ($action === 'route') {
                if (strtolower(pathinfo($book['file_name'],PATHINFO_EXTENSION))!=='pdf') throw new RuntimeException('การเกษียนบนหน้าเอกสารต้องใช้ PDF');
                if (!$workflow) {
                    $directory = dirname(__DIR__,2) . '/private-workflows/' . preg_replace('/[^A-Za-z0-9_-]/','_',$user['id']);
                    if (!is_dir($directory) && !mkdir($directory,0755,true) && !is_dir($directory)) throw new RuntimeException('เตรียมพื้นที่เก็บเอกสารไม่สำเร็จ');
                    $stored = bin2hex(random_bytes(12)) . '.pdf'; $path=$directory . '/' . $stored;
                    if (!copy(__DIR__ . '/../storage/eoffice/' . basename($book['stored_name']),$path)) throw new RuntimeException('เตรียม PDF ไม่สำเร็จ');
                    $workflowId='EO-' . bin2hex(random_bytes(12));
                    $q=$db->prepare('INSERT INTO document_workflows (id,title,topic,description,file_url,file_name,created_by,created_by_name,status,current_step,signers_json,stored_name,academic_year,semester) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
                    $period=current_academic_period($db);
                    $q->execute([$workflowId,$book['title'],'other','หนังสือรับที่ ' . $book['receipt_no'],'/api/document_workflows.php?download=' . $workflowId,$book['file_name'],$user['id'],$user['name'],'pending',1,'[]',$stored,$book['academic_year'],$period['semester']]);
                } else $workflowId=$workflow['id'];
                $step=count($signers)+1;
                $signers[]=['userId'=>$people[0]['id'],'userName'=>$people[0]['name'],'step'=>$step,'status'=>'pending'];
                $q=$db->prepare('UPDATE document_workflows SET signers_json=?,current_step=?,status=? WHERE id=?');
                $q->execute([json_encode($signers,JSON_UNESCAPED_UNICODE),$step,'in_review',$workflowId]);
                $q=$db->prepare("UPDATE eoffice_incoming SET workflow_id=?,responsible_id=?,responsible_name=?,stage='routing' WHERE id=?");
                $q->execute([$workflowId,$people[0]['id'],$people[0]['name'],$id]);
                $label='เสนอเกษียน';
            } else {
                $q=$db->prepare('INSERT INTO eoffice_tasks (book_id,user_id,user_name,instruction) VALUES (?,?,?,?)');
                foreach ($people as $person) $q->execute([$id,$person['id'],$person['name'],$note]);
                $db->prepare("UPDATE eoffice_incoming SET stage='distributed' WHERE id=?")->execute([$id]);
                $label='ส่งถึงผู้ปฏิบัติ';
            }
            $targets=$ids;
            $q=$db->prepare('INSERT INTO notifications (user_id,title,message,module,related_id,created_at) VALUES (?,?,?,?,?,NOW())');
            foreach ($ids as $target) $q->execute([$target,'e-Office: ' . $label,$book['title'] . ($note ? ' — ' . $note : ''),'eoffice',$id]);
            eoffice_history($db,$id,$user['name'],$label,implode(', ',array_column($people,'name')) . ($note ? ' — ' . $note : ''));
        } elseif (in_array($action,['acknowledge','report'],true)) {
            $q=$db->prepare('SELECT * FROM eoffice_tasks WHERE book_id=? AND user_id=? FOR UPDATE');
            $q->execute([$id,$user['id']]); $task=$q->fetch();
            if (!$task || $task['status']==='completed') throw new RuntimeException('ไม่มีงานที่รอดำเนินการของคุณ');
            if ($action==='report') {
                if ($note==='') throw new RuntimeException('กรุณาระบุผลดำเนินงาน');
                $q=$db->prepare("UPDATE eoffice_tasks SET status='completed',report=?,acknowledged_at=COALESCE(acknowledged_at,NOW()),completed_at=NOW() WHERE id=?");
                $q->execute([$note,$task['id']]);
            } else {
                if ($task['status']!=='pending') throw new RuntimeException('รับทราบแล้ว');
                $db->prepare("UPDATE eoffice_tasks SET status='acknowledged',acknowledged_at=NOW() WHERE id=?")->execute([$task['id']]);
            }
            eoffice_history($db,$id,$user['name'],$action==='report'?'รายงานผลเสร็จสิ้น':'รับทราบ',$note);
            if ($action === 'report') {
                $targets = [$book['created_by']];
                $label = 'รายงานผลดำเนินงานแล้ว';
                $q=$db->prepare('INSERT INTO notifications (user_id,title,message,module,related_id,created_at) VALUES (?,?,?,?,?,NOW())');
                $q->execute([$book['created_by'],'e-Office: ' . $label,$book['title'] . ' — ' . $user['name'] . ': ' . $note,'eoffice',$id]);
            }
        } elseif ($action==='follow') {
            if (!$canForward) throw new RuntimeException('ไม่มีสิทธิ์ติดตามหนังสือ');
            $date=trim((string)($_POST['follow_date']??''));
            if ($date!=='' && !eoffice_valid_date($date)) throw new RuntimeException('วันที่ติดตามไม่ถูกต้อง');
            $db->prepare('UPDATE eoffice_incoming SET follow_date=? WHERE id=?')->execute([$date?:null,$id]);
            eoffice_history($db,$id,$user['name'],'บันทึกการติดตาม',$date . ' ' . $note);
        } elseif ($action==='archive') {
            if (!$staff) throw new RuntimeException('เฉพาะเจ้าหน้าที่สารบรรณ');
            $q=$db->prepare("SELECT COUNT(*) FROM eoffice_tasks WHERE book_id=? AND status NOT IN ('acknowledged','completed')"); $q->execute([$id]);
            if ((int)$q->fetchColumn()>0 || ($workflow && $workflow['status']!=='completed')) throw new RuntimeException('ยังมีงานหรือลายเซ็นค้างอยู่');
            $db->prepare("UPDATE eoffice_incoming SET stage='archived' WHERE id=?")->execute([$id]);
            eoffice_history($db,$id,$user['name'],'จัดเก็บหนังสือ',$note);
        }
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        if ($path && is_file($path)) unlink($path);
        error_log('eOffice action: ' . $e->getMessage());
        api_error($e instanceof PDOException ? 'บันทึกไม่สำเร็จ กรุณาลองใหม่' : $e->getMessage(),422,'eoffice_action_failed');
    }
    if ($targets) {
        try { require_once __DIR__ . '/line-notifier.php'; line_notify_linked_users($db,$targets,'e-Office: ' . $label,['เรื่อง'=>$book['title'],'เลขรับ'=>$book['receipt_no'],'ผู้ส่ง'=>$user['name'],'ข้อความมอบหมาย'=>$note]+($action==='distribute'?['eoffice_ack_book'=>$id]:[])); }
        catch (Throwable $e) { error_log('eOffice LINE: ' . $e->getMessage()); }
    }
    api_respond(['status'=>'success']);
}

