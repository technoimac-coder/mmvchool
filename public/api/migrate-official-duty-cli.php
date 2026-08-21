<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/db.php';
$database = require_database();
$database->exec(
    "CREATE TABLE IF NOT EXISTS official_duty_requests (
      id varchar(30) NOT NULL, user_id varchar(20) NOT NULL, user_name varchar(255) NOT NULL,
      user_position varchar(255) NOT NULL DEFAULT '', department varchar(255) NOT NULL DEFAULT '',
      title text NOT NULL, location varchar(500) NOT NULL, organizer varchar(500) NOT NULL DEFAULT '',
      start_date date NOT NULL, end_date date NOT NULL, total_days int NOT NULL DEFAULT 1,
      participants json DEFAULT NULL, vehicle_type varchar(30) NOT NULL,
      vehicle_id varchar(50) DEFAULT NULL, vehicle_name varchar(255) DEFAULT NULL,
      license_plate varchar(100) DEFAULT NULL, driver_name varchar(255) DEFAULT NULL,
      supervisor_name varchar(255) DEFAULT NULL, personal_license_plate varchar(100) DEFAULT NULL,
      budget_type varchar(30) NOT NULL DEFAULT 'none', budget_amount decimal(12,2) NOT NULL DEFAULT 0,
      budget_custom_text text DEFAULT NULL, signature_url longtext NOT NULL,
      status varchar(30) NOT NULL DEFAULT 'pending', current_stage varchar(40) NOT NULL DEFAULT 'deputy_approval',
      admin_review json DEFAULT NULL, deputy_approval json DEFAULT NULL, director_approval json DEFAULT NULL,
      forwarded_to_academic tinyint(1) NOT NULL DEFAULT 0, substitute_scheduled tinyint(1) NOT NULL DEFAULT 0,
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id), KEY official_duty_user (user_id), KEY official_duty_stage (status, current_stage),
      CONSTRAINT official_duty_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
);
$database->exec("ALTER TABLE official_duty_requests MODIFY current_stage varchar(40) NOT NULL DEFAULT 'deputy_approval'");
$database->exec("UPDATE official_duty_requests SET current_stage = 'deputy_approval' WHERE status = 'pending' AND current_stage = 'admin_review'");
fwrite(STDOUT, "Official duty workflow table is ready.\n");
