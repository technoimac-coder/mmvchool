<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') exit(1);
$db = new PDO('mysql:host=127.0.0.1;port=43317;charset=utf8mb4', 'root', '', [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$name = 'mmv_leave_first_' . bin2hex(random_bytes(4));
$db->exec("CREATE DATABASE `$name` CHARACTER SET utf8mb4");
try {
    $db->exec("USE `$name`");
    $db->exec("CREATE TABLE leave_requests (id varchar(30), user_id varchar(20), user_name varchar(255), user_position varchar(255), department varchar(255), organization varchar(255), written_at varchar(255), leave_type varchar(30), other_leave_details varchar(255), start_date date, end_date date, total_days decimal(8,1), reason text, contact_address text, contact_phone varchar(50), leave_stats longtext, signature_url longtext, attachments longtext, academic_year varchar(10), semester varchar(1), leave_schedule longtext, current_stage varchar(40) NOT NULL DEFAULT 'admin_review')");
    foreach (['api/leaves.php', 'public/api/leaves.php'] as $index => $file) {
        $source = file_get_contents(__DIR__ . '/../' . $file);
        if (!preg_match("~'((?:INSERT INTO leave_requests)[\\s\\S]*?)'\\s*\\n\\s*\\);~", $source, $match)) throw new RuntimeException("Insert not found: $file");
        $sql = str_replace("\\'", "'", $match[1]);
        $values = ["TEST-$index",'owner','Owner','Teacher','Dept','School','School','sick',null,'2026-11-16','2026-11-16',1,'Test','','',null,null,'[]','2569','2',null];
        $db->prepare($sql)->execute($values);
        $q = $db->prepare('SELECT current_stage FROM leave_requests WHERE id = ?');
        $q->execute(["TEST-$index"]);
        if ($q->fetchColumn() !== 'secretary_ack') throw new RuntimeException("Wrong initial stage: $file");
    }
    echo "PASS: both leave APIs start at secretary even with old database default\n";
} finally {
    $db->exec("DROP DATABASE `$name`");
}
