<?php
declare(strict_types=1);
function eoffice_share_find(PDO $db, string $token): ?array {
    if (!preg_match('/^[a-f0-9]{64}$/D',$token)) return null;
    $q=$db->prepare('SELECT b.stored_name,b.file_name FROM eoffice_share_links s JOIN eoffice_incoming b ON b.id=s.book_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND b.deleted_at IS NULL LIMIT 1');
    $q->execute([hash('sha256',$token)]); $book=$q->fetch(PDO::FETCH_ASSOC);
    return $book && strtolower(pathinfo((string)$book['file_name'],PATHINFO_EXTENSION))==='pdf' ? $book : null;
}

/** Return only public-facing receipt and signed marks for a valid link. */
function eoffice_share_metadata(PDO $db, string $token): ?array {
    if (!eoffice_share_find($db,$token)) return null;
    $q=$db->prepare('SELECT b.id,b.title,b.file_name,b.receipt_no,b.received_date,b.created_at,b.stamp_enabled,w.signers_json FROM eoffice_share_links s JOIN eoffice_incoming b ON b.id=s.book_id LEFT JOIN document_workflows w ON w.id=b.workflow_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND b.deleted_at IS NULL LIMIT 1');
    $q->execute([hash('sha256',$token)]); $row=$q->fetch(PDO::FETCH_ASSOC);
    if (!$row) return null;
    $signers=json_decode((string)($row['signers_json']??'[]'),true);
    if (!is_array($signers)) $signers=[];
    $allowed=array_flip(['userName','step','status','signedAt','signatureData','placement','placements','comment','commentImage','commentPlacement','textPlacement','textAnnotations','checkmarks','checkmarksPlacement']);
    $signers=array_values(array_map(static fn($signer)=>array_intersect_key($signer,$allowed),array_filter($signers,static fn($signer)=>is_array($signer)&&($signer['status']??'')==='signed')));
    foreach ($signers as $index => &$signer) $signer['userId']='public-signer-'.($index+1);
    unset($signer);
    $metadata=['id'=>'EO-PUBLIC','title'=>(string)$row['title'],'topic'=>'other','fileUrl'=>'','fileName'=>(string)$row['file_name'],'createdBy'=>'','createdByName'=>'','status'=>'completed','currentStep'=>0,'signers'=>$signers,'createdAt'=>(string)$row['created_at']];
    if (!empty($row['stamp_enabled'])) $metadata['receiptStamp']=['receiptNo'=>(string)$row['receipt_no'],'date'=>(string)$row['received_date'],'time'=>substr((string)$row['created_at'],11,5)];
    return $metadata;
}
