-- Run once in phpMyAdmin before importing private personnel authentication data.
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `citizen_id` char(13) DEFAULT NULL AFTER `id`,
  ADD COLUMN IF NOT EXISTS `password_hash` varchar(255) DEFAULT NULL AFTER `citizen_id`,
  ADD COLUMN IF NOT EXISTS `must_change_password` tinyint(1) NOT NULL DEFAULT 1 AFTER `password_hash`,
  ADD COLUMN IF NOT EXISTS `status` varchar(20) NOT NULL DEFAULT 'active' AFTER `must_change_password`,
  ADD COLUMN IF NOT EXISTS `password_changed_at` datetime DEFAULT NULL AFTER `status`,
  ADD COLUMN IF NOT EXISTS `last_login_at` datetime DEFAULT NULL AFTER `password_changed_at`;

ALTER TABLE `users`
  ADD UNIQUE INDEX IF NOT EXISTS `users_citizen_id_unique` (`citizen_id`);
