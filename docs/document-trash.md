# Delete unsigned submissions; send a new submission if needed

The sender may open their own unsigned document, choose **ลบเอกสาร**, and confirm the specific title. The confirmation explains that the submission cannot be restored in the system and must be sent again through **ส่งเอกสารใหม่** if needed. Signed documents, e-Office records and other senders' records cannot be deleted.

There is no deleted-documents panel or restoration control. The server rejects both the former `restore_submission` action and `?trash=1` endpoint with HTTP 410, including for cached clients. Old document download/history/sign/edit/resubmit URLs remain closed, and active queues/reports exclude deleted submissions. Existing tombstones remain closed; deployment does not delete additional real documents.

Deletion notifies the first signer once through existing web/linked LINE notifications with **ผู้ส่งลบเอกสารแล้ว** and the document identity. Retries do not duplicate notifications. No restoration notification is sent.

Internal deletion markers, files and event records remain for audit without any product restoration path. The additive schema from the prior release is unchanged. The row lock, ownership checks, unsigned checks and expected file/lifecycle versions remain in force. Document numbers and previous revision history are not rewritten.

Validation: `php tests/document-trash.test.php` uses isolated local MariaDB (43317), actual routes and notification stubs. It verifies owner/signed/EO/race guards, closed links, blocked cached restore/trash requests, active-list exclusion and one deletion notice. Targeted UI/API tests cover confirmation, cancellation, errors, deletion requests and absence of restoration controls. Tests do not alter production documents or send live LINE messages.
