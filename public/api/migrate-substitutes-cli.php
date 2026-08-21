<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/db.php';
$database = require_database();
$database->exec(
    "CREATE TABLE IF NOT EXISTS substitute_teachings (
      id varchar(40) NOT NULL, official_duty_id varchar(30) DEFAULT NULL, leave_request_id varchar(30) DEFAULT NULL,
      original_teacher_id varchar(20) NOT NULL, original_teacher_name varchar(255) NOT NULL,
      substitute_teacher_id varchar(20) NOT NULL, substitute_teacher_name varchar(255) NOT NULL,
      teaching_date date NOT NULL, period tinyint unsigned NOT NULL, teaching_time varchar(50) NOT NULL DEFAULT '',
      grade_level varchar(100) NOT NULL, subject_code varchar(100) NOT NULL, subject_name varchar(255) NOT NULL,
      assigned_work text DEFAULT NULL, leave_reason text DEFAULT NULL,
      status varchar(30) NOT NULL DEFAULT 'pending', stage varchar(30) NOT NULL DEFAULT 'pending_ack',
      acknowledged_at datetime DEFAULT NULL, created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id), KEY substitute_original (original_teacher_id),
      KEY substitute_assignee (substitute_teacher_id, stage), KEY substitute_schedule (teaching_date, period),
      UNIQUE KEY substitute_teacher_slot (substitute_teacher_id, teaching_date, period),
      UNIQUE KEY original_teacher_slot (original_teacher_id, teaching_date, period),
      KEY substitute_official_duty (official_duty_id),
      CONSTRAINT substitute_original_fk FOREIGN KEY (original_teacher_id) REFERENCES users (id) ON DELETE CASCADE,
      CONSTRAINT substitute_assignee_fk FOREIGN KEY (substitute_teacher_id) REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
);
fwrite(STDOUT, "Substitute teaching table is ready.\n");
