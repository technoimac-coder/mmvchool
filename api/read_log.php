<?php
declare(strict_types=1);

header('Content-Type: text/plain; charset=utf-8');

$logFile = __DIR__ . '/line_debug.log';
if (file_exists($logFile)) {
    echo file_get_contents($logFile);
} else {
    echo "No log file found yet. Please make sure you have booked a room (Ruangphueng) to generate logs.";
}
