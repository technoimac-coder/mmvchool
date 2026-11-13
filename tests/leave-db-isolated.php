<?php
declare(strict_types=1);
// Run only against the disposable database started by leave-db-isolated.ps1.
$port = (int)($argv[1] ?? 0);
if ($port < 33000 || $port > 65000) throw new RuntimeException('Invalid isolated test port');
$pdo = new PDO("mysql:host=127.0.0.1;port={$port};charset=utf8mb4", 'root', '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$pdo->exec('CREATE DATABASE leave_isolated_test CHARACTER SET utf8mb4');
$pdo->exec('USE leave_isolated_test');
$pdo->exec("CREATE TABLE leave_requests (id varchar(30) PRIMARY KEY, total_days int NOT NULL) ENGINE=InnoDB");
$pdo->exec("INSERT INTO leave_requests VALUES ('old', 3)");
require_once __DIR__.'/../api/pending-request-edit.php';
pending_request_install($pdo, 'leave');
if ((float)$pdo->query("SELECT total_days FROM leave_requests WHERE id='old'")->fetchColumn() !== 3.0) throw new RuntimeException('Existing value changed during migration');
$pdo->exec("INSERT INTO leave_requests(id,total_days,leave_schedule) VALUES ('new',1.5,'[{\"date\":\"2026-11-13\",\"period\":\"morning\"}]')");
if ((float)$pdo->query("SELECT total_days FROM leave_requests WHERE id='new'")->fetchColumn() !== 1.5) throw new RuntimeException('Half day was not persisted');
$pdo->exec("UPDATE leave_requests SET total_days=0.5 WHERE id='new'");
if ((float)$pdo->query("SELECT total_days FROM leave_requests WHERE id='new'")->fetchColumn() !== 0.5) throw new RuntimeException('Half day update was not persisted');
echo "PASS: existing integer preserved; 1.5 and 0.5 days persisted.\n";
