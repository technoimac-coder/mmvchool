<?php
declare(strict_types=1);
require_once __DIR__ . '/../api/document-workflow-access.php';

$items = [
    ['id' => 'own', 'createdBy' => 'teacher', 'signers' => [], 'status' => 'completed'],
    ['id' => 'assigned', 'createdBy' => 'other', 'signers' => [
        ['userId' => 'director', 'step' => 1, 'status' => 'pending'],
        ['userId' => 'teacher', 'step' => 2, 'status' => 'pending'],
    ]],
    ['id' => 'unrelated', 'createdBy' => 'other', 'createdByName' => 'Same name', 'signers' => []],
];
$idsFor = static fn(string $userId): array => array_values(array_column(
    array_filter($items, static fn(array $item): bool => workflow_is_participant($item, $userId)), 'id'
));
if ($idsFor('teacher') !== ['own', 'assigned']) throw new RuntimeException('Owner and future signers must retain their documents');
if ($idsFor('director') !== ['assigned']) throw new RuntimeException('Signer must see the document');
foreach (['admin', 'reviewer', 'unrelated-account', ''] as $userId) {
    if ($idsFor($userId) !== []) throw new RuntimeException('Unrelated accounts must receive no personal records: ' . $userId);
}
if (workflow_is_participant(['createdBy' => '', 'signers' => [['userId' => '']]], '')) throw new RuntimeException('Empty IDs must not grant access');
echo "Personal document access checks passed\n";