<?php
// Copy to config.local.php on HostAtom and use newly rotated credentials.
// config.local.php is ignored by Git and must never be committed.
$mmvDbHost = 'localhost';
$mmvDbName = 'CHANGE_ME';
$mmvDbUser = 'CHANGE_ME';
$mmvDbPassword = 'CHANGE_ME';

// LINE Official Account Messaging API (keep these values only in config.local.php).
$mmvLineChannelAccessToken = '';
$mmvLineMode = 'push'; // push: selected user/group IDs, broadcast: every OA friend
$mmvLineTargetIds = []; // Example: ['Uxxxxxxxx', 'Cxxxxxxxx']
