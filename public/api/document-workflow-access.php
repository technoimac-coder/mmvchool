<?php
declare(strict_types=1);

/** Personal work contains only documents the user submitted or is assigned to sign. */
function workflow_is_participant(array $item, string $userId): bool
{
    if ($userId === '') return false;
    if ((string) ($item['createdBy'] ?? '') === $userId) return true;
    foreach ($item['signers'] ?? [] as $signer) {
        if ((string) ($signer['userId'] ?? '') === $userId) return true;
    }
    return false;
}
