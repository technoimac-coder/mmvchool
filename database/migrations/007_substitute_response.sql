ALTER TABLE substitute_teachings
  ADD COLUMN rejected_at datetime DEFAULT NULL AFTER acknowledged_at,
  ADD COLUMN rejection_reason text DEFAULT NULL AFTER rejected_at;
