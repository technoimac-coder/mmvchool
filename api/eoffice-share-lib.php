<?php
declare(strict_types=1);
function eoffice_share_find(PDO $db, string $token): ?array {
    if (!preg_match('/^[a-f0-9]{64}$/D',$token)) return null;
    $q=$db->prepare('SELECT b.stored_name,b.file_name FROM eoffice_share_links s JOIN eoffice_incoming b ON b.id=s.book_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND b.deleted_at IS NULL LIMIT 1');
    $q->execute([hash('sha256',$token)]); $book=$q->fetch(PDO::FETCH_ASSOC);
    return $book && strtolower(pathinfo((string)$book['file_name'],PATHINFO_EXTENSION))==='pdf' ? $book : null;
}
