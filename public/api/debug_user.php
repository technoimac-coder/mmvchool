<?php
require_once __DIR__ . '/db.php';
 = require_database();
 = ->query('SELECT * FROM users WHERE name LIKE \'%กัลยานี%\'');
 = ->fetchAll(PDO::FETCH_ASSOC);
echo json_encode(, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

