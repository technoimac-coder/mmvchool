# Correcting a mistaken submission before signing

In **ส่งเอกสาร/ลงนามออนไลน์**, the sender opens the document and selects **แก้ไขไฟล์ / ชนิดเอกสาร**. They can change the category (for example, lesson plan to course plan), title or description and optionally replace the PDF (maximum 15 MB). Keeping the same file is supported.

The action is available only for the owner of a pending/in-review or first-step-returned personal workflow at step 1 whose signers are all still pending or returned, with no stored signature/date/placements. The server enforces this under the same row lock used by signing. e-Office and completed workflows cannot use it. A first-step return with no signatures uses this same correction form. Once anyone signs, the correction is rejected even if an old browser still shows the form.

A changed submission retains its document ID, original sender/date, batch, academic year, semester and signer order. Its prior file and full record are archived in `document_workflow_revisions`; the current version increments (including category-only changes), so a signer holding the previous PDF must reopen the latest version. Research fiscal year is recalculated from the retained academic period. The existing web/linked LINE notification path informs the first signer. Idempotent retries do not duplicate files, history or notifications; unchanged saves are no-ops.

The legacy metadata action uses the same protected path. Returned documents retain the separate existing **อัปโหลดและส่งลงนามใหม่** revision flow, which archives previous signatures and restarts signing from the first person.

Validation: PHP lint, isolated local MariaDB integration (`tests/document-unsigned-correction.test.php`, which includes the returned-document regression), React panel/API tests, mobile reader and revision-panel regressions, TypeScript and production static build. No production documents or notifications are created by tests. No schema migration is required beyond the existing revision storage.
