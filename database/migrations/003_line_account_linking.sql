-- Secure one-time LINE account linking for authenticated personnel.
CREATE TABLE IF NOT EXISTS `line_accounts` (
  `user_id` varchar(20) NOT NULL,
  `line_user_id` varchar(80) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `linked_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `line_accounts_line_user_id` (`line_user_id`),
  CONSTRAINT `line_accounts_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `line_link_codes` (
  `user_id` varchar(20) NOT NULL,
  `code_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  KEY `line_link_codes_expires_at` (`expires_at`),
  CONSTRAINT `line_link_codes_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
