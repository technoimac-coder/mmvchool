CREATE TABLE IF NOT EXISTS repair_assignments (
  role_key varchar(50) NOT NULL PRIMARY KEY,
  role_label varchar(255) NOT NULL,
  pipeline_id varchar(80) NOT NULL,
  step_number tinyint unsigned NOT NULL,
  user_id varchar(20) NOT NULL,
  updated_by varchar(20) DEFAULT NULL,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY repair_pipeline_step (pipeline_id, step_number),
  KEY repair_assignment_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO repair_assignments (role_key, role_label, pipeline_id, step_number, user_id) VALUES
  ('audiovisual_handler', 'ผู้ดูแลงานโสตทัศนูปกรณ์และไอที', 'pipe-repair-av', 2, 'MMV18'),
  ('building_reviewer', 'ผู้รับแจ้งงานอาคารสถานที่', 'pipe-repair-build', 2, 'MMV03'),
  ('building_technician', 'ผู้ดำเนินการซ่อมอาคารสถานที่', 'pipe-repair-build', 3, 'MMV20');
