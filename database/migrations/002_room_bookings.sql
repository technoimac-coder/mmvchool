-- Shared meeting-room inventory and bookings.
CREATE TABLE IF NOT EXISTS `meeting_rooms` (
  `id` varchar(30) NOT NULL,
  `name` varchar(255) NOT NULL,
  `location` varchar(255) NOT NULL DEFAULT '',
  `capacity` varchar(100) NOT NULL DEFAULT '',
  `facilities` longtext,
  `image` text,
  `status` varchar(30) NOT NULL DEFAULT 'available',
  `manager_id` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `meeting_rooms_manager_id` (`manager_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `room_bookings` (
  `id` varchar(50) NOT NULL,
  `user_id` varchar(20) NOT NULL,
  `user_name` varchar(255) NOT NULL,
  `user_phone` varchar(50) NOT NULL DEFAULT '',
  `department` varchar(255) NOT NULL DEFAULT '',
  `room_id` varchar(30) NOT NULL,
  `room_name` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `attendee_count` int unsigned NOT NULL DEFAULT 1,
  `booking_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `layout_style` varchar(30) NOT NULL DEFAULT 'classroom',
  `equipment_required` longtext,
  `snack_required` tinyint(1) NOT NULL DEFAULT 0,
  `snack_details` text,
  `booking_stage` varchar(30) NOT NULL DEFAULT 'pending_manager',
  `status` varchar(30) NOT NULL DEFAULT 'pending',
  `manager_review_by` varchar(255) DEFAULT NULL,
  `manager_review_at` datetime DEFAULT NULL,
  `manager_review_comment` text,
  `completed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `room_bookings_schedule` (`room_id`, `booking_date`, `start_time`, `end_time`),
  KEY `room_bookings_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `meeting_rooms`
  (`id`, `name`, `location`, `capacity`, `facilities`, `image`, `status`, `manager_id`)
VALUES
  ('room-1', 'ห้องประชุมราชพฤกษ์', 'อาคาร 1 ชั้น 2', '80 - 100 ท่าน', '["โปรเจกเตอร์ 4K","ระบบเสียงห้องประชุม","ระบบถ่ายทอดสด Zoom","ไมโครโฟนไร้สาย 4 ตัว"]', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=60', 'available', 'MMV03'),
  ('room-2', 'ห้องโสตทัศนศึกษา', 'อาคาร 2 ชั้น 1', '40 - 50 ท่าน', '["Smart TV 75 นิ้ว","ระบบประชุมทางไกล","เครื่องปรับอากาศ 4 ทิศทาง"]', 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&auto=format&fit=crop&q=60', 'available', 'MMV10'),
  ('room-3', 'ห้องประชุมเกียรติยศ', 'อาคารอำนวยการ', '20 - 30 ท่าน', '["โต๊ะประชุม VIP รูปตัว U","ไมโครโฟนประจำที่นั่ง","จอ LED Display"]', 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=600&auto=format&fit=crop&q=60', 'available', 'MMV01')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
