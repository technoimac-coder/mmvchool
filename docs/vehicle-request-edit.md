# Editing a vehicle request

The requester can use **แก้ไขคำขอ** in the request list or details before the original departure time (Asia/Bangkok). Pending, approved, driver-acknowledged and rejected future trips can be corrected. An acknowledged driver means allocation is confirmed, not that the trip has finished.

Saving changed details keeps the booking ID, requester, original submission date and academic period. A previous payload and allocation/comment are appended to `vehicle_bookings.request_history`. `request_version` increments. Unchanged submissions do not restart approval or notify anyone.

Every changed request returns to `pending` / `admin_review`, clears the previous vehicle, rental, driver and acknowledgement token, and notifies the owner and current reviewer. If it had progressed beyond review, the current allocator is also notified; any previously assigned driver is informed that the previous allocation ended. Notifications use the existing web and linked LINE delivery path with the original booking ID and new trip details.

Edits are owner-only and protected by CSRF, a row lock and the expected request version. Review, allocation, rejection and driver acknowledgement must match that version and the correct stage. A driver link issued before an edit cannot acknowledge a later revision.

Migration 009 is additive and also applied idempotently by the API. There are no deleted bookings or changes to personnel/settings. Test with `C:\xampp\php\php.exe tests/vehicle-request-edit.test.php`.
