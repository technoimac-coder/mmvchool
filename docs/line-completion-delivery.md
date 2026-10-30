# Reliable document-completion LINE delivery

Each non-e-Office file completion inserts its web notification and an outbox job
inside the signing transaction. The owner gets a separate completion per file/version.
After commit the request attempts the push once; a network failure cannot roll back
the already committed signature. The scheduled CLI worker handles pending jobs.
e-Office forwarding and acknowledgement remain separate.

## Hosting task (required)

In Plesk Scheduled Tasks select **Run a PHP script**, PHP **8.3 or newer**:

- Script: `httpdocs/api/line-delivery-worker.php`
- Arguments: empty
- Cron style: `* * * * *`
- Description: `MMV LINE completion retry`
- Notifications: Do not notify (failures are recorded in the server PHP log).

Use Run Now to verify the task can load the existing server-side database and LINE
configuration. The script is CLI only and returns HTTP 404 via the web. Never copy
credentials into task arguments, documentation or source control.

`line_notification_outbox` is installed idempotently by the workflow API/worker.
It contains private recipient IDs and message payloads and must have the same
database/backup access restrictions as existing notifications and LINE accounts.
Do not expose a public queue browser or dump payloads into logs.

## Retry and deduplication

Jobs have a stable UUID used as LINE `X-Line-Retry-Key`; the original recipient and
payload are retained. The unique document/version/owner key makes recovery and
repeated enqueue idempotent. A short database claim plus a 60-second lease avoids
concurrent workers; a crashed worker's lease can be reclaimed. Network I/O happens
outside the transaction. Each attempt has an 8-second connect and 12-second total
timeout. The worker tries up to 3 due jobs per invocation.

Only connection errors and HTTP 5xx are retried, with 1, 2, 4, 8, 16, 32 and 60-minute
delays, up to 8 attempts. Jobs older than 23 hours are failed rather than retried
past LINE's retry-key window. HTTP 2xx and 409 with an accepted-request ID mark a
job sent. Other 4xx responses fail with a bounded reason in the PHP log. Re-linking
the owner to another LINE account fails the old job; deleted/changed versions or
non-current owners cancel it. `sent` means accepted by LINE, not confirmed read.

All calls to `line_notify_linked_users` and `line_notify_linked_roles` now enqueue
one private job per active school account, including leave, official duty, vehicle,
room, repair, substitute, e-Office, document routing and school announcements.
New schemas are installed in `db.php` before business transactions. Notification
callbacks do not run DDL or send network requests while a transaction is open.
Post-response dispatch processes up to 3 jobs; the minute worker processes up to
100 due jobs within a 40-second loop budget (plus the final network attempt).
Reply and validation endpoints are not retried. Direct OA test/broadcast helpers
retain a single bounded transport retry.
See [LINE retry guidance](https://developers.line.biz/en/docs/messaging-api/retrying-api-request/).

## Administrator monitoring

Open **ศูนย์ควบคุมผู้ดูแลระบบ > 8. ตรวจสอบการส่ง LINE**. Only current active admin
or director accounts can access the server report or retry action. The report
lists the last 7 days, recipient name/staff ID, subject, accepted/pending/failed
status, reason, attempts and timestamps. It never returns LINE user IDs, tokens or
message payloads. A separate account view shows all active staff and link status.
Records before this feature was enabled cannot be assigned a historical delivery
status. `LINE ตอบรับแล้ว` is deliberately not described as a read/delivery receipt.

The worker records a heartbeat; the report warns if no run is recorded in 3 minutes.
Failures in the last day and overdue pending work generate a web-bell notice to
active admins/directors, at most once per 6 hours. This fallback does not use LINE.

The retry button operates on exactly one failed job, checks the expected attempt
count under a database lock and retains its retry UUID and payload. Accepted,
cancelled, changed-recipient/version, expired and malformed requests cannot be
resent. Up to three manual rounds are available within the original 23-hour window.
An account linked after a missed first send can be attached only when no network
attempt was made and the original target was empty. No accepted messages are
automatically resent and no historical notifications are bulk-recovered.

## Recover one confirmed missed completion

An operator can run the same PHP script with:

```text
--recover-notification=<web notification ID> --recipient=<owner staff ID>
```

Recovery verifies the specific notification, owner, completed document and current
file version. It queues only that recipient and does not add another web notice.
Run again safely: a previously accepted outbox job is not sent again. Remove these
arguments before saving the recurring task. Do not recover historical notices
without confirming the intended recipient/document.

## Verification

Run `php tests/line-transport.test.php`,
`php tests/document-completion-notifications.test.php`, and
`php tests/line-outbox.test.php` (isolated local MariaDB on port 43317).
Tests use synthetic recipients and injected transports, never live LINE sends.
