-- Also applied idempotently by vehicles.php when first accessed after deployment.
ALTER TABLE vehicle_bookings
  ADD COLUMN IF NOT EXISTS request_version int unsigned NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS request_history longtext DEFAULT NULL;
