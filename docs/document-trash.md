# Recoverable deletion of unsigned submissions

The sender can open a document in **ส่งเอกสาร/ลงนามออนไลน์**, choose **ลบเอกสาร**, and confirm the specific title. The server permits this only before any signature exists. e-Office records and other senders' documents are excluded, including for administrators.

Deleted submissions disappear from normal lists, signing queues and reviewer reports. Download, history, edit, resubmit, sign and reject URLs reject deleted documents. The main row, private PDF, previous PDF revisions, signers, original submission date, category, period and batch remain stored. There is no permanent purge action.

Open **เอกสารที่ลบ** in the document module to list only the current sender's deleted records and restore a record. Restoration keeps the original submission and signing state. Cancellation and restoration each notify the first signer through existing web/linked LINE notifications. Retried requests do not duplicate notifications.

`workflow_install_trash` adds nullable `deleted_at`, `deleted_by` and a `lifecycle_version` counter, plus `document_workflow_trash_events` recording actor, action, timestamp and generation. The API installs missing fields idempotently; no manual SQL is needed. Backups should include the new event table along with workflows, revisions and private files.

Delete/restore use the same row lock as signing and correction. File-version checks reject edits from an old PDF, and a separate lifecycle generation prevents an old delete retry from hiding a restored document. PDF version numbers and revision reports remain unchanged by deletion/restoration.

Validation: `php tests/document-trash.test.php` uses the local isolated MariaDB fixture (port 43317), actual routes and notification stubs; `node --test tests/document-trash.test.mjs` checks owner/signed controls, explicit confirmation, cancellation, API actions and restoration. These tests never send live LINE messages or alter production documents.
